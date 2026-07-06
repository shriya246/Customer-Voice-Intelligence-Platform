"use client";

import { useActionState } from "react";
import { acceptInvite } from "./actions";
import { Button } from "@/components/ui/button";
import { FieldError } from "@/components/ui/input";

export function AcceptInviteButton({ token }: { token: string }) {
  const [state, formAction, isPending] = useActionState(
    acceptInvite.bind(null, token),
    undefined
  );

  return (
    <form action={formAction}>
      <FieldError>{state?.error}</FieldError>
      <Button type="submit" loading={isPending} className="w-full">
        {isPending ? "Joining…" : "Accept invite"}
      </Button>
    </form>
  );
}
