"use client";

import { useRef } from "react";
import type { MembershipSummary } from "@/lib/org";
import { switchOrg } from "./actions";

export function OrgSwitcher({
  memberships,
  currentOrgId,
}: {
  memberships: MembershipSummary[];
  currentOrgId: string;
}) {
  const formRef = useRef<HTMLFormElement>(null);

  if (memberships.length <= 1) {
    return (
      <span className="text-sm text-gray-600 dark:text-gray-400">
        {memberships[0]?.orgName}
      </span>
    );
  }

  return (
    <form ref={formRef} action={switchOrg}>
      <select
        name="orgId"
        defaultValue={currentOrgId}
        onChange={() => formRef.current?.requestSubmit()}
        className="rounded-md border border-gray-300 bg-white px-2 py-1 text-sm dark:border-neutral-700 dark:bg-neutral-800"
      >
        {memberships.map((m) => (
          <option key={m.orgId} value={m.orgId}>
            {m.orgName}
          </option>
        ))}
      </select>
    </form>
  );
}
