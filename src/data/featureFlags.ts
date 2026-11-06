import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/data/database.types";
import { flagOn, type FlagRow } from "@/lib/flags";
import { TtlCache } from "@/lib/rateLimit";

/**
 * Server-side reads of public.feature_flags, used as kill switches (imports,
 * enrichment, recommendations).
 *
 * - Flags are public (RLS lets anon read them), so this uses a plain anon client with
 *   no session cookies. It works in route handlers, Server Components and background
 *   code alike.
 * - All flags are read in one query and cached for 30 s per server instance. A failed
 *   read is cached too, so an outage doesn't send one request per check.
 * - **Any failure returns the caller's default.** That includes a missing table, before
 *   the migration reaches an environment. Pick defaults so that "flags unreadable"
 *   leaves the app in its safe state.
 */

const TTL_MS = 30_000;
const cache = new TtlCache<Map<string, FlagRow> | null>(TTL_MS, 1);

let client: SupabaseClient<Database> | null = null;
function anonClient(): SupabaseClient<Database> | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  client ??= createClient<Database>(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  return client;
}

async function loadFlags(): Promise<Map<string, FlagRow> | null> {
  const hit = cache.get("all");
  if (hit !== undefined) return hit;
  let flags: Map<string, FlagRow> | null = null;
  try {
    const supabase = anonClient();
    if (supabase) {
      const { data, error } = await supabase.from("feature_flags").select("key, enabled, rollout");
      if (error) throw error;
      flags = new Map(data.map((r) => [r.key, r]));
    }
  } catch (err) {
    console.error("feature flags unavailable, using defaults", err instanceof Error ? err.name : "error");
    flags = null;
  }
  cache.set("all", flags);
  return flags;
}

/** A flag with no per-user rollout (or evaluated for nobody): on only if enabled at 100%. */
export async function getFlag(key: string, opts: { default: boolean }): Promise<boolean> {
  const flags = await loadFlags();
  return flags ? flagOn(flags.get(key), opts.default) : opts.default;
}

/** A flag evaluated for one user, honouring `rollout`. */
export async function isEnabledFor(key: string, userId: string, opts: { default: boolean }): Promise<boolean> {
  const flags = await loadFlags();
  return flags ? flagOn(flags.get(key), opts.default, userId) : opts.default;
}
