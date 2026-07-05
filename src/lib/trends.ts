import type { SupabaseClient } from "@supabase/supabase-js";

export type WeeklyPoint = { weekStart: string; count: number };

export type ThemeTrend = {
  weeks: WeeklyPoint[];
  recentTotal: number; // last 2 weeks
  priorTotal: number; // the 2 weeks before that
  direction: "rising" | "falling" | "flat";
  percentChange: number | null; // null when priorTotal is 0 (no baseline to compare against)
};

const WEEKS_TO_FETCH = 8;
const COMPARISON_WINDOW_WEEKS = 2;
const FLAT_THRESHOLD_PERCENT = 10; // within +/-10% counts as "flat", not noise-chasing

export async function getThemeTrend(
  supabase: SupabaseClient,
  themeId: string
): Promise<ThemeTrend> {
  const { data, error } = await supabase.rpc("get_theme_trend", {
    p_theme_id: themeId,
    p_weeks: WEEKS_TO_FETCH,
  });
  if (error) throw new Error(`get_theme_trend failed: ${error.message}`);

  const rows = (data ?? []) as { week_start: string; item_count: number }[];
  const weeks: WeeklyPoint[] = rows.map((r) => ({
    weekStart: r.week_start,
    count: r.item_count,
  }));

  const recentTotal = sumInWeekRange(weeks, 0, COMPARISON_WINDOW_WEEKS);
  const priorTotal = sumInWeekRange(weeks, COMPARISON_WINDOW_WEEKS, COMPARISON_WINDOW_WEEKS * 2);

  let direction: ThemeTrend["direction"] = "flat";
  let percentChange: number | null = null;

  if (priorTotal === 0) {
    direction = recentTotal > 0 ? "rising" : "flat";
  } else {
    percentChange = Math.round(((recentTotal - priorTotal) / priorTotal) * 100);
    if (percentChange > FLAT_THRESHOLD_PERCENT) direction = "rising";
    else if (percentChange < -FLAT_THRESHOLD_PERCENT) direction = "falling";
    else direction = "flat";
  }

  return { weeks, recentTotal, priorTotal, direction, percentChange };
}

const MS_PER_WEEK = 7 * 24 * 60 * 60 * 1000;

/**
 * Sums counts for weeks whose start date falls within
 * [now - weeksAgoEnd, now - weeksAgoStart). Filters by actual date rather
 * than array position -- get_theme_trend only returns weeks that have at
 * least one item (a GROUP BY omits empty weeks), so the weeks array is
 * sparse. Treating "the last 2 array elements" as "the last 2 calendar
 * weeks" breaks as soon as a theme has any week with zero feedback, which
 * shifts the comparison window without actually comparing the intended
 * date ranges -- confirmed this was a real bug, not a hypothetical one, by
 * testing with intentionally gappy data before relying on this function.
 */
function sumInWeekRange(weeks: WeeklyPoint[], weeksAgoStart: number, weeksAgoEnd: number): number {
  const now = Date.now();
  const rangeStart = now - weeksAgoEnd * MS_PER_WEEK;
  const rangeEnd = now - weeksAgoStart * MS_PER_WEEK;

  return weeks
    .filter((w) => {
      const t = new Date(w.weekStart).getTime();
      return t >= rangeStart && t < rangeEnd;
    })
    .reduce((sum, w) => sum + w.count, 0);
}
