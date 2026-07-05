import "server-only";
import { InferenceClient } from "@huggingface/inference";

// Confirmed servable via the "hf-inference" provider as of Sprint 2 (checked
// the model's own Hub page rather than assuming) -- 384-dimensional output,
// which is why feedback_items.embedding / themes.centroid are vector(384).
// Changing models later means re-embedding every existing row.
const EMBEDDING_MODEL = "sentence-transformers/all-MiniLM-L6-v2";
const EMBEDDING_DIMENSIONS = 384;

let client: InferenceClient | null = null;

function getClient(): InferenceClient {
  if (!client) {
    if (!process.env.HUGGINGFACE_API_TOKEN) {
      throw new Error(
        "HUGGINGFACE_API_TOKEN is not set -- embeddings are unavailable until it's configured."
      );
    }
    client = new InferenceClient(process.env.HUGGINGFACE_API_TOKEN);
  }
  return client;
}

/**
 * The API's own type (`(number | number[] | number[][])[]`) reflects that
 * whether pooling was applied is model/provider-dependent and not something
 * we can be certain of ahead of time -- handles all three shapes a single
 * string input could plausibly come back as:
 *   - a flat 384-length array (already pooled)
 *   - a single-element array wrapping the pooled vector, e.g. [[...]]
 *   - a multi-element array of per-token vectors, needing mean-pooling here
 */
function extractEmbedding(output: unknown): number[] {
  if (!Array.isArray(output) || output.length === 0) {
    throw new Error("Unexpected embedding response: empty or not an array");
  }

  const first = output[0];

  if (typeof first === "number") {
    return output as number[];
  }

  if (Array.isArray(first)) {
    if (output.length === 1) {
      return first as number[];
    }

    const dim = first.length;
    const sums = new Array(dim).fill(0) as number[];
    for (const row of output as number[][]) {
      for (let i = 0; i < dim; i++) sums[i] += row[i];
    }
    return sums.map((sum) => sum / output.length);
  }

  throw new Error("Unexpected embedding response shape");
}

export async function getEmbedding(text: string): Promise<number[]> {
  const output = await getClient().featureExtraction({
    model: EMBEDDING_MODEL,
    provider: "hf-inference",
    inputs: text,
    normalize: true,
  });

  const embedding = extractEmbedding(output);

  if (embedding.length !== EMBEDDING_DIMENSIONS) {
    throw new Error(
      `Expected a ${EMBEDDING_DIMENSIONS}-dimensional embedding, got ${embedding.length}. ` +
        "The model or provider response shape may have changed -- check extractEmbedding()."
    );
  }

  return embedding;
}
