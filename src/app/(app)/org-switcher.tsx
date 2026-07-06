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
    return <span className="text-sm font-medium text-foreground">{memberships[0]?.orgName}</span>;
  }

  return (
    <form ref={formRef} action={switchOrg}>
      <select
        name="orgId"
        defaultValue={currentOrgId}
        onChange={() => formRef.current?.requestSubmit()}
        className="rounded-md border border-border bg-surface px-2 py-1 text-sm font-medium text-foreground transition-colors hover:border-border-strong focus:outline-none focus:ring-2 focus:ring-primary/20"
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
