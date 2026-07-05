import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getCurrentMembership } from "@/lib/org";
import { FeedbackForm } from "./feedback-form";

export const metadata: Metadata = { title: "Log feedback — VoiceIQ Enterprise" };

export default async function NewFeedbackPage() {
  const membership = await getCurrentMembership();
  if (!membership) return null;

  const supabase = await createClient();
  const [{ data: channels }, { data: customers }] = await Promise.all([
    supabase
      .from("channels")
      .select("name")
      .eq("org_id", membership.orgId)
      .order("name"),
    supabase
      .from("customers")
      .select("name")
      .eq("org_id", membership.orgId)
      .not("name", "is", null)
      .order("name"),
  ]);

  return (
    <div>
      <Link href="/dashboard" className="text-sm text-gray-500 hover:underline">
        ← Dashboard
      </Link>
      <h1 className="mt-2 mb-6 text-2xl font-semibold">Log feedback</h1>
      <FeedbackForm
        channelNames={(channels ?? []).map((c) => c.name as string)}
        customerNames={(customers ?? []).map((c) => c.name as string)}
      />
    </div>
  );
}
