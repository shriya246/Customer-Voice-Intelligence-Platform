import "server-only";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

/**
 * Service-role client for trusted server-only code (the public widget
 * ingestion endpoint, audit-log writes). Bypasses RLS entirely, so every
 * caller is responsible for its own authorization checks before using it.
 * The `server-only` import makes an accidental client-bundle import a build
 * error instead of a leaked secret.
 */
export function createAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}
