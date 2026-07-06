"use client";

import { useActionState } from "react";
import { createOrganization } from "./actions";
import { Button } from "@/components/ui/button";
import { Input, Label, FieldError } from "@/components/ui/input";

export function OnboardingForm() {
  const [state, formAction, isPending] = useActionState(
    createOrganization,
    undefined
  );

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <Label htmlFor="organizationName">Organization name</Label>
        <Input id="organizationName" name="organizationName" type="text" required placeholder="Acme Corp" />
      </div>
      {state?.error && <FieldError>{state.error}</FieldError>}
      <Button type="submit" loading={isPending} className="w-full">
        {isPending ? "Creating…" : "Continue"}
      </Button>
    </form>
  );
}
