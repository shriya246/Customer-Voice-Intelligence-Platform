# Pricing Strategy

Status: Sprint 3 draft — a plan, not a billing implementation. Per [ROADMAP.md](./ROADMAP.md), billing/payments infrastructure is explicitly out of scope until this strategy is validated against real usage data; nothing here is wired to a payment provider yet.

## Philosophy: price against the ceiling the beachhead segment actually hits, not seats

Productboard, Enterprise, and Pendo Feedback all anchor pricing to seats and enterprise contracts — exactly the structure that prices out the lean, early-stage teams [GTM_STRATEGY.md](./GTM_STRATEGY.md) targets first. VoiceIQ's free tier should stay generous on seats (a 2-4 person team is the whole beachhead) and instead gate on the dimension that actually costs something to run at scale: feedback volume processed through the AI pipeline (embedding + clustering + sentiment). That also keeps pricing legible — "how much feedback do you process" is a number a PM already knows, unlike "how many integrations do you need."

## Proposed tiers

| Tier | Price | Seats | Feedback volume | AI-enriched (clustering/sentiment/personas/exec summary) |
|---|---|---|---|---|
| **Free** | $0 | Up to 3 | Up to 500 items/month | Full pipeline, no feature gating — the product has to prove itself before asking for money |
| **Growth** | Usage-based, priced once real infra costs exist (Groq/HF paid tiers, Supabase paid tier) | Up to 10 | Up to 5,000 items/month | Full pipeline, plus priority processing (less queue lag as volume grows) |
| **Team** | Priced per real customer conversations, not guessed upfront | Unlimited | Volume-negotiated | Full pipeline, plus configurable scoring weights (see [ROADMAP.md](./ROADMAP.md) V1) and exportable audit log |

No tier gates a *feature* that exists today — clustering, sentiment, personas, roadmap, and the executive summary all ship in the free tier. The axis that scales with willingness to pay is volume, not capability, because gating the very features that prove the "evidence-based prioritization" pitch would undercut the pitch itself before a prospect ever sees it work.

## Why free tier has to be real, not a trial

The beachhead segment ([GTM_STRATEGY.md](./GTM_STRATEGY.md)) is the most tool-fatigued, budget-constrained segment in the market — a time-limited trial reads as exactly the kind of enterprise-sales-motion friction VoiceIQ is positioned against. The free tier's ceiling (3 seats, 500 items/month) is sized to genuinely cover a single PM or small team's real usage, not to function as a 14-day demo in disguise. This is only sustainable because of the zero-dollar architecture constraint already in place (see [ARCHITECTURE.md](./ARCHITECTURE.md)'s free-tier ceilings) — the free tier's cost floor is close to $0 per org until a paid Supabase/Groq/HF tier is actually needed.

## What's deliberately not decided yet

- **Exact Growth/Team price points** — set once there's a paid Groq/Hugging Face/Supabase tier in place and real per-org cost data to price against, not benchmarked against competitors' list prices in a vacuum.
- **Annual vs. monthly billing, and any discount structure** — irrelevant until there's a billing provider at all.
- **Whether volume overage is hard-capped or soft-capped with an upgrade prompt** — a product decision that should be informed by watching real free-tier usage patterns first (tie-in: [KPI_FRAMEWORK.md](./KPI_FRAMEWORK.md)'s business-facing metrics section is reserved for exactly this once it's live).

## Competitive anchor

Enterpret and Productboard's enterprise pricing is opaque-by-design (talk-to-sales, no public number) — that opacity is itself part of the wedge. A visible, self-serve price list, even a simple one, is a differentiator on its own for a buyer who has already been burned by a multi-week procurement cycle for a tool they wanted to try in an afternoon.
