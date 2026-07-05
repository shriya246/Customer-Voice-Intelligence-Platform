"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const inviteSchema = z.object({
  orgId: z.string().uuid(),
  email: z.string().trim().email("Enter a valid email address"),
  role: z.enum(["admin", "member", "viewer"]),
});

export type CreateInviteState =
  | { error: string; link?: undefined }
  | { error?: undefined; link: string }
  | undefined;

export async function createInvite(
  _prevState: CreateInviteState,
  formData: FormData
): Promise<CreateInviteState> {
  const parsed = inviteSchema.safeParse({
    orgId: formData.get("orgId"),
    email: formData.get("email"),
    role: formData.get("role"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("invites")
    .insert({
      org_id: parsed.data.orgId,
      email: parsed.data.email,
      role: parsed.data.role,
    })
    .select("token")
    .single();

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/settings");
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";
  return { link: `${appUrl}/invite/${data.token}` };
}

export async function revokeInvite(formData: FormData) {
  const inviteId = formData.get("inviteId");
  if (typeof inviteId !== "string") return;

  const supabase = await createClient();
  await supabase.from("invites").update({ status: "revoked" }).eq("id", inviteId);
  revalidatePath("/settings");
}

export async function updateMemberRole(formData: FormData) {
  const orgId = formData.get("orgId");
  const userId = formData.get("userId");
  const role = formData.get("role");
  if (
    typeof orgId !== "string" ||
    typeof userId !== "string" ||
    typeof role !== "string"
  )
    return;

  const supabase = await createClient();
  const { error } = await supabase
    .from("org_members")
    .update({ role })
    .eq("org_id", orgId)
    .eq("user_id", userId);

  // Surfaces the last-admin-protection trigger (and any other DB-level
  // rejection) as a visible error instead of a silent no-op that just
  // reverts on the next render with no explanation.
  if (error) throw new Error(error.message);

  revalidatePath("/settings");
}

export async function removeMember(formData: FormData) {
  const orgId = formData.get("orgId");
  const userId = formData.get("userId");
  if (typeof orgId !== "string" || typeof userId !== "string") return;

  const supabase = await createClient();
  const { error } = await supabase
    .from("org_members")
    .delete()
    .eq("org_id", orgId)
    .eq("user_id", userId);

  if (error) throw new Error(error.message);

  revalidatePath("/settings");
}
