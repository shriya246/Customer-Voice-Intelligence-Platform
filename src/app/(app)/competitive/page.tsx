import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { getCurrentMembership } from "@/lib/org";
import { NewNoteForm } from "./new-note-form";
import { NoteCard } from "./note-card";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/card";

export const metadata: Metadata = { title: "Competitive insights — VoiceIQ Enterprise" };

export default async function CompetitivePage() {
  const membership = await getCurrentMembership();
  if (!membership) return null;

  const supabase = await createClient();
  const { data: notes } = await supabase
    .from("competitive_notes")
    .select("id, competitor_name, note, ai_summary")
    .eq("org_id", membership.orgId)
    .order("created_at", { ascending: false });

  const canEdit = membership.role !== "viewer";

  return (
    <div>
      <PageHeader
        title="Competitive insights"
        description="Manual notes on competitors, plus an AI-assisted summary of what customers actually say about them in their own feedback."
      />

      {canEdit && (
        <div className="mb-6">
          <NewNoteForm />
        </div>
      )}

      {!notes || notes.length === 0 ? (
        <EmptyState title="No competitive notes yet" />
      ) : (
        <div className="stagger-children grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {notes.map((n) => (
            <NoteCard
              key={n.id}
              noteId={n.id}
              competitorName={n.competitor_name as string}
              note={n.note as string}
              aiSummary={n.ai_summary as string | null}
              canEdit={canEdit}
            />
          ))}
        </div>
      )}
    </div>
  );
}
