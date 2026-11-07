/**
 * Preview guard. A Vercel preview whose migrations don't match staging is built with
 * NEXT_PUBLIC_EARWRM_PREVIEW_GUARD=1 (scripts/vercel-build.mjs). In such a build:
 *   - proxy.ts sends every page to /demo and answers app APIs with 503;
 *   - every Supabase client factory refuses to create a client, so no code path, browser
 *     or server, can reach the shared staging database.
 * The flag is inlined at build time, so production and local builds never take these
 * branches.
 */
export const PREVIEW_GUARD = process.env.NEXT_PUBLIC_EARWRM_PREVIEW_GUARD === "1";

export class SupabaseDisabledError extends Error {
  constructor() {
    super("Supabase is disabled in this preview build: its migrations don't match staging (preview guard).");
    this.name = "SupabaseDisabledError";
  }
}

/** Throws in a preview-guard build. Call before creating any Supabase client. */
export function assertSupabaseAllowed(): void {
  if (PREVIEW_GUARD) throw new SupabaseDisabledError();
}

export type GuardAction = "pass" | "redirect-demo" | "unavailable";

const STATIC_FILE = /\.(?:svg|png|jpg|jpeg|gif|webp|ico|avif|txt|xml|webmanifest|json|woff2?|css|js|map)$/i;

/**
 * What the proxy does with a path in a preview-guard build. Static assets and the demo
 * (with the MusicBrainz proxy it searches through) keep working; app APIs answer 503;
 * every other page goes to /demo.
 */
export function guardAction(pathname: string): GuardAction {
  if (
    pathname.startsWith("/_next/") ||
    pathname === "/favicon.ico" ||
    pathname.startsWith("/manifest") ||
    pathname.startsWith("/icon") ||
    pathname.startsWith("/apple-icon") ||
    STATIC_FILE.test(pathname)
  ) {
    return "pass";
  }
  if (pathname === "/demo" || pathname.startsWith("/demo/")) return "pass";
  if (pathname === "/api/mb" || pathname.startsWith("/api/mb/")) return "pass";
  if (pathname === "/api" || pathname.startsWith("/api/")) return "unavailable";
  return "redirect-demo";
}
