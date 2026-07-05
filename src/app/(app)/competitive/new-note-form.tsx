"use client";

import { useActionState } from "react";
import { createCompetitiveNote } from "./actions";

export function NewNoteForm() {
  const [state, formAction, isPending] = useActionState(createCompetitiveNote, undefined);

  return (
    <form action={formAction} className="max-w-md space-y-3 rounded-lg border border-gray-200 p-4 dark:border-neutral-800">
      <div>
        <label htmlFor="competitorName" className="block text-sm font-medium">
          Competitor
        </label>
        <input
          id="competitorName"
          name="competitorName"
          type="text"
          required
          placeholder="e.g. Productboard"
          className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-800"
        />
      </div>
      <div>
        <label htmlFor="note" className="block text-sm font-medium">
          Note
        </label>
        <textarea
          id="note"
          name="note"
          rows={3}
          required
          placeholder="What are you noticing?"
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
        className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-white dark:text-gray-900"
      >
        {isPending ? "Adding..." : "Add note"}
      </button>
    </form>
  );
}
