import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getCurrentMembership } from "@/lib/org";
import { CsvImportForm } from "./csv-import-form";

export const metadata: Metadata = { title: "Import feedback — VoiceIQ Enterprise" };

export default async function ImportFeedbackPage() {
  const membership = await getCurrentMembership();
  if (!membership) return null;

  const supabase = await createClient();
  const { data: channels } = await supabase
    .from("channels")
    .select("name")
    .eq("org_id", membership.orgId)
    .order("name");

  return (
    <div>
      <Link href="/dashboard" className="text-sm text-gray-500 hover:underline">
        ← Dashboard
      </Link>
      <h1 className="mt-2 mb-2 text-2xl font-semibold">Import feedback from CSV</h1>
      <p className="mb-6 text-sm text-gray-500">
        Covers exports from support tools, review sites, and surveys — map the columns, preview, then import.
      </p>
      <CsvImportForm channelNames={(channels ?? []).map((c) => c.name as string)} />
    </div>
  );
}
