# Architecture

Status: Sprint 1 — foundation schema. Updated with auth architecture and the clustering pipeline as those land.

## Overview

Next.js (App Router) talks to Supabase (Postgres + Auth) directly from Server Components, Server Actions, and Route Handlers using the signed-in user's own session — almost every access rule lives in the database as Row-Level Security, not in application code. The one deliberate exception is the public feedback widget, which writes through a service-role server route rather than an RLS carve-out (see "Public ingestion" below).

## Multi-tenancy & RBAC

Every tenant-owned table carries an `org_id` and is scoped by Postgres RLS policies — never by an application-layer `WHERE` clause alone, since that would only protect access paths someone remembered to guard.

- **`organizations`** — one row per tenant. No direct insert policy exists; the only way to create one is the `create_organization(name, slug)` RPC, which atomically creates the org and adds the caller as its `admin` in the same transaction. This avoids a class of bug where a client could create an orphaned org with no admin member.
- **`profiles`** — mirrors `auth.users` for app-level profile data (name, avatar), since `auth.users` itself isn't extensible. Populated automatically by an `on_auth_user_created` trigger.
- **`org_members`** — the membership + role table. Role is one of `admin`, `member`, `viewer`. Status is `active` or `invited` (see "Invites" below). This table *is* what "teams" means in this product — there's no separate sub-team grouping within an org at this stage.
- **`audit_log`** — every consequential action, keyed by org. Deliberately has no client-facing insert policy at all; every write happens from trusted server code using the service-role key (see "Public ingestion").

RBAC is enforced through two `security definer` SQL functions — `is_org_member(org_id)` and `has_org_role(org_id, roles[])` — used inside every other table's policies. They run as the function owner rather than the calling role, which sidesteps a common RLS pitfall: policies on `org_members` that query `org_members` recursively. A third helper, `shares_org_with(user_id)`, backs the `profiles` visibility policy the same way.

Role capabilities, as encoded in policy: `viewer` can read; `member` can read/write feedback, customers, channels, and tags; `admin` additionally manages members, roles, and deletions. See `supabase/migrations/20260704185500_core_schema.sql` for the exact policy set.

**Known gap:** nothing currently stops the last remaining admin of an org from leaving or being demoted, which would leave the org unmanageable. Deferred — worth a trigger-level guard before this goes further than a portfolio build.

## Core schema

| Table | Purpose |
|---|---|
| `organizations` | Tenant root |
| `profiles` | App-level user profile, 1:1 with `auth.users` |
| `org_members` | Membership + role (RBAC) |
| `audit_log` | Append-only record of consequential actions |
| `channels` | Org-defined feedback sources (e.g. "Support Tickets", "App Store Reviews") |
| `customers` | The end customer a piece of feedback came from, if known |
| `tags` | Org-defined labels, normalized (not a free-text array) so they can be renamed and offered as autocomplete without fragmenting into near-duplicates |
| `feedback_items` | The feedback itself: content, channel, optional customer, ingestion `source` (`manual` / `csv_import` / `widget`) |
| `feedback_item_tags` | Join table between feedback and tags |

Sprint 2 adds an embedding column and clustering tables to `feedback_items`; deliberately not created now since designing them before the pipeline exists would just be guessing.

## Invites

There's no transactional email provider in this stack, and Supabase's own free-tier auth email is rate-limited to a handful of sends per hour — too low to build a real invite-by-email flow on top of without hitting the ceiling almost immediately. Sprint 1's invite flow is a shareable link instead: an admin generates an invite record (`org_members` row with `status = 'invited'`), gets a link, and sends it however they want (Slack, their own email client, etc.). Automated invite emails are a V1 candidate once a free-tier email provider is evaluated (see `ROADMAP.md`).

## Public ingestion (the widget)

The embeddable public widget has no Supabase session at all — it's an anonymous visitor on an external site. Rather than opening an RLS policy for anonymous inserts on `feedback_items` (which would need to be trusted to self-limit and self-validate), the widget posts to a Next.js Route Handler that:

1. Validates the payload with Zod (`src/lib/api/validate.ts`)
2. Rate-limits by IP via Upstash (`src/lib/rate-limit.ts`)
3. Inserts using the service-role client (`src/lib/supabase/admin.ts`), which bypasses RLS under the route's own authorization logic rather than a table policy

This keeps the RLS policy set on `feedback_items` limited to "authenticated org member," full stop, and pushes the actually-tricky trust decision (is this widget submission legitimate?) into ordinary, testable server code instead of a harder-to-reason-about RLS policy.

## Supabase client architecture (Next.js App Router)

Three distinct clients, per Supabase's SSR guidance for the App Router:

- **`src/lib/supabase/client.ts`** — browser client (`createBrowserClient`). Used in Client Components. Respects RLS as the signed-in user.
- **`src/lib/supabase/server.ts`** — server client (`createServerClient`), built fresh per request from `next/headers` cookies. Used in Server Components, Server Actions, and Route Handlers. Also respects RLS.
- **`src/lib/supabase/admin.ts`** — service-role client, guarded with the `server-only` package so an accidental import into client code fails the build instead of leaking the key. Bypasses RLS entirely; only used where the route itself does the authorization (the widget endpoint, audit-log writes).
- **`src/proxy.ts`** — refreshes the session cookie on every request. Server Components can't write cookies, so without this, expired access tokens would never get refreshed. (Named `proxy.ts`, not `middleware.ts` — Next.js 16 renamed the convention; the old name still works but logs a deprecation warning.)

## Security posture

- RLS on every table, enforced at the database, not just checked in application code.
- Zod validation baseline for every API route (`src/lib/api/validate.ts`).
- Security headers (CSP, HSTS, frame-ancestors, etc.) applied globally in `next.config.ts`. CSP currently allows `'unsafe-inline'` for scripts/styles since Next.js's own bootstrap needs it without nonce-based middleware — tightening this with per-request nonces is deferred to the Sprint 3 hardening pass.
- Rate limiting via Upstash (`src/lib/rate-limit.ts`), fails open with a warning when Upstash isn't configured yet (true right now — no account created). Must be confirmed fail-closed-or-blocking before the public widget carries real traffic.
- Secrets (Supabase service role, Groq, Upstash, HF tokens) live only in environment variables, never in code or client bundles; `.env.example` documents every var without values.

## Free-tier ceilings to watch

- **Supabase free tier:** 500MB database, 1GB file storage, 5GB egress/month, project pauses after 7 days with no API requests (auto-resumes on next request, but the pause itself is worth knowing about for a portfolio demo that might sit idle).
- **Supabase auth email:** free tier ships a small number of auth emails per hour via Supabase's own SMTP — driving the shareable-link invite design above instead of relying on it.
- **Upstash Redis free tier:** 500K commands/month, 256MB — ample for rate-limiting at this scale, revisit only if traffic ever becomes real.
- **Groq free tier:** generous but rate-limited per-model requests/minute — relevant starting Sprint 2, will document actual limits hit (if any) once the clustering pipeline is running against it.
