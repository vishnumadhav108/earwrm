import { describe, expect, it } from "vitest";
import { checkInvocation, redact, TargetError } from "../../../scripts/db/target.mjs";

const PROD = "fvbifyhaamgaebsltulu";
const STAGING = "abcdefghijabcdefghij";
const env = { PRODUCTION_PROJECT_REF: PROD, STAGING_PROJECT_REF: STAGING };
const refuses = (mode: string, args: string[], e: Record<string, string> = env) =>
  expect(() => checkInvocation(mode, args, e)).toThrow(TargetError);

describe("db target guard: local", () => {
  it("allows plain local commands", () => {
    expect(checkInvocation("local", ["db", "reset"], {})).toMatchObject({ kind: "local", command: "db reset" });
  });

  it.each([["--remote"], [`--remote=${PROD}`], ["--linked"], ["--db-url=postgres://x"], ["--project-ref=x"]])(
    "refuses hosted flag %s",
    (flag) => refuses("local", ["db", "dump", flag], {}),
  );

  it("refuses --password", () => refuses("local", ["db", "dump", "--password", "x"], {}));
});

describe("db target guard: production-read", () => {
  const ok = ["db", "dump", "--schema", "public", "--password", "pw", `--remote=${PROD}`];

  it("allows a schema dump with a password and the explicit production ref", () => {
    expect(checkInvocation("production-read", ok, env)).toMatchObject({ ref: PROD, readOnly: true });
    expect(
      checkInvocation("production-read", ["migration", "list", "-p", "pw", `--remote=${PROD}`], env),
    ).toMatchObject({ command: "migration list" });
  });

  it("needs PRODUCTION_PROJECT_REF", () => refuses("production-read", ok, {}));
  it("refuses a bare --remote", () => refuses("production-read", ["db", "dump", "-p", "x", "--remote"]));
  it("refuses a space-separated --remote", () =>
    refuses("production-read", ["db", "dump", "-p", "x", "--remote", PROD]));
  it("refuses another ref", () => refuses("production-read", ["db", "dump", "-p", "x", `--remote=${STAGING}`]));
  it("refuses without --password", () => refuses("production-read", ["db", "dump", `--remote=${PROD}`]));
  it("refuses --yes", () => refuses("production-read", [...ok, "--yes"]));
  it.each([["--data-only"], ["--role-only"], ["--use-copy"]])("refuses data dumps (%s)", (f) =>
    refuses("production-read", [...ok, f]),
  );
  it.each([
    [["db", "push"]],
    [["db", "reset"]],
    [["db", "query", "select 1"]],
    [["migration", "repair", "1"]],
    [["migration", "up"]],
  ])("refuses write-capable command %j", (cmd) => refuses("production-read", [...cmd, "-p", "x", `--remote=${PROD}`]));
});

describe("db target guard: staging", () => {
  it("allows db push to the staging ref", () => {
    expect(checkInvocation("staging", ["db", "push", "--yes", `--remote=${STAGING}`], env)).toMatchObject({
      ref: STAGING,
    });
  });
  it("refuses when staging and production refs are equal", () =>
    refuses("staging", ["db", "push", `--remote=${PROD}`], {
      PRODUCTION_PROJECT_REF: PROD,
      STAGING_PROJECT_REF: PROD,
    }));
  it("refuses the production ref", () => refuses("staging", ["db", "push", `--remote=${PROD}`]));
  it("refuses --include-seed", () => refuses("staging", ["db", "push", "--include-seed", `--remote=${STAGING}`]));
  it("refuses db reset", () => refuses("staging", ["db", "reset", `--remote=${STAGING}`]));
});

describe("redact", () => {
  it("hides password values in every form", () => {
    expect(redact(["db", "dump", "--password", "s3cret", "--password=s3cret", "-p", "s3cret"])).toBe(
      "db dump --password <redacted> --password=<redacted> -p <redacted>",
    );
  });
});

it("unknown modes are refused", () => refuses("production", ["db", "push"]));
