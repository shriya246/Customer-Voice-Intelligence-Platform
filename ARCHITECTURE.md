# Architecture

Status: Sprints 1–2 complete. Sprint 3 (personas, roadmap, executive layer) in progress.

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

`getEmbedding()` (`src/lib/embeddings.ts`) handles a real ambiguity the SDK's own types admit to: the feature-extraction response type is `(number | number[] | number[][])[]`, because whether the provider already mean-pooled the result depends on the model/provider combination. Parses defensively — a flat array is used as-is, a single-element nested array is unwrapped, a multi-element nested array gets mean-pooled here — rather than assuming one shape. Verified live once Hugging Face was connected: real feedback content produced a 384-dimensional embedding and was correctly assigned to a labeled theme.

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

### Opportunity scoring (RICE)

`20260705190000_opportunity_scoring.sql` adds `themes.impact_override` / `confidence_override` (nullable — null means "use the auto-suggested value") and `effort` (not-null, defaults to `1`), plus `get_theme_stats(theme_id)`, a plain SQL function (not security-definer — no privilege boundary here, the caller already has SELECT on their own org's `feedback_items` via RLS) returning raw aggregates over the last 90 days: item count, **reach** (`count(distinct coalesce(customer_id::text, id::text))` — dedupes by customer where known, and falls back to counting each customer-less item on its own rather than collapsing them into one bucket, matching `RICE_PRIORITIZATION.md`'s Reach definition exactly), average sentiment score, and sentiment stddev.

The actual RICE formula lives in `src/lib/scoring.ts`, in application code, not SQL — deliberately, so the scoring logic (the part most likely to need retuning once real data exists) is easy to read and change without a migration. `suggestImpact()` maps average sentiment onto the standard categorical RICE scale (0.25/0.5/1/2/3), more negative sentiment suggesting higher impact; `computeConfidence()` blends a volume component (approaches 1 past ~20 items — an arbitrary "feels like enough for this scale of product" cutoff, not statistically derived) with a penalty for inconsistent sentiment within the theme. Both are overridable per theme; `effort` never has a suggested value at all, since it can't be inferred from feedback text under any circumstances — it's a real engineering estimate, plain PM input with a neutral default.

`/opportunities` lists every theme ranked by computed score, each row editable inline (impact/confidence/effort inputs, auto-submitting on blur) for admins/members, linking through to `/dashboard?theme=X` — the `OPPORTUNITY_FRAMEWORK.md` promise that "no opportunity score exists without a visible set of underlying items a PM can click into" is what that link is for, not just a nice-to-have. Score edits log a `theme.scoring_updated` audit event via `log_audit_event`, same pattern as every other authenticated mutation.

**Verified against live data (synthetic sentiment values set directly, since no Groq key exists to generate real ones yet):** 5 feedback items with distinct customers and consistently strongly-negative sentiment scores (~-0.8 avg) correctly produced `reach=5`, `avg_sentiment` reflecting the strong negativity, and `suggestImpact` correctly returning `3` (massive) for it. Separately, 3 customer-less (widget-style anonymous) items in one theme correctly produced `reach=3`, not `1` — confirming the fallback-to-item-count behavior specifically, not just the common customer-linked case. Overrides (`impact_override`, `effort`) round-trip correctly through an update + re-read.

### Trend view

`get_theme_trend(theme_id, weeks)` returns weekly-bucketed item counts (`date_trunc('week', created_at)`) for a theme, most recent N weeks (default 8). `/trends` (`src/lib/trends.ts`) computes a rising/falling/flat direction per theme by comparing the last 2 weeks' total against the 2 weeks before that (a ±10% band counts as "flat," so noise doesn't read as a trend), and renders one small Recharts bar chart per theme (small multiples — a single series each, so no legend, one sequential hue). Rising themes sort first, since those are the ones that most need a PM's attention; direction badges use status colors keyed to business meaning, not the literal direction — **rising complaint volume is bad, not good**, so "rising" gets a warning tone and "falling" gets the good/green tone, the reverse of a naive "up = green" default.

**A real bug in the comparison logic, caught by testing with intentionally gappy data rather than a clean synthetic week-by-week series:** the first implementation summed "the last 2 elements of the weeks array" for the recent period and "the 2 before that" for prior — but `get_theme_trend`'s `GROUP BY` only returns weeks that actually have at least one item, so the array is **sparse**, not a dense run of consecutive weeks. Any theme with even one zero-feedback week in its recent history would have its comparison window silently shifted, mixing older data into what was supposed to be a "last 2 weeks" figure. Caught this by deliberately testing with gappy timestamps (not evenly-spaced weekly data) rather than a clean case that would have passed either way — a "rising" test theme initially came back misclassified. Fixed by filtering on each week's actual date against `now() - N weeks` instead of array position; re-verified with both a rising and a falling synthetic dataset, both now classify correctly.

## Sprint 3: roadmap integration

`roadmap_items` (org_id, optional `theme_id`, title, description, status) tracks feature requests through a fixed lifecycle (`under_review` → `planned` → `in_progress` → `shipped`, or `declined`), enforced by a Postgres `check` constraint rather than just application-level validation — confirmed the constraint actually rejects an invalid status value, not just that the app happens not to send one. RLS mirrors `feedback_items`/`themes`: any member reads, admin/member writes, admin-only deletes (not built yet, but the policy is ready).

**Two entry points, one shared insert path:** `/roadmap` has a full form (title, description, optional theme link) for standalone feature ideas; `/opportunities` has a one-click **Add to roadmap** button per theme, pre-filled with the theme's own name and id, no form needed — the traceability the opportunity-scoring section already established (score → underlying feedback) extends one step further here (score → roadmap decision). The one-click version is a separate, simpler Server Action (`addThemeToRoadmap`, plain form action, no `prevState`/error-UI plumbing) rather than reusing the full form's action, since it never needs to surface a validation error the page itself doesn't already guarantee won't happen (theme id and name both come from data already on the page).

`/roadmap` is a five-column board (one per status) rather than a flat list with a status filter — a PM scanning "what's shipped vs. what's still under review" benefits from seeing all five states at once, which a single filtered list would hide behind repeated filter-switching.

## Sprint 3: AI-generated personas

`personas` + `persona_themes` (a join table, not a single FK, since one persona is typically grounded in more than one theme): personas synthesized from real clustered feedback themes, in contrast to `PERSONAS.md` (VoiceIQ's own hypothetical target users) — these describe a *VoiceIQ customer's own end customers*, and the entire point is that they're data-backed rather than invented, so every persona has to trace back to real themes, not just read as plausible.

**The generation prompt explicitly requires the model to copy theme names verbatim** rather than freely describing them, specifically so `based_on_themes` can be reliably mapped back to real `theme_id`s afterward. This doesn't fully solve LLM unreliability, so the mapping code treats a theme name that doesn't match anything real as an expected, non-fatal case: it's dropped silently rather than erroring or creating a broken foreign-key reference, and the persona itself still gets created (with whichever real themes it did correctly reference). Verified this exact path with a synthetic "hallucinated theme name" input, confirming it's filtered out cleanly rather than crashing.

**Regeneration replaces the whole persona set, not an incremental merge.** "Regenerate personas" is framed to the user as producing a fresh snapshot from current data; existing personas are deleted only *after* generation succeeds, never before — verified this ordering directly (simulated a failed generation, confirmed a pre-existing persona was still present afterward) so a Groq failure can't wipe out a previously-good persona set.

Same graceful-degradation posture as the rest of Sprint 2/3's AI features, and now fully verified: connected Groq and confirmed live that `generatePersonas` produces real personas grounded in given themes, correctly mapped back to real theme ids via `based_on_themes`.

## Sprint 3: competitive insight notes

`competitive_notes` (org_id, competitor_name, manual `note`, optional `ai_summary`) is deliberately two separate text fields, not one: `note` is what a PM typed, `ai_summary` is generated separately and never silently overwrites or merges into it — a PM's own words and an AI-generated summary should stay visibly distinct, not blended into one field where it's unclear which parts came from where.

**"AI-assisted" here means literal substring search, not semantic search:** finding feedback that mentions a competitor is a plain `ilike('%competitor_name%')` over `feedback_items.content`, not an embedding-similarity lookup — a competitor's actual name is exactly the kind of thing literal matching handles correctly and semantic search could plausibly miss or over-match (a vector search might surface feedback about "competitors in general" without the specific name appearing at all, which isn't what "customers who specifically mentioned Acme Rival" is asking for). Groq then summarizes only the matched excerpts, explicitly told not to speculate beyond them.

**Verified against live data, including the Groq summarization call itself once credentials were connected:** inserted feedback items, some mentioning a test competitor name and some not, confirmed the `ilike` search matched exactly the relevant ones; confirmed `ai_summary` persists correctly on update, independent of the manual `note` field; confirmed a viewer can read notes but is blocked from creating one. This call is also where a real Groq reliability issue surfaced — see "Groq JSON reliability" below.

## Sprint 3: executive summary generator

`executive_summaries` (org_id, content, generated_by, created_at) — every generation is a new row, not an overwritten "current summary," since comparing this period's narrative to last period's is a real use case (`KPI_FRAMEWORK.md`'s "executive summary views per month" metric implies exactly this history, not a single live snapshot with no past).

**The model narrates; it doesn't compute.** Every number handed to `generateExecutiveSummary()` — feedback volume this period vs. the prior period, each top theme's opportunity score/reach/trend, roadmap shipped/in-progress counts — is already computed deterministically by the same functions the rest of the app uses (`getThemeStats`, `computeOpportunityScore`, `getThemeTrend`), not left for the model to derive from raw text. The prompt explicitly tells it not to invent numbers or themes beyond what's given. This matters more here than in the sentiment/labeling prompts: an executive reading this expects the figures to be real, and "the model estimated it from vibes" would undermine the entire "evidence-based, not anecdote-based" pitch the product makes.

**Verified against live data, including the actual Groq narration call once credentials were connected:** inserted feedback at controlled offsets (3 items within the last 30 days, 1 item 45 days ago) and confirmed the recent/prior period counts matched exactly; confirmed shipped/in-progress roadmap counts; confirmed `get_theme_stats`/`get_theme_trend` — already independently verified in their own sections — compose correctly together for the top-themes input; confirmed a stored summary persists and reads back, and that a viewer can read summaries but is blocked from generating one.

## Groq JSON reliability (found and fixed once credentials were connected)

Once `GROQ_API_KEY`, `HUGGINGFACE_API_TOKEN`, and Upstash credentials were connected, every AI call was re-verified live end to end (real feedback through the widget → real embedding → real cluster/theme label → real sentiment/pain-point, plus personas, competitive summarization, and executive narration called directly). Embeddings, clustering, and sentiment worked correctly on the first pass. `summarizeCompetitorMentions` did not: it failed roughly 2 out of every 3 calls with a Groq-side `400 json_validate_failed` — the model periodically emitted an unquoted JSON string value (e.g. `"summary": Customers switched because...` with no opening quote), which Groq's own server-side validation rejects before this code ever sees a response to parse.

Root cause, once compared across all five Groq call sites: every prompt's "respond with this shape" instruction described a value inline (`"summary": 2-4 sentences summarizing...`) without ever showing the model a literal quoted example — so it had no concrete demonstration that the value itself needed to be wrapped in quote characters, and would sometimes mirror the unquoted shape of the instruction back in its output. Confirmed this was the actual mechanism, not a guess: rewriting every shape description to use a quoted placeholder (`"summary": "<2-4 sentences...>"`) plus an explicit "every string value must be a properly quoted JSON string" reminder took the failure rate from ~2/3 to 0 across 8 consecutive full runs (24 calls) after the fix, versus a mix of failures across the same number of calls before it.

Two changes, both in `src/lib/groq.ts`:
1. **`createJsonCompletion()`** — a shared helper all five functions now call, retrying the whole request up to 3 times specifically on this failure class (temperature > 0 means the same prompt frequently succeeds on a retry) rather than duplicating a `chat.completions.create` + raw-content-extraction block five times.
2. **Quoted placeholders in every prompt** — the actual fix for the root cause; the retry is defense-in-depth on top of it, not a substitute for it (retries alone did not reliably prevent the failure in testing — the model would sometimes fail all 3 attempts in a row on the original prompt wording).

This is exactly the kind of gap the zero-credential period couldn't have caught — `summarizeCompetitorMentions`'s surrounding logic (mention search, RLS, persistence) was already verified correct against live data; only the actual model call was still unverified, and turned out to be the one place with a real, frequent failure.

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

## Frontend design system

Sprint 1–3 shipped every feature on the untouched default `create-next-app` scaffold — no color palette, no shared components, no animation, just raw Tailwind utility classes repeated inline per page. Replaced with a real design system rather than continuing to duplicate ad hoc classes as new pages ship:

- **`src/app/globals.css`** — Tailwind v4's `@theme` block defines semantic color tokens (`--color-background`, `--color-surface`, `--color-primary`, `--color-sentiment-*`, `--color-trend-*`, etc.) as CSS custom properties, not raw Tailwind palette classes, so a component written once (`bg-surface`, `text-muted-foreground`) looks right in both themes without a parallel `dark:` class on every element. Also defines animation keyframes as `--animate-*` theme keys (`fade-in`, `slide-up`, `scale-in`, `slide-in-left`, `shimmer`) — Tailwind v4 auto-generates `animate-*` utilities from that namespace, the same mechanism that produces `--color-*` → `bg-*`/`text-*` utilities.
- **Manual dark mode, not pure `prefers-color-scheme`** — `@custom-variant dark (&:where(.dark, .dark *));` makes every `dark:` utility respond to a `.dark` class on `<html>` instead of only the OS setting. An inline `<script>` in `src/app/layout.tsx` sets that class from `localStorage` (falling back to system preference) before first paint, so there's no flash of the wrong theme. `src/components/theme-toggle.tsx` toggles it, using `useSyncExternalStore` rather than a `useState` + `useEffect` pair — the value legitimately differs between the server snapshot (no theme class exists yet) and the client snapshot (reads what the inline script already set), which is exactly the case `useSyncExternalStore`'s `getServerSnapshot` parameter exists for, and avoids both a hydration-mismatch warning and the newer `react-hooks/set-state-in-effect` lint rule.
- **`src/components/ui/`** — shared primitives (`Button`/`ButtonLink`, `Card`/`CardHeader`/`CardContent`/`EmptyState`, `Badge`/`SentimentBadge`/`TrendBadge`, `Input`/`Textarea`/`Select`/`Label`/`FieldError`, `PageHeader`, `Skeleton`). `SentimentBadge` and `TrendBadge` specifically replace the `SENTIMENT_STYLES`/`DIRECTION_STYLES` lookup objects that were previously duplicated between the dashboard and the trends chart card — one definition now, used everywhere a sentiment or trend needs to render.
- **`src/components/app-sidebar.tsx`** — the app shell gained a real sidebar nav (collapsible into an off-canvas drawer below the `md` breakpoint) linking every top-level section. Previously there was no persistent navigation between sections at all — every page only linked back to `/dashboard`, so getting from, say, Roadmap to Personas meant going through the dashboard first.
- **Animation is CSS-only, no JS animation library** — the app leans heavily on Server Components for data fetching; a library like Framer Motion needs `"use client"` on every animated node, which would have forced converting most pages to client components just to animate their entrance. Tailwind's own transition utilities plus the `--animate-*` keyframes cover hover states, button press feedback (`active:scale-[0.97]`), page-content entrance (`animate-slide-up`/`animate-fade-in`), and staggered list entrance (`.stagger-children`, nth-child animation-delay, no JS) without that cost. `@media (prefers-reduced-motion: reduce)` collapses all of it to near-zero duration for users who've asked the OS for that.
- **The public widget embed (`src/app/widget/[channelId]/`) deliberately does not use any of this** — it's iframed into third-party pages of unknown theme, so it stays on a fixed light Tailwind palette (`gray-300`, `indigo-600`, etc.) rather than the `dark:`-aware tokens everywhere else. Polished its interaction states (button press, spinner, animated success check) without adopting the token system, on purpose.

**Verified:** `tsc --noEmit`, `npm run lint`, `npx vitest run` (unaffected — no logic changed, only presentation), and `npm run build` all clean after every batch of pages. Also ran a live unauthenticated route sweep against a real dev server (every `(app)` route correctly `307`s to `/login` when signed out, no `500`s) — full authenticated-page verification would need a real browser, which isn't available in this environment; the user should click through each page after this ships to confirm the visual result looks right, not just that it builds.

## Security posture

- RLS on every table, enforced at the database, not just checked in application code.
- Zod validation baseline for every API route (`src/lib/api/validate.ts`).
- Security headers (CSP, HSTS, frame-ancestors, etc.) applied globally in `next.config.ts`. CSP currently allows `'unsafe-inline'` for scripts/styles since Next.js's own bootstrap needs it without nonce-based middleware — tightening this with per-request nonces is deferred to the Sprint 3 hardening pass.
- Rate limiting via Upstash (`src/lib/rate-limit.ts`), fails open with a warning when Upstash isn't configured. Upstash is now connected and verified live — concurrent requests against the widget endpoint correctly return `429` past the sliding-window threshold (see "Hardening pass: rate-limit audit" below).
- Secrets (Supabase service role, Groq, Upstash, HF tokens) live only in environment variables, never in code or client bundles; `.env.example` documents every var without values.

## Hardening pass: RLS audit

Reviewed every RLS policy across all 15 migrations directly against their source (not by introspecting the live database — the migrations are the intended access model, authored one at a time, so reading them is more reliable than reverse-engineering intent from `pg_policies`). Confirmed RLS is enabled on all 16 tenant tables and every policy's role/action split matches the intended admin/member/viewer model.

Found the same class of bug as the `tags` UPDATE-policy gap above, in two join-table INSERT policies: `feedback_item_tags` and `persona_themes` both checked that the caller had the right role on one side of the link (the feedback item's org, the persona's org) but never verified the *other* foreign key (`tag_id`, `theme_id`) actually belonged to that same org. The app's own code never constructs a cross-org pair — tags/themes are always looked up or created within the caller's own org first — but RLS, not application code, is the real boundary: an authenticated member could call PostgREST directly (bypassing the Next.js server actions entirely) with a foreign org's tag/theme UUID and have it accepted. Fixed in `20260705250000_cross_org_link_policies.sql` by joining across both tables in the `with check` clause. Verified live: a cross-org attempt on both tables now fails with `42501`, while same-org linking still succeeds.

## Hardening pass: rate-limit audit

The widget endpoint (`api/widget/[channelId]`) is the only unauthenticated, publicly-reachable write surface in the app, and it's the only place `checkRateLimit` is called — correctly, before any database work, keyed on `x-forwarded-for` (set by the platform's own edge proxy, not client-controlled). The other bulk-write surface, CSV import, requires authentication (org membership, viewers blocked) and already caps input at 2000 rows via Zod, so it doesn't need IP rate limiting on top. No gap found. Upstash is now connected — verified live with 15 concurrent requests against a real widget endpoint, 10 succeeded and 5 correctly returned `429`.

## Hardening pass: structured error logging

No paid error-tracking service (this project's zero-dollar constraint, and no account exists for one) — instead, `src/lib/log-error.ts` emits one structured JSON line per error (`scope`, `message`, `stack`, arbitrary context, `timestamp`) to `console.error`, which Vercel's own log viewer already captures and lets filter by field. Retrofit into every catch block that was previously silent past its returned client-facing message or an ad hoc string-concatenated `console.error`: the three Groq-calling actions (`personas.generate`, `competitive.summarize_mentions`, `executive_summary.generate`) now log server-side before returning the user-facing error, the four failure points in `tryProcessFeedbackItem` (`clustering.read_current_state`, `clustering.embed_and_cluster`, `clustering.sentiment_analysis`, `clustering.label_theme`) use consistent structured calls instead of one-off template strings, and the widget route's previously-silent insert failure (`widget.insert_feedback_item`) now logs before returning its generic 500.

## Hardening pass: unit test coverage for core logic

Added Vitest (free, no external service) covering the pure/deterministic logic that's easiest to get subtly wrong and hardest to catch by eyeballing: `scoring.ts` (RICE math — impact/confidence suggestion, override precedence, the zero-effort divide-by-zero guard), `trends.ts` (`sumInWeekRange`, including a regression test for the sparse-array bug documented above, exercised with `vi.useFakeTimers()` rather than relying on real wall-clock time), `slug.ts`, `safe-redirect.ts` (the open-redirect guard — `//evil.com`, absolute URLs, array-typed query params), `clustering.ts`'s `parseVector`, `embeddings.ts`'s `extractEmbedding` (all three response shapes: flat, single-wrapped, multi-token needing mean-pooling), and `log-error.ts`.

`parseVector` and `extractEmbedding` were previously module-private; exported for direct testability rather than only exercising them indirectly through their parent functions, which would require mocking a Supabase client or the Hugging Face SDK for what's really pure-function logic. Both `clustering.ts` and `embeddings.ts` transitively import a `server-only`-marked module (`groq.ts` in one case, and `embeddings.ts` itself imports `server-only` directly) — that package throws unconditionally unless a bundler's `react-server` export condition resolves it away, which plain Node/Vitest doesn't do. `vitest.config.ts` aliases `server-only` to a no-op stub (`test/stubs/server-only.ts`) so these modules import cleanly under test without changing any production code path.

Wired into CI (`.github/workflows/ci.yml`): `npm run test` runs after lint and before build, so a broken unit test fails fast before spending time on a full production build.

## Free-tier ceilings to watch

- **Supabase free tier:** 500MB database, 1GB file storage, 5GB egress/month, project pauses after 7 days with no API requests (auto-resumes on next request, but the pause itself is worth knowing about for a portfolio demo that might sit idle).
- **Supabase auth email:** free tier ships a small number of auth emails per hour via Supabase's own SMTP — confirmed directly (hit "email rate limit exceeded" during Sprint 1 testing after only a couple of signups), not just a theoretical ceiling. Driving the shareable-link invite design above instead of relying on it, and why automated verification scripts create test users via the admin API rather than the public signup flow.
- **Upstash Redis free tier:** 500K commands/month, 256MB — ample for rate-limiting at this scale, revisit only if traffic ever becomes real.
- **Groq free tier:** generous but rate-limited per-model requests/minute — relevant starting Sprint 2, will document actual limits hit (if any) once the clustering pipeline is running against it.
