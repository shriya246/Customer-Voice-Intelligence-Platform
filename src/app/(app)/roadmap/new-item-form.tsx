"use client";

import { useActionState, useState } from "react";
import { createRoadmapItem } from "./actions";

export function NewItemForm({
  themes,
}: {
  themes: { id: string; name: string | null }[];
}) {
  const [open, setOpen] = useState(false);
  const [state, formAction, isPending] = useActionState(createRoadmapItem, undefined);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white dark:bg-white dark:text-gray-900"
      >
        New feature request
      </button>
    );
  }

  return (
    <form action={formAction} className="max-w-md space-y-3 rounded-lg border border-gray-200 p-4 dark:border-neutral-800">
      <div>
        <label htmlFor="title" className="block text-sm font-medium">
          Title
        </label>
        <input
          id="title"
          name="title"
          type="text"
          required
          className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-800"
        />
      </div>
      <div>
        <label htmlFor="description" className="block text-sm font-medium">
          Description <span className="text-gray-400">(optional)</span>
        </label>
        <textarea
          id="description"
          name="description"
          rows={3}
          className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-800"
        />
      </div>
      {themes.length > 0 && (
        <div>
          <label htmlFor="themeId" className="block text-sm font-medium">
            Linked theme <span className="text-gray-400">(optional)</span>
          </label>
          <select
            id="themeId"
            name="themeId"
            defaultValue=""
            className="mt-1 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-800"
          >
            <option value="">None</option>
            {themes.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name ?? "Unlabeled theme"}
              </option>
            ))}
          </select>
        </div>
      )}
      {state?.error && (
        <p className="text-sm text-red-600" role="alert">
          {state.error}
        </p>
      )}
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={isPending}
          className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-white dark:text-gray-900"
        >
          {isPending ? "Adding..." : "Add"}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium dark:border-neutral-700"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
