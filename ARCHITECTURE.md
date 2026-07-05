# Architecture

Status: Sprint 1 (foundation, auth) complete. Sprint 2 (clustering pipeline) in progress.

## Overview

Next.js (App Router) talks to Supabase (Postgres + Auth) directly from Server Components, Server Actions, and Route Handlers using the signed-in user's own session — almost every access rule lives in the database as Row-Level Security, not in application code. The one deliberate exception is the public feedback widget, which writes through a service-role server route rather than an RLS carve-out (see "Public ingestion" below).

## Multi-tenancy & RBAC

Every tenant-owned table carries an `org_id` and is scoped by Postgres RLS policies — never by an application-layer `WHERE` clause alone, since that would only protect access paths someone remembered to guard.

- **`organizations`** — one row per tenant. No direct insert policy exists; the only way to create one is the `create_organization(name, slug)` RPC, which atomically creates the org and adds the caller as its `admin` in the same transaction. This avoids a class of bug where a client could create an orphaned org with no admin member.
- **`profiles`** — mirrors `auth.users` for app-level profile data (name, avatar), since `auth.users` itself isn't extensible. Populated automatically by an `on_auth_user_created` trigger.
- **`org_members`** — the membership + role table. Role is one of `admin`, `member`, `viewer`. Status is `active` or `invited` (see "Invites" below). This table *is* what "teams" means in this product — there's no separate sub-team grouping within an org at this stage.
- **`audit_log`** — every consequential action, keyed by org. No client-facing insert *policy* at all — every write goes through `log_audit_event()` (a `security definer` RPC) or is inserted directly by another `security definer` function in the same transaction as the action it's recording (see "Audit log" below).

RBAC is enforced through two `security definer` SQL functions — `is_org_member(org_id)` and `has_org_role(org_id, roles[])` — used inside every other table's policies. They run as the function owner rather than the calling role, which sidesteps a common RLS pitfall: policies on `org_members` that query `org_members` recursively. A third helper, `shares_org_with(user_id)`, backs the `profiles` visibility policy the same way.

Role capabilities, as encoded in policy: `viewer` can read; `member` can read/write feedback, customers, channels, and tags; `admin` additionally manages members, roles, and deletions. See `supabase/migrations/20260704185500_core_schema.sql` for the exact policy set. `/settings` is the UI for all of this: member list, role changes, removal, and invites, visible to any member but only editable by admins.

A `prevent_last_admin_removal` trigger on `org_members` (added in `20260705120000_teams_and_invites.sql`) blocks any update or delete that would leave an org with zero active admins — closes what was originally a known gap in the core schema.

A user can belong to more than one organization. `profiles.current_org_id` tracks which one is "active"; `getCurrentMembership()` reads it and falls back to whichever membership is found first if it's unset or stale (e.g. removed from that org). The header's org switcher (a plain `<select>` that submits on change) only renders when a user actually has more than one membership, rather than showing a single-item dropdown.

## Core schema

| Table | Purpose |
|---|---|
| `organizations` | Tenant root |
| `profiles` | App-level user profile, 1:1 with `auth.users`, including `current_org_id` for the org switcher |
| `org_members` | Membership + role (RBAC) |
| `invites` | Pending/accepted/revoked email invitations, independent of `org_members` until accepted |
| `audit_log` | Append-only record of consequential actions |
| `channels` | Org-defined feedback sources (e.g. "Support Tickets", "App Store Reviews") |
| `customers` | The end customer a piece of feedback came from, if known |
| `tags` | Org-defined labels, normalized (not a free-text array) so they can be renamed and offered as autocomplete without fragmenting into near-duplicates |
| `feedback_items` | The feedback itself: content, channel, optional customer, ingestion `source` (`manual` / `csv_import` / `widget`) |
| `feedback_item_tags` | Join table between feedback and tags |

Sprint 2 adds an embedding column and clustering tables to `feedback_items`; deliberately not created now since designing them before the pipeline exists would just be guessing.

## Invites

There's no transactional email provider in this stack, and Supabase's own free-tier auth email is rate-limited to a handful of sends per hour — too low to build a real invite-by-email flow on top of without hitting the ceiling almost immediately. Sprint 1's invite flow is a shareable link instead, generated from `/settings` and sent however the admin wants (Slack, their own email client, etc.).

Invites are their own `invites` table, not an `org_members` row: `org_members.user_id` is `not null` (it always represents a real member), so someone who hasn't signed up yet can't be represented there at all until they actually join. An invite is `{org_id, email, role, token, status}`; accepting one is a `security definer` RPC (`accept_invite`), not a direct client insert into `org_members`, because a brand-new member accepting their own invite isn't yet an admin of that org — the existing "admins can add members" policy would otherwise block it. `accept_invite` also checks that the accepting user's `auth.users.email` matches the invite's email (case-insensitive) before honoring it — a leaked link alone isn't enough, at least when email confirmation is enabled on the project (weaker, but still a real check, when it isn't). `get_invite_by_token` is a second, read-only `security definer` function granted to `anon` as well as `authenticated`, since an unauthenticated visitor needs to see who's inviting them to what, before they've signed up or logged in — RLS on `invites` itself only allows admins of the org to read/write it directly.

`/login` and `/signup` both accept a `next` query param (validated by `src/lib/safe-redirect.ts` to same-app relative paths only, to avoid an open-redirect) so `/invite/[token]` can send an unauthenticated visitor to sign in or sign up and land back on the same invite afterward — including through email confirmation, by round-tripping `next` through `emailRedirectTo` on `/auth/callback`. Automated invite *emails* (as opposed to this link-based flow) are a V1 candidate once a free-tier email provider is evaluated (see `ROADMAP.md`).

## Public ingestion (the widget)

The embeddable public widget has no Supabase session at all — it's an anonymous visitor on an external site. Rather than opening an RLS policy for anonymous inserts on `feedback_items` (which would need to be trusted to self-limit and self-validate), the widget posts to a Next.js Route Handler that:

1. Validates the payload with Zod (`src/lib/api/validate.ts`)
2. Rate-limits by IP via Upstash (`src/lib/rate-limit.ts`)
3. Inserts using the service-role client (`src/lib/supabase/admin.ts`), which bypasses RLS under the route's own authorization logic rather than a table policy

This keeps the RLS policy set on `feedback_items` limited to "authenticated org member," full stop, and pushes the actually-tricky trust decision (is this widget submission legitimate?) into ordinary, testable server code instead of a harder-to-reason-about RLS policy.

`/widget/[channelId]` is the embeddable page itself (an admin gets the `<iframe>` snippet from `/settings/widget`, keyed by `channels.id` directly — channel ids are already random UUIDs, so there's no separate opaque token to manage). It's meant to be framed on arbitrary external sites, which conflicts with the site-wide `X-Frame-Options: DENY` / `frame-ancestors 'none'` from `next.config.ts` — **and Next.js applies every header rule whose `source` matches a path, not just the most specific one**, so a naive "add a second, more specific rule for `/widget/*` that just omits those headers" doesn't actually override the site-wide rule's `X-Frame-Options: DENY`; both apply and the browser still blocks framing (confirmed by testing, not assumed — the widget page still 100% denied framing after adding a second rule that simply didn't mention the header). The fix was to exclude `/widget` from the general rule's match pattern (`/((?!widget/).*)`) instead of trying to override it from a second rule. `/api/widget/[channelId]` (the POST endpoint, as opposed to the page) intentionally still matches the general rule and keeps the strict headers — only the page needs to be frameable.

`audit_log` writes from the widget route go through the service-role client directly (`actor_user_id: null`), not `log_audit_event` — there's no `auth.uid()` at all for an anonymous external submission, so the RPC's `is_org_member()` check would just reject it the same way `create_organization` rejects an unauthenticated caller. This is the one write path where the service-role admin client remains the right tool for the audit-log write too, not just the feedback insert.

## Feedback ingestion: manual entry

`/feedback/new` logs a single item: content, a channel, an optional customer, optional comma-separated tags. Channels and tags are find-or-create-by-name — `.upsert({org_id, name}, {onConflict: "org_id,name"})` against their unique constraint, so typing an existing name reuses it (via a datalist-suggested `<input>`, not a dropdown, so creating a new one needs no separate UI) and typing a new one creates it inline. Customers are matched by exact name if provided, otherwise the feedback item just has no customer link.

**RLS gotcha worth remembering for CSV import and the widget too:** `.upsert()`'s conflict path is an `UPDATE` at the SQL level even when no column value actually changes, so it needs an `UPDATE` policy, not just `INSERT`. `channels` already had one; `tags` didn't (only `SELECT`/`INSERT`/`DELETE` from the core schema migration) and failed with `42501` the first time this pattern was tested against a real second call with the same name. Fixed in `20260705150000_tags_update_policy.sql`. Any future find-or-create-by-upsert against a table needs to be checked for this, not just assumed to work because `INSERT` succeeds on the first call.

Every ingestion path logs to `audit_log` via `log_audit_event` (`feedback.created` for manual entry, `feedback.csv_imported` for CSV import), same pattern as the settings actions.

## Feedback ingestion: CSV import

`/feedback/import` is a client-side wizard (upload → map columns → preview → confirm), not a server round-trip per step — the whole CSV is parsed and held in browser state (via `papaparse`), and only the final mapped rows get sent to the server, as a direct call to a `"use server"` function rather than a form submission (`importFeedbackCsv(channelName, rows)`), since the data being submitted is derived client-side rather than coming from form fields.

Deliberately **one channel for the entire import, not a per-row column**: a real CSV import is normally a single export from one source (a Zendesk export, an App Store reviews export), so requiring a channel column per row would fight how these files actually look. Content, customer name, and tags are the only per-row column mappings.

Bulk-insert strategy: unique channel (one row) and all unique tag names across the whole file are upserted once, in a single batched call each (`.upsert([...])` with an array, not one call per row) — confirmed this correctly dedupes rather than creating N rows for the same repeated tag name across the file. Customers are resolved with one `select ... in (names)` for existing matches, then one batched insert for whatever's missing. Only the actual `feedback_items` + `feedback_item_tags` inserts happen one row at a time, in a loop — deliberately, not a missed optimization: this is what makes per-row error reporting possible (a bad row doesn't abort the batch, and the caller gets back exactly which row numbers failed and why), and at the row counts a CSV import realistically involves here, the per-row round trip cost is a non-issue. Capped at 2000 rows per import as a sanity limit, not a scalability tuned number.

## Feedback list view

`/dashboard` is the list view — filters (search, channel, tag, date range) are plain `<form method="get">` inputs, not client-state/JS, so filtering is just a normal navigation with query params (`?channel=...&tag=...&q=...&page=...`), bookmarkable and shareable, and works without JavaScript. Pagination is offset-based (`page` param, 20 rows/page) rather than cursor-based — simpler, and entirely adequate at the row counts this product deals with.

Tag filtering is a separate query, not an embedded-resource inner join: filtering `feedback_items` by tag via `.select("*, feedback_item_tags!inner(tag_id)").eq("feedback_item_tags.tag_id", x)` would work for *restricting which rows come back*, but the same embed used for *displaying* every tag on each row would then only show the one tag being filtered on, not the item's other tags — PostgREST's embedded-resource filtering scopes the embed itself, not just row inclusion. Instead: a first query resolves which `feedback_item_id`s have the target tag (`feedback_item_tags` where `tag_id = x`), then `.in("id", thoseIds)` on the main query, which keeps the *display* join (`feedback_item_tags(tags(name))`) unfiltered and complete. A tag with zero matches resolves to a single-element array containing a nil UUID, forcing the main query to correctly return zero rows rather than needing a separate no-results code path.

Sprint 1's "done when" criterion — sign up, create an org, import feedback via CSV or the widget, browse/filter it — is met as of this feature.

## Sprint 2: embedding + clustering pipeline

### Model and infrastructure

Embeddings come from `sentence-transformers/all-MiniLM-L6-v2` (384 dimensions) via Hugging Face's **Inference Providers** API — checked the model's own Hub page before committing to it, since HF's infrastructure moved from a simple "any public model, one URL" Inference API to a provider-routed system (`router.huggingface.co`, requests dispatched to partner backends like `hf-inference`, Scaleway, Together, etc., not every model available everywhere). Confirmed this specific model is servable via the `hf-inference` provider and pinned to it explicitly (`provider: "hf-inference"`) rather than relying on provider auto-selection. Also confirmed via their own docs that the OpenAI-compatible chat endpoint is chat-only — embeddings have to go through the `@huggingface/inference` SDK's `featureExtraction()`, not a raw fetch to a REST endpoint, since request/response shape varies by provider and the SDK is what normalizes that.

`getEmbedding()` (`src/lib/embeddings.ts`) handles a real ambiguity the SDK's own types admit to: the feature-extraction response type is `(number | number[] | number[][])[]`, because whether the provider already mean-pooled the result depends on the model/provider combination. Parses defensively — a flat array is used as-is, a single-element nested array is unwrapped, a multi-element nested array gets mean-pooled here — rather than assuming one shape. This is the one part of the pipeline **not yet verified against a real API response** (no Hugging Face token configured yet); everything else describes what's confirmed.

384 dimensions is now load-bearing: `feedback_items.embedding` and `themes.centroid` are both `vector(384)`. Switching embedding models later means re-embedding every row, not a config change.

### Clustering: incremental nearest-centroid, not batch

Feedback arrives continuously, one item at a time (mostly) — this called for online/incremental clustering rather than a periodic batch job that reclusters everything from scratch, which also sidesteps needing any job scheduler (there isn't one in this stack; no Vercel Cron, no queue).

For each newly embedded item: `find_nearest_theme(org_id, embedding)` (a SQL function using pgvector's `<=>` cosine-distance operator) returns the closest existing theme in the org, if any. If the distance is below `JOIN_THRESHOLD_DISTANCE` (`src/lib/clustering.ts`, currently `0.35`), the item joins that theme and the theme's centroid updates as an incremental running mean (`new = (old * old_count + embedding) / (old_count + 1)`) rather than recomputing from every member each time. Otherwise, a new theme is created with this item as its sole member and its embedding as the initial centroid.

**The threshold is a starting guess, not a tuned constant** — there's no real embedded feedback yet to tune it against. Verified the *mechanism* is correct using synthetic (non-semantic) test vectors: near-identical embeddings join the same theme, an unrelated embedding starts a new one, and a third item matching the first topic correctly rejoins it rather than the second — but the actual right distance cutoff for real sentence embeddings on real feedback text can only be tuned once real data exists.

A `parseVector()` helper handles a similar defensive-parsing situation to `getEmbedding()`: `vector` columns can come back from PostgREST as either a real array or its text representation, and this was actually confirmed both ways don't break anything by testing against the live database directly rather than assuming a single shape.

### Sentiment analysis and theme labeling (Groq)

`src/lib/groq.ts` wraps `llama-3.3-70b-versatile` (confirmed against Groq's own model docs, matching the original plan's spec) via the `groq-sdk` package — Groq is OpenAI-API-compatible by design, confirmed the SDK's `chat.completions.create()` / `choices[0].message.content` shape matches accordingly. Uses the older `response_format: {type: "json_object"}` mode rather than strict `json_schema` structured outputs, since strict schema adherence support for this specific model on Groq isn't confirmed — the response is parsed and validated with Zod instead of trusted to match a schema exactly, which is the more defensive bet given that uncertainty.

- **Sentiment** (`analyzeSentiment`): per feedback item, returns a category (`very_negative` … `very_positive`), a `-1..1` numeric score (for the averaging `OPPORTUNITY_FRAMEWORK.md` describes), and a short `pain_point` phrase (or `null` if the feedback isn't a complaint). Stored directly on `feedback_items`.
- **Theme labeling** (`generateThemeLabel`): given up to 10 sample member contents, returns a short `name` and 1-2 sentence `summary`. Only runs **once per theme**, the first time it has any members (`maybeLabelTheme()` in `src/lib/clustering.ts` checks `name is null` before calling Groq at all) — deliberately does not relabel as a theme grows, since auto-relabeling on every new member would mean a Groq call per item added to an already-large theme, including during backlog batch processing where 20 items could land in the same theme in one pass. A "regenerate label" action is a reasonable later addition if labels drift stale as themes grow past their original sample; not built yet.

### Where processing gets triggered, and why it differs by ingestion path

`tryProcessFeedbackItem()` (`src/lib/clustering.ts`) is the single entry point every ingestion path calls, running embed+cluster and sentiment analysis as two independently-failing steps, then theme labeling if a theme was (newly or previously) assigned:

- **Manual entry and the widget** (one item at a time): call it synchronously, right after the `feedback_items` insert, before responding. Adds real latency to those two request paths (two external API calls plus a few DB round trips) — an accepted tradeoff given there's no background job infrastructure to defer it to.
- **CSV import**: deliberately *not* synchronous. A single import can be up to 2000 rows, and each row needs two separate external API calls — well beyond what a serverless function's execution-time budget can afford in one request. CSV-imported rows land fully unprocessed, and `/dashboard` shows an "N feedback items not yet analyzed" banner with a **Process next batch** button (`processUnclusteredBacklog`, `src/app/(app)/dashboard/actions.ts`) that processes up to 20 at a time per click.

**Idempotency matters here, not just best-effort failure handling.** Embedding/clustering and sentiment analysis can fail independently (different APIs, different failure modes) — an item could end up with a `theme_id` set but `sentiment` still `null` if only the Groq call failed. The backlog query catches this (`theme_id.is.null OR sentiment.is.null`, not just the first), and `tryProcessFeedbackItem()` checks each item's *current* state before redoing a step — critically, before rerunning `assignToTheme`, since that function has no "is this item already a member" check, and blindly re-running it on an already-clustered item would double-count it into its theme's centroid and `item_count`. This was a correctness bug caught during design (before it shipped, by reasoning through what the backlog button would do to a partially-processed row), not one discovered by testing after the fact.

**Everything here is best-effort, never a condition of a feedback item actually being saved.** Verified directly, not assumed: submitted real feedback through the live widget endpoint with *both* `HUGGINGFACE_API_TOKEN` and `GROQ_API_KEY` unset (the actual current state), confirmed the request still returned `200 {"ok":true}`, confirmed *both* failures were visibly logged server-side as separate, specific errors, and confirmed the row landed with `theme_id`, `embedding`, `sentiment`, `sentiment_score`, and `pain_point` all correctly `null` — this exact scenario is what happens for every submission until both credentials exist, so it needed to work cleanly as today's reality, not just as a hypothetical.

## Auth & onboarding flow

Sign-up collects only name, email, and password — no organization name at that step, to keep the form short. What happens next depends on whether the Supabase project requires email confirmation, which the app doesn't assume either way:

1. **Sign up** (`/signup`) calls `auth.signUp()` with `full_name` attached as user metadata (read by the `handle_new_user` trigger) and `emailRedirectTo` pointed at `/auth/callback`.
   - If the project has email confirmation *off*, a session comes back immediately and the user goes straight to `/dashboard`.
   - If confirmation is *on*, there's no session yet — the user sees a "check your email" message instead.
2. **Email confirmation callback** (`/auth/callback`) exchanges the emailed code for a session, then redirects to `/dashboard`.
3. **`/dashboard`** (and every route under the `(app)` route group) checks for both a signed-in user and an existing organization membership. No user → `/login`. User but no membership → `/onboarding`. Both → render.
4. **`/onboarding`** is where an organization actually gets created — a single "name your organization" form backed by the `create_organization` RPC. A slug is derived from the name; on a collision (`23505` unique violation) it retries with a random suffix rather than surfacing a confusing error for an internal implementation detail.

Routing every authenticated-but-org-less user through the same `/onboarding` step (rather than branching "create org" logic across both the instant-session and post-confirmation paths) keeps org creation in exactly one place. The membership check itself lives in `src/lib/org.ts` (`getCurrentMembership()`) so `/onboarding` and the `(app)` layout can't drift out of sync on what "has an org" means.

**Known gap:** `getCurrentMembership()`'s return type is hand-typed rather than generated from the schema — there's no `Database` type yet, since generating one (`supabase gen types typescript`) needs a linked project. Worth wiring up once linked; low urgency since the query shapes here are simple.

Verified end to end against a live project before this shipped: sign-up (via the admin API to avoid the email rate limit below), the `handle_new_user` trigger firing, `create_organization`, and RLS correctly isolating two separate orgs from each other (blocked reads return `null`, blocked writes return Postgres `42501`) — see `PROGRESS_LOG.md` for the full verification script and output.

## Audit log

Every consequential action gets a row in `audit_log`: who (`actor_user_id`), what (`action`, a short dotted string like `member.role_changed`), on what (`target_type`/`target_id`), and any extra context (`metadata`, jsonb). Two ways it gets written, both `security definer`, neither a direct client insert:

- **`create_organization` and `accept_invite`** insert directly, in the same transaction as the action they're recording — they're already `security definer` for the action itself, so there's no reason to round-trip through a second function call.
- **Everything else** (`invite.created`, `invite.revoked`, `member.role_changed`, `member.removed`) goes through `log_audit_event(org_id, action, target_type, target_id, metadata)`, called from the relevant Server Action right after the mutation succeeds. `actor_user_id` always comes from `auth.uid()` inside the function, never a client-supplied field, so it can't be spoofed; it also re-checks `is_org_member(org_id)` before writing, so a caller can't log a fabricated event against an org they don't belong to.

Originally planned to route these writes through the service-role admin client (like the widget), but `security definer` RPCs turned out to be the better fit: they keep `actor_user_id` tied to a real, verified session instead of something the server code would otherwise have to thread through manually, and they let ordinary authenticated users trigger a write without ever touching a service-role key outside the one route that genuinely needs it (the anonymous widget).

`/settings/audit-log` is the admin-only view (RLS already restricts `audit_log` SELECT to admins; the page also redirects non-admins as a clearer UX than a silently-empty table). Feedback CRUD isn't logged yet since ingestion doesn't exist yet — added to this same table as those backlog items ship, not a separate mechanism.

## Supabase client architecture (Next.js App Router)

Three distinct clients, per Supabase's SSR guidance for the App Router:

- **`src/lib/supabase/client.ts`** — browser client (`createBrowserClient`). Used in Client Components. Respects RLS as the signed-in user.
- **`src/lib/supabase/server.ts`** — server client (`createServerClient`), built fresh per request from `next/headers` cookies. Used in Server Components, Server Actions, and Route Handlers. Also respects RLS.
- **`src/lib/supabase/admin.ts`** — service-role client, guarded with the `server-only` package so an accidental import into client code fails the build instead of leaking the key. Bypasses RLS entirely; only used where the route itself does the authorization (the widget endpoint — audit-log writes turned out not to need this, see "Audit log" below).
- **`src/proxy.ts`** — refreshes the session cookie on every request. Server Components can't write cookies, so without this, expired access tokens would never get refreshed. (Named `proxy.ts`, not `middleware.ts` — Next.js 16 renamed the convention; the old name still works but logs a deprecation warning.)

## Security posture

- RLS on every table, enforced at the database, not just checked in application code.
- Zod validation baseline for every API route (`src/lib/api/validate.ts`).
- Security headers (CSP, HSTS, frame-ancestors, etc.) applied globally in `next.config.ts`. CSP currently allows `'unsafe-inline'` for scripts/styles since Next.js's own bootstrap needs it without nonce-based middleware — tightening this with per-request nonces is deferred to the Sprint 3 hardening pass.
- Rate limiting via Upstash (`src/lib/rate-limit.ts`), fails open with a warning when Upstash isn't configured yet (true right now — no account created). Must be confirmed fail-closed-or-blocking before the public widget carries real traffic.
- Secrets (Supabase service role, Groq, Upstash, HF tokens) live only in environment variables, never in code or client bundles; `.env.example` documents every var without values.

## Free-tier ceilings to watch

- **Supabase free tier:** 500MB database, 1GB file storage, 5GB egress/month, project pauses after 7 days with no API requests (auto-resumes on next request, but the pause itself is worth knowing about for a portfolio demo that might sit idle).
- **Supabase auth email:** free tier ships a small number of auth emails per hour via Supabase's own SMTP — confirmed directly (hit "email rate limit exceeded" during Sprint 1 testing after only a couple of signups), not just a theoretical ceiling. Driving the shareable-link invite design above instead of relying on it, and why automated verification scripts create test users via the admin API rather than the public signup flow.
- **Upstash Redis free tier:** 500K commands/month, 256MB — ample for rate-limiting at this scale, revisit only if traffic ever becomes real.
- **Groq free tier:** generous but rate-limited per-model requests/minute — relevant starting Sprint 2, will document actual limits hit (if any) once the clustering pipeline is running against it.
