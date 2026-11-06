import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { TtlCache } from "@/lib/rateLimit";

describe("TtlCache", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("returns a value until its TTL passes, then forgets it", () => {
    const c = new TtlCache<string>(1000);
    c.set("k", "v");
    vi.advanceTimersByTime(1000);
    expect(c.get("k")).toBe("v");
    vi.advanceTimersByTime(1);
    expect(c.get("k")).toBeUndefined();
  });

  it("returns undefined for a key it never had", () => {
    expect(new TtlCache<number>(1000).get("missing")).toBeUndefined();
  });

  it("can store falsy values", () => {
    const c = new TtlCache<number | null>(1000);
    c.set("zero", 0);
    c.set("null", null);
    expect(c.get("zero")).toBe(0);
    expect(c.get("null")).toBeNull();
  });

  it("evicts the oldest entry when full", () => {
    const c = new TtlCache<number>(60_000, 2);
    c.set("a", 1);
    c.set("b", 2);
    c.set("c", 3);
    expect(c.get("a")).toBeUndefined();
    expect(c.get("b")).toBe(2);
    expect(c.get("c")).toBe(3);
  });

  it("treats a read as recent use, so the least recently used entry is evicted", () => {
    const c = new TtlCache<number>(60_000, 2);
    c.set("a", 1);
    c.set("b", 2);
    expect(c.get("a")).toBe(1); // a is now the most recently used
    c.set("c", 3);
    expect(c.get("b")).toBeUndefined();
    expect(c.get("a")).toBe(1);
  });

  it("a read doesn't extend the TTL", () => {
    const c = new TtlCache<string>(1000);
    c.set("k", "v");
    vi.advanceTimersByTime(800);
    expect(c.get("k")).toBe("v");
    vi.advanceTimersByTime(201);
    expect(c.get("k")).toBeUndefined();
  });
});
