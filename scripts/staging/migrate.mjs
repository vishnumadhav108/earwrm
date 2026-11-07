#!/usr/bin/env node
/**
 * Applies migrations to staging and maintains the two staging tags. Run by
 * .github/workflows/staging-migrate.yml; see docs/STAGING.md and docs/RUNBOOK.md.
 *
 * Environment:
 *   MODE                    normal | bootstrap
 *   GITHUB_SHA, GITHUB_REPOSITORY
 *   APP_TOKEN               GitHub App installation token (tag writes; App-only ruleset bypass)
 *   SUPABASE_ACCESS_TOKEN   the staging bot account's scoped token
 *   STAGING_PROJECT_REF, PRODUCTION_PROJECT_REF
 *   LOCAL_SNAPSHOT          bootstrap only: app-object snapshot of a clean local build of this commit
 *
 * Every database command goes through scripts/db/target.mjs in staging mode. Every step
 * is confirmed before the next. Any failure stops the run with a classified message and
 * leaves staging-applied absent if it had already been deleted.
 */
import { execFileSync, spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseLsTree } from "../preview-guard-core.mjs";
import { diffSnapshots } from "../db/verify-migrations.mjs";
import {
  appliedFromList,
  checkBootstrap,
  checkConsistency,
  classifyCliError,
  classifyProjectStatus,
  decideNoop,
  sameSet,
  versionsFromTree,
} from "./core.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const target = path.join(root, "scripts", "db", "target.mjs");
const APPLIED = "staging-applied";
const LAST_GOOD = "staging-last-good";

const log = (m) => console.log(`[staging] ${m}`);
class Stop extends Error {}
const stop = (kind, message) => {
  throw new Stop(`${kind.toUpperCase()}: ${message}`);
};
// Config errors are thrown at the top level, before the main try/catch.
process.on("uncaughtException", (err) => {
  console.error(`::error::[staging] ${err instanceof Stop ? err.message : `UNEXPECTED: ${err.message}`}`);
  process.exit(1);
});

const env = (name) => {
  const v = (process.env[name] ?? "").trim();
  if (!v) stop("config", `${name} is not set`);
  return v;
};

const MODE = process.env.MODE || "normal";
const SHA = env("GITHUB_SHA");
const REPO = env("GITHUB_REPOSITORY");
const APP_TOKEN = env("APP_TOKEN");
const ACCESS_TOKEN = env("SUPABASE_ACCESS_TOKEN");
const REF = env("STAGING_PROJECT_REF");
const PROD = env("PRODUCTION_PROJECT_REF");
if (REF === PROD) stop("config", "STAGING_PROJECT_REF equals PRODUCTION_PROJECT_REF");
if (!["normal", "bootstrap"].includes(MODE)) stop("config", `MODE must be normal or bootstrap (got ${MODE})`);

const remoteUrl = `https://x-access-token:${APP_TOKEN}@github.com/${REPO}.git`;
/** git, with the App token removed from any error message (it's part of the remote URL). */
function git(...args) {
  try {
    return execFileSync("git", args, { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
  } catch (err) {
    const msg = [err.message, err.stderr ?? ""].join(" ").split(APP_TOKEN).join("***");
    throw new Error(`git ${args[0]} failed: ${msg}`);
  }
}

/** Remote tag SHAs, read fresh from GitHub. */
function remoteTags() {
  const out = git("ls-remote", remoteUrl, `refs/tags/${APPLIED}`, `refs/tags/${LAST_GOOD}`);
  const tags = { [APPLIED]: null, [LAST_GOOD]: null };
  for (const line of out.split("\n").filter(Boolean)) {
    const [sha, ref] = line.split("\t");
    tags[ref.replace("refs/tags/", "")] = sha;
  }
  return tags;
}

function pushTag(name, sha) {
  if (sha) git("push", "--force", remoteUrl, `${sha}:refs/tags/${name}`);
  else git("push", remoteUrl, `:refs/tags/${name}`);
  const now = remoteTags()[name];
  if (now !== sha) stop("tag", `${name} is ${now ?? "absent"} after the update, expected ${sha ?? "absent"}`);
  log(`${name} → ${sha ? sha.slice(0, 12) : "deleted"} (confirmed)`);
}

const treeAt = (sha) => parseLsTree(git("ls-tree", "-r", sha, "--", "supabase/migrations/"));

/** Runs the pinned CLI against staging through the target guard. */
function cli(args, { input } = {}) {
  const res = spawnSync(process.execPath, [target, "staging", "--", ...args, `--remote=${REF}`], {
    cwd: root,
    encoding: "utf8",
    input,
    env: { ...process.env, STAGING_PROJECT_REF: REF, PRODUCTION_PROJECT_REF: PROD },
  });
  const output = `${res.stdout ?? ""}\n${res.stderr ?? ""}`;
  return { ok: res.status === 0, stdout: res.stdout ?? "", output };
}

function cliOrStop(what, args) {
  const r = cli(args);
  if (!r.ok) {
    process.stderr.write(r.output);
    stop(classifyCliError(r.output), `${what} failed`);
  }
  return r.stdout;
}

const jsonFrom = (text, open = "{") => JSON.parse(text.slice(text.indexOf(open)));

function appliedVersions() {
  return appliedFromList(jsonFrom(cliOrStop("migration list", ["migration", "list", "--output-format", "json"])));
}

async function projectStatus() {
  let res;
  try {
    res = await fetch(`https://api.supabase.com/v1/projects/${REF}`, {
      headers: { authorization: `Bearer ${ACCESS_TOKEN}` },
      signal: AbortSignal.timeout(20_000),
    });
  } catch (err) {
    stop("unavailable", `could not reach the Supabase Management API (${err.name})`);
  }
  const body = await res.json().catch(() => ({}));
  const s = classifyProjectStatus(res.status, body);
  if (s.kind !== "ok") stop(s.kind, s.message);
  log(`project ${REF}: ${s.message}`);
}

function stagingSnapshot() {
  return jsonFrom(
    cliOrStop("app-object snapshot", [
      "db",
      "query",
      "--read-only",
      "-f",
      "scripts/db/snapshot.sql",
      "-o",
      "json",
      "--agent=no",
    ]),
    "[",
  );
}

function pushAndVerify(expected) {
  const tags = remoteTags();
  if (tags[APPLIED]) pushTag(APPLIED, null);
  log("New preview builds that observe the missing tag fall back to demo mode.");

  const push = cli(["db", "push", "--yes"]);
  process.stdout.write(push.output);
  if (!push.ok) {
    const kind = classifyCliError(push.output);
    stop(kind, kind === "sql" ? "a migration failed on staging (see the output above)" : "db push failed");
  }
  const after = appliedVersions();
  if (!sameSet(after, expected)) {
    stop("verify", `staging has [${after.join(", ")}] after the push, expected [${expected.join(", ")}]`);
  }
  log(`verified: staging has exactly this commit's ${expected.length} migration(s)`);
}

function publish() {
  // staging-last-good first, staging-applied last. If either fails, stop with
  // staging-applied absent.
  try {
    pushTag(LAST_GOOD, SHA);
    pushTag(APPLIED, SHA);
  } catch (err) {
    try {
      if (remoteTags()[APPLIED]) pushTag(APPLIED, null);
    } catch {
      // Report the original failure; RUNBOOK covers a leftover tag.
    }
    throw err;
  }
}

async function normal() {
  await projectStatus();
  const tags = remoteTags();
  const lastGood = tags[LAST_GOOD];
  if (!lastGood) {
    stop(
      "recovery",
      `${LAST_GOOD} is missing. Never skipped outside bootstrap: see docs/RUNBOOK.md § Staging recovery`,
    );
  }
  try {
    git("cat-file", "-e", `${lastGood}^{commit}`);
  } catch {
    stop("recovery", `${LAST_GOOD} points at ${lastGood}, which isn't in this checkout's history`);
  }
  let ancestryOk = true;
  try {
    git("merge-base", "--is-ancestor", lastGood, SHA);
  } catch {
    ancestryOk = false;
  }
  if (!ancestryOk) {
    stop(
      "recovery",
      `${LAST_GOOD} (${lastGood.slice(0, 12)}) is not an ancestor of ${SHA.slice(0, 12)}; refusing to move backwards`,
    );
  }

  const headTree = treeAt(SHA);
  const lastGoodTree = treeAt(lastGood);
  const headVersions = versionsFromTree(headTree);
  const lastGoodVersions = versionsFromTree(lastGoodTree);
  const applied = appliedVersions();
  log(
    `applied on staging: ${applied.length}, at ${LAST_GOOD}: ${lastGoodVersions.length}, at this commit: ${headVersions.length}`,
  );

  const c = checkConsistency({ applied, lastGoodVersions, headVersions });
  if (!c.ok)
    stop(
      "recovery",
      `the database and the tags disagree: ${c.problems.join("; ")}. See docs/RUNBOOK.md § Staging recovery`,
    );

  const n = decideNoop({
    appliedTagSha: tags[APPLIED],
    lastGoodSha: lastGood,
    lastGoodVersions,
    applied,
    ancestryOk,
    headTree,
    lastGoodTree,
  });
  if (n.noop) log("no migration changes since the last verified state: skipping the push");
  else {
    log(`migrating (${n.reasons.join("; ")})`);
    pushAndVerify(headVersions);
  }
  publish();
}

async function bootstrap() {
  await projectStatus();
  const snapshotFile = env("LOCAL_SNAPSHOT");
  const tags = remoteTags();
  const applied = appliedVersions();
  const b = checkBootstrap({ lastGoodSha: tags[LAST_GOOD], applied, snapshotRows: stagingSnapshot() });
  if (!b.ok) stop("bootstrap", `refused: ${b.problems.join("; ")}`);
  log("bootstrap preconditions hold: fresh project, no checkpoint, no history, no app-owned objects");

  const expected = versionsFromTree(treeAt(SHA));
  pushAndVerify(expected);

  const local = JSON.parse(fs.readFileSync(snapshotFile, "utf8"));
  const diff = diffSnapshots(local, stagingSnapshot());
  if (diff.length) {
    console.error(diff.join("\n"));
    stop(
      "bootstrap",
      `staging's app-owned objects differ from a clean local build of this commit (${diff.length} difference(s)). Nothing was published; bring this to review`,
    );
  }
  log(`app-owned objects match a clean local build (${local.length} objects)`);
  publish();
}

try {
  log(`mode=${MODE} commit=${SHA.slice(0, 12)} project=${REF}`);
  await (MODE === "bootstrap" ? bootstrap() : normal());
  log("done: staging-last-good and staging-applied point at this commit");
} catch (err) {
  if (err instanceof Stop) {
    console.error(`::error::[staging] ${err.message}`);
    process.exit(1);
  }
  console.error(`::error::[staging] UNEXPECTED: ${err.message}`);
  process.exit(1);
}
