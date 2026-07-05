"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentMembership } from "@/lib/org";

function parseOverride(value: FormDataEntryValue | null): number | null {
  if (typeof value !== "string" || value.trim() === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export async function updateThemeScoring(formData: FormData) {
  const themeId = formData.get("themeId");
  if (typeof themeId !== "string") return;

  const membership = await getCurrentMembership();
  if (!membership) throw new Error("Not authenticated");
  if (membership.role === "viewer") throw new Error("Viewers can't edit scoring.");

  const impactOverride = parseOverride(formData.get("impactOverride"));
  const confidenceOverride = parseOverride(formData.get("confidenceOverride"));
  const effortRaw = parseOverride(formData.get("effort"));
  const effort = effortRaw !== null && effortRaw > 0 ? effortRaw : 1;

  const supabase = await createClient();
  const { error } = await supabase
    .from("themes")
    .update({
      impact_override: impactOverride,
      confidence_override: confidenceOverride,
      effort,
    })
    .eq("id", themeId);
  if (error) throw new Error(error.message);

  await supabase.rpc("log_audit_event", {
    p_org_id: membership.orgId,
    p_action: "theme.scoring_updated",
    p_target_type: "theme",
    p_target_id: themeId,
    p_metadata: { impact_override: impactOverride, confidence_override: confidenceOverride, effort },
  });

  revalidatePath("/opportunities");
}
