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
