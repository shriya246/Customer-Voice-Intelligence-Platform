import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getCurrentMembership } from "@/lib/org";
import { computeOpportunityScore, getThemeStats } from "@/lib/scoring";
import { ThemeRow } from "./theme-row";

export const metadata: Metadata = { title: "Opportunities — VoiceIQ Enterprise" };

export default async function OpportunitiesPage() {
  const membership = await getCurrentMembership();
  if (!membership) return null;

  const supabase = await createClient();
  const { data: themes } = await supabase
    .from("themes")
    .select("id, name, summary, item_count, impact_override, confidence_override, effort")
    .eq("org_id", membership.orgId);

  const scored = await Promise.all(
    (themes ?? []).map(async (theme) => {
      const stats = await getThemeStats(supabase, theme.id);
      const score = computeOpportunityScore(stats, {
        impactOverride: theme.impact_override as number | null,
        confidenceOverride: theme.confidence_override as number | null,
        effort: theme.effort as number,
      });
      return { theme, score };
    })
  );

  scored.sort((a, b) => b.score.opportunityScore - a.score.opportunityScore);

  return (
    <div>
      <Link href="/dashboard" className="text-sm text-gray-500 hover:underline">
        ← Dashboard
      </Link>
      <h1 className="mt-2 mb-2 text-2xl font-semibold">Opportunities</h1>
      <p className="mb-6 text-sm text-gray-500">
        Themes ranked by opportunity score — Reach × Impact × Confidence ÷ Effort. See{" "}
        <span className="italic">OPPORTUNITY_FRAMEWORK.md</span> and{" "}
        <span className="italic">RICE_PRIORITIZATION.md</span> for how these are computed.
      </p>

      {scored.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-300 p-8 text-center text-sm text-gray-500 dark:border-neutral-700">
          No themes yet — feedback gets clustered into themes automatically as it&apos;s processed.
        </div>
      ) : (
        <div className="space-y-3">
          {scored.map(({ theme, score }) => (
            <ThemeRow
              key={theme.id}
              themeId={theme.id}
              name={theme.name as string | null}
              summary={theme.summary as string | null}
              itemCount={theme.item_count as number}
              score={score}
              canEdit={membership.role !== "viewer"}
            />
          ))}
        </div>
      )}
    </div>
  );
}
