import { NextResponse } from "next/server";
import { isAbortError } from "@/lib/abort";
import { searchReleases, searchTitles } from "@/lib/musicbrainz";

export const runtime = "nodejs";

/**
 * Search proxy. The browser must never call MusicBrainz directly: the required
 * User-Agent cannot be set from fetch() in a browser, and per-tab traffic would
 * blow past the ~1 req/sec limit.
 *
 * `request.signal` is forwarded so that when the client abandons a search (the
 * user kept typing), the queued MusicBrainz calls are dropped instead of
 * holding the rate-limit slot against the search the user is actually waiting on.
 *
 * `stage=1` runs the title branch only — one upstream call, so the UI can paint
 * in roughly a third of the time. The client follows up with the full search.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const q = url.searchParams.get("q")?.trim() ?? "";
  const stage = url.searchParams.get("stage");
  if (!q) return NextResponse.json({ results: [] });
  try {
    const results = stage === "1"
      ? await searchTitles(q, 25, request.signal)
      : await searchReleases(q, 25, request.signal);
    return NextResponse.json({ results });
  } catch (err) {
    // The client gave up (kept typing). Not an error worth logging.
    if (isAbortError(err)) return new Response(null, { status: 499 });
    console.error("mb/search", err);
    return NextResponse.json({ error: "Search is unavailable right now." }, { status: 502 });
  }
}
