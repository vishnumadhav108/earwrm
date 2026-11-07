import { afterEach, describe, expect, it, vi } from "vitest";
import { guardAction } from "@/lib/supabase/guard";

describe("guardAction (proxy behaviour in a preview-guard build)", () => {
  it.each([
    ["/_next/static/chunks/main.js"],
    ["/_next/image"],
    ["/favicon.ico"],
    ["/manifest.webmanifest"],
    ["/icon.png"],
    ["/apple-icon.png"],
    ["/next.svg"],
    ["/robots.txt"],
  ])("lets static asset %s through", (p) => expect(guardAction(p)).toBe("pass"));

  it.each([["/demo"], ["/demo/anything"], ["/api/mb/search"], ["/api/mb/release-group/x"]])(
    "lets the demo and the MusicBrainz proxy through (%s)",
    (p) => expect(guardAction(p)).toBe("pass"),
  );

  it.each([["/api/account"], ["/api/anything"], ["/api"]])("answers app API %s with 503", (p) =>
    expect(guardAction(p)).toBe("unavailable"),
  );

  it.each([["/"], ["/login"], ["/auth/callback"], ["/u/someone"], ["/demonstration"]])("sends page %s to /demo", (p) =>
    expect(guardAction(p)).toBe("redirect-demo"),
  );
});

describe("Supabase client factories in a preview-guard build", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  const guarded = () => {
    vi.stubEnv("NEXT_PUBLIC_EARWRM_PREVIEW_GUARD", "1");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "http://127.0.0.1:3198");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "test-anon");
    vi.resetModules();
  };

  it("the browser factory refuses", async () => {
    guarded();
    const { createClient } = await import("@/lib/supabase/client");
    expect(() => createClient()).toThrow(/preview guard/);
  });

  it("the server factory refuses before touching cookies", async () => {
    guarded();
    const { createClient } = await import("@/lib/supabase/server");
    await expect(createClient()).rejects.toThrow(/preview guard/);
  });

  it("the admin factory refuses", async () => {
    guarded();
    const { createAdminClient } = await import("@/lib/supabase/admin");
    expect(() => createAdminClient("service-key")).toThrow(/preview guard/);
  });

  it("feature flags return the default without any network request", async () => {
    guarded();
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("no network in a guard build"));
    const { getFlag } = await import("@/data/featureFlags");
    await expect(getFlag("imports", { default: true })).resolves.toBe(true);
    await expect(getFlag("imports", { default: false })).resolves.toBe(false);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("without the flag, the browser factory creates a client as before", async () => {
    vi.stubEnv("NEXT_PUBLIC_EARWRM_PREVIEW_GUARD", "");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "http://127.0.0.1:54321");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "test-anon");
    vi.resetModules();
    const { createClient } = await import("@/lib/supabase/client");
    expect(typeof createClient().from).toBe("function");
  });
});
