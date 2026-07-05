"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentMembership } from "@/lib/org";
import { computeOpportunityScore, getThemeStats } from "@/lib/scoring";
import { getThemeTrend } from "@/lib/trends";
import { generateExecutiveSummary } from "@/lib/groq";
import { logError } from "@/lib/log-error";

const TOP_THEMES_COUNT = 5;

export type GenerateSummaryState = { error: string } | { content: string } | undefined;

/**
 * Every number handed to Groq is already computed deterministically here
 * (same scoring/trend logic the rest of the app uses) -- the model's job
 * is narration and framing, not re-deriving figures it could get wrong.
 */
export async function generateSummary(): Promise<GenerateSummaryState> {
  const membership = await getCurrentMembership();
  if (!membership) throw new Error("Not authenticated");
  if (membership.role === "viewer") return { error: "Viewers can't generate summaries." };

  const supabase = await createClient();

  const now = Date.now();
  const thirtyDaysAgo = new Date(now - 30 * 24 * 60 * 60 * 1000).toISOString();
  const sixtyDaysAgo = new Date(now - 60 * 24 * 60 * 60 * 1000).toISOString();

  const { count: totalFeedbackThisPeriod } = await supabase
    .from("feedback_items")
    .select("*", { count: "exact", head: true })
    .eq("org_id", membership.orgId)
    .gte("created_at", thirtyDaysAgo);

  const { count: totalFeedbackPriorPeriod } = await supabase
    .from("feedback_items")
    .select("*", { count: "exact", head: true })
    .eq("org_id", membership.orgId)
    .gte("created_at", sixtyDaysAgo)
    .lt("created_at", thirtyDaysAgo);

  const { data: themes } = await supabase
    .from("themes")
    .select("id, name, impact_override, confidence_override, effort")
    .eq("org_id", membership.orgId)
    .not("name", "is", null);

  const scoredThemes = await Promise.all(
    (themes ?? []).map(async (theme) => {
      const [stats, trend] = await Promise.all([
        getThemeStats(supabase, theme.id),
        getThemeTrend(supabase, theme.id),
      ]);
      const score = computeOpportunityScore(stats, {
        impactOverride: theme.impact_override as number | null,
        confidenceOverride: theme.confidence_override as number | null,
        effort: theme.effort as number,
      });
      return {
        name: theme.name as string,
        opportunityScore: score.opportunityScore,
        reach: score.reach,
        trend: trend.direction,
      };
    })
  );
  scoredThemes.sort((a, b) => b.opportunityScore - a.opportunityScore);
  const topThemes = scoredThemes.slice(0, TOP_THEMES_COUNT);

  const { count: shippedCount } = await supabase
    .from("roadmap_items")
    .select("*", { count: "exact", head: true })
    .eq("org_id", membership.orgId)
    .eq("status", "shipped");

  const { count: inProgressCount } = await supabase
    .from("roadmap_items")
    .select("*", { count: "exact", head: true })
    .eq("org_id", membership.orgId)
    .eq("status", "in_progress");

  let content: string;
  try {
    content = await generateExecutiveSummary({
      totalFeedbackThisPeriod: totalFeedbackThisPeriod ?? 0,
      totalFeedbackPriorPeriod: totalFeedbackPriorPeriod ?? 0,
      topThemes,
      shippedCount: shippedCount ?? 0,
      inProgressCount: inProgressCount ?? 0,
    });
  } catch (error) {
    logError("executive_summary.generate", error, { orgId: membership.orgId });
    return { error: error instanceof Error ? error.message : "Summary generation failed" };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { error: insertError } = await supabase
    .from("executive_summaries")
    .insert({ org_id: membership.orgId, content, generated_by: user?.id ?? null });
  if (insertError) return { error: insertError.message };

  await supabase.rpc("log_audit_event", {
    p_org_id: membership.orgId,
    p_action: "executive_summary.generated",
  });

  revalidatePath("/executive-summary");
  return { content };
}
