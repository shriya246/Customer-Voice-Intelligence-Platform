# Roadmap

Last updated: Sprint 1.

## MVP (Sprints 1–3)

The three sprints that take this from nothing to a demoable end-to-end loop.

- **Sprint 1 — Foundation & Feedback Ingestion:** multi-tenant auth/org/RBAC, core schema, three ingestion paths (manual, CSV, widget), filterable feedback list. *In progress.*
- **Sprint 2 — AI Clustering, Sentiment, and Opportunity Scoring:** embedding + clustering pipeline, sentiment/pain-point extraction, RICE-based opportunity scoring, trend view.
- **Sprint 3 — Personas, Roadmap Integration, Executive Layer:** data-backed personas, roadmap tracker linked to themes, competitive insight notes, auto-drafted executive summary, security/test hardening pass.

Full detail on each sprint's scope lives in [PROJECT_PLAN.md](./PROJECT_PLAN.md) and [PRD.md](./PRD.md).

## V1 (post-MVP hardening)

Goal: take the demoable loop and make it reliable enough for a real team to depend on daily, not just demo well.

- Real integrations beyond CSV: at minimum a Zendesk or Intercom export/API connector, evaluated against free-tier feasibility
- Configurable opportunity scoring weights per organization, instead of one fixed RICE formula
- Saved views / dashboards per persona (a PM's default view vs. an exec's)
- Notification/digest layer (e.g., weekly theme-movement summary) — needs a free-tier email provider evaluation
- Expanded audit log into a full activity feed, exportable for compliance-minded orgs

## V2 (exploratory, not committed)

Directional ideas, not yet scoped or sequenced:

- Multi-language feedback support (embedding models and sentiment models that generalize beyond English)
- Customer-facing changelog view that closes the loop ("you asked, we shipped") — would cross into Canny territory deliberately, once the core analysis product is proven
- Predictive churn-risk scoring that factors in theme sentiment trends per account, not just aggregate
- Public API for feedback ingestion beyond the embeddable widget, with proper API-key management and usage tiers
- Real revenue-impact input (CRM/ARR linkage) replacing the Sprint-2 placeholder in the opportunity scoring formula

## Explicitly out of scope for the foreseeable future

- Native mobile apps
- Becoming a public feature-voting board (see [COMPETITIVE_ANALYSIS.md](./COMPETITIVE_ANALYSIS.md) — deliberately not competing with Canny on that axis)
- Billing/payments infrastructure until pricing strategy is validated (see [PRICING_STRATEGY.md](./PRICING_STRATEGY.md))
