"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { generateSummary } from "./actions";

export function GenerateButton() {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  return (
    <div>
      <button
        type="button"
        disabled={isPending}
        onClick={() =>
          startTransition(async () => {
            setError(null);
            const result = await generateSummary();
            if (result && "error" in result) setError(result.error);
            else router.refresh();
          })
        }
        className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-white dark:text-gray-900"
      >
        {isPending ? "Generating..." : "Generate new summary"}
      </button>
      {error && (
        <p className="mt-2 text-sm text-red-600" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
