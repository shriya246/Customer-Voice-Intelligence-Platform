"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentMembership } from "@/lib/org";
import { tryProcessFeedbackItem } from "@/lib/clustering";

const BATCH_SIZE = 20;

/**
 * CSV import can add far more rows than a single serverless request can
 * afford to embed/analyze synchronously (each is a separate external API
 * call), so those items land unprocessed and get picked up here in small
 * batches instead -- manual entry and the widget still process at ingest
 * time since they're one item at a time. Also catches items where only
 * *some* enrichment succeeded (e.g. embedding worked but sentiment hit a
 * rate limit) via the OR, not just fully-unprocessed rows -- tryProcessFeedbackItem
 * itself skips whichever step already succeeded, so re-running it here is safe.
 */
export async function processUnclusteredBacklog(): Promise<{ processed: number }> {
  const membership = await getCurrentMembership();
  if (!membership) throw new Error("Not authenticated");

  const supabase = await createClient();
  const { data: items } = await supabase
    .from("feedback_items")
    .select("id, content")
    .eq("org_id", membership.orgId)
    .or("theme_id.is.null,sentiment.is.null")
    .limit(BATCH_SIZE);

  for (const item of items ?? []) {
    await tryProcessFeedbackItem(supabase, membership.orgId, item.id, item.content as string);
  }

  revalidatePath("/dashboard");
  return { processed: items?.length ?? 0 };
}
