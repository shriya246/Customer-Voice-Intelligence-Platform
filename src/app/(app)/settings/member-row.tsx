"use client";

import { useRef } from "react";
import { updateMemberRole, removeMember } from "./actions";

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
    <tr className="border-b border-gray-100 dark:border-neutral-800">
      <td className="py-3 pr-4">
        <div className="font-medium">
          {name || "—"} {isSelf && <span className="text-gray-400">(you)</span>}
        </div>
        <div className="text-sm text-gray-500">{email}</div>
      </td>
      <td className="py-3 pr-4">
        {canManage ? (
          <form ref={roleFormRef} action={updateMemberRole}>
            <input type="hidden" name="orgId" value={orgId} />
            <input type="hidden" name="userId" value={userId} />
            <select
              name="role"
              defaultValue={role}
              onChange={() => roleFormRef.current?.requestSubmit()}
              className="rounded-md border border-gray-300 bg-white px-2 py-1 text-sm dark:border-neutral-700 dark:bg-neutral-800"
            >
              <option value="admin">Admin</option>
              <option value="member">Member</option>
              <option value="viewer">Viewer</option>
            </select>
          </form>
        ) : (
          <span className="text-sm capitalize">{role}</span>
        )}
      </td>
      <td className="py-3 text-right">
        {canManage && (
          <form action={removeMember}>
            <input type="hidden" name="orgId" value={orgId} />
            <input type="hidden" name="userId" value={userId} />
            <button
              type="submit"
              className="text-sm text-red-600 hover:underline"
            >
              Remove
            </button>
          </form>
        )}
      </td>
    </tr>
  );
}
