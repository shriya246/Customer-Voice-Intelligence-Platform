import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { AcceptInviteButton } from "./accept-invite-button";

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
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 px-4 dark:bg-neutral-950">
      <div className="w-full max-w-sm rounded-xl border border-gray-200 bg-white p-8 text-center shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
        {!invite ? (
          <p className="text-sm text-gray-600 dark:text-gray-400">
            This invite link isn&apos;t valid.
          </p>
        ) : invite.status !== "pending" ? (
          <p className="text-sm text-gray-600 dark:text-gray-400">
            This invite has already been {invite.status}.
          </p>
        ) : (
          <>
            <h1 className="mb-2 text-xl font-semibold">You&apos;re invited</h1>
            <p className="mb-6 text-sm text-gray-500">
              Join <span className="font-medium">{invite.org_name}</span> as a{" "}
              {invite.role}.
            </p>
            {user ? (
              <AcceptInviteButton token={token} />
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-gray-500">
                  Sign in or create an account with{" "}
                  <span className="font-medium">{invite.email}</span> to accept.
                </p>
                <Link
                  href={`/login?next=${encodeURIComponent(next)}`}
                  className="block w-full rounded-md bg-gray-900 px-3 py-2 text-sm font-medium text-white dark:bg-white dark:text-gray-900"
                >
                  Sign in
                </Link>
                <Link
                  href={`/signup?next=${encodeURIComponent(next)}`}
                  className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm font-medium dark:border-neutral-700"
                >
                  Create account
                </Link>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
