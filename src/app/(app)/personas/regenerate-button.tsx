"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { regeneratePersonas } from "./actions";

export function RegenerateButton() {
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
            const result = await regeneratePersonas();
            if (result && "error" in result) {
              setError(result.error);
            } else {
              router.refresh();
            }
          })
        }
        className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-white dark:text-gray-900"
      >
        {isPending ? "Generating..." : "Regenerate personas"}
      </button>
      {error && (
        <p className="mt-2 text-sm text-red-600" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
