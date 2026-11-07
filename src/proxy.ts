import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import type { Database } from "@/data/database.types";
import { guardAction, PREVIEW_GUARD } from "@/lib/supabase/guard";

/** Refreshes the Supabase session cookie and gates the app behind /login. */
export async function proxy(request: NextRequest) {
  // Preview guard first: before any Supabase client or session-refresh code exists.
  if (PREVIEW_GUARD) return previewGuardResponse(request);

  let response = NextResponse.next({ request });

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (list) => {
          list.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          list.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  const isAuthRoute = path.startsWith("/login") || path.startsWith("/auth");
  // Demo mode runs the app with no session at all, so both the demo route and
  // the MusicBrainz proxy it searches through have to sit outside the gate.
  // The proxy only reads public catalogue data and is throttled server-side.
  const isPublicRoute = path.startsWith("/demo") || path.startsWith("/api/mb");

  if (isPublicRoute) return response;

  if (!user && !isAuthRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }
  if (user && isAuthRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  return response;
}

/**
 * In a preview-guard build (migrations don't match staging) the app runs as the demo
 * only: pages go to /demo, app APIs answer 503, and nothing creates a Supabase client.
 */
function previewGuardResponse(request: NextRequest) {
  const action = guardAction(request.nextUrl.pathname);
  if (action === "pass") return NextResponse.next({ request });
  if (action === "unavailable") {
    return NextResponse.json(
      { error: "This preview runs in demo mode: its database migrations don't match staging." },
      { status: 503, headers: { "x-earwrm-preview-guard": "demo" } },
    );
  }
  const url = request.nextUrl.clone();
  url.pathname = "/demo";
  url.search = "";
  return NextResponse.redirect(url, { headers: { "x-earwrm-preview-guard": "demo" } });
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
