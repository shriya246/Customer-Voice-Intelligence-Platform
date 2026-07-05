import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getCurrentMembership } from "@/lib/org";
import { RegenerateButton } from "./regenerate-button";

export const metadata: Metadata = { title: "Personas — VoiceIQ Enterprise" };

type PersonaRow = {
  id: string;
  name: string;
  description: string;
  persona_themes: { themes: { id: string; name: string | null } | null }[];
};

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
      <Link href="/dashboard" className="text-sm text-gray-500 hover:underline">
        ← Dashboard
      </Link>
      <div className="mt-2 mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Personas</h1>
          <p className="mt-1 text-sm text-gray-500">
            Synthesized from real clustered feedback themes — not hypothetical, and each one traces back to the data it came from.
          </p>
        </div>
        {membership.role !== "viewer" && <RegenerateButton />}
      </div>

      {personas.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-300 p-8 text-center text-sm text-gray-500 dark:border-neutral-700">
          No personas yet — generate some once you have a few labeled themes.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {personas.map((persona) => (
            <div key={persona.id} className="rounded-lg border border-gray-200 p-4 dark:border-neutral-800">
              <p className="font-medium">{persona.name}</p>
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">{persona.description}</p>
              {persona.persona_themes.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1">
                  {persona.persona_themes.map(
                    (pt) =>
                      pt.themes && (
                        <Link
                          key={pt.themes.id}
                          href={`/dashboard?theme=${pt.themes.id}`}
                          className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600 hover:underline dark:bg-neutral-800 dark:text-gray-400"
                        >
                          {pt.themes.name ?? "Unlabeled theme"}
                        </Link>
                      )
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
