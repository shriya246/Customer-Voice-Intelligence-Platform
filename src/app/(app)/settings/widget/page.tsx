import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getCurrentMembership } from "@/lib/org";
import { ChannelEmbed } from "./channel-embed";

export const metadata: Metadata = { title: "Feedback widget — VoiceIQ Enterprise" };

export default async function WidgetSettingsPage() {
  const membership = await getCurrentMembership();
  if (!membership) return null;

  const supabase = await createClient();
  const { data: channels } = await supabase
    .from("channels")
    .select("id, name")
    .eq("org_id", membership.orgId)
    .order("name");

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";

  return (
    <div>
      <Link href="/settings" className="text-sm text-gray-500 hover:underline">
        ← Settings
      </Link>
      <h1 className="mt-2 mb-2 text-2xl font-semibold">Feedback widget</h1>
      <p className="mb-6 text-sm text-gray-500">
        Embed this on your own site to collect feedback directly into a channel — no login required for whoever fills it out.
      </p>

      {!channels || channels.length === 0 ? (
        <p className="text-sm text-gray-500">
          No channels yet — log or import some feedback first to create one.
        </p>
      ) : (
        <div className="space-y-3">
          {channels.map((channel) => (
            <ChannelEmbed
              key={channel.id}
              name={channel.name as string}
              snippet={`<iframe src="${appUrl}/widget/${channel.id}" width="100%" height="280" style="border:1px solid #e5e7eb;border-radius:8px;"></iframe>`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
