# Architecture

Status: Sprint 1 — foundation schema and auth architecture. Updated with the clustering pipeline in Sprint 2.

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

## Feedback ingestion: manual entry

`/feedback/new` logs a single item: content, a channel, an optional customer, optional comma-separated tags. Channels and tags are find-or-create-by-name — `.upsert({org_id, name}, {onConflict: "org_id,name"})` against their unique constraint, so typing an existing name reuses it (via a datalist-suggested `<input>`, not a dropdown, so creating a new one needs no separate UI) and typing a new one creates it inline. Customers are matched by exact name if provided, otherwise the feedback item just has no customer link.

**RLS gotcha worth remembering for CSV import and the widget too:** `.upsert()`'s conflict path is an `UPDATE` at the SQL level even when no column value actually changes, so it needs an `UPDATE` policy, not just `INSERT`. `channels` already had one; `tags` didn't (only `SELECT`/`INSERT`/`DELETE` from the core schema migration) and failed with `42501` the first time this pattern was tested against a real second call with the same name. Fixed in `20260705150000_tags_update_policy.sql`. Any future find-or-create-by-upsert against a table needs to be checked for this, not just assumed to work because `INSERT` succeeds on the first call.

Every ingestion path logs `feedback.created` to `audit_log` via `log_audit_event`, same pattern as the settings actions.

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
