"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentMembership } from "@/lib/org";
import { tryEmbedAndCluster } from "@/lib/clustering";

const BATCH_SIZE = 20;

/**
 * CSV import can add far more rows than a single serverless request can
 * afford to embed synchronously (each embedding is an external API call),
 * so those items land unclustered and get picked up here in small batches
 * instead -- manual entry and the widget still embed at ingest time since
 * they're one item at a time.
 */
export async function processUnclusteredBacklog(): Promise<{ processed: number }> {
  const membership = await getCurrentMembership();
  if (!membership) throw new Error("Not authenticated");

  const supabase = await createClient();
  const { data: items } = await supabase
    .from("feedback_items")
    .select("id, content")
    .eq("org_id", membership.orgId)
    .is("theme_id", null)
    .limit(BATCH_SIZE);

  for (const item of items ?? []) {
    await tryEmbedAndCluster(supabase, membership.orgId, item.id, item.content as string);
  }

  revalidatePath("/dashboard");
  return { processed: items?.length ?? 0 };
}
