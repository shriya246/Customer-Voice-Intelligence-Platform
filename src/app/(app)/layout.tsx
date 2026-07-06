import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getCurrentMembership, listMemberships } from "@/lib/org";
import { signOut } from "./actions";
import { OrgSwitcher } from "./org-switcher";
import { AppSidebar, MobileNav } from "@/components/app-sidebar";
import { ThemeToggle } from "@/components/theme-toggle";

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
    <div className="flex min-h-screen bg-background">
      <AppSidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-border bg-surface px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <MobileNav />
            <Link
              href="/dashboard"
              className="hidden font-semibold tracking-tight text-foreground md:inline"
            >
              VoiceIQ
            </Link>
            <span className="hidden text-border-strong md:inline">/</span>
            <OrgSwitcher memberships={memberships} currentOrgId={membership.orgId} />
          </div>
          <div className="flex items-center gap-1.5">
            <ThemeToggle />
            <Link
              href="/settings"
              className="rounded-md px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-surface-hover hover:text-foreground"
            >
              Settings
            </Link>
            <form action={signOut}>
              <button
                type="submit"
                className="rounded-md px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-surface-hover hover:text-foreground"
              >
                Sign out
              </button>
            </form>
          </div>
        </header>
        <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 sm:px-6 lg:px-8">
          <div key={membership.orgId} className="animate-fade-in">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
