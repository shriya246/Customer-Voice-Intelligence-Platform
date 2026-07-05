import type { SupabaseClient } from "@supabase/supabase-js";
import { getEmbedding } from "@/lib/embeddings";

// Cosine distance below which a new item joins an existing theme rather
// than starting a new one. Not empirically tuned yet -- there's no real
// embedded feedback to tune against until the embedding pipeline has real
// data flowing through it. Expect to revisit once it does.
const JOIN_THRESHOLD_DISTANCE = 0.35;

/**
 * pgvector columns can come back through PostgREST as either a real array
 * or its text representation ("[0.1,0.2,...]") depending on context --
 * parses defensively rather than assuming one or the other.
 */
function parseVector(value: unknown): number[] {
  if (Array.isArray(value)) return value as number[];
  if (typeof value === "string") {
    return JSON.parse(value) as number[];
  }
  throw new Error(`Unexpected vector column shape: ${typeof value}`);
}

/**
 * Finds the nearest existing theme for this embedding (if any are close
 * enough) and updates its centroid as an incremental running mean, or
 * creates a new theme if nothing is close enough / none exist yet. Returns
 * the theme id the item should be assigned to.
 */
export async function assignToTheme(
  supabase: SupabaseClient,
  orgId: string,
  embedding: number[]
): Promise<string> {
  const { data: nearest, error: nearestError } = await supabase.rpc(
    "find_nearest_theme",
    { p_org_id: orgId, p_embedding: embedding }
  );
  if (nearestError) {
    throw new Error(`find_nearest_theme failed: ${nearestError.message}`);
  }

  const match = nearest?.[0] as { theme_id: string; distance: number } | undefined;

  if (match && match.distance < JOIN_THRESHOLD_DISTANCE) {
    const { data: theme, error: themeError } = await supabase
      .from("themes")
      .select("centroid, item_count")
      .eq("id", match.theme_id)
      .single();
    if (themeError) throw new Error(`theme lookup failed: ${themeError.message}`);

    const oldCentroid = parseVector(theme.centroid);
    const oldCount = theme.item_count as number;
    const newCount = oldCount + 1;
    const newCentroid = oldCentroid.map(
      (value, i) => (value * oldCount + embedding[i]) / newCount
    );

    const { error: updateError } = await supabase
      .from("themes")
      .update({ centroid: newCentroid, item_count: newCount })
      .eq("id", match.theme_id);
    if (updateError) throw new Error(`theme update failed: ${updateError.message}`);

    return match.theme_id;
  }

  const { data: newTheme, error: insertError } = await supabase
    .from("themes")
    .insert({ org_id: orgId, centroid: embedding, item_count: 1 })
    .select("id")
    .single();
  if (insertError) throw new Error(`theme creation failed: ${insertError.message}`);

  return newTheme.id;
}

/**
 * Embeds a feedback item's content and assigns it to a theme. Wraps
 * getEmbedding + assignToTheme + the feedback_items update in one call so
 * every ingestion path (manual, CSV, widget) triggers it identically.
 */
export async function embedAndCluster(
  supabase: SupabaseClient,
  orgId: string,
  feedbackItemId: string,
  content: string,
  embed: (text: string) => Promise<number[]>
): Promise<void> {
  const embedding = await embed(content);
  const themeId = await assignToTheme(supabase, orgId, embedding);

  const { error } = await supabase
    .from("feedback_items")
    .update({ embedding, theme_id: themeId })
    .eq("id", feedbackItemId);
  if (error) {
    throw new Error(`failed to save embedding/theme on feedback item: ${error.message}`);
  }
}

/**
 * Best-effort entry point for the three ingestion paths: embedding/clustering
 * is an enhancement layered on top of feedback storage, not a condition of
 * it. A missing HUGGINGFACE_API_TOKEN, a rate limit, or any other failure
 * here must never turn an already-successfully-stored piece of feedback
 * into a user-facing error -- it just stays unclustered until the next
 * backlog pass (see /feedback/process-backlog) picks it up.
 */
export async function tryEmbedAndCluster(
  supabase: SupabaseClient,
  orgId: string,
  feedbackItemId: string,
  content: string
): Promise<void> {
  try {
    await embedAndCluster(supabase, orgId, feedbackItemId, content, getEmbedding);
  } catch (error) {
    console.error(
      `Embedding/clustering failed for feedback item ${feedbackItemId}:`,
      error
    );
  }
}
