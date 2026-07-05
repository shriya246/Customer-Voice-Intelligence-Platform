import { createClient } from "@/lib/supabase/server";

export type OrgRole = "admin" | "member" | "viewer";

export type CurrentMembership = {
  orgId: string;
  orgName: string;
  role: OrgRole;
};

export type MembershipSummary = {
  orgId: string;
  orgName: string;
  role: OrgRole;
};

/**
 * There's no generated Database type yet (needs a linked Supabase project to
 * generate against), so these results aren't schema-checked -- just
 * hand-typed at this boundary until `supabase gen types` is wired up.
 */

/** All orgs the signed-in user belongs to, for the org switcher. */
export async function listMemberships(): Promise<MembershipSummary[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data } = await supabase
    .from("org_members")
    .select("org_id, role, organizations(name)")
    .eq("user_id", user.id)
    .eq("status", "active");

  if (!data) return [];

  return data.map((row) => {
    const org = row.organizations as unknown as { name: string } | null;
    return {
      orgId: row.org_id as string,
      orgName: org?.name ?? "",
      role: row.role as OrgRole,
    };
  });
}

/**
 * The user's active org (profiles.current_org_id), falling back to whichever
 * membership was found first if unset or stale (e.g. removed from that org).
 */
export async function getCurrentMembership(): Promise<CurrentMembership | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("current_org_id")
    .eq("id", user.id)
    .single();

  const memberships = await listMemberships();
  if (memberships.length === 0) return null;

  const active =
    memberships.find((m) => m.orgId === profile?.current_org_id) ??
    memberships[0];

  return active;
}
