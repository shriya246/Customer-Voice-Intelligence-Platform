"use client";

import { useRef } from "react";
import { updateMemberRole, removeMember } from "./actions";
import { Select } from "@/components/ui/input";

export function MemberRow({
  orgId,
  userId,
  name,
  email,
  role,
  isSelf,
  canManage,
}: {
  orgId: string;
  userId: string;
  name: string;
  email: string;
  role: string;
  isSelf: boolean;
  canManage: boolean;
}) {
  const roleFormRef = useRef<HTMLFormElement>(null);

  return (
    <tr className="border-b border-border last:border-0 transition-colors hover:bg-surface-hover">
      <td className="py-3 pr-4">
        <div className="font-medium text-foreground">
          {name || "—"} {isSelf && <span className="text-muted-foreground">(you)</span>}
        </div>
        <div className="text-sm text-muted-foreground">{email}</div>
      </td>
      <td className="py-3 pr-4">
        {canManage ? (
          <form ref={roleFormRef} action={updateMemberRole}>
            <input type="hidden" name="orgId" value={orgId} />
            <input type="hidden" name="userId" value={userId} />
            <Select
              name="role"
              defaultValue={role}
              onChange={() => roleFormRef.current?.requestSubmit()}
              className="w-auto py-1"
            >
              <option value="admin">Admin</option>
              <option value="member">Member</option>
              <option value="viewer">Viewer</option>
            </Select>
          </form>
        ) : (
          <span className="text-sm capitalize text-foreground">{role}</span>
        )}
      </td>
      <td className="py-3 text-right">
        {canManage && (
          <form action={removeMember}>
            <input type="hidden" name="orgId" value={orgId} />
            <input type="hidden" name="userId" value={userId} />
            <button
              type="submit"
              className="text-sm text-red-600 transition-colors hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
            >
              Remove
            </button>
          </form>
        )}
      </td>
    </tr>
  );
}
