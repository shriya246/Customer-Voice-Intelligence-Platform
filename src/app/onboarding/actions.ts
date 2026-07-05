"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { slugify, slugWithSuffix } from "@/lib/slug";

const onboardingSchema = z.object({
  organizationName: z
    .string()
    .trim()
    .min(2, "Organization name is required")
    .max(200),
});

export type OnboardingState = { error?: string } | undefined;

const MAX_SLUG_ATTEMPTS = 5;

export async function createOrganization(
  _prevState: OnboardingState,
  formData: FormData
): Promise<OnboardingState> {
  const parsed = onboardingSchema.safeParse({
    organizationName: formData.get("organizationName"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const supabase = await createClient();
  const baseSlug = slugify(parsed.data.organizationName) || "org";
  let slug = baseSlug;

  for (let attempt = 0; attempt < MAX_SLUG_ATTEMPTS; attempt++) {
    const { error } = await supabase.rpc("create_organization", {
      p_name: parsed.data.organizationName,
      p_slug: slug,
    });

    if (!error) {
      redirect("/dashboard");
    }

    if (error.code === "23505") {
      slug = slugWithSuffix(baseSlug);
      continue;
    }

    return { error: error.message };
  }

  return { error: "Could not create organization. Try a different name." };
}
