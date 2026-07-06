import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getCurrentMembership } from "@/lib/org";
import { RegenerateButton } from "./regenerate-button";
import { PageHeader } from "@/components/ui/page-header";
import { Card, EmptyState } from "@/components/ui/card";

export const metadata: Metadata = { title: "Personas — VoiceIQ Enterprise" };

type PersonaRow = {
  id: string;
  name: string;
  description: string;
  persona_themes: { themes: { id: string; name: string | null } | null }[];
};

const AVATAR_COLORS = [
  "bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300",
  "bg-teal-100 text-teal-700 dark:bg-teal-950 dark:text-teal-300",
  "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
  "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300",
  "bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300",
];

export default async function PersonasPage() {
  const membership = await getCurrentMembership();
  if (!membership) return null;

  const supabase = await createClient();
  const { data } = await supabase
    .from("personas")
    .select("id, name, description, persona_themes(themes(id, name))")
    .eq("org_id", membership.orgId)
    .order("created_at", { ascending: false });

  const personas = (data ?? []) as unknown as PersonaRow[];

  return (
    <div>
      <PageHeader
        title="Personas"
        description="Synthesized from real clustered feedback themes — not hypothetical, and each one traces back to the data it came from."
        action={membership.role !== "viewer" ? <RegenerateButton /> : undefined}
      />

      {personas.length === 0 ? (
        <EmptyState
          title="No personas yet"
          description="Generate some once you have a few labeled themes."
        />
      ) : (
        <div className="stagger-children grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {personas.map((persona, i) => (
            <Card key={persona.id} interactive className="p-4">
              <div className="flex items-center gap-3">
                <div
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-semibold ${AVATAR_COLORS[i % AVATAR_COLORS.length]}`}
                >
                  {persona.name.charAt(0).toUpperCase()}
                </div>
                <p className="font-medium text-foreground">{persona.name}</p>
              </div>
              <p className="mt-3 text-sm text-muted-foreground">{persona.description}</p>
              {persona.persona_themes.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {persona.persona_themes.map(
                    (pt) =>
                      pt.themes && (
                        <Link
                          key={pt.themes.id}
                          href={`/dashboard?theme=${pt.themes.id}`}
                          className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground transition-colors hover:bg-primary-soft hover:text-primary-soft-foreground"
                        >
                          {pt.themes.name ?? "Unlabeled theme"}
                        </Link>
                      )
                  )}
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
