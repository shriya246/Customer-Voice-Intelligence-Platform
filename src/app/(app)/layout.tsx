import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getCurrentMembership, listMemberships } from "@/lib/org";
import { signOut } from "./actions";
import { OrgSwitcher } from "./org-switcher";

export default async function AppLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const membership = await getCurrentMembership();
  if (!membership) {
    redirect("/onboarding");
  }

  const memberships = await listMemberships();

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-neutral-950">
      <header className="flex items-center justify-between border-b border-gray-200 bg-white px-6 py-4 dark:border-neutral-800 dark:bg-neutral-900">
        <div className="flex items-center gap-3">
          <Link href="/dashboard" className="font-semibold tracking-tight">
            VoiceIQ Enterprise
          </Link>
          <span className="text-sm text-gray-400">/</span>
          <OrgSwitcher memberships={memberships} currentOrgId={membership.orgId} />
        </div>
        <div className="flex items-center gap-4">
          <Link
            href="/settings"
            className="text-sm text-gray-500 hover:text-gray-900 dark:hover:text-gray-100"
          >
            Settings
          </Link>
          <form action={signOut}>
            <button
              type="submit"
              className="text-sm text-gray-500 underline hover:text-gray-900 dark:hover:text-gray-100"
            >
              Sign out
            </button>
          </form>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-6 py-8">{children}</main>
    </div>
  );
}
