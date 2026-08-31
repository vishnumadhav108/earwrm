import { NextResponse } from "next/server";
import { isAbortError } from "@/lib/abort";
import { getRelease } from "@/lib/musicbrainz";

export const runtime = "nodejs";

export async function GET(request: Request, ctx: { params: Promise<{ mbid: string }> }) {
  const { mbid } = await ctx.params;
  try {
    const release = await getRelease(mbid, request.signal);
    if (!release) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ release });
  } catch (err) {
    // The client gave up (kept typing). Not an error worth logging.
    if (isAbortError(err)) return new Response(null, { status: 499 });
    console.error("mb/release-group", err);
    return NextResponse.json({ error: "Lookup failed." }, { status: 502 });
  }
}
