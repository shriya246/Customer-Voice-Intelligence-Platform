import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getCurrentMembership } from "@/lib/org";
import { GenerateButton } from "./generate-button";

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
      <Link href="/dashboard" className="text-sm text-gray-500 hover:underline">
        ← Dashboard
      </Link>
      <div className="mt-2 mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Executive summary</h1>
          <p className="mt-1 text-sm text-gray-500">
            What customers are asking for and why it matters — generated from real opportunity scores, trends, and roadmap status.
          </p>
        </div>
        {membership.role !== "viewer" && <GenerateButton />}
      </div>

      {!latest ? (
        <div className="rounded-lg border border-dashed border-gray-300 p-8 text-center text-sm text-gray-500 dark:border-neutral-700">
          No summary generated yet.
        </div>
      ) : (
        <div className="rounded-lg border border-gray-200 p-6 dark:border-neutral-800">
          <p className="text-xs text-gray-400">{new Date(latest.created_at).toLocaleString()}</p>
          <p className="mt-2 leading-relaxed text-gray-800 dark:text-gray-200">{latest.content}</p>
        </div>
      )}

      {history.length > 0 && (
        <div className="mt-8">
          <h2 className="mb-3 text-sm font-medium text-gray-500">Previous summaries</h2>
          <div className="space-y-3">
            {history.map((s) => (
              <div key={s.id} className="rounded-lg border border-gray-100 p-4 text-sm dark:border-neutral-800">
                <p className="text-xs text-gray-400">{new Date(s.created_at).toLocaleString()}</p>
                <p className="mt-1 text-gray-600 dark:text-gray-400">{s.content}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
