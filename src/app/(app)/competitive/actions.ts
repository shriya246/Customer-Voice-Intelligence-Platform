"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getCurrentMembership } from "@/lib/org";
import { summarizeCompetitorMentions } from "@/lib/groq";
import { logError } from "@/lib/log-error";

const createSchema = z.object({
  competitorName: z.string().trim().min(1, "Competitor name is required").max(100),
  note: z.string().trim().min(1, "Note is required").max(2000),
});

export type CreateNoteState = { error: string } | undefined;

export async function createCompetitiveNote(
  _prevState: CreateNoteState,
  formData: FormData
): Promise<CreateNoteState> {
  const parsed = createSchema.safeParse({
    competitorName: formData.get("competitorName"),
    note: formData.get("note"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const membership = await getCurrentMembership();
  if (!membership) throw new Error("Not authenticated");
  if (membership.role === "viewer") return { error: "Viewers can't add notes." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: note, error } = await supabase
    .from("competitive_notes")
    .insert({
      org_id: membership.orgId,
      competitor_name: parsed.data.competitorName,
      note: parsed.data.note,
      created_by: user?.id ?? null,
    })
    .select("id")
    .single();
  if (error) return { error: error.message };

  await supabase.rpc("log_audit_event", {
    p_org_id: membership.orgId,
    p_action: "competitive_note.created",
    p_target_type: "competitive_note",
    p_target_id: note.id,
    p_metadata: { competitor_name: parsed.data.competitorName },
  });

  revalidatePath("/competitive");
  return undefined;
}

const MENTION_SAMPLE_SIZE = 15;

export type SummarizeState = { error: string } | { summary: string } | undefined;

/**
 * Finds feedback mentioning this competitor by a plain substring search
 * (not semantic -- this is about literal name mentions, not "similar
 * meaning") and asks Groq to summarize the recurring themes across them.
 */
export async function summarizeCompetitor(noteId: string): Promise<SummarizeState> {
  const membership = await getCurrentMembership();
  if (!membership) throw new Error("Not authenticated");
  if (membership.role === "viewer") return { error: "Viewers can't generate summaries." };

  const supabase = await createClient();
  const { data: note, error: noteError } = await supabase
    .from("competitive_notes")
    .select("competitor_name")
    .eq("id", noteId)
    .single();
  if (noteError) return { error: noteError.message };

  const { data: mentions, error: mentionsError } = await supabase
    .from("feedback_items")
    .select("content")
    .eq("org_id", membership.orgId)
    .ilike("content", `%${note.competitor_name}%`)
    .limit(MENTION_SAMPLE_SIZE);
  if (mentionsError) return { error: mentionsError.message };

  if (!mentions || mentions.length === 0) {
    return { error: `No feedback mentions "${note.competitor_name}" yet.` };
  }

  let summary: string;
  try {
    summary = await summarizeCompetitorMentions(
      note.competitor_name as string,
      mentions.map((m) => m.content as string)
    );
  } catch (error) {
    logError("competitive.summarize_mentions", error, { orgId: membership.orgId, noteId });
    return { error: error instanceof Error ? error.message : "Summarization failed" };
  }

  const { error: updateError } = await supabase
    .from("competitive_notes")
    .update({ ai_summary: summary })
    .eq("id", noteId);
  if (updateError) return { error: updateError.message };

  revalidatePath("/competitive");
  return { summary };
}
