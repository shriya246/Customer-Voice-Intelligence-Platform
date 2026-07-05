"use server";

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getCurrentMembership } from "@/lib/org";

const MAX_ROWS = 2000;

const importRowSchema = z.object({
  content: z.string(),
  customerName: z.string().optional(),
  tags: z.string().optional(),
});

const importInputSchema = z.object({
  channelName: z.string().trim().min(1, "Channel is required").max(200),
  rows: z.array(importRowSchema).min(1, "No rows to import").max(MAX_ROWS, `Import is limited to ${MAX_ROWS} rows at a time`),
});

export type ImportRow = z.infer<typeof importRowSchema>;

export type ImportResult = {
  totalRows: number;
  succeeded: number;
  errors: { row: number; message: string }[];
};

export async function importFeedbackCsv(
  channelName: string,
  rows: ImportRow[]
): Promise<ImportResult> {
  const parsed = importInputSchema.safeParse({ channelName, rows });
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Invalid import data");
  }

  const membership = await getCurrentMembership();
  if (!membership) throw new Error("Not authenticated");
  if (membership.role === "viewer") {
    throw new Error("Viewers can't import feedback.");
  }

  const supabase = await createClient();
  const orgId = membership.orgId;

  const { data: channel, error: channelError } = await supabase
    .from("channels")
    .upsert({ org_id: orgId, name: parsed.data.channelName }, { onConflict: "org_id,name" })
    .select("id")
    .single();
  if (channelError) throw new Error(`Failed to prepare channel: ${channelError.message}`);

  const allTagNames = [
    ...new Set(
      parsed.data.rows.flatMap((r) =>
        (r.tags ?? "").split(",").map((t) => t.trim()).filter(Boolean)
      )
    ),
  ];
  const tagMap = new Map<string, string>();
  if (allTagNames.length > 0) {
    const { data: tags, error: tagsError } = await supabase
      .from("tags")
      .upsert(
        allTagNames.map((name) => ({ org_id: orgId, name })),
        { onConflict: "org_id,name" }
      )
      .select("id, name");
    if (tagsError) throw new Error(`Failed to prepare tags: ${tagsError.message}`);
    for (const t of tags) tagMap.set(t.name as string, t.id as string);
  }

  const customerNames = [
    ...new Set(
      parsed.data.rows
        .map((r) => r.customerName?.trim())
        .filter((n): n is string => Boolean(n))
    ),
  ];
  const customerMap = new Map<string, string>();
  if (customerNames.length > 0) {
    const { data: existing } = await supabase
      .from("customers")
      .select("id, name")
      .eq("org_id", orgId)
      .in("name", customerNames);
    for (const c of existing ?? []) customerMap.set(c.name as string, c.id as string);

    const missing = customerNames.filter((n) => !customerMap.has(n));
    if (missing.length > 0) {
      const { data: created, error: customersError } = await supabase
        .from("customers")
        .insert(missing.map((name) => ({ org_id: orgId, name })))
        .select("id, name");
      if (customersError) {
        throw new Error(`Failed to prepare customers: ${customersError.message}`);
      }
      for (const c of created) customerMap.set(c.name as string, c.id as string);
    }
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const errors: ImportResult["errors"] = [];
  let succeeded = 0;

  for (let i = 0; i < parsed.data.rows.length; i++) {
    const row = parsed.data.rows[i];
    const content = row.content.trim();
    if (!content) {
      errors.push({ row: i + 1, message: "Missing content" });
      continue;
    }

    const customerId = row.customerName?.trim()
      ? (customerMap.get(row.customerName.trim()) ?? null)
      : null;

    const { data: feedbackItem, error: feedbackError } = await supabase
      .from("feedback_items")
      .insert({
        org_id: orgId,
        channel_id: channel.id,
        customer_id: customerId,
        content,
        source: "csv_import",
        created_by: user?.id ?? null,
      })
      .select("id")
      .single();

    if (feedbackError) {
      errors.push({ row: i + 1, message: feedbackError.message });
      continue;
    }

    const rowTags = (row.tags ?? "").split(",").map((t) => t.trim()).filter(Boolean);
    const tagLinks = rowTags
      .map((t) => tagMap.get(t))
      .filter((id): id is string => Boolean(id))
      .map((tagId) => ({ feedback_item_id: feedbackItem.id, tag_id: tagId }));
    if (tagLinks.length > 0) {
      await supabase.from("feedback_item_tags").insert(tagLinks);
    }

    succeeded++;
  }

  if (succeeded > 0) {
    await supabase.rpc("log_audit_event", {
      p_org_id: orgId,
      p_action: "feedback.csv_imported",
      p_metadata: { row_count: succeeded, channel: parsed.data.channelName },
    });
  }

  return { totalRows: parsed.data.rows.length, succeeded, errors };
}
