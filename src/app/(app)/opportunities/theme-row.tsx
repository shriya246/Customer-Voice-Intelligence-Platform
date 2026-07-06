"use client";

import { useRef } from "react";
import Link from "next/link";
import { updateThemeScoring } from "./actions";
import { addThemeToRoadmap } from "../roadmap/actions";
import type { OpportunityScore } from "@/lib/scoring";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

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
    <Card interactive className="p-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <Link
            href={`/dashboard?theme=${themeId}`}
            className="font-medium text-foreground transition-colors hover:text-primary"
          >
            {name ?? <span className="italic text-muted-foreground">Unlabeled theme</span>}
          </Link>
          {summary && <p className="mt-1 text-sm text-muted-foreground">{summary}</p>}
          <p className="mt-1 text-xs text-muted-foreground/80">
            {itemCount} feedback item{itemCount === 1 ? "" : "s"}
          </p>
        </div>
        <div className="shrink-0 text-right">
          <div className="text-2xl font-semibold tabular-nums text-primary">{score.opportunityScore}</div>
          <div className="text-xs text-muted-foreground">opportunity score</div>
          {canEdit && (
            <form action={addThemeToRoadmap} className="mt-2">
              <input type="hidden" name="themeId" value={themeId} />
              <input type="hidden" name="title" value={name ?? "Unlabeled theme"} />
              <Button type="submit" variant="secondary" size="sm">
                Add to roadmap
              </Button>
            </form>
          )}
        </div>
      </div>

      <form ref={formRef} action={updateThemeScoring} className="mt-4 grid grid-cols-4 gap-3 text-sm">
        <input type="hidden" name="themeId" value={themeId} />
        <div>
          <div className="text-xs font-medium text-muted-foreground">Reach</div>
          <div className="mt-1.5 text-sm font-medium text-foreground">{score.reach}</div>
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground" htmlFor={`impact-${themeId}`}>
            Impact {score.impact === score.suggestedImpact && "(suggested)"}
          </label>
          <Input
            id={`impact-${themeId}`}
            name="impactOverride"
            type="number"
            step="0.25"
            min="0.25"
            max="3"
            defaultValue={score.impact}
            disabled={!canEdit}
            onBlur={() => formRef.current?.requestSubmit()}
            className="mt-1 py-1"
          />
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground" htmlFor={`confidence-${themeId}`}>
            Confidence {score.confidence === score.suggestedConfidence && "(suggested)"}
          </label>
          <Input
            id={`confidence-${themeId}`}
            name="confidenceOverride"
            type="number"
            step="0.05"
            min="0"
            max="1"
            defaultValue={score.confidence}
            disabled={!canEdit}
            onBlur={() => formRef.current?.requestSubmit()}
            className="mt-1 py-1"
          />
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground" htmlFor={`effort-${themeId}`}>
            Effort
          </label>
          <Input
            id={`effort-${themeId}`}
            name="effort"
            type="number"
            step="0.5"
            min="0.5"
            defaultValue={score.effort}
            disabled={!canEdit}
            onBlur={() => formRef.current?.requestSubmit()}
            className="mt-1 py-1"
          />
        </div>
      </form>
    </Card>
  );
}
