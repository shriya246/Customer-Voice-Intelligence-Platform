import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentMembership } from "@/lib/org";
import { OnboardingForm } from "./onboarding-form";

export const metadata: Metadata = { title: "Set up your organization — VoiceIQ Enterprise" };

export default async function OnboardingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const membership = await getCurrentMembership();
  if (membership) {
    redirect("/dashboard");
  }

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-background px-4">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_60%_50%_at_50%_-10%,var(--color-primary-soft),transparent)] opacity-60"
      />
      <div className="w-full max-w-sm animate-slide-up rounded-xl border border-border bg-surface p-8 shadow-sm">
        <h1 className="mb-2 text-xl font-semibold text-foreground">Name your organization</h1>
        <p className="mb-6 text-sm text-muted-foreground">
          This is the workspace your team&apos;s feedback will live in. You can invite teammates afterward.
        </p>
        <OnboardingForm />
      </div>
    </div>
  );
}
