import { createClient } from "@/lib/supabase/server";

export type OrgRole = "admin" | "member" | "viewer";

export type CurrentMembership = {
  orgId: string;
  orgName: string;
  role: OrgRole;
};

/**
 * There's no generated Database type yet (needs a linked Supabase project to
 * generate against), so this result isn't schema-checked -- just hand-typed
 * at this boundary until `supabase gen types` is wired up.
 */
export async function getCurrentMembership(): Promise<CurrentMembership | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: membership } = await supabase
    .from("org_members")
    .select("org_id, role")
    .eq("user_id", user.id)
    .eq("status", "active")
    .limit(1)
    .maybeSingle();

  if (!membership) return null;

  const { data: org } = await supabase
    .from("organizations")
    .select("name")
    .eq("id", membership.org_id)
    .single();

  return {
    orgId: membership.org_id as string,
    orgName: (org?.name as string) ?? "",
    role: membership.role as OrgRole,
  };
}
