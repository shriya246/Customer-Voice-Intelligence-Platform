"use client";

import { useActionState } from "react";
import { createFeedback } from "./actions";

export function FeedbackForm({
  channelNames,
  customerNames,
}: {
  channelNames: string[];
  customerNames: string[];
}) {
  const [state, formAction, isPending] = useActionState(createFeedback, undefined);

  return (
    <form action={formAction} className="max-w-lg space-y-4">
      <div>
        <label htmlFor="content" className="block text-sm font-medium">
          Feedback
        </label>
        <textarea
          id="content"
          name="content"
          required
          rows={5}
          placeholder="What did the customer say?"
          className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-800"
        />
      </div>

      <div>
        <label htmlFor="channelName" className="block text-sm font-medium">
          Channel
        </label>
        <input
          id="channelName"
          name="channelName"
          type="text"
          required
          list="channel-suggestions"
          placeholder="e.g. Support Tickets"
          className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-800"
        />
        <datalist id="channel-suggestions">
          {channelNames.map((name) => (
            <option key={name} value={name} />
          ))}
        </datalist>
        <p className="mt-1 text-xs text-gray-500">
          Pick an existing channel or type a new one — it&apos;ll be created automatically.
        </p>
      </div>

      <div>
        <label htmlFor="customerName" className="block text-sm font-medium">
          Customer <span className="text-gray-400">(optional)</span>
        </label>
        <input
          id="customerName"
          name="customerName"
          type="text"
          list="customer-suggestions"
          placeholder="Who said this?"
          className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-800"
        />
        <datalist id="customer-suggestions">
          {customerNames.map((name) => (
            <option key={name} value={name} />
          ))}
        </datalist>
      </div>

      <div>
        <label htmlFor="tags" className="block text-sm font-medium">
          Tags <span className="text-gray-400">(optional, comma-separated)</span>
        </label>
        <input
          id="tags"
          name="tags"
          type="text"
          placeholder="bug, pricing, onboarding"
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
        {isPending ? "Saving..." : "Log feedback"}
      </button>
    </form>
  );
}
