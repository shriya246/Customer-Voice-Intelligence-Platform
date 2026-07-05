# Competitive Analysis

Status: Sprint 1 draft, revisited as the product develops.

## Landscape summary

The customer-feedback-intelligence space splits roughly into two camps: roadmap/feedback-board tools that started from "collect feature requests" (Canny, Pendo Feedback / formerly Receptive), and AI-native feedback-analytics tools that started from "make sense of feedback at scale" (Enterpret, Productboard's newer AI features). VoiceIQ sits in the second camp: the entry point is analysis and prioritization, not a public voting board.

## Head-to-head

### Productboard
- **Strengths:** Mature roadmapping and prioritization workflows, strong integrations ecosystem, established in mid-market/enterprise PM orgs.
- **Gaps VoiceIQ targets:** Feedback insight features feel bolted onto a roadmapping tool rather than being the core loop. Pricing and seat structure are built for larger teams, not a lean or early-stage PM function.
- **VoiceIQ's angle:** Lead with clustering and scoring as the primary workflow, not a secondary module on top of a roadmap board.

### Enterpret
- **Strengths:** Purpose-built for feedback analytics at scale, strong theming/clustering, enterprise-grade integrations.
- **Gaps VoiceIQ targets:** Enterprise pricing and implementation weight puts it out of reach for smaller teams or single-PM functions who still have the same fragmentation problem at a smaller scale.
- **VoiceIQ's angle:** Same core idea (cluster and score feedback automatically) at a scale and cost that a single PM or small team can adopt without a procurement cycle.

### Canny
- **Strengths:** Excellent public feedback board / feature-voting UX, easy for customers to submit and upvote requests directly.
- **Gaps VoiceIQ targets:** Optimized for explicit feature requests customers choose to voice publicly — it doesn't ingest or make sense of the much larger volume of feedback embedded in support tickets, reviews, and call notes where most signal actually lives, and voting != evidence of impact.
- **VoiceIQ's angle:** Treat every channel (not just a public board) as a feedback source, and score by evidence rather than vote count.

### Pendo Feedback
- **Strengths:** Deep integration with Pendo's broader product-analytics suite; feedback sits next to usage data.
- **Gaps VoiceIQ targets:** Feedback intelligence is a module within a much larger (and expensive) product suite; teams that just need feedback-to-opportunity mapping are paying for and navigating a lot of adjacent surface area.
- **VoiceIQ's angle:** A focused tool that does one loop — feedback in, opportunity out — extremely well, rather than a suite.

## Positioning summary

VoiceIQ's wedge is: **the full feedback-to-opportunity loop, evidence-based and automatic, without enterprise pricing or a roadmap-tool-first design.** As the product matures, the biggest competitive risk is Enterpret and Productboard moving further downmarket — the defensibility has to come from being genuinely easier to adopt (free/self-serve to start) and from the quality of clustering and scoring, not from feature-count parity.

## What VoiceIQ deliberately does not try to match (yet)

- Native integrations with every helpdesk/CRM (see [PRD.md](./PRD.md) non-goals) — CSV import covers this at current scale.
- Public-facing feature voting boards (Canny's core feature) — VoiceIQ's audience is internal (PM/CS/exec), not end customers browsing a roadmap.
