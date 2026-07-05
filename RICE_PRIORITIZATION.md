# RICE Prioritization

Status: Sprint 2 draft. This is the concrete formula behind [OPPORTUNITY_FRAMEWORK.md](./OPPORTUNITY_FRAMEWORK.md)'s reasoning — read that first for the *why*.

## Formula

```
opportunity_score = (Reach × Impact × Confidence) / Effort
```

Standard RICE (Reach, Impact, Confidence, Effort), with each term defined concretely against VoiceIQ's actual data rather than left as an abstract estimate.

## Reach

**Definition:** distinct customers mentioning this theme in the last 90 days; falls back to item count for a theme where none of its feedback has a linked customer (anonymous widget submissions, for example).

**Why 90 days, not all-time:** an opportunity score should reflect current signal, not a permanent scar from a spike eight months ago. Recomputed on a rolling basis, not fixed at cluster-creation time.

**Auto-computed.** No manual override needed — this is a count of real rows, not a judgment call.

## Impact

**Scale:** 3 (massive) / 2 (high) / 1 (medium) / 0.5 (low) / 0.25 (minimal) — the standard RICE categorical scale, not a continuous number, so it stays comparable across themes a PM is eyeballing side by side.

**Auto-suggested from average sentiment severity** across the theme's feedback items (more negative → higher suggested impact — a theme full of furious feedback is presumed higher-impact than one full of mild suggestions, in the absence of other information). **Always PM-overridable**, and the override persists — VoiceIQ doesn't know which tier of customer is affected or what's actually at stake commercially, and pretending otherwise would be exactly the kind of false precision this framework exists to avoid. The auto-suggested value stays visible next to the override so a PM can see when they've diverged from the data-driven default and why.

## Confidence

**Scale:** 0–1 (i.e., 100% = full confidence in the Reach/Impact estimate).

**Auto-computed** from two things: how much data the theme rests on (a 2-item cluster is a hunch, a 40-item cluster is a pattern), and how much the items agree with each other in sentiment (high variance suggests the clustering may have lumped together things that aren't really the same issue, or that it's a genuinely divisive topic — either way, lower confidence in treating it as one clean opportunity). Concretely: a volume-based component that approaches 1 as item count grows, scaled down by a sentiment-agreement penalty when the theme's sentiment is inconsistent.

**PM-overridable**, same as Impact.

## Effort

**The one input VoiceIQ cannot infer from feedback text at all** — it's an engineering/product estimate (person-weeks), not something present in what a customer said. Defaults to `1` (a neutral placeholder) until a PM sets a real number for a theme they're actually considering scoping. The UI makes clear when a theme's Effort is still the default rather than a real estimate, since dividing by a placeholder produces a score that looks more precise than it is.

## Recomputation

Reach, Impact (suggestion), and Confidence recompute whenever the underlying data changes meaningfully (new feedback lands in the theme, sentiment distribution shifts) — not on a fixed schedule. A PM's manual Impact/Confidence/Effort overrides are sticky and don't get silently recalculated away; they're cleared only if the PM explicitly resets them.

## Open question carried from the PRD

How much should a theme's score visibly change sprint-over-sprint without new evidence? Tracked as a KPI (`KPI_FRAMEWORK.md`'s "opportunity score stability" metric) — if scores swing wildly without new feedback, that's a sign the confidence/impact defaults need retuning, not that the underlying product problem changed.
