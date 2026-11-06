import { describe, expect, it } from "vitest";
import { bucketOf, flagOn, type FlagRow } from "@/lib/flags";

const row = (p: Partial<FlagRow> = {}): FlagRow => ({ key: "imports", enabled: true, rollout: 100, ...p });

describe("bucketOf", () => {
  it("is stable and within 0-99", () => {
    const b = bucketOf("imports", "user-1");
    expect(bucketOf("imports", "user-1")).toBe(b);
    expect(b).toBeGreaterThanOrEqual(0);
    expect(b).toBeLessThan(100);
  });

  it("spreads users roughly evenly", () => {
    const counts = new Array(10).fill(0);
    for (let i = 0; i < 10_000; i++) counts[Math.floor(bucketOf("imports", `user-${i}`) / 10)]++;
    for (const c of counts) expect(c).toBeGreaterThan(800);
  });

  it("buckets the same user differently per flag", () => {
    const differs = Array.from({ length: 50 }, (_, i) => bucketOf("a", `u${i}`) !== bucketOf("b", `u${i}`));
    expect(differs.filter(Boolean).length).toBeGreaterThan(40);
  });
});

describe("flagOn", () => {
  it("uses the caller's default when the flag has no row", () => {
    expect(flagOn(undefined, true)).toBe(true);
    expect(flagOn(undefined, false, "user-1")).toBe(false);
  });

  it("is off when disabled, whatever the default or rollout", () => {
    expect(flagOn(row({ enabled: false }), true, "user-1")).toBe(false);
  });

  it("is on for everyone at 100% rollout, including signed-out callers", () => {
    expect(flagOn(row(), false)).toBe(true);
    expect(flagOn(row(), false, "user-1")).toBe(true);
  });

  it("is off for everyone at 0% rollout", () => {
    expect(flagOn(row({ rollout: 0 }), true, "user-1")).toBe(false);
  });

  it("is off for signed-out callers on a partial rollout", () => {
    expect(flagOn(row({ rollout: 50 }), true)).toBe(false);
  });

  it("follows the user's bucket on a partial rollout", () => {
    for (let i = 0; i < 200; i++) {
      const u = `user-${i}`;
      expect(flagOn(row({ rollout: 30 }), false, u)).toBe(bucketOf("imports", u) < 30);
    }
  });

  it("clamps out-of-range rollout values", () => {
    expect(flagOn(row({ rollout: 150 }), false, "u")).toBe(true);
    expect(flagOn(row({ rollout: -5 }), true, "u")).toBe(false);
  });
});
