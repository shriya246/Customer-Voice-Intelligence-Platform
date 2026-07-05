import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getCurrentMembership } from "@/lib/org";
import { getThemeTrend } from "@/lib/trends";
import { ThemeTrendCard } from "./theme-trend-card";

export const metadata: Metadata = { title: "Trends — VoiceIQ Enterprise" };

export default async function TrendsPage() {
  const membership = await getCurrentMembership();
  if (!membership) return null;

  const supabase = await createClient();
  const { data: themes } = await supabase
    .from("themes")
    .select("id, name")
    .eq("org_id", membership.orgId);

  const withTrends = await Promise.all(
    (themes ?? []).map(async (theme) => ({
      theme,
      trend: await getThemeTrend(supabase, theme.id),
    }))
  );

  // Rising themes first (the ones that most need attention), then by recent volume.
  const directionRank = { rising: 0, flat: 1, falling: 2 };
  withTrends.sort((a, b) => {
    const rankDiff = directionRank[a.trend.direction] - directionRank[b.trend.direction];
    if (rankDiff !== 0) return rankDiff;
    return b.trend.recentTotal - a.trend.recentTotal;
  });

  return (
    <div>
      <Link href="/dashboard" className="text-sm text-gray-500 hover:underline">
        ← Dashboard
      </Link>
      <h1 className="mt-2 mb-2 text-2xl font-semibold">Trends</h1>
      <p className="mb-6 text-sm text-gray-500">
        Weekly feedback volume per theme, last 8 weeks. Rising themes surface first.
      </p>

      {withTrends.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-300 p-8 text-center text-sm text-gray-500 dark:border-neutral-700">
          No themes yet — feedback gets clustered into themes automatically as it&apos;s processed.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {withTrends.map(({ theme, trend }) => (
            <ThemeTrendCard
              key={theme.id}
              themeId={theme.id}
              name={theme.name as string | null}
              trend={trend}
            />
          ))}
        </div>
      )}
    </div>
  );
}
