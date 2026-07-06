"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { processUnclusteredBacklog } from "./actions";
import { Button } from "@/components/ui/button";

export function ProcessBacklogButton({ unclusteredCount }: { unclusteredCount: number }) {
  const [isPending, startTransition] = useTransition();
  const [lastProcessed, setLastProcessed] = useState<number | null>(null);
  const router = useRouter();

  if (unclusteredCount === 0) return null;

  return (
    <div className="mb-4 flex animate-slide-up items-center gap-3 rounded-lg border border-orange-200 bg-orange-50 px-4 py-2.5 text-sm dark:border-orange-900/50 dark:bg-orange-950/40">
      <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4 shrink-0 text-orange-500">
        <path
          fillRule="evenodd"
          d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 6a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 6zm0 8a1 1 0 100-2 1 1 0 000 2z"
          clipRule="evenodd"
        />
      </svg>
      <span className="text-orange-900 dark:text-orange-200">
        {unclusteredCount} feedback item{unclusteredCount === 1 ? "" : "s"} not yet analyzed
        {lastProcessed !== null && ` (just processed ${lastProcessed})`}.
      </span>
      <Button
        type="button"
        variant="secondary"
        size="sm"
        loading={isPending}
        className="ml-auto shrink-0"
        onClick={() =>
          startTransition(async () => {
            const result = await processUnclusteredBacklog();
            setLastProcessed(result.processed);
            router.refresh();
          })
        }
      >
        {isPending ? "Processing…" : "Process next batch"}
      </Button>
    </div>
  );
}
