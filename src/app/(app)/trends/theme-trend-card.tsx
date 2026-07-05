"use client";

import Link from "next/link";
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { ThemeTrend } from "@/lib/trends";

// Sequential blue -- a single series needs one hue and no legend (dataviz
// skill: "a single series needs no legend box, there is only one color").
const BAR_COLOR = "#2a78d6";

// Rising complaint volume is bad, falling is good -- status color follows
// business meaning, not the naive "up = green" default.
const DIRECTION_STYLES = {
  rising: "bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-300",
  falling: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
  flat: "bg-gray-100 text-gray-600 dark:bg-neutral-800 dark:text-gray-400",
};

const DIRECTION_LABELS = {
  rising: "↑ Rising",
  falling: "↓ Falling",
  flat: "→ Flat",
};

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
    <div className="rounded-lg border border-gray-200 p-4 dark:border-neutral-800">
      <div className="flex items-center justify-between">
        <Link href={`/dashboard?theme=${themeId}`} className="font-medium hover:underline">
          {name ?? <span className="text-gray-400 italic">Unlabeled theme</span>}
        </Link>
        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${DIRECTION_STYLES[trend.direction]}`}>
          {DIRECTION_LABELS[trend.direction]}
          {trend.percentChange !== null && ` ${Math.abs(trend.percentChange)}%`}
        </span>
      </div>
      <p className="mt-1 text-xs text-gray-500">
        {trend.recentTotal} in the last 2 weeks, {trend.priorTotal} the 2 weeks before
      </p>
      <div className="mt-3 h-32">
        {chartData.length === 0 ? (
          <div className="flex h-full items-center justify-center text-xs text-gray-400">
            No feedback in the last 8 weeks
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
              <XAxis
                dataKey="week"
                tick={{ fontSize: 11, fill: "#898781" }}
                axisLine={{ stroke: "#c3c2b7" }}
                tickLine={false}
              />
              <YAxis
                allowDecimals={false}
                tick={{ fontSize: 11, fill: "#898781" }}
                axisLine={false}
                tickLine={false}
                width={28}
              />
              <Tooltip
                cursor={{ fill: "rgba(0,0,0,0.04)" }}
                contentStyle={{ fontSize: 12, borderRadius: 6 }}
              />
              <Bar dataKey="count" fill={BAR_COLOR} radius={[4, 4, 0, 0]} maxBarSize={24} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
