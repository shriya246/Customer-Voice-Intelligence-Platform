"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

export async function switchOrg(formData: FormData) {
  const orgId = formData.get("orgId");
  if (typeof orgId !== "string" || orgId.length === 0) return;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  await supabase
    .from("profiles")
    .update({ current_org_id: orgId })
    .eq("id", user.id);

  revalidatePath("/", "layout");
}
