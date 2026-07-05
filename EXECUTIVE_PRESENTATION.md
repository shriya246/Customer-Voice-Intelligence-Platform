# VoiceIQ Enterprise — Executive Presentation

*One page. The version you hand someone before they've read anything else.*

---

## The problem

Customer feedback lives everywhere — support tickets, reviews, sales call notes, surveys, a public widget if you're lucky enough to have one — and almost nowhere is it aggregated into something a product team can act on with confidence. The default substitute is memory: whoever complained most recently or most vividly tends to win the roadmap debate, not whoever represents the most customers or the highest business risk.

## What VoiceIQ does

Turns that scattered feedback into a continuously updated, evidence-scored opportunity map:

**Feedback in** (manual entry, CSV import, or an embeddable widget) → **clustered** into themes by semantic similarity, not keyword matching → **scored** by a RICE-based formula (Reach × Impact × Confidence ÷ Effort) that's always traceable back to the real feedback behind it and always overridable by a PM who knows something the data doesn't → **synthesized** into data-backed personas and a roadmap tracker → **narrated** into an executive-ready summary of what customers are asking for and why it matters.

## Why now, why this wedge

The market splits into roadmap tools with feedback bolted on (Productboard, Pendo Feedback), feedback-analytics tools priced for enterprise procurement (Enterpret), and public voting boards that only capture explicit requests (Canny). VoiceIQ's wedge: **the full feedback-to-opportunity loop, evidence-based and automatic, without enterprise pricing or a roadmap-tool-first design** — built for the single PM or small team currently priced out of or underserved by all three (full detail: [COMPETITIVE_ANALYSIS.md](./COMPETITIVE_ANALYSIS.md)).

## Where the product stands today

The full loop is built and demoable end to end, not just scaffolded: multi-tenant auth/RBAC, three ingestion paths, automatic embedding/clustering/sentiment, RICE-based scoring, trend detection, AI-generated personas, a roadmap tracker, competitive insight notes, and an auto-drafted executive narrative — all running on Row-Level-Security-enforced multi-tenancy, audited, rate-limited, structured-error-logged, and covered by a CI-gated unit-test suite. Built entirely on free-tier infrastructure (Supabase, Vercel, Groq, Hugging Face, Upstash) — the cost floor to run this for an early customer is close to zero, which is deliberate: see [PRICING_STRATEGY.md](./PRICING_STRATEGY.md) for why that matters to the go-to-market motion, not just the budget.

## Business model

Free tier generous enough to cover a real single-PM or small-team workload (not a disguised trial), gated on feedback volume rather than seats or features — every capability, including the AI pipeline, ships free. Paid tiers scale with volume once real usage data exists to price against, not guessed at upfront. Full detail: [PRICING_STRATEGY.md](./PRICING_STRATEGY.md).

## What's next

Connect the remaining external service accounts (Vercel, Upstash, Groq, Hugging Face — deliberately deferred until the architecture around them was fully built and verified), confirm the AI pipeline against real model output for the first time, then a private beta with a small number of early-stage PM teams before a public self-serve launch. Full sequencing: [GTM_STRATEGY.md](./GTM_STRATEGY.md).

---

*For full detail: [PRD.md](./PRD.md) (product scope), [ARCHITECTURE.md](./ARCHITECTURE.md) (technical design), [ROADMAP.md](./ROADMAP.md) (MVP → V1 → V2), [EXECUTIVE_SUMMARY.md](./EXECUTIVE_SUMMARY.md) (sprint-by-sprint status).*
