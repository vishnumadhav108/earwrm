import { describe, expect, it } from "vitest";
import {
  appliedFromList,
  checkBootstrap,
  checkConsistency,
  classifyCliError,
  classifyProjectStatus,
  decideNoop,
  sameTree,
  versionsFromTree,
} from "../../../scripts/staging/core.mjs";

const blob = (c: string) => c.repeat(40);
const tree = (files: Record<string, string>) =>
  new Map(Object.entries(files).map(([name, b]) => [`supabase/migrations/${name}`, blob(b)]));
const T1 = tree({ "20260831000000_baseline.sql": "a", "20261005000453_keep_alive.sql": "b" });
const T2 = tree({
  ...Object.fromEntries([...T1].map(([p, b]) => [p.split("/").pop()!, b[0]])),
  "20261106211527_flags.sql": "c",
});
const SHA_A = "1".repeat(40);
const SHA_B = "2".repeat(40);

describe("versions", () => {
  it("reads versions from a migration tree, sorted", () => {
    expect(versionsFromTree(T2)).toEqual(["20260831000000", "20261005000453", "20261106211527"]);
  });

  it("reads applied versions from migration list JSON", () => {
    const json = {
      migrations: [
        { local: "20260831000000", remote: "20260831000000" },
        { local: "20261106211527", remote: "" },
        { local: "", remote: "20261005000453" },
      ],
    };
    expect(appliedFromList(json)).toEqual(["20260831000000", "20261005000453"]);
  });

  it("compares trees by filename and blob", () => {
    expect(sameTree(T1, new Map(T1))).toBe(true);
    expect(sameTree(T1, tree({ "20260831000000_baseline.sql": "a", "20261005000453_keep_alive.sql": "x" }))).toBe(
      false,
    );
  });
});

describe("checkConsistency", () => {
  const lastGoodVersions = versionsFromTree(T1);
  const headVersions = versionsFromTree(T2);

  it("accepts staging exactly at the last verified state", () => {
    expect(checkConsistency({ applied: lastGoodVersions, lastGoodVersions, headVersions }).ok).toBe(true);
  });

  it("accepts a partly applied retry (between last-good and this commit)", () => {
    expect(checkConsistency({ applied: headVersions, lastGoodVersions, headVersions }).ok).toBe(true);
  });

  it("rejects staging missing a migration last-good says was applied", () => {
    const r = checkConsistency({ applied: ["20260831000000"], lastGoodVersions, headVersions });
    expect(r.ok).toBe(false);
    expect(r.problems[0]).toContain("20261005000453");
  });

  it("rejects staging with a migration this commit doesn't contain", () => {
    const r = checkConsistency({ applied: [...lastGoodVersions, "20991231000000"], lastGoodVersions, headVersions });
    expect(r.ok).toBe(false);
    expect(r.problems[0]).toContain("20991231000000");
  });
});

describe("decideNoop", () => {
  const base = {
    appliedTagSha: SHA_A,
    lastGoodSha: SHA_A,
    lastGoodVersions: versionsFromTree(T1),
    applied: versionsFromTree(T1),
    ancestryOk: true,
    headTree: new Map(T1),
    lastGoodTree: T1,
  };

  it("skips the push only when every condition holds", () => {
    expect(decideNoop(base).noop).toBe(true);
  });

  it.each([
    ["staging-applied missing", { appliedTagSha: null }],
    ["staging-last-good missing", { lastGoodSha: null }],
    ["tags at different commits", { appliedTagSha: SHA_B }],
    ["ancestry failed", { ancestryOk: false }],
    ["this commit adds a migration", { headTree: T2 }],
    [
      "an edited migration",
      { headTree: tree({ "20260831000000_baseline.sql": "z", "20261005000453_keep_alive.sql": "b" }) },
    ],
    ["staging differs from the expected set", { applied: ["20260831000000"] }],
  ])("doesn't skip when %s", (_label, override) => {
    expect(decideNoop({ ...base, ...override }).noop).toBe(false);
  });
});

describe("checkBootstrap", () => {
  it("accepts a fresh project (default privileges only)", () => {
    const r = checkBootstrap({
      lastGoodSha: null,
      applied: [],
      snapshotRows: [{ kind: "default_acl", name: "postgres r" }],
    });
    expect(r.ok).toBe(true);
  });

  it.each([
    ["a checkpoint exists", { lastGoodSha: SHA_A }],
    ["history isn't empty", { applied: ["20260831000000"] }],
    ["app objects exist", { snapshotRows: [{ kind: "table", name: "entries" }] }],
  ])("refuses when %s", (_label, override) => {
    const r = checkBootstrap({ lastGoodSha: null, applied: [], snapshotRows: [], ...override });
    expect(r.ok).toBe(false);
  });
});

describe("classification", () => {
  it("maps Management API responses", () => {
    expect(classifyProjectStatus(200, { status: "ACTIVE_HEALTHY" }).kind).toBe("ok");
    expect(classifyProjectStatus(200, { status: "INACTIVE" })).toMatchObject({ kind: "unavailable" });
    expect(classifyProjectStatus(200, { status: "INACTIVE" }).message).toContain("possibly paused");
    expect(classifyProjectStatus(401, {}).kind).toBe("auth");
    expect(classifyProjectStatus(403, {}).kind).toBe("auth");
    expect(classifyProjectStatus(404, {}).kind).toBe("auth");
    expect(classifyProjectStatus(500, {}).kind).toBe("unknown");
  });

  it.each([
    ["auth", "failed SASL auth (FATAL: password authentication failed for user cli_login_postgres)"],
    ["auth", "Unauthorized: invalid access token"],
    ["sql", 'ERROR: relation "public.x" already exists (SQLSTATE 42P07)'],
    ["sql", 'ERROR: column "y" does not exist'],
    ["unavailable", "dial tcp: connection refused"],
    ["unavailable", "context deadline exceeded (Client.Timeout exceeded while awaiting headers): timed out"],
    ["unknown", "something else entirely"],
  ])("classifies CLI output as %s", (kind, text) => {
    expect(classifyCliError(text)).toBe(kind);
  });
});
