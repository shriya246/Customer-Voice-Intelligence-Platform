import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { getCurrentMembership } from "@/lib/org";
import { CsvImportForm } from "./csv-import-form";
import { PageHeader } from "@/components/ui/page-header";

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
      <PageHeader
        title="Import feedback from CSV"
        description="Covers exports from support tools, review sites, and surveys — map the columns, preview, then import."
      />
      <CsvImportForm channelNames={(channels ?? []).map((c) => c.name as string)} />
    </div>
  );
}
