import { createClient } from "@/lib/supabase/server";
import { AcceptInviteButton } from "./accept-invite-button";
import { ButtonLink } from "@/components/ui/button";

export default async function InvitePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const supabase = await createClient();

  const { data: invites } = await supabase.rpc("get_invite_by_token", {
    p_token: token,
  });
  const invite = invites?.[0];

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const next = `/invite/${token}`;

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-background px-4">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_60%_50%_at_50%_-10%,var(--color-primary-soft),transparent)] opacity-60"
      />
      <div className="w-full max-w-sm animate-slide-up rounded-xl border border-border bg-surface p-8 text-center shadow-sm">
        {!invite ? (
          <p className="text-sm text-muted-foreground">This invite link isn&apos;t valid.</p>
        ) : invite.status !== "pending" ? (
          <p className="text-sm text-muted-foreground">This invite has already been {invite.status}.</p>
        ) : (
          <>
            <h1 className="mb-2 text-xl font-semibold text-foreground">You&apos;re invited</h1>
            <p className="mb-6 text-sm text-muted-foreground">
              Join <span className="font-medium text-foreground">{invite.org_name}</span> as a {invite.role}.
            </p>
            {user ? (
              <AcceptInviteButton token={token} />
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Sign in or create an account with{" "}
                  <span className="font-medium text-foreground">{invite.email}</span> to accept.
                </p>
                <ButtonLink href={`/login?next=${encodeURIComponent(next)}`} className="w-full">
                  Sign in
                </ButtonLink>
                <ButtonLink
                  href={`/signup?next=${encodeURIComponent(next)}`}
                  variant="secondary"
                  className="w-full"
                >
                  Create account
                </ButtonLink>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
