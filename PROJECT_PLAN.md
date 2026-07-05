# Project Plan — VoiceIQ Enterprise

## Vision

VoiceIQ Enterprise turns scattered customer feedback — support tickets, reviews, surveys, call notes, sales notes — into a continuously updated, prioritized product opportunity map. Instead of a PM manually reading through hundreds of tickets, VoiceIQ clusters, scores, and surfaces the highest-impact opportunities automatically.

**Problem it solves:** customer signal is fragmented across channels and tools, so the loudest voice — not the most common or most impactful one — tends to win roadmap debates. VoiceIQ makes prioritization evidence-based.

**Positioning:** an AI-native alternative to manually triaging feedback across Zendesk, surveys, and spreadsheets before it ever reaches a roadmap decision.

## Target users

Detailed in [PERSONAS.md](./PERSONAS.md):

- **Product Manager** — needs a ranked opportunity list, not a raw feedback firehose
- **UX Researcher** — needs to trace themes back to verbatim feedback and personas
- **Customer Success / Support** — needs to log and tag feedback with minimal friction
- **Executive** — needs a top-line view of what customers are asking for and why it matters to revenue and churn

## Operating constraints

Every dependency in this project runs on a genuinely free tier — no paid APIs, no paid hosting, no paid add-ons. This keeps the project self-funded indefinitely and forces discipline about what's actually necessary versus nice-to-have. Where a free tier has a real ceiling (rate limits, storage caps, request quotas), that ceiling is documented in [ARCHITECTURE.md](./ARCHITECTURE.md) rather than exceeded silently.

## Sprint plan

### Sprint 1 — Foundation & Feedback Ingestion
A working multi-tenant system that can take feedback in from multiple channel types: auth, organizations, teams, role-based access, core schema, and three ingestion paths (manual entry, CSV import, embeddable widget), plus a filterable feedback list.

**Done when:** a user can sign up, create an org, import a batch of feedback via CSV or the widget, and browse/filter it.

### Sprint 2 — AI Clustering, Sentiment, and Opportunity Scoring
Raw feedback becomes structured, prioritized signal: an embedding + clustering pipeline groups feedback into themes, sentiment and pain points are extracted automatically, and each theme gets a computed opportunity score (see [RICE_PRIORITIZATION.md](./RICE_PRIORITIZATION.md)) tied to volume, sentiment, and business impact. Adds a trend view showing which themes are rising or falling over time.

**Done when:** imported feedback is auto-clustered into labeled themes with sentiment, and each theme has a computed opportunity score.

### Sprint 3 — Personas, Roadmap Integration, Executive Layer
Opportunity scores turn into roadmap decisions and executive-legible output: data-backed personas generated from real clustered feedback (not hypothetical), a feature request tracker linked to themes with roadmap status, competitive insight notes, and an auto-drafted executive summary of what customers are asking for and why it matters. Closes with a hardening pass on security and test coverage.

**Done when:** the full loop — feedback in, clustered and scored, persona/roadmap/executive output out — is demoable end to end and deployed.

See [ROADMAP.md](./ROADMAP.md) for the longer-horizon view past these three sprints.

## How this repo is organized

- Product docs (this file, PRD, PERSONAS, COMPETITIVE_ANALYSIS, ROADMAP, KPI_FRAMEWORK, GTM_STRATEGY, PRICING_STRATEGY, EXECUTIVE_SUMMARY) live at the repo root and are updated every sprint.
- [BACKLOG.md](./BACKLOG.md) is the living, sprint-tagged task list.
- [ARCHITECTURE.md](./ARCHITECTURE.md) documents the database schema, API surface, and clustering pipeline as they're built.
