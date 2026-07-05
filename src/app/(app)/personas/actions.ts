"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentMembership } from "@/lib/org";
import { generatePersonas } from "@/lib/groq";

export type RegenerateState = { error: string } | { count: number } | undefined;

/**
 * Replaces the org's whole persona set with a freshly-generated one rather
 * than trying to merge/update -- "regenerate" is framed to the user as
 * producing a new snapshot from current data, not incrementally editing a
 * prior set, so wholesale replacement matches that framing rather than
 * leaving stale personas from an earlier, smaller slice of themes.
 */
export async function regeneratePersonas(): Promise<RegenerateState> {
  const membership = await getCurrentMembership();
  if (!membership) throw new Error("Not authenticated");
  if (membership.role === "viewer") return { error: "Viewers can't generate personas." };

  const supabase = await createClient();
  const { data: themes, error: themesError } = await supabase
    .from("themes")
    .select("id, name, summary")
    .eq("org_id", membership.orgId)
    .not("name", "is", null);
  if (themesError) return { error: themesError.message };

  if (!themes || themes.length === 0) {
    return { error: "No labeled themes yet — feedback needs to be clustered and labeled first." };
  }

  let generated;
  try {
    generated = await generatePersonas(
      themes.map((t) => ({ name: t.name as string, summary: t.summary as string | null }))
    );
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Persona generation failed" };
  }

  const nameToId = new Map(themes.map((t) => [t.name as string, t.id as string]));

  await supabase.from("personas").delete().eq("org_id", membership.orgId);

  let created = 0;
  for (const persona of generated) {
    const { data: row, error: insertError } = await supabase
      .from("personas")
      .insert({ org_id: membership.orgId, name: persona.name, description: persona.description })
      .select("id")
      .single();
    if (insertError) continue;

    const themeIds = persona.based_on_themes
      .map((themeName) => nameToId.get(themeName))
      .filter((id): id is string => Boolean(id));
    if (themeIds.length > 0) {
      await supabase
        .from("persona_themes")
        .insert(themeIds.map((themeId) => ({ persona_id: row.id, theme_id: themeId })));
    }
    created++;
  }

  await supabase.rpc("log_audit_event", {
    p_org_id: membership.orgId,
    p_action: "personas.regenerated",
    p_metadata: { count: created },
  });

  revalidatePath("/personas");
  return { count: created };
}
