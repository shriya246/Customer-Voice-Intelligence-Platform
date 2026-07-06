import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getCurrentMembership } from "@/lib/org";
import { MemberRow } from "./member-row";
import { InviteForm } from "./invite-form";
import { revokeInvite } from "./actions";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";

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
    <div className="space-y-8">
      <PageHeader
        title="Settings"
        description={membership.orgName}
        action={
          isAdmin ? (
            <div className="flex gap-4 text-sm">
              <Link href="/settings/widget" className="font-medium text-primary hover:text-primary-hover">
                Feedback widget
              </Link>
              <Link href="/settings/audit-log" className="font-medium text-primary hover:text-primary-hover">
                View audit log
              </Link>
            </div>
          ) : undefined
        }
      />

      <Card className="animate-slide-up p-5">
        <h2 className="text-sm font-semibold text-foreground">Members</h2>
        <table className="mt-4 w-full text-left">
          <thead>
            <tr className="border-b border-border text-sm text-muted-foreground">
              <th className="pb-2 font-medium">Name</th>
              <th className="pb-2 font-medium">Role</th>
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
      </Card>

      {isAdmin && (
        <Card className="animate-slide-up p-5" style={{ animationDelay: "60ms" }}>
          <h2 className="text-sm font-semibold text-foreground">Invite a teammate</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Generates a shareable link — send it however you want. Anyone with the link and a matching email can join.
          </p>
          <div className="mt-4">
            <InviteForm orgId={membership.orgId} />
          </div>

          {invites.length > 0 && (
            <div className="mt-6">
              <h3 className="text-sm font-medium text-muted-foreground">Pending invites</h3>
              <ul className="mt-2 divide-y divide-border">
                {invites.map((invite) => (
                  <li key={invite.id} className="flex items-center justify-between py-2 text-sm">
                    <span className="text-foreground">
                      {invite.email} <span className="text-muted-foreground">({invite.role})</span>
                    </span>
                    <form action={revokeInvite}>
                      <input type="hidden" name="inviteId" value={invite.id} />
                      <input type="hidden" name="orgId" value={membership.orgId} />
                      <button
                        type="submit"
                        className="text-red-600 transition-colors hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                      >
                        Revoke
                      </button>
                    </form>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
