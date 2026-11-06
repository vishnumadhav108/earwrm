#!/usr/bin/env node
/**
 * `npm test`: runs Vitest, then fails if it executed zero tests.
 *
 *   npm test                      all unit tests
 *   npm test -- -t "TtlCache"     extra arguments go to Vitest
 *
 * Vitest exits 0 when a name filter (-t) matches nothing and every test is skipped, so
 * this runner writes Vitest's JSON report and checks the executed count afterwards.
 * Playwright and `supabase test db` already fail on their own when nothing ran (checked
 * in handoff 01, PR C), so they don't need it.
 */
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const REPORT = path.join(root, "test-results", "vitest.json");
const log = (m) => console.error(`[test] ${m}`);

/** Tests that actually ran (passed or failed), from a Vitest JSON report. */
export function executedCount(report) {
  return (report.numPassedTests ?? 0) + (report.numFailedTests ?? 0);
}

function main(args) {
  fs.rmSync(REPORT, { force: true });
  const vitest = path.join(root, "node_modules", "vitest", "vitest.mjs");
  const res = spawnSync(
    process.execPath,
    [vitest, "run", "--reporter=default", "--reporter=json", `--outputFile.json=${REPORT}`, ...args],
    { cwd: root, stdio: "inherit" },
  );
  if (res.status !== 0) process.exit(res.status ?? 1);
  if (!fs.existsSync(REPORT)) {
    log("FAIL: Vitest wrote no report, so the executed test count is unknown.");
    process.exit(1);
  }
  const n = executedCount(JSON.parse(fs.readFileSync(REPORT, "utf8")));
  if (n === 0) {
    log("FAIL: Vitest executed 0 tests (everything was skipped or filtered out).");
    process.exit(1);
  }
  log(`Vitest executed ${n} tests.`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main(process.argv.slice(2));
