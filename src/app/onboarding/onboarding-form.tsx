"use client";

import { useActionState } from "react";
import { createOrganization } from "./actions";

export function OnboardingForm() {
  const [state, formAction, isPending] = useActionState(
    createOrganization,
    undefined
  );

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <label htmlFor="organizationName" className="block text-sm font-medium">
          Organization name
        </label>
        <input
          id="organizationName"
          name="organizationName"
          type="text"
          required
          placeholder="Acme Corp"
          className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-800"
        />
      </div>
      {state?.error && (
        <p className="text-sm text-red-600" role="alert">
          {state.error}
        </p>
      )}
      <button
        type="submit"
        disabled={isPending}
        className="w-full rounded-md bg-gray-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-white dark:text-gray-900"
      >
        {isPending ? "Creating..." : "Continue"}
      </button>
    </form>
  );
}
