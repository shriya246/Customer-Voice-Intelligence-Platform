"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { summarizeCompetitor } from "./actions";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FieldError } from "@/components/ui/input";

export function NoteCard({
  noteId,
  competitorName,
  note,
  aiSummary,
  canEdit,
}: {
  noteId: string;
  competitorName: string;
  note: string;
  aiSummary: string | null;
  canEdit: boolean;
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  return (
    <Card interactive className="p-4">
      <p className="font-medium text-foreground">{competitorName}</p>
      <p className="mt-1 text-sm text-muted-foreground">{note}</p>

      {aiSummary && (
        <div className="mt-3 animate-fade-in rounded-lg bg-primary-soft p-3 text-sm">
          <p className="text-xs font-medium text-primary-soft-foreground/80">
            What customers actually say (AI-summarized from feedback mentions)
          </p>
          <p className="mt-1 text-primary-soft-foreground">{aiSummary}</p>
        </div>
      )}

      {canEdit && (
        <div className="mt-3">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            loading={isPending}
            onClick={() =>
              startTransition(async () => {
                setError(null);
                const result = await summarizeCompetitor(noteId);
                if (result && "error" in result) setError(result.error);
                else router.refresh();
              })
            }
          >
            {isPending ? "Summarizing…" : aiSummary ? "Refresh summary" : "Summarize feedback mentions"}
          </Button>
          <FieldError>{error}</FieldError>
        </div>
      )}
    </Card>
  );
}
