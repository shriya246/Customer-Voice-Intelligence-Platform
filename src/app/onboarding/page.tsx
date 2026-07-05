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
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 px-4 dark:bg-neutral-950">
      <div className="w-full max-w-sm rounded-xl border border-gray-200 bg-white p-8 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
        <h1 className="mb-2 text-xl font-semibold">Name your organization</h1>
        <p className="mb-6 text-sm text-gray-500">
          This is the workspace your team&apos;s feedback will live in. You can invite teammates afterward.
        </p>
        <OnboardingForm />
      </div>
    </div>
  );
}
