"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type AcceptInviteState = { error: string } | undefined;

export async function acceptInvite(
  token: string,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- required by useActionState's (state, payload) shape
  _prevState: AcceptInviteState
): Promise<AcceptInviteState> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("accept_invite", { p_token: token });

  if (error) {
    return { error: error.message };
  }

  redirect("/dashboard");
}
