"use client";

import { useActionState } from "react";
import { acceptInvite } from "./actions";

export function AcceptInviteButton({ token }: { token: string }) {
  const [state, formAction, isPending] = useActionState(
    acceptInvite.bind(null, token),
    undefined
  );

  return (
    <form action={formAction}>
      {state?.error && (
        <p className="mb-3 text-sm text-red-600" role="alert">
          {state.error}
        </p>
      )}
      <button
        type="submit"
        disabled={isPending}
        className="w-full rounded-md bg-gray-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-white dark:text-gray-900"
      >
        {isPending ? "Joining..." : "Accept invite"}
      </button>
    </form>
  );
}
