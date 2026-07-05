# Opportunity Framework

Status: Sprint 2 draft.

## What makes a "theme" an "opportunity"

A theme is a cluster of feedback items that are, semantically, about the same underlying issue or request — "the export button breaks on Safari" and "can't get my data out of the app on Mac" cluster together even though they share almost no words in common, because they're the same customer problem said two different ways. A theme becomes an *opportunity* the moment it's scored: given a number that says how much it matters relative to every other theme, so a PM can rank them instead of reading all of them.

The whole point of this framework is to replace "whoever complained most recently or most loudly wins the roadmap debate" with something reconstructable and arguable. Every score has to trace back to real feedback — no opportunity score exists without a visible set of underlying items a PM (or a skeptical exec) can click into and read.

## The three inputs

**Volume (how many people, not how many messages).** A theme mentioned by 40 distinct customers matters more than one mentioned 40 times by the same customer. Where a `customer_id` is known, volume counts distinct customers first and total mentions second; where it isn't (anonymous widget submissions with no email), it falls back to item count. This is why linking feedback to a customer, even loosely, matters beyond just record-keeping — it's a direct input to prioritization, not a nice-to-have.

**Sentiment (how negative, and how consistent).** A theme that's uniformly frustrated is a clearer signal than one with mixed sentiment — the latter might be two different things wearing one cluster label, or a genuinely divisive feature. Sentiment here comes from per-item classification (see `ARCHITECTURE.md`'s pipeline section), aggregated per theme as both an average and a measure of how much individual items agree with each other.

**Impact (the business-consequence proxy).** At this stage, without real revenue or account data flowing into VoiceIQ, impact is a manual, editable field a PM sets per theme (e.g., "this affects our enterprise tier" vs. "this is a nice-to-have from free users") rather than something inferred from feedback text alone. Treating this as a deliberate placeholder rather than pretending to infer it from sentiment alone is the honest position — see `ROADMAP.md`'s V2 section for what a real revenue-linked version would need (CRM/ARR import per customer).

## How they combine

Volume and sentiment are computed automatically the moment enough feedback exists in a theme; impact starts at a neutral default and is a PM's call to adjust. The concrete formula that turns these three (plus effort, and confidence) into one orderable number is [RICE_PRIORITIZATION.md](./RICE_PRIORITIZATION.md) — this document is the *why*, that one is the *how*.

## Why this is worth doing at all

The alternative — a PM manually reading a growing pile of tickets and reviews and forming a gut sense of "what's coming up a lot lately" — doesn't scale past a small volume of feedback, and it's not falsifiable: nobody can check the PM's gut against the actual data without redoing the reading themselves. A visible, recomputable score that anyone can trace back to the underlying feedback items is falsifiable by construction — if the score looks wrong, the fix is either "the clustering put unrelated items together" (a data-quality bug) or "the weights are wrong for this org" (a tuning problem), not "trust me." Both are things a PM can act on; "trust my gut" isn't.
