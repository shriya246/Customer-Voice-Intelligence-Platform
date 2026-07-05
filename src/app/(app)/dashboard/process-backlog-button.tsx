"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { processUnclusteredBacklog } from "./actions";

export function ProcessBacklogButton({ unclusteredCount }: { unclusteredCount: number }) {
  const [isPending, startTransition] = useTransition();
  const [lastProcessed, setLastProcessed] = useState<number | null>(null);
  const router = useRouter();

  if (unclusteredCount === 0) return null;

  return (
    <div className="mb-4 flex items-center gap-3 rounded-md border border-amber-200 bg-amber-50 px-4 py-2 text-sm dark:border-amber-900 dark:bg-amber-950">
      <span>
        {unclusteredCount} feedback item{unclusteredCount === 1 ? "" : "s"} not yet analyzed (clustering/sentiment)
        {lastProcessed !== null && ` (just processed ${lastProcessed})`}.
      </span>
      <button
        type="button"
        disabled={isPending}
        onClick={() =>
          startTransition(async () => {
            const result = await processUnclusteredBacklog();
            setLastProcessed(result.processed);
            router.refresh();
          })
        }
        className="shrink-0 rounded-md border border-amber-300 bg-white px-3 py-1 text-sm font-medium dark:border-amber-800 dark:bg-neutral-900"
      >
        {isPending ? "Processing..." : "Process next batch"}
      </button>
    </div>
  );
}
