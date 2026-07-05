"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { summarizeCompetitor } from "./actions";

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
    <div className="rounded-lg border border-gray-200 p-4 dark:border-neutral-800">
      <p className="font-medium">{competitorName}</p>
      <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">{note}</p>

      {aiSummary && (
        <div className="mt-3 rounded-md bg-gray-50 p-3 text-sm dark:bg-neutral-800">
          <p className="text-xs font-medium text-gray-500">
            What customers actually say (AI-summarized from feedback mentions)
          </p>
          <p className="mt-1 text-gray-700 dark:text-gray-300">{aiSummary}</p>
        </div>
      )}

      {canEdit && (
        <div className="mt-3">
          <button
            type="button"
            disabled={isPending}
            onClick={() =>
              startTransition(async () => {
                setError(null);
                const result = await summarizeCompetitor(noteId);
                if (result && "error" in result) setError(result.error);
                else router.refresh();
              })
            }
            className="rounded-md border border-gray-300 px-3 py-1 text-xs font-medium disabled:opacity-50 dark:border-neutral-700"
          >
            {isPending ? "Summarizing..." : aiSummary ? "Refresh summary" : "Summarize feedback mentions"}
          </button>
          {error && (
            <p className="mt-1 text-xs text-red-600" role="alert">
              {error}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
