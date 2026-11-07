import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/data/database.types";
import { assertSupabaseAllowed } from "./guard";

/** Service-role client for admin operations (server only). Refuses in a preview-guard build. */
export function createAdminClient(serviceKey: string) {
  assertSupabaseAllowed();
  return createClient<Database>(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
