# Backlog

Living, sprint-tagged. Checked off as each item ships (coded, tested, committed, pushed).

## Sprint 1 — Foundation & Feedback Ingestion

Done when: a user can sign up, create an org, import a batch of feedback via CSV or the widget, and browse/filter it.

- [x] **Project scaffolding** — Next.js (App Router) + TypeScript + Tailwind, ESLint, base repo docs
- [ ] **CI/CD + security/config baseline** — Vercel deploy pipeline, security headers, `.env.example`, Zod as the validation baseline, rate-limit scaffold wired for Upstash
- [ ] **Database schema & RLS foundation** — Supabase schema: `organizations`, `profiles`, `org_members` (roles), `audit_log`, `channels`, `customers`, `feedback_items`; RLS policy on every table; `ARCHITECTURE.md` written alongside
- [ ] **Auth & onboarding** — sign up / sign in / sign out via Supabase Auth, session middleware, protected routes, auto-create org on first signup
- [ ] **Organizations, teams & RBAC UI** — org settings page, invite/manage members, role assignment (admin/member/viewer), org switcher
- [ ] **Audit log** — record key actions server-side, admin-facing view
- [ ] **Feedback ingestion: manual entry** — form + Zod validation + storage
- [ ] **Feedback ingestion: CSV import** — upload, column mapping, preview, bulk insert, per-row error reporting
- [ ] **Feedback ingestion: public widget embed** — embeddable snippet + public rate-limited API endpoint writing into a channel
- [ ] **Feedback list/table view** — filter by channel, date range, tag; search; pagination

## Sprint 2 — AI Clustering, Sentiment, and Opportunity Scoring

Done when: imported feedback is auto-clustered into labeled themes with sentiment, and each theme has a computed opportunity score.

- [ ] Embedding pipeline (pgvector) for feedback items
- [ ] Clustering job grouping feedback into themes
- [ ] AI-generated theme labels + summaries (Groq)
- [ ] Sentiment tagging + pain-point extraction per feedback item (Groq)
- [ ] Opportunity scoring engine (RICE-based, per `RICE_PRIORITIZATION.md`)
- [ ] Trend view — themes over time, rising/falling
- [ ] PM docs: `OPPORTUNITY_FRAMEWORK.md`, `RICE_PRIORITIZATION.md`, `EXECUTIVE_SUMMARY.md` update, `ARCHITECTURE.md` pipeline write-up

## Sprint 3 — Personas, Roadmap Integration, Executive Layer

Done when: the full loop (feedback in → clustered/scored → persona/roadmap/executive output) is demoable end to end and deployed.

- [ ] AI-generated, data-backed personas from clustered feedback
- [ ] Feature request tracker linked to themes, with roadmap status
- [ ] Competitive insight notes field (manual + AI-assisted summarization)
- [ ] Executive summary generator (auto-drafted narrative)
- [ ] Hardening pass: RLS audit, rate-limit audit, error tracking, core-flow test coverage
- [ ] PM docs: `GTM_STRATEGY.md`, `PRICING_STRATEGY.md`, final `EXECUTIVE_SUMMARY.md`, one-page Executive Presentation doc
