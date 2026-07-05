import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentMembership } from "@/lib/org";

export const metadata: Metadata = { title: "Audit log — VoiceIQ Enterprise" };

type AuditLogRecord = {
  id: string;
  action: string;
  target_type: string | null;
  created_at: string;
  profiles: { full_name: string | null; email: string | null } | null;
};

const ACTION_LABELS: Record<string, string> = {
  "organization.created": "created the organization",
  "invite.created": "created an invite",
  "invite.revoked": "revoked an invite",
  "invite.accepted": "accepted an invite",
  "member.role_changed": "changed a member's role",
  "member.removed": "removed a member",
};

export default async function AuditLogPage() {
  const membership = await getCurrentMembership();
  if (!membership) return null;
  if (membership.role !== "admin") {
    redirect("/settings");
  }

  const supabase = await createClient();
  const { data } = await supabase
    .from("audit_log")
    .select("id, action, target_type, created_at, profiles(full_name, email)")
    .eq("org_id", membership.orgId)
    .order("created_at", { ascending: false })
    .limit(100);
  const entries = (data ?? []) as unknown as AuditLogRecord[];

  return (
    <div>
      <Link href="/settings" className="text-sm text-gray-500 hover:underline">
        ← Settings
      </Link>
      <h1 className="mt-2 text-2xl font-semibold">Audit log</h1>
      <p className="mt-1 text-sm text-gray-500">
        Last {entries.length} action{entries.length === 1 ? "" : "s"} in {membership.orgName}.
      </p>

      {entries.length === 0 ? (
        <p className="mt-8 text-sm text-gray-500">Nothing recorded yet.</p>
      ) : (
        <ul className="mt-6 divide-y divide-gray-100 dark:divide-neutral-800">
          {entries.map((entry) => (
            <li key={entry.id} className="flex items-center justify-between py-3 text-sm">
              <span>
                <span className="font-medium">
                  {entry.profiles?.full_name || entry.profiles?.email || "Someone"}
                </span>{" "}
                {ACTION_LABELS[entry.action] ?? entry.action}
              </span>
              <span className="text-gray-400">
                {new Date(entry.created_at).toLocaleString()}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
