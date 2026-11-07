import { describe, expect, it } from "vitest";
import { checkReleaseOrder, parseNameStatus } from "../../../scripts/ci/release-order-core.mjs";

const M = "supabase/migrations/20261201000000_add_thing.sql";
const OLD = "supabase/migrations/20260831000000_baseline.sql";

describe("parseNameStatus", () => {
  it("reads add, modify, delete and rename lines", () => {
    expect(parseNameStatus(`A\t${M}\nM\tsrc/a.ts\nD\tx\nR100\told.ts\tnew.ts\n`)).toEqual([
      { status: "A", path: M },
      { status: "M", path: "src/a.ts" },
      { status: "D", path: "x" },
      { status: "R", path: "new.ts", from: "old.ts" },
    ]);
  });
});

describe("checkReleaseOrder", () => {
  it("passes a PR with no migrations, whatever it touches", () => {
    const r = checkReleaseOrder([
      { status: "M", path: "src/app/page.tsx" },
      { status: "M", path: "package.json" },
    ]);
    expect(r).toMatchObject({ ok: true, summary: "no new migrations" });
  });

  it("passes a migration-only PR with allowlisted companions", () => {
    const r = checkReleaseOrder([
      { status: "A", path: M },
      { status: "A", path: "supabase/tests/thing_test.sql" },
      { status: "M", path: "supabase/fixtures/prototype_data.sql" },
      { status: "M", path: "supabase/seed.sql" },
      { status: "M", path: "src/data/database.types.ts" },
      { status: "M", path: "docs/ARCHITECTURE.md" },
      { status: "A", path: "tests/unit/thing.test.ts" },
    ]);
    expect(r.ok).toBe(true);
    expect(r.summary).toContain("1 migration(s)");
  });

  it.each([
    ["app code", "src/lib/store.tsx"],
    ["package.json", "package.json"],
    ["the lockfile", "package-lock.json"],
    ["a build script", "scripts/vercel-build.mjs"],
    ["config", "next.config.ts"],
    ["vercel.json", "vercel.json"],
    ["a workflow", ".github/workflows/ci.yml"],
  ])("fails a migration PR that also changes %s", (_label, path) => {
    const r = checkReleaseOrder([
      { status: "A", path: M },
      { status: "M", path },
    ]);
    expect(r.ok).toBe(false);
    expect(r.problems[0]).toContain(path);
  });

  it("fails when an existing migration is modified, deleted or renamed, even without new migrations", () => {
    expect(checkReleaseOrder([{ status: "M", path: OLD }]).ok).toBe(false);
    expect(checkReleaseOrder([{ status: "D", path: OLD }]).ok).toBe(false);
    expect(checkReleaseOrder([{ status: "R", path: "supabase/migrations/x.sql", from: OLD }]).ok).toBe(false);
  });
});
