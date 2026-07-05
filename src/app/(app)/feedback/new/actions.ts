"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getCurrentMembership } from "@/lib/org";
import { tryProcessFeedbackItem } from "@/lib/clustering";

const feedbackSchema = z.object({
  content: z.string().trim().min(1, "Feedback content is required").max(10_000),
  channelName: z.string().trim().min(1, "Channel is required").max(200),
  customerName: z.string().trim().max(200).optional(),
  tags: z.string().trim().max(500).optional(),
});

export type CreateFeedbackState = { error: string } | undefined;

export async function createFeedback(
  _prevState: CreateFeedbackState,
  formData: FormData
): Promise<CreateFeedbackState> {
  const parsed = feedbackSchema.safeParse({
    content: formData.get("content"),
    channelName: formData.get("channelName"),
    customerName: formData.get("customerName") || undefined,
    tags: formData.get("tags") || undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const membership = await getCurrentMembership();
  if (!membership) redirect("/onboarding");
  if (membership.role === "viewer") {
    return { error: "Viewers can't log feedback." };
  }

  const supabase = await createClient();
  const { content, channelName, customerName, tags } = parsed.data;

  const { data: channel, error: channelError } = await supabase
    .from("channels")
    .upsert(
      { org_id: membership.orgId, name: channelName },
      { onConflict: "org_id,name" }
    )
    .select("id")
    .single();
  if (channelError) return { error: channelError.message };

  let customerId: string | null = null;
  if (customerName) {
    const { data: existingCustomer } = await supabase
      .from("customers")
      .select("id")
      .eq("org_id", membership.orgId)
      .eq("name", customerName)
      .maybeSingle();

    if (existingCustomer) {
      customerId = existingCustomer.id;
    } else {
      const { data: newCustomer, error: customerError } = await supabase
        .from("customers")
        .insert({ org_id: membership.orgId, name: customerName })
        .select("id")
        .single();
      if (customerError) return { error: customerError.message };
      customerId = newCustomer.id;
    }
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: feedbackItem, error: feedbackError } = await supabase
    .from("feedback_items")
    .insert({
      org_id: membership.orgId,
      channel_id: channel.id,
      customer_id: customerId,
      content,
      source: "manual",
      created_by: user?.id ?? null,
    })
    .select("id")
    .single();
  if (feedbackError) return { error: feedbackError.message };

  const tagNames = [
    ...new Set(
      (tags ?? "")
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean)
    ),
  ];

  for (const tagName of tagNames) {
    const { data: tag, error: tagError } = await supabase
      .from("tags")
      .upsert(
        { org_id: membership.orgId, name: tagName },
        { onConflict: "org_id,name" }
      )
      .select("id")
      .single();
    if (tagError) continue;

    await supabase
      .from("feedback_item_tags")
      .insert({ feedback_item_id: feedbackItem.id, tag_id: tag.id });
  }

  await supabase.rpc("log_audit_event", {
    p_org_id: membership.orgId,
    p_action: "feedback.created",
    p_target_type: "feedback_item",
    p_target_id: feedbackItem.id,
    p_metadata: { source: "manual", channel: channelName },
  });

  await tryProcessFeedbackItem(supabase, membership.orgId, feedbackItem.id, content);

  redirect("/dashboard");
}
