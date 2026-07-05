import type { SupabaseClient } from "@supabase/supabase-js";
import { getEmbedding } from "@/lib/embeddings";
import { analyzeSentiment, generateThemeLabel } from "@/lib/groq";

// Cosine distance below which a new item joins an existing theme rather
// than starting a new one. Not empirically tuned yet -- there's no real
// embedded feedback to tune against until the embedding pipeline has real
// data flowing through it. Expect to revisit once it does.
const JOIN_THRESHOLD_DISTANCE = 0.35;

// How many of a theme's member feedback items to sample when generating its
// label/summary. Only used the first time a theme gets labeled -- see
// maybeLabelTheme() for why labels don't auto-regenerate as themes grow.
const LABEL_SAMPLE_SIZE = 10;

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
 * Embeds a feedback item's content and assigns it to a theme. Returns the
 * assigned theme id so the caller can decide whether that theme needs
 * labeling.
 */
export async function embedAndCluster(
  supabase: SupabaseClient,
  orgId: string,
  feedbackItemId: string,
  content: string,
  embed: (text: string) => Promise<number[]>
): Promise<string> {
  const embedding = await embed(content);
  const themeId = await assignToTheme(supabase, orgId, embedding);

  const { error } = await supabase
    .from("feedback_items")
    .update({ embedding, theme_id: themeId })
    .eq("id", feedbackItemId);
  if (error) {
    throw new Error(`failed to save embedding/theme on feedback item: ${error.message}`);
  }

  return themeId;
}

/**
 * Labels a theme once, the first time it has any members -- deliberately
 * does not relabel as a theme grows, to avoid a Groq call on every single
 * new member of an active theme (a batch-processed CSV backlog could easily
 * add 20 items to the same theme in one pass). A "regenerate label" action
 * is a reasonable later addition if labels drift stale; not built yet.
 */
async function maybeLabelTheme(
  supabase: SupabaseClient,
  themeId: string
): Promise<void> {
  const { data: theme, error: themeError } = await supabase
    .from("themes")
    .select("name")
    .eq("id", themeId)
    .single();
  if (themeError) throw new Error(`theme lookup failed: ${themeError.message}`);
  if (theme.name) return;

  const { data: items, error: itemsError } = await supabase
    .from("feedback_items")
    .select("content")
    .eq("theme_id", themeId)
    .limit(LABEL_SAMPLE_SIZE);
  if (itemsError) throw new Error(`sample fetch failed: ${itemsError.message}`);
  if (!items || items.length === 0) return;

  const { name, summary } = await generateThemeLabel(
    items.map((item) => item.content as string)
  );

  const { error: updateError } = await supabase
    .from("themes")
    .update({ name, summary })
    .eq("id", themeId);
  if (updateError) throw new Error(`theme label save failed: ${updateError.message}`);
}

/**
 * Best-effort entry point for the three ingestion paths: embedding,
 * clustering, sentiment analysis, and theme labeling are all enhancements
 * layered on top of feedback storage, not a condition of it. A missing API
 * key, a rate limit, or any other failure in any one of them must never
 * turn an already-successfully-stored piece of feedback into a user-facing
 * error -- each step fails independently (so a sentiment failure doesn't
 * also lose a successful clustering result) and just leaves that piece of
 * enrichment for a later retry.
 */
export async function tryProcessFeedbackItem(
  supabase: SupabaseClient,
  orgId: string,
  feedbackItemId: string,
  content: string
): Promise<void> {
  // Each of embed+cluster / sentiment can fail independently (different
  // external APIs, different failure modes), so a retry (the backlog
  // button, or a later ingestion path re-processing) must only redo
  // whichever step didn't already succeed -- assignToTheme has no
  // "already a member" check, so blindly re-running it on an
  // already-clustered item would double-count it into its theme's
  // centroid and item_count.
  const { data: current, error: currentError } = await supabase
    .from("feedback_items")
    .select("theme_id, sentiment")
    .eq("id", feedbackItemId)
    .single();
  if (currentError) {
    console.error(`Could not read current state for feedback item ${feedbackItemId}:`, currentError);
    return;
  }

  let themeId: string | null = current.theme_id as string | null;

  if (!themeId) {
    try {
      themeId = await embedAndCluster(supabase, orgId, feedbackItemId, content, getEmbedding);
    } catch (error) {
      console.error(`Embedding/clustering failed for feedback item ${feedbackItemId}:`, error);
    }
  }

  if (!current.sentiment) {
    try {
      const sentiment = await analyzeSentiment(content);
      const { error } = await supabase
        .from("feedback_items")
        .update({
          sentiment: sentiment.sentiment,
          sentiment_score: sentiment.sentiment_score,
          pain_point: sentiment.pain_point,
        })
        .eq("id", feedbackItemId);
      if (error) throw new Error(error.message);
    } catch (error) {
      console.error(`Sentiment analysis failed for feedback item ${feedbackItemId}:`, error);
    }
  }

  if (themeId) {
    try {
      await maybeLabelTheme(supabase, themeId);
    } catch (error) {
      console.error(`Theme labeling failed for theme ${themeId}:`, error);
    }
  }
}
