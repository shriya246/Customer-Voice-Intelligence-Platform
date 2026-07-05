"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getCurrentMembership } from "@/lib/org";

const STATUSES = ["under_review", "planned", "in_progress", "shipped", "declined"] as const;

const createSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(200),
  description: z.string().trim().max(2000).optional(),
  themeId: z.string().uuid().optional(),
});

export type CreateRoadmapItemState = { error: string } | undefined;

export async function createRoadmapItem(
  _prevState: CreateRoadmapItemState,
  formData: FormData
): Promise<CreateRoadmapItemState> {
  const parsed = createSchema.safeParse({
    title: formData.get("title"),
    description: formData.get("description") || undefined,
    themeId: formData.get("themeId") || undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const membership = await getCurrentMembership();
  if (!membership) throw new Error("Not authenticated");
  if (membership.role === "viewer") return { error: "Viewers can't add roadmap items." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: item, error } = await supabase
    .from("roadmap_items")
    .insert({
      org_id: membership.orgId,
      theme_id: parsed.data.themeId ?? null,
      title: parsed.data.title,
      description: parsed.data.description ?? null,
      created_by: user?.id ?? null,
    })
    .select("id")
    .single();
  if (error) return { error: error.message };

  await supabase.rpc("log_audit_event", {
    p_org_id: membership.orgId,
    p_action: "roadmap_item.created",
    p_target_type: "roadmap_item",
    p_target_id: item.id,
    p_metadata: { title: parsed.data.title },
  });

  revalidatePath("/roadmap");
  revalidatePath("/opportunities");
  return undefined;
}

const addThemeSchema = z.object({
  themeId: z.string().uuid(),
  title: z.string().trim().min(1).max(200),
});

/**
 * One-click "push this opportunity onto the roadmap" from /opportunities --
 * a plain form action (no prevState/error UI) since it always has a valid
 * theme+title from the page itself, unlike the free-form NewItemForm.
 */
export async function addThemeToRoadmap(formData: FormData) {
  const parsed = addThemeSchema.safeParse({
    themeId: formData.get("themeId"),
    title: formData.get("title"),
  });
  if (!parsed.success) return;

  const membership = await getCurrentMembership();
  if (!membership) throw new Error("Not authenticated");
  if (membership.role === "viewer") throw new Error("Viewers can't add roadmap items.");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: item, error } = await supabase
    .from("roadmap_items")
    .insert({
      org_id: membership.orgId,
      theme_id: parsed.data.themeId,
      title: parsed.data.title,
      created_by: user?.id ?? null,
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);

  await supabase.rpc("log_audit_event", {
    p_org_id: membership.orgId,
    p_action: "roadmap_item.created",
    p_target_type: "roadmap_item",
    p_target_id: item.id,
    p_metadata: { title: parsed.data.title, source: "opportunities" },
  });

  revalidatePath("/roadmap");
}

export async function updateRoadmapItemStatus(formData: FormData) {
  const itemId = formData.get("itemId");
  const status = formData.get("status");
  if (typeof itemId !== "string" || typeof status !== "string") return;
  if (!STATUSES.includes(status as (typeof STATUSES)[number])) return;

  const membership = await getCurrentMembership();
  if (!membership) throw new Error("Not authenticated");
  if (membership.role === "viewer") throw new Error("Viewers can't update roadmap items.");

  const supabase = await createClient();
  const { error } = await supabase
    .from("roadmap_items")
    .update({ status })
    .eq("id", itemId);
  if (error) throw new Error(error.message);

  await supabase.rpc("log_audit_event", {
    p_org_id: membership.orgId,
    p_action: "roadmap_item.status_changed",
    p_target_type: "roadmap_item",
    p_target_id: itemId,
    p_metadata: { status },
  });

  revalidatePath("/roadmap");
}
