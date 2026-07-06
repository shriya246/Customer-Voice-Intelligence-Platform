"use client";

import Link from "next/link";
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { ThemeTrend } from "@/lib/trends";
import { Card } from "@/components/ui/card";
import { TrendBadge } from "@/components/ui/badge";

function formatWeek(weekStart: string): string {
  return new Date(weekStart).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function ThemeTrendCard({
  themeId,
  name,
  trend,
}: {
  themeId: string;
  name: string | null;
  trend: ThemeTrend;
}) {
  const chartData = trend.weeks.map((w) => ({ week: formatWeek(w.weekStart), count: w.count }));

  return (
    <Card interactive className="p-4">
      <div className="flex items-center justify-between">
        <Link
          href={`/dashboard?theme=${themeId}`}
          className="font-medium text-foreground transition-colors hover:text-primary"
        >
          {name ?? <span className="italic text-muted-foreground">Unlabeled theme</span>}
        </Link>
        <TrendBadge direction={trend.direction} />
      </div>
      <p className="mt-1 text-xs text-muted-foreground">
        {trend.recentTotal} in the last 2 weeks, {trend.priorTotal} the 2 weeks before
        {trend.percentChange !== null && ` (${trend.percentChange > 0 ? "+" : ""}${trend.percentChange}%)`}
      </p>
      <div className="mt-3 h-32">
        {chartData.length === 0 ? (
          <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
            No feedback in the last 8 weeks
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
              <XAxis
                dataKey="week"
                tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }}
                axisLine={{ stroke: "var(--color-border-strong)" }}
                tickLine={false}
              />
              <YAxis
                allowDecimals={false}
                tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }}
                axisLine={false}
                tickLine={false}
                width={28}
              />
              <Tooltip
                cursor={{ fill: "var(--color-muted)" }}
                contentStyle={{
                  fontSize: 12,
                  borderRadius: 8,
                  border: "1px solid var(--color-border)",
                  background: "var(--color-surface)",
                  color: "var(--color-foreground)",
                }}
              />
              <Bar dataKey="count" fill="var(--color-primary)" radius={[4, 4, 0, 0]} maxBarSize={24} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </Card>
  );
}
