import { describe, expect, it } from "vitest";
import { computeOpportunityScore } from "./scoring";

describe("computeOpportunityScore", () => {
  it("suggests higher impact for more negative average sentiment", () => {
    const veryNegative = computeOpportunityScore(
      { itemCount: 10, reach: 10, avgSentiment: -0.8, sentimentStddev: 0 },
      { impactOverride: null, confidenceOverride: null, effort: 1 }
    );
    const positive = computeOpportunityScore(
      { itemCount: 10, reach: 10, avgSentiment: 0.8, sentimentStddev: 0 },
      { impactOverride: null, confidenceOverride: null, effort: 1 }
    );
    expect(veryNegative.suggestedImpact).toBeGreaterThan(positive.suggestedImpact);
  });

  it("defaults suggested impact to medium (1) with no sentiment data", () => {
    const result = computeOpportunityScore(
      { itemCount: 5, reach: 5, avgSentiment: null, sentimentStddev: null },
      { impactOverride: null, confidenceOverride: null, effort: 1 }
    );
    expect(result.suggestedImpact).toBe(1);
  });

  it("lets an explicit override replace the suggested impact/confidence", () => {
    const result = computeOpportunityScore(
      { itemCount: 1, reach: 1, avgSentiment: 0.9, sentimentStddev: null },
      { impactOverride: 3, confidenceOverride: 1, effort: 1 }
    );
    expect(result.impact).toBe(3);
    expect(result.confidence).toBe(1);
    expect(result.suggestedImpact).not.toBe(3); // suggestion is preserved separately from the override
  });

  it("computes reach * impact * confidence / effort", () => {
    const result = computeOpportunityScore(
      { itemCount: 20, reach: 10, avgSentiment: -0.6, sentimentStddev: 0 },
      { impactOverride: null, confidenceOverride: null, effort: 2 }
    );
    expect(result.opportunityScore).toBe(
      Math.round(((result.reach * result.impact * result.confidence) / result.effort) * 100) / 100
    );
  });

  it("treats a zero or negative effort override as 1 rather than dividing by zero", () => {
    const result = computeOpportunityScore(
      { itemCount: 5, reach: 5, avgSentiment: null, sentimentStddev: null },
      { impactOverride: 1, confidenceOverride: 1, effort: 0 }
    );
    expect(result.effort).toBe(1);
    expect(Number.isFinite(result.opportunityScore)).toBe(true);
  });

  it("increases confidence with item count and decreases it with sentiment inconsistency", () => {
    const lowVolume = computeOpportunityScore(
      { itemCount: 2, reach: 2, avgSentiment: 0, sentimentStddev: 0 },
      { impactOverride: null, confidenceOverride: null, effort: 1 }
    );
    const highVolume = computeOpportunityScore(
      { itemCount: 40, reach: 40, avgSentiment: 0, sentimentStddev: 0 },
      { impactOverride: null, confidenceOverride: null, effort: 1 }
    );
    expect(highVolume.suggestedConfidence).toBeGreaterThan(lowVolume.suggestedConfidence);

    const inconsistent = computeOpportunityScore(
      { itemCount: 40, reach: 40, avgSentiment: 0, sentimentStddev: 0.9 },
      { impactOverride: null, confidenceOverride: null, effort: 1 }
    );
    expect(inconsistent.suggestedConfidence).toBeLessThan(highVolume.suggestedConfidence);
  });

  it("never returns a negative confidence even with an extreme stddev", () => {
    const result = computeOpportunityScore(
      { itemCount: 1, reach: 1, avgSentiment: 0, sentimentStddev: 5 },
      { impactOverride: null, confidenceOverride: null, effort: 1 }
    );
    expect(result.suggestedConfidence).toBeGreaterThanOrEqual(0);
  });
});
