import type { SupabaseClient } from "@supabase/supabase-js";

// Standard RICE categorical scale, not a continuous number, so scores stay
// comparable across themes a PM is eyeballing side by side (RICE_PRIORITIZATION.md).
const IMPACT_SCALE = [0.25, 0.5, 1, 2, 3] as const;

/**
 * More negative average sentiment -> higher suggested impact, in the
 * absence of any other signal. Thresholds are a reasonable starting split
 * of the -1..1 range, not empirically tuned -- there's no real sentiment
 * data yet to tune them against. Defaults to "medium" (1) when there's no
 * sentiment data at all yet, rather than assuming either extreme.
 */
function suggestImpact(avgSentiment: number | null): number {
  if (avgSentiment === null) return 1;
  if (avgSentiment <= -0.6) return 3;
  if (avgSentiment <= -0.3) return 2;
  if (avgSentiment <= 0) return 1;
  if (avgSentiment <= 0.3) return 0.5;
  return 0.25;
}

/**
 * Blends how much data the theme rests on (approaches 1 as item count
 * grows past ~20 -- an arbitrary "feels like enough for a small product"
 * threshold, not a statistically derived one) with a penalty for
 * inconsistent sentiment within the theme (a high stddev suggests the
 * cluster may not really be one coherent issue, so confidence in treating
 * it as one is lower).
 */
function computeConfidence(itemCount: number, sentimentStddev: number | null): number {
  const volumeComponent = Math.min(1, itemCount / 20);
  const consistencyPenalty = sentimentStddev !== null ? Math.min(1, sentimentStddev) * 0.5 : 0;
  return Math.max(0, Math.round((volumeComponent - consistencyPenalty) * 100) / 100);
}

export type ThemeStats = {
  itemCount: number;
  reach: number;
  avgSentiment: number | null;
  sentimentStddev: number | null;
};

export type ThemeOverrides = {
  impactOverride: number | null;
  confidenceOverride: number | null;
  effort: number;
};

export type OpportunityScore = {
  reach: number;
  suggestedImpact: number;
  impact: number;
  suggestedConfidence: number;
  confidence: number;
  effort: number;
  opportunityScore: number;
};

export function computeOpportunityScore(
  stats: ThemeStats,
  overrides: ThemeOverrides
): OpportunityScore {
  const suggestedImpact = suggestImpact(stats.avgSentiment);
  const suggestedConfidence = computeConfidence(stats.itemCount, stats.sentimentStddev);

  const impact = overrides.impactOverride ?? suggestedImpact;
  const confidence = overrides.confidenceOverride ?? suggestedConfidence;
  const effort = overrides.effort > 0 ? overrides.effort : 1;

  const opportunityScore = (stats.reach * impact * confidence) / effort;

  return {
    reach: stats.reach,
    suggestedImpact,
    impact,
    suggestedConfidence,
    confidence,
    effort,
    opportunityScore: Math.round(opportunityScore * 100) / 100,
  };
}

export { IMPACT_SCALE };

export async function getThemeStats(
  supabase: SupabaseClient,
  themeId: string
): Promise<ThemeStats> {
  const { data: rawData, error } = await supabase
    .rpc("get_theme_stats", { p_theme_id: themeId })
    .single();
  if (error) throw new Error(`get_theme_stats failed: ${error.message}`);

  const data = rawData as {
    item_count: number | null;
    reach: number | null;
    avg_sentiment: number | null;
    sentiment_stddev: number | null;
  };

  return {
    itemCount: data.item_count ?? 0,
    reach: data.reach ?? 0,
    avgSentiment: data.avg_sentiment,
    sentimentStddev: data.sentiment_stddev,
  };
}
