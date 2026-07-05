import "server-only";
import Groq from "groq-sdk";
import { z } from "zod";

// Confirmed against Groq's own model docs rather than assumed from memory.
const MODEL = "llama-3.3-70b-versatile";

let client: Groq | null = null;

function getClient(): Groq {
  if (!client) {
    if (!process.env.GROQ_API_KEY) {
      throw new Error(
        "GROQ_API_KEY is not set -- sentiment analysis and theme labeling are unavailable until it's configured."
      );
    }
    client = new Groq({ apiKey: process.env.GROQ_API_KEY });
  }
  return client;
}

/**
 * Uses the older, more broadly-supported `json_object` response mode rather
 * than strict `json_schema` structured outputs -- not confirmed that
 * llama-3.3-70b-versatile reliably supports strict schema adherence on
 * Groq, so parsing+validating the result with Zod here is the safer bet
 * over trusting the model to match a schema exactly.
 */
const sentimentSchema = z.object({
  sentiment: z.enum(["very_negative", "negative", "neutral", "positive", "very_positive"]),
  sentiment_score: z.number().min(-1).max(1),
  pain_point: z.string().nullable(),
});

export type SentimentResult = z.infer<typeof sentimentSchema>;

export async function analyzeSentiment(content: string): Promise<SentimentResult> {
  const completion = await getClient().chat.completions.create({
    model: MODEL,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content:
          "You classify customer feedback sentiment. Respond only with JSON matching exactly this shape: " +
          '{"sentiment": one of "very_negative", "negative", "neutral", "positive", "very_positive", ' +
          '"sentiment_score": a number from -1 (very negative) to 1 (very positive), ' +
          '"pain_point": a short phrase (under 15 words) naming the core complaint, or null if this feedback is not a complaint}',
      },
      { role: "user", content },
    ],
  });

  const raw = completion.choices[0]?.message?.content;
  if (!raw) throw new Error("Groq returned no content for sentiment analysis");

  return sentimentSchema.parse(JSON.parse(raw));
}

const themeLabelSchema = z.object({
  name: z.string().min(1).max(80),
  summary: z.string().min(1).max(400),
});

export type ThemeLabelResult = z.infer<typeof themeLabelSchema>;

export async function generateThemeLabel(
  sampleContents: string[]
): Promise<ThemeLabelResult> {
  const completion = await getClient().chat.completions.create({
    model: MODEL,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content:
          "You label clusters of customer feedback that were grouped together as describing the same underlying issue. " +
          'Respond only with JSON matching exactly this shape: {"name": a short label under 8 words identifying the shared theme, ' +
          '"summary": a 1-2 sentence summary of what customers are saying}.',
      },
      {
        role: "user",
        content: sampleContents.map((c, i) => `${i + 1}. ${c}`).join("\n"),
      },
    ],
  });

  const raw = completion.choices[0]?.message?.content;
  if (!raw) throw new Error("Groq returned no content for theme labeling");

  return themeLabelSchema.parse(JSON.parse(raw));
}

const personaSchema = z.object({
  name: z.string().min(1).max(80),
  description: z.string().min(1).max(600),
  based_on_themes: z.array(z.string()),
});

const personasResponseSchema = z.object({
  personas: z.array(personaSchema).min(1).max(5),
});

export type PersonaResult = z.infer<typeof personaSchema>;

/**
 * Synthesizes data-backed personas from real clustered themes -- explicitly
 * told to reference themes by their exact given names, not invent new
 * theme names, so the caller can reliably map `based_on_themes` back to
 * real theme ids afterward (traceability: every persona has to point at
 * data that actually exists, not a plausible-sounding fabrication).
 */
export async function generatePersonas(
  themes: { name: string; summary: string | null }[]
): Promise<PersonaResult[]> {
  const themeList = themes
    .map((t, i) => `${i + 1}. ${t.name}${t.summary ? ` — ${t.summary}` : ""}`)
    .join("\n");

  const completion = await getClient().chat.completions.create({
    model: MODEL,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content:
          "You synthesize customer personas from real, already-clustered feedback themes -- these are data-backed personas, not hypothetical ones, so every persona must be grounded in the actual themes given. " +
          'Respond only with JSON matching exactly this shape: {"personas": [{"name": a short persona archetype name under 6 words, ' +
          '"description": 2-3 sentences describing who this customer is, what they care about, and why, grounded in the themes below, ' +
          '"based_on_themes": an array of the exact theme name strings from the list below that this persona is drawn from -- copy them verbatim, do not invent new ones}]}. ' +
          "Produce 2 to 4 personas, each grounded in at least one theme. Do not reference any theme name not in the list provided.",
      },
      { role: "user", content: `Themes:\n${themeList}` },
    ],
  });

  const raw = completion.choices[0]?.message?.content;
  if (!raw) throw new Error("Groq returned no content for persona generation");

  return personasResponseSchema.parse(JSON.parse(raw)).personas;
}

const competitorSummarySchema = z.object({
  summary: z.string().min(1).max(800),
});

/**
 * Summarizes feedback that mentions a competitor by name -- the caller
 * finds the matching feedback_items (a plain ILIKE search, not semantic),
 * this just synthesizes what customers are actually saying across them.
 */
export async function summarizeCompetitorMentions(
  competitorName: string,
  mentions: string[]
): Promise<string> {
  const completion = await getClient().chat.completions.create({
    model: MODEL,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content:
          `You summarize what customers say about a competitor ("${competitorName}") based on real feedback excerpts that mention them. ` +
          'Respond only with JSON matching exactly this shape: {"summary": 2-4 sentences summarizing the recurring themes in how customers compare VoiceIQ\'s customer\'s product to this competitor -- pricing, missing features, switching reasons, whatever actually recurs}. ' +
          "Base this only on the excerpts given, don't speculate beyond them.",
      },
      {
        role: "user",
        content: mentions.map((m, i) => `${i + 1}. ${m}`).join("\n"),
      },
    ],
  });

  const raw = completion.choices[0]?.message?.content;
  if (!raw) throw new Error("Groq returned no content for competitor summarization");

  return competitorSummarySchema.parse(JSON.parse(raw)).summary;
}
