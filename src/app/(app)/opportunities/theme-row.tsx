"use client";

import { useRef } from "react";
import Link from "next/link";
import { updateThemeScoring } from "./actions";
import type { OpportunityScore } from "@/lib/scoring";

export function ThemeRow({
  themeId,
  name,
  summary,
  itemCount,
  score,
  canEdit,
}: {
  themeId: string;
  name: string | null;
  summary: string | null;
  itemCount: number;
  score: OpportunityScore;
  canEdit: boolean;
}) {
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <div className="rounded-lg border border-gray-200 p-4 dark:border-neutral-800">
      <div className="flex items-start justify-between gap-4">
        <div>
          <Link href={`/dashboard?theme=${themeId}`} className="font-medium hover:underline">
            {name ?? <span className="text-gray-400 italic">Unlabeled theme</span>}
          </Link>
          {summary && <p className="mt-1 text-sm text-gray-500">{summary}</p>}
          <p className="mt-1 text-xs text-gray-400">{itemCount} feedback item{itemCount === 1 ? "" : "s"}</p>
        </div>
        <div className="shrink-0 text-right">
          <div className="text-2xl font-semibold">{score.opportunityScore}</div>
          <div className="text-xs text-gray-400">opportunity score</div>
        </div>
      </div>

      <form
        ref={formRef}
        action={updateThemeScoring}
        className="mt-3 grid grid-cols-4 gap-3 text-sm"
      >
        <input type="hidden" name="themeId" value={themeId} />
        <div>
          <div className="text-xs text-gray-500">Reach</div>
          <div className="mt-1">{score.reach}</div>
        </div>
        <div>
          <label className="text-xs text-gray-500" htmlFor={`impact-${themeId}`}>
            Impact {score.impact === score.suggestedImpact && "(suggested)"}
          </label>
          <input
            id={`impact-${themeId}`}
            name="impactOverride"
            type="number"
            step="0.25"
            min="0.25"
            max="3"
            defaultValue={score.impact}
            disabled={!canEdit}
            onBlur={() => formRef.current?.requestSubmit()}
            className="mt-1 w-full rounded-md border border-gray-300 px-2 py-1 disabled:opacity-60 dark:border-neutral-700 dark:bg-neutral-800"
          />
        </div>
        <div>
          <label className="text-xs text-gray-500" htmlFor={`confidence-${themeId}`}>
            Confidence {score.confidence === score.suggestedConfidence && "(suggested)"}
          </label>
          <input
            id={`confidence-${themeId}`}
            name="confidenceOverride"
            type="number"
            step="0.05"
            min="0"
            max="1"
            defaultValue={score.confidence}
            disabled={!canEdit}
            onBlur={() => formRef.current?.requestSubmit()}
            className="mt-1 w-full rounded-md border border-gray-300 px-2 py-1 disabled:opacity-60 dark:border-neutral-700 dark:bg-neutral-800"
          />
        </div>
        <div>
          <label className="text-xs text-gray-500" htmlFor={`effort-${themeId}`}>
            Effort
          </label>
          <input
            id={`effort-${themeId}`}
            name="effort"
            type="number"
            step="0.5"
            min="0.5"
            defaultValue={score.effort}
            disabled={!canEdit}
            onBlur={() => formRef.current?.requestSubmit()}
            className="mt-1 w-full rounded-md border border-gray-300 px-2 py-1 disabled:opacity-60 dark:border-neutral-700 dark:bg-neutral-800"
          />
        </div>
      </form>
    </div>
  );
}
