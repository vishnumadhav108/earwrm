import type { NextConfig } from "next";
import { PHASE_DEVELOPMENT_SERVER } from "next/constants";

const LOOPBACK = new Set(["127.0.0.1", "localhost", "[::1]", "::1"]);

/**
 * `next dev` must never talk to a hosted Supabase project by accident. `.env.local`
 * points at production, so without `.env.development.local` (written by
 * `npm run env:local`) a plain `npm run dev` would read and write production data.
 * Set EARWRM_ALLOW_REMOTE_DB=1 to opt in on purpose. See docs/STAGING.md § Local
 * development. Only the dev server checks this: builds and `next start` are unaffected.
 */
function assertLocalDatabaseForDev() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  let host = "";
  try {
    host = new URL(url).hostname;
  } catch {
    // Unset or malformed: the app can't reach any database, so there's nothing to guard.
    return;
  }
  if (LOOPBACK.has(host) || process.env.EARWRM_ALLOW_REMOTE_DB === "1") return;
  throw new Error(
    `next dev is pointed at a hosted Supabase project (${host}). ` +
      "Run `supabase start` and `npm run env:local` to use the local stack, " +
      "or set EARWRM_ALLOW_REMOTE_DB=1 if you really mean to use this one.",
  );
}

export default function config(phase: string): NextConfig {
  if (phase === PHASE_DEVELOPMENT_SERVER) assertLocalDatabaseForDev();
  return {};
}
