# Go-to-Market Strategy

Status: Sprint 3 draft — precedes any real launch activity. No paid acquisition, no sales motion; this is the plan for how VoiceIQ would find its first real users once the product itself is ready, not a record of things already done.

## Beachhead segment

Not "product teams" broadly — that's Productboard's and Pendo's fight to win, and neither VoiceIQ nor a single early team can out-integrate them. The wedge is narrower: **a single PM or a 2-4 person product team at an early- to growth-stage B2B SaaS company who is currently prioritizing off gut feel and whichever ticket they remember most vividly**, and who would be priced out of or overkill-served by Enterpret/Productboard's enterprise motion (see [COMPETITIVE_ANALYSIS.md](./COMPETITIVE_ANALYSIS.md)). This matches the Priya Nair persona in [PERSONAS.md](./PERSONAS.md) almost exactly — she's the buyer and the user in the same person, which shortens the sales cycle to zero because there isn't one yet.

## Positioning statement

For product teams who are tired of prioritizing by whoever complained loudest, VoiceIQ is a customer-voice intelligence platform that turns scattered feedback into a continuously updated, evidence-scored opportunity map — unlike Productboard or Pendo, feedback analysis is the core loop, not a bolted-on module; unlike Enterpret, it's built for a team of one to adopt without a procurement cycle.

## Go-to-market motion: product-led, self-serve, no sales team

There is no sales motion at this stage — the product has to sell itself in the first ten minutes: sign up, create an org, import a CSV of real support tickets, watch them cluster into scored themes. That "aha" moment (raw tickets becoming a ranked, evidenced opportunity list) is the entire pitch, so early GTM effort goes into making that first-CSV-import moment as fast and convincing as possible, not into outbound.

**Built-in distribution loop:** the embeddable feedback widget is not just an ingestion feature — every org that installs it puts a small "powered by VoiceIQ"-style footprint in front of their own customers, the same mechanic Canny and Typeform used to grow via their embed surface. Worth revisiting once there's a live org to test it with; not yet a committed tactic, just a structural advantage worth not accidentally designing away.

## Channels & tactics (first 90 days post-launch)

- **Direct outreach to early-stage PM communities** — Mind the Product, Product-Led Alliance, r/ProductManagement, and PM-focused Slack/Discord groups, where "how do you actually prioritize feedback" is a recurring, unanswered thread rather than a solved problem.
- **Build-in-public content** — the sprint-by-sprint build story itself (this repo's own commit history and README) is GTM content for an audience of PMs who evaluate tools partly by how much they trust the builder's judgment.
- **Comparison-intent SEO/content** — "Enterpret alternative," "Canny vs Productboard for feedback analysis"-style pages, aimed at the exact buyer already frustrated with the gaps named in [COMPETITIVE_ANALYSIS.md](./COMPETITIVE_ANALYSIS.md).
- **A single, aggressively simple onboarding path** — CSV import as the front door (every team already has a spreadsheet or export of tickets somewhere), not an integrations checklist that stalls activation before the first "aha" moment.

## Launch sequence

1. **Private beta** — a handful of hand-picked early-stage teams (sourced from the communities above), free, in exchange for direct feedback on the clustering/scoring quality itself — the same evidence-based-prioritization pitch VoiceIQ makes to its own customers gets applied to prioritizing VoiceIQ's own roadmap.
2. **Public self-serve launch** — sign-up open to anyone, free tier live (see [PRICING_STRATEGY.md](./PRICING_STRATEGY.md)), announced through the build-in-public channel and the PM communities already engaged during beta.
3. **First paid conversions** — once usage data exists to know which free-tier ceiling actually gets hit first (seats, feedback volume, or AI-processing volume), not guessed at upfront.

## How this connects to the rest of the plan

GTM only matters if the product underneath it holds up under real usage — [KPI_FRAMEWORK.md](./KPI_FRAMEWORK.md)'s adoption metrics (CSV-import completion, weekly-active PM usage, executive-summary views) are the leading indicators that beta users are actually getting the "aha" moment described above, not just signing up and leaving.

## Biggest risk

The beachhead segment (lean/early-stage PM teams) is also the segment with the least budget and the most tool fatigue — free-tier generosity has to be real (see the zero-dollar constraint in [ARCHITECTURE.md](./ARCHITECTURE.md)'s free-tier ceilings section) or the self-serve motion never gets past a first login.
