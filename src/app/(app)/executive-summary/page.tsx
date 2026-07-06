import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { getCurrentMembership } from "@/lib/org";
import { GenerateButton } from "./generate-button";
import { PageHeader } from "@/components/ui/page-header";
import { Card, EmptyState } from "@/components/ui/card";

export const metadata: Metadata = { title: "Executive summary — VoiceIQ Enterprise" };

type SummaryRow = { id: string; content: string; created_at: string };

export default async function ExecutiveSummaryPage() {
  const membership = await getCurrentMembership();
  if (!membership) return null;

  const supabase = await createClient();
  const { data } = await supabase
    .from("executive_summaries")
    .select("id, content, created_at")
    .eq("org_id", membership.orgId)
    .order("created_at", { ascending: false })
    .limit(12);

  const summaries = (data ?? []) as SummaryRow[];
  const [latest, ...history] = summaries;

  return (
    <div>
      <PageHeader
        title="Executive summary"
        description="What customers are asking for and why it matters — generated from real opportunity scores, trends, and roadmap status."
        action={membership.role !== "viewer" ? <GenerateButton /> : undefined}
      />

      {!latest ? (
        <EmptyState title="No summary generated yet" />
      ) : (
        <Card className="animate-slide-up border-primary/20 bg-primary-soft/30 p-6">
          <p className="text-xs text-muted-foreground">{new Date(latest.created_at).toLocaleString()}</p>
          <p className="mt-2 leading-relaxed text-foreground">{latest.content}</p>
        </Card>
      )}

      {history.length > 0 && (
        <div className="mt-8">
          <h2 className="mb-3 text-sm font-medium text-muted-foreground">Previous summaries</h2>
          <div className="stagger-children space-y-3">
            {history.map((s) => (
              <Card key={s.id} className="p-4 text-sm">
                <p className="text-xs text-muted-foreground">{new Date(s.created_at).toLocaleString()}</p>
                <p className="mt-1 text-muted-foreground">{s.content}</p>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
