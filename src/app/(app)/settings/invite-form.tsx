"use client";

import { useActionState, useState } from "react";
import { createInvite } from "./actions";

export function InviteForm({ orgId }: { orgId: string }) {
  const [state, formAction, isPending] = useActionState(createInvite, undefined);
  const [copied, setCopied] = useState(false);

  return (
    <div>
      <form action={formAction} className="flex flex-wrap items-end gap-3">
        <input type="hidden" name="orgId" value={orgId} />
        <div>
          <label htmlFor="email" className="block text-sm font-medium">
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            placeholder="teammate@company.com"
            className="mt-1 rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-800"
          />
        </div>
        <div>
          <label htmlFor="role" className="block text-sm font-medium">
            Role
          </label>
          <select
            id="role"
            name="role"
            defaultValue="member"
            className="mt-1 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-800"
          >
            <option value="admin">Admin</option>
            <option value="member">Member</option>
            <option value="viewer">Viewer</option>
          </select>
        </div>
        <button
          type="submit"
          disabled={isPending}
          className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-white dark:text-gray-900"
        >
          {isPending ? "Creating..." : "Create invite link"}
        </button>
      </form>
      {state?.error && (
        <p className="mt-2 text-sm text-red-600" role="alert">
          {state.error}
        </p>
      )}
      {state?.link && (
        <div className="mt-3 flex items-center gap-2 rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm dark:border-neutral-800 dark:bg-neutral-900">
          <code className="flex-1 overflow-x-auto whitespace-nowrap">{state.link}</code>
          <button
            type="button"
            onClick={() => {
              navigator.clipboard.writeText(state.link);
              setCopied(true);
              setTimeout(() => setCopied(false), 2000);
            }}
            className="shrink-0 rounded-md border border-gray-300 px-2 py-1 text-xs dark:border-neutral-700"
          >
            {copied ? "Copied" : "Copy"}
          </button>
        </div>
      )}
    </div>
  );
}
