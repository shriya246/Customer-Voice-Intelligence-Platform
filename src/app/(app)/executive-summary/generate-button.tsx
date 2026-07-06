"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { generateSummary } from "./actions";
import { Button } from "@/components/ui/button";
import { FieldError } from "@/components/ui/input";

export function GenerateButton() {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  return (
    <div>
      <Button
        type="button"
        loading={isPending}
        onClick={() =>
          startTransition(async () => {
            setError(null);
            const result = await generateSummary();
            if (result && "error" in result) setError(result.error);
            else router.refresh();
          })
        }
      >
        {isPending ? "Generating…" : "Generate new summary"}
      </Button>
      <FieldError>{error}</FieldError>
    </div>
  );
}
