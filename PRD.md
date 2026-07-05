# Product Requirements Document — v1

Status: Draft, Sprint 1. Revisited and expanded every sprint.

## Summary

VoiceIQ Enterprise ingests customer feedback from multiple channels, structures it into themes with sentiment and pain-point extraction, scores those themes by business opportunity, and surfaces the result as a ranked list, a trend view, and an executive narrative. This document covers the full product scope; sections are tagged with the sprint they ship in.

## Goals

- Give a PM a ranked, evidence-backed opportunity list instead of a raw feedback firehose
- Make feedback logging low-friction enough that support/CS teams actually keep doing it
- Make prioritization defensible: every score traces back to real feedback volume, sentiment, and impact
- Stay operable on entirely free-tier infrastructure

## Non-goals (at least through Sprint 3)

- Live integrations with Zendesk, Intercom, Salesforce, etc. (CSV export/import substitutes for this at this stage)
- Multi-language feedback processing
- Native mobile apps
- Billing/payments (this is a portfolio-stage product, not a monetized SaaS yet — see [PRICING_STRATEGY.md](./PRICING_STRATEGY.md) for the eventual model)

## Functional requirements

### [Sprint 1] Multi-tenancy & access
- A user can sign up and is provisioned into a new organization automatically, or joins an existing one via invite.
- Organizations have members with roles (admin, member, viewer) governing what they can see and do.
- Every write action of consequence (org changes, member changes, feedback CRUD) is recorded in an audit log visible to admins.
- All data access is scoped to the user's organization at the database level (Row-Level Security), not just the application layer.

### [Sprint 1] Feedback ingestion
- **Manual entry:** a form to log a single piece of feedback — content, channel, customer (optional), tags.
- **CSV import:** upload a CSV, map its columns to VoiceIQ fields, preview, then bulk-import with per-row error reporting.
- **Public widget:** an embeddable snippet that lets an external page submit feedback into a specific organization/channel through a public, rate-limited API endpoint.
- Every feedback item records its source channel, timestamp, and (if available) linked customer.

### [Sprint 1] Feedback list view
- Table/list of feedback items, filterable by channel, date range, and tag, with pagination.
- This is the "raw firehose" view — the rest of the product exists to make this view unnecessary for day-to-day prioritization.

### [Sprint 2] Clustering & scoring
- Feedback items are embedded and clustered into themes using pgvector similarity.
- Each theme gets an AI-generated label and summary, plus sentiment classification and pain-point extraction on individual items.
- Each theme gets an opportunity score per [RICE_PRIORITIZATION.md](./RICE_PRIORITIZATION.md), combining feedback volume, sentiment intensity, and a (placeholder, manually-editable) revenue-impact input.
- A trend view shows which themes are growing or shrinking over time.

### [Sprint 3] Personas, roadmap, executive layer
- Personas are generated from actual clustered feedback data rather than hypothetical user research.
- Top-scored themes can be pushed into a roadmap view with status (e.g., under review, planned, in progress, shipped).
- A manual field for competitive-insight notes, lightly AI-assisted for summarization of competitor mentions found in feedback.
- An auto-drafted executive summary narrating what customers are asking for and why it matters, refreshed on a cadence.

## Success metrics

Tracked in detail in [KPI_FRAMEWORK.md](./KPI_FRAMEWORK.md). Headline metrics:
- Time from feedback ingested to it appearing in a scored theme
- % of feedback items that end up inside a labeled cluster (vs. unclustered noise)
- PM-reported confidence in the top-ranked opportunity list (qualitative, sprint-over-sprint)

## Open questions

- What does "revenue impact" actually source from once this isn't a placeholder? (Candidate: optional CRM/ARR CSV import per customer.)
- How much manual override should PMs have over automatic cluster labels and scores? (Leaning: full override, with the automatic value always visible as a reference point.)
