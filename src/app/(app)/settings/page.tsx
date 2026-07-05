import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { getCurrentMembership } from "@/lib/org";
import { MemberRow } from "./member-row";
import { InviteForm } from "./invite-form";
import { revokeInvite } from "./actions";

export const metadata: Metadata = { title: "Settings — VoiceIQ Enterprise" };

type MemberRecord = {
  user_id: string;
  role: string;
  profiles: { full_name: string | null; email: string | null } | null;
};

type InviteRecord = {
  id: string;
  email: string;
  role: string;
  status: string;
  created_at: string;
};

export default async function SettingsPage() {
  const supabase = await createClient();
  const membership = await getCurrentMembership();
  if (!membership) return null;

  const isAdmin = membership.role === "admin";

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: membersData } = await supabase
    .from("org_members")
    .select("user_id, role, profiles(full_name, email)")
    .eq("org_id", membership.orgId)
    .eq("status", "active");
  const members = (membersData ?? []) as unknown as MemberRecord[];

  let invites: InviteRecord[] = [];
  if (isAdmin) {
    const { data: invitesData } = await supabase
      .from("invites")
      .select("id, email, role, status, created_at")
      .eq("org_id", membership.orgId)
      .eq("status", "pending")
      .order("created_at", { ascending: false });
    invites = invitesData ?? [];
  }

  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-2xl font-semibold">Settings</h1>
        <p className="mt-1 text-sm text-gray-500">{membership.orgName}</p>
      </div>

      <section>
        <h2 className="text-lg font-medium">Members</h2>
        <table className="mt-4 w-full text-left">
          <thead>
            <tr className="border-b border-gray-200 text-sm text-gray-500 dark:border-neutral-800">
              <th className="pb-2 font-normal">Name</th>
              <th className="pb-2 font-normal">Role</th>
              <th className="pb-2"></th>
            </tr>
          </thead>
          <tbody>
            {members.map((m) => (
              <MemberRow
                key={m.user_id}
                orgId={membership.orgId}
                userId={m.user_id}
                name={m.profiles?.full_name ?? ""}
                email={m.profiles?.email ?? ""}
                role={m.role}
                isSelf={m.user_id === user?.id}
                canManage={isAdmin}
              />
            ))}
          </tbody>
        </table>
      </section>

      {isAdmin && (
        <section>
          <h2 className="text-lg font-medium">Invite a teammate</h2>
          <p className="mt-1 text-sm text-gray-500">
            Generates a shareable link — send it however you want. Anyone with the link and a matching email can join.
          </p>
          <div className="mt-4">
            <InviteForm orgId={membership.orgId} />
          </div>

          {invites.length > 0 && (
            <div className="mt-6">
              <h3 className="text-sm font-medium text-gray-500">Pending invites</h3>
              <ul className="mt-2 divide-y divide-gray-100 dark:divide-neutral-800">
                {invites.map((invite) => (
                  <li
                    key={invite.id}
                    className="flex items-center justify-between py-2 text-sm"
                  >
                    <span>
                      {invite.email} <span className="text-gray-400">({invite.role})</span>
                    </span>
                    <form action={revokeInvite}>
                      <input type="hidden" name="inviteId" value={invite.id} />
                      <button type="submit" className="text-red-600 hover:underline">
                        Revoke
                      </button>
                    </form>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
