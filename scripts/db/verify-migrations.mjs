#!/usr/bin/env node
/**
 * `npm run verify:migrations`: proves the migrations two ways, on the local stack only.
 *
 *   A. Clean build. Reset the local database from supabase/migrations/ and snapshot
 *      the app-owned objects (scripts/db/snapshot.sql).
 *   B. Legacy upgrade. Rebuild the database the way production was really made:
 *      production's default privileges, then supabase/legacy/schema.sql and
 *      002_grants.sql as written, then the keep_alive migration, then synthetic data
 *      (supabase/fixtures/prototype_data.sql). Set the migration history to what
 *      production has after the baseline repair (baseline and keep_alive applied),
 *      run `migration up` for everything newer, and snapshot again.
 *
 * The two snapshots must be identical, and the fixture rows must survive B. Any
 * difference fails (exit 1). The local database is always reset to the normal
 * migrations + seed afterwards. This never touches a hosted project: every CLI call
 * goes through scripts/db/target.mjs in local mode.
 */
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const target = path.join(root, "scripts/db/target.mjs");
const log = (m) => console.error(`[verify:migrations] ${m}`);

/** Production's default privileges for objects postgres creates in public (see the baseline). */
const PROD_DEFAULT_PRIVILEGES = `
alter default privileges for role postgres in schema public
  revoke select, insert, update, delete on tables from anon, authenticated, service_role;
alter default privileges for role postgres in schema public
  revoke all on functions from anon, authenticated, service_role;
alter default privileges for role postgres in schema public
  revoke all on sequences from anon, authenticated, service_role;
`;

const BASELINE = "20260831000000";
const KEEP_ALIVE = "20261005000453";
const FIXTURE_VERSION = "20260101000000";

/** Runs the Supabase CLI through the target guard (local mode). Returns stdout. */
function sb(args, { workdir } = {}) {
  const full = [...args, ...(workdir ? ["--workdir", workdir] : [])];
  const res = spawnSync(process.execPath, [target, "local", "--", ...full], { cwd: root, encoding: "utf8" });
  if (res.status !== 0) {
    process.stderr.write(res.stderr ?? "");
    throw new Error(`supabase ${args.join(" ")} failed (exit ${res.status})`);
  }
  return res.stdout;
}

function snapshot(workdir) {
  const out = sb(["db", "query", "-f", path.join(root, "scripts/db/snapshot.sql"), "-o", "json", "--agent=no"], {
    workdir,
  });
  return JSON.parse(out.slice(out.indexOf("[")));
}

function counts(workdir) {
  const sql =
    "select (select count(*) from auth.users)::int users, (select count(*) from public.entries)::int entries, " +
    "(select count(*) from public.list_items)::int list_items, (select count(*) from public.releases)::int releases";
  const out = sb(["db", "query", sql, "-o", "json", "--agent=no"], { workdir });
  return JSON.parse(out.slice(out.indexOf("[")))[0];
}

export function diffSnapshots(a, b) {
  const key = (r) => `${r.kind} ${r.name}`;
  const ma = new Map(a.map((r) => [key(r), r.detail]));
  const mb = new Map(b.map((r) => [key(r), r.detail]));
  const lines = [];
  for (const k of ma.keys()) if (!mb.has(k)) lines.push(`- only in clean build:    ${k}`);
  for (const k of mb.keys()) if (!ma.has(k)) lines.push(`+ only in legacy upgrade: ${k}`);
  for (const [k, v] of ma) {
    if (mb.has(k) && mb.get(k) !== v) lines.push(`~ differs: ${k}\n    clean:  ${v}\n    legacy: ${mb.get(k)}`);
  }
  return lines;
}

function legacyFixtureSql() {
  const read = (p) => fs.readFileSync(path.join(root, p), "utf8");
  return [
    "-- Built by scripts/db/verify-migrations.mjs. Production as it was really created.",
    PROD_DEFAULT_PRIVILEGES,
    read("supabase/legacy/schema.sql"),
    read("supabase/legacy/002_grants.sql"),
    read(`supabase/migrations/${KEEP_ALIVE}_keep_alive.sql`),
    read("supabase/fixtures/prototype_data.sql"),
  ].join("\n\n");
}

function main() {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "earwrm-verify-"));
  const workdir = tmp;
  const mig = path.join(tmp, "supabase", "migrations");
  let failed = false;
  try {
    // A. Clean build from the real migrations.
    log("A: clean build from supabase/migrations");
    sb(["db", "reset", "--no-seed"]);
    const clean = snapshot();
    log(`A: ${clean.length} app-owned objects`);

    // B. Legacy upgrade, in a temporary workdir that shares this project's config (and
    //    so the same local containers). Its only migration at first is the fixture.
    log("B: legacy schema + production default privileges + keep_alive + fixture data");
    fs.mkdirSync(mig, { recursive: true });
    fs.copyFileSync(path.join(root, "supabase/config.toml"), path.join(tmp, "supabase/config.toml"));
    fs.writeFileSync(path.join(mig, `${FIXTURE_VERSION}_legacy_fixture.sql`), legacyFixtureSql());
    sb(["db", "reset", "--no-seed"], { workdir });
    const before = counts(workdir);

    // Make the history look like production after the baseline repair.
    sb(["migration", "repair", FIXTURE_VERSION, "--status", "reverted"], { workdir });
    fs.rmSync(path.join(mig, `${FIXTURE_VERSION}_legacy_fixture.sql`));
    for (const f of fs.readdirSync(path.join(root, "supabase/migrations"))) {
      fs.copyFileSync(path.join(root, "supabase/migrations", f), path.join(mig, f));
    }
    sb(["migration", "repair", BASELINE, KEEP_ALIVE, "--status", "applied"], { workdir });
    log("B: migration up (everything newer than keep_alive)");
    process.stderr.write(sb(["migration", "up"], { workdir }));
    const upgraded = snapshot(workdir);
    const after = counts(workdir);
    log(
      `B: ${upgraded.length} app-owned objects; rows before ${JSON.stringify(before)} after ${JSON.stringify(after)}`,
    );

    const diff = diffSnapshots(clean, upgraded);
    if (JSON.stringify(before) !== JSON.stringify(after)) {
      diff.push(`~ fixture rows changed during migration up: ${JSON.stringify(before)} -> ${JSON.stringify(after)}`);
    }
    if (before.entries === 0) diff.push("~ fixture data did not load (0 entries)");
    if (diff.length) {
      failed = true;
      log(`FAIL: ${diff.length} difference(s) between the clean build and the legacy upgrade:`);
      console.error(diff.join("\n"));
    } else {
      log("PASS: clean build and legacy upgrade are identical, and fixture rows survived.");
    }
  } catch (err) {
    failed = true;
    log(`ERROR: ${err.message}`);
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
    try {
      log("restoring the local database (migrations + seed)");
      sb(["db", "reset"]);
    } catch (err) {
      failed = true;
      log(`could not restore the local database: ${err.message}`);
    }
  }
  process.exit(failed ? 1 : 0);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
