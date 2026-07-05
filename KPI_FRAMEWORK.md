# KPI Framework

Status: Sprint 1 draft. Metrics that need live usage data to compute are marked accordingly and will start populating from Sprint 2 onward.

## North star

**% of feedback volume that is actively informing a roadmap decision**, proxied until there's real usage data by: time from ingestion to being surfaced inside a scored, labeled theme.

## Product health metrics

| Metric | Definition | Why it matters | Available from |
|---|---|---|---|
| Ingestion-to-theme latency | Time from a feedback item being created to appearing inside a labeled cluster | If this is slow, the product isn't "continuously updated" — it's a batch report | Sprint 2 |
| Clustering coverage | % of feedback items assigned to a labeled theme vs. left as unclustered noise | Low coverage means the clustering pipeline isn't earning trust | Sprint 2 |
| Opportunity score stability | How much a theme's score swings sprint-over-sprint without new evidence | High volatility undermines the "defensible score" value prop | Sprint 2 |
| Ingestion channel mix | Share of feedback arriving via manual entry vs. CSV vs. widget | Signals which ingestion path needs the most UX investment | Sprint 1 |
| Feedback logging friction | Time to log one manual feedback item, start to submit | Directly determines whether CS/support keep using it (Marcus persona) | Sprint 1 |

## Adoption metrics

| Metric | Definition | Why it matters |
|---|---|---|
| Orgs with ≥1 completed CSV import | Proxy for "got past onboarding into real usage" | Signals whether onboarding friction is a blocker |
| Weekly active PM-role users | Users with the PM role who view the opportunity/theme views weekly | The core persona has to return regularly for the "continuously updated" pitch to hold |
| Executive summary views per month | How often the Sprint 3 executive view is opened | Validates whether the top-of-funnel exec use case is real or aspirational |

## Business-facing metrics (post-Sprint 3 / GTM-stage)

Deferred until [GTM_STRATEGY.md](./GTM_STRATEGY.md) and [PRICING_STRATEGY.md](./PRICING_STRATEGY.md) are active — tracked here as placeholders so the framework doesn't need restructuring later:

- Conversion from free usage to paid tier (once pricing exists)
- Net revenue retention (once there are paying accounts)
- Churn correlated with unaddressed high-score themes

## How this framework is used

Each sprint's [EXECUTIVE_SUMMARY.md](./EXECUTIVE_SUMMARY.md) update reports against whichever of these metrics are live at the time, rather than restating the full framework. Metrics move from "Available from: Sprint N" to actually tracked once the underlying feature ships.
