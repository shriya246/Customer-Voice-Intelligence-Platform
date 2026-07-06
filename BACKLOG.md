# Backlog

Living, sprint-tagged. Checked off as each item ships (coded, tested, committed, pushed).

## Sprint 1 — Foundation & Feedback Ingestion

Done when: a user can sign up, create an org, import a batch of feedback via CSV or the widget, and browse/filter it.

- [x] **Project scaffolding** — Next.js (App Router) + TypeScript + Tailwind, ESLint, base repo docs
- [x] **CI + security/config baseline** — GitHub Actions CI (lint + build on every push/PR), security headers, `.env.example`, Zod validation baseline, rate-limit scaffold wired for Upstash
  - [x] *Follow-up:* Vercel connected — repo linked for CD, live at https://customer-voice-intelligence-platfor.vercel.app, full pipeline (widget → embed → cluster → sentiment, rate limiting) verified live against the actual deployment
- [x] **Database schema & RLS foundation** — Supabase schema: `organizations`, `profiles`, `org_members` (roles), `audit_log`, `channels`, `customers`, `feedback_items`; RLS policy on every table; `ARCHITECTURE.md` written alongside
- [x] **Auth & onboarding** — sign up / sign in / sign out via Supabase Auth, session middleware, protected routes, auto-create org on first signup
- [x] **Organizations, teams & RBAC UI** — org settings page, invite/manage members, role assignment (admin/member/viewer), org switcher
- [x] **Audit log** — record key actions server-side, admin-facing view
- [x] **Feedback ingestion: manual entry** — form + Zod validation + storage
- [x] **Feedback ingestion: CSV import** — upload, column mapping, preview, bulk insert, per-row error reporting
- [x] **Feedback ingestion: public widget embed** — embeddable snippet + public rate-limited API endpoint writing into a channel
  - [x] *Follow-up:* Upstash connected — rate limiting verified live (concurrent requests against the widget endpoint correctly return 429 past the sliding-window threshold)
- [x] **Feedback list/table view** — filter by channel, date range, tag; search; pagination

## Sprint 2 — AI Clustering, Sentiment, and Opportunity Scoring

Done when: imported feedback is auto-clustered into labeled themes with sentiment, and each theme has a computed opportunity score.

- [x] Embedding pipeline (pgvector) for feedback items
  - [x] *Follow-up:* Hugging Face connected — verified live, real feedback content correctly embedded and clustered into a labeled theme
- [x] Clustering job grouping feedback into themes
- [x] AI-generated theme labels + summaries (Groq)
- [x] Sentiment tagging + pain-point extraction per feedback item (Groq)
  - [x] *Follow-up:* Groq connected — verified live, real feedback correctly sentiment-tagged with an extracted pain point
- [x] Opportunity scoring engine (RICE-based, per `RICE_PRIORITIZATION.md`)
- [x] Trend view — themes over time, rising/falling
- [x] PM docs: `OPPORTUNITY_FRAMEWORK.md`, `RICE_PRIORITIZATION.md`, `ARCHITECTURE.md` pipeline write-up, `EXECUTIVE_SUMMARY.md` update

## Sprint 3 — Personas, Roadmap Integration, Executive Layer

Done when: the full loop (feedback in → clustered/scored → persona/roadmap/executive output) is demoable end to end and deployed.

- [x] AI-generated, data-backed personas from clustered feedback
  - [x] *Follow-up:* Groq connected — verified live, produces real personas grounded in given themes
- [x] Feature request tracker linked to themes, with roadmap status
- [x] Competitive insight notes field (manual + AI-assisted summarization)
  - [x] *Follow-up:* Groq connected — verified live; this call surfaced a real bug (Groq's own JSON validation rejecting ~2/3 of calls due to an unquoted string value) fixed by tightening the prompt's shape example and adding a retry, see `PROGRESS_LOG.md`
- [x] Executive summary generator (auto-drafted narrative)
  - [x] *Follow-up:* Groq connected — verified live, produces a real narrative grounded in the given numbers
- [x] Hardening pass: RLS audit, rate-limit audit, error tracking, core-flow test coverage
- [x] PM docs: `GTM_STRATEGY.md`, `PRICING_STRATEGY.md`, final `EXECUTIVE_SUMMARY.md`, one-page Executive Presentation doc
