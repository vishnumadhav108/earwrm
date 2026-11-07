import { expect, openDemo, searchAndPick, test } from "../e2e/fixtures";

/**
 * A preview-guard build must behave as the demo only, and nothing (browser or Next.js
 * server) may contact Supabase. The build's Supabase URL is a tripwire on :3198 that
 * records every request it receives.
 *
 * Every request carries a well-formed (fake) Supabase session cookie. Without one,
 * supabase-js skips the network entirely and a leak would go unnoticed. With one, an
 * unguarded proxy or page calls GET /auth/v1/user on the tripwire. (Checked: with the
 * guard flag removed, the tripwire check fails.)
 */
const TRIPWIRE = "http://127.0.0.1:3198/__tripwire/requests";
const BASE = "http://127.0.0.1:3101";

const b64url = (s: string) => Buffer.from(s).toString("base64url");
const exp = Math.floor(Date.now() / 1000) + 3600;
const jwt = [
  b64url(JSON.stringify({ alg: "HS256", typ: "JWT" })),
  b64url(
    JSON.stringify({ sub: "00000000-0000-4000-8000-0000000000ee", role: "authenticated", aud: "authenticated", exp }),
  ),
  "fake-signature",
].join(".");
// @supabase/ssr cookie: sb-<first label of the Supabase host>-auth-token = "base64-" + base64url(session JSON)
const SESSION_COOKIE = {
  name: "sb-127-auth-token",
  value:
    "base64-" +
    b64url(
      JSON.stringify({
        access_token: jwt,
        token_type: "bearer",
        expires_in: 3600,
        expires_at: exp,
        refresh_token: "fake-refresh-token",
        user: { id: "00000000-0000-4000-8000-0000000000ee", aud: "authenticated", role: "authenticated" },
      }),
    ),
};
const cookieHeader = { cookie: `${SESSION_COOKIE.name}=${SESSION_COOKIE.value}` };

test.describe.configure({ mode: "serial" });

test("pages redirect to /demo", async ({ request }) => {
  for (const path of ["/", "/login", "/some/unknown/page"]) {
    const res = await request.get(path, { maxRedirects: 0, headers: cookieHeader });
    expect(res.status(), path).toBe(307);
    expect(new URL(res.headers()["location"], BASE).pathname, path).toBe("/demo");
    expect(res.headers()["x-earwrm-preview-guard"], path).toBe("demo");
  }
});

test("app APIs answer 503 for every method", async ({ request }) => {
  for (const method of ["GET", "POST", "DELETE"] as const) {
    const res = await request.fetch("/api/account", { method, maxRedirects: 0, headers: cookieHeader });
    expect(res.status(), method).toBe(503);
    expect((await res.json()).error).toContain("demo mode");
  }
});

test("static assets and the MusicBrainz proxy pass through", async ({ request }) => {
  expect((await request.get("/favicon.ico", { maxRedirects: 0, headers: cookieHeader })).status()).toBe(200);
  // No query → the route answers locally without calling MusicBrainz.
  const mb = await request.get("/api/mb/search", { maxRedirects: 0, headers: cookieHeader });
  expect(mb.status()).toBe(200);
  expect(await mb.json()).toEqual({ results: [] });
});

test("the demo works, and / lands on it", async ({ page, context }) => {
  await context.addCookies([{ ...SESSION_COOKIE, url: BASE }]);
  await page.goto("/");
  await expect(page).toHaveURL(/\/demo$/);
  await openDemo(page);
  await page.getByRole("button", { name: "Log a release" }).click();
  await searchAndPick(page, "E2E Test Album");
  await page.getByRole("button", { name: "Review or log" }).click();
  await page.getByRole("button", { name: "Save" }).first().click();
  await expect(page.getByText("E2E Test Album", { exact: true })).toBeVisible();
});

test("nothing reached Supabase, from the browser or the server", async ({ request }) => {
  const res = await request.get(TRIPWIRE);
  const body = (await res.json()) as { count: number; requests: { method: string; path: string; from: string }[] };
  expect(body.requests, "requests that reached the Supabase tripwire").toEqual([]);
  expect(body.count).toBe(0);
});
