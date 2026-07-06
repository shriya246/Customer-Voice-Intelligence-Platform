"use client";

import { useActionState, useState } from "react";
import { createRoadmapItem } from "./actions";
import { Button } from "@/components/ui/button";
import { Input, Textarea, Select, Label, FieldError } from "@/components/ui/input";
import { Card } from "@/components/ui/card";

export function NewItemForm({
  themes,
}: {
  themes: { id: string; name: string | null }[];
}) {
  const [open, setOpen] = useState(false);
  const [state, formAction, isPending] = useActionState(createRoadmapItem, undefined);

  if (!open) {
    return (
      <Button type="button" onClick={() => setOpen(true)}>
        New feature request
      </Button>
    );
  }

  return (
    <Card className="w-full max-w-md animate-scale-in p-4">
      <form action={formAction} className="space-y-3">
        <div>
          <Label htmlFor="title">Title</Label>
          <Input id="title" name="title" type="text" required />
        </div>
        <div>
          <Label htmlFor="description">
            Description <span className="font-normal text-muted-foreground">(optional)</span>
          </Label>
          <Textarea id="description" name="description" rows={3} />
        </div>
        {themes.length > 0 && (
          <div>
            <Label htmlFor="themeId">
              Linked theme <span className="font-normal text-muted-foreground">(optional)</span>
            </Label>
            <Select id="themeId" name="themeId" defaultValue="">
              <option value="">None</option>
              {themes.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name ?? "Unlabeled theme"}
                </option>
              ))}
            </Select>
          </div>
        )}
        {state?.error && <FieldError>{state.error}</FieldError>}
        <div className="flex gap-2">
          <Button type="submit" loading={isPending}>
            {isPending ? "Adding…" : "Add"}
          </Button>
          <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
            Cancel
          </Button>
        </div>
      </form>
    </Card>
  );
}
