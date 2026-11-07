import { describe, expect, it } from "vitest";
import { decideGuard, diffTrees, parseLsTree } from "../../../scripts/preview-guard-core.mjs";

const tree = (entries: Record<string, string>) => new Map(Object.entries(entries));
const A = "a".repeat(40);
const B = "b".repeat(40);
const C = "c".repeat(40);

describe("parseLsTree", () => {
  it("reads git ls-tree -r output", () => {
    const out = parseLsTree(
      `100644 blob ${A}\tsupabase/migrations/20260831000000_baseline.sql\n100644 blob ${B}\tsupabase/migrations/20261005000453_keep_alive.sql\n`,
    );
    expect(out).toEqual(
      tree({
        "supabase/migrations/20260831000000_baseline.sql": A,
        "supabase/migrations/20261005000453_keep_alive.sql": B,
      }),
    );
  });

  it("ignores blank and unrelated lines", () => {
    expect(parseLsTree("\n\nwarning: something\n").size).toBe(0);
  });
});

describe("diffTrees", () => {
  it("finds added, removed and changed files", () => {
    const d = diffTrees(tree({ x: A, y: C, z: A }), tree({ x: A, y: B, w: A }));
    expect(d).toEqual({ added: ["z"], removed: ["w"], changed: ["y"] });
  });
});

describe("decideGuard", () => {
  it("does nothing outside preview builds", () => {
    expect(decideGuard({ vercelEnv: "production" }).mode).toBe("skip");
    expect(decideGuard({ vercelEnv: undefined }).mode).toBe("skip");
  });

  it("runs normally when the migrations match the tag exactly", () => {
    const t = tree({ "m/1.sql": A, "m/2.sql": B });
    expect(decideGuard({ vercelEnv: "preview", head: t, tag: new Map(t) })).toMatchObject({ mode: "full" });
  });

  it.each([
    ["an added migration", tree({ "m/1.sql": A, "m/2.sql": B }), tree({ "m/1.sql": A })],
    ["an edited migration", tree({ "m/1.sql": C }), tree({ "m/1.sql": A })],
    ["a deleted migration", tree({ "m/1.sql": A }), tree({ "m/1.sql": A, "m/2.sql": B })],
  ])("falls back to demo mode on %s", (_label, head, tag) => {
    expect(decideGuard({ vercelEnv: "preview", head, tag }).mode).toBe("demo");
  });

  it("falls back to demo mode when the tag is missing", () => {
    expect(decideGuard({ vercelEnv: "preview", head: tree({}), tag: null })).toEqual({
      mode: "demo",
      reason: "tag staging-applied not found",
    });
  });

  it("falls back to demo mode on any error", () => {
    expect(decideGuard({ vercelEnv: "preview", error: "no git repository in the build environment" }).mode).toBe(
      "demo",
    );
  });

  it("falls back to demo mode when this commit's migrations can't be read", () => {
    expect(decideGuard({ vercelEnv: "preview", head: null, tag: tree({}) }).mode).toBe("demo");
  });
});
