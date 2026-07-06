"use client";

import { useActionState } from "react";
import { createCompetitiveNote } from "./actions";
import { Button } from "@/components/ui/button";
import { Input, Textarea, Label, FieldError } from "@/components/ui/input";
import { Card } from "@/components/ui/card";

export function NewNoteForm() {
  const [state, formAction, isPending] = useActionState(createCompetitiveNote, undefined);

  return (
    <Card className="max-w-md p-4">
      <form action={formAction} className="space-y-3">
        <div>
          <Label htmlFor="competitorName">Competitor</Label>
          <Input id="competitorName" name="competitorName" type="text" required placeholder="e.g. Productboard" />
        </div>
        <div>
          <Label htmlFor="note">Note</Label>
          <Textarea id="note" name="note" rows={3} required placeholder="What are you noticing?" />
        </div>
        {state?.error && <FieldError>{state.error}</FieldError>}
        <Button type="submit" loading={isPending}>
          {isPending ? "Adding…" : "Add note"}
        </Button>
      </form>
    </Card>
  );
}
