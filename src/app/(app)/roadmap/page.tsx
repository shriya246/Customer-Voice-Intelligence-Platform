import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getCurrentMembership } from "@/lib/org";
import { RoadmapItemCard } from "./roadmap-item-card";
import { NewItemForm } from "./new-item-form";

export const metadata: Metadata = { title: "Roadmap — VoiceIQ Enterprise" };

const COLUMNS = [
  { value: "under_review", label: "Under review" },
  { value: "planned", label: "Planned" },
  { value: "in_progress", label: "In progress" },
  { value: "shipped", label: "Shipped" },
  { value: "declined", label: "Declined" },
];

type RoadmapItem = {
  id: string;
  title: string;
  description: string | null;
  status: string;
  theme_id: string | null;
  themes: { name: string | null } | null;
};

export default async function RoadmapPage() {
  const membership = await getCurrentMembership();
  if (!membership) return null;

  const supabase = await createClient();
  const [{ data: items }, { data: themes }] = await Promise.all([
    supabase
      .from("roadmap_items")
      .select("id, title, description, status, theme_id, themes(name)")
      .eq("org_id", membership.orgId)
      .order("created_at", { ascending: false }),
    supabase.from("themes").select("id, name").eq("org_id", membership.orgId),
  ]);

  const rows = (items ?? []) as unknown as RoadmapItem[];
  const canEdit = membership.role !== "viewer";

  return (
    <div>
      <Link href="/dashboard" className="text-sm text-gray-500 hover:underline">
        ← Dashboard
      </Link>
      <div className="mt-2 mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Roadmap</h1>
          <p className="mt-1 text-sm text-gray-500">
            Feature requests, linked back to the customer feedback that motivated them.
          </p>
        </div>
        {canEdit && <NewItemForm themes={themes ?? []} />}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {COLUMNS.map((col) => {
          const columnItems = rows.filter((item) => item.status === col.value);
          return (
            <div key={col.value}>
              <h2 className="mb-2 text-sm font-medium text-gray-500">
                {col.label} <span className="text-gray-400">({columnItems.length})</span>
              </h2>
              <div className="space-y-2">
                {columnItems.map((item) => (
                  <RoadmapItemCard
                    key={item.id}
                    itemId={item.id}
                    title={item.title}
                    description={item.description}
                    status={item.status}
                    themeId={item.theme_id}
                    themeName={item.themes?.name ?? null}
                    canEdit={canEdit}
                  />
                ))}
                {columnItems.length === 0 && (
                  <p className="text-xs text-gray-400 italic">Nothing here</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
