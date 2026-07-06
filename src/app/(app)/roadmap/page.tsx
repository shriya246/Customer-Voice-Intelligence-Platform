import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { getCurrentMembership } from "@/lib/org";
import { RoadmapItemCard } from "./roadmap-item-card";
import { NewItemForm } from "./new-item-form";
import { PageHeader } from "@/components/ui/page-header";

export const metadata: Metadata = { title: "Roadmap — VoiceIQ Enterprise" };

const COLUMNS = [
  { value: "under_review", label: "Under review", dot: "bg-muted-foreground" },
  { value: "planned", label: "Planned", dot: "bg-primary" },
  { value: "in_progress", label: "In progress", dot: "bg-orange-500" },
  { value: "shipped", label: "Shipped", dot: "bg-emerald-500" },
  { value: "declined", label: "Declined", dot: "bg-red-400" },
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
      <PageHeader
        title="Roadmap"
        description="Feature requests, linked back to the customer feedback that motivated them."
        action={canEdit ? <NewItemForm themes={themes ?? []} /> : undefined}
      />

      <div className="stagger-children grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {COLUMNS.map((col) => {
          const columnItems = rows.filter((item) => item.status === col.value);
          return (
            <div key={col.value}>
              <h2 className="mb-2 flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
                <span className={`h-1.5 w-1.5 rounded-full ${col.dot}`} />
                {col.label} <span className="text-muted-foreground/70">({columnItems.length})</span>
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
                  <p className="text-xs italic text-muted-foreground/70">Nothing here</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
