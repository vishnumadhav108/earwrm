#!/usr/bin/env node
/**
 * CI "Release order" check. Compares HEAD with its merge base on the base branch and
 * applies the rules in release-order-core.mjs. It always prints a result and exits 0
 * (pass) or 1 (fail), including on PRs with no migrations.
 *
 *   node scripts/ci/release-order.mjs [baseRef]     (default: origin/$GITHUB_BASE_REF, else origin/main)
 *
 * Needs full history (actions/checkout with fetch-depth: 0).
 */
import { execFileSync } from "node:child_process";
import { checkReleaseOrder, parseNameStatus } from "./release-order-core.mjs";

const git = (...args) => execFileSync("git", args, { encoding: "utf8" }).trim();
const log = (m) => console.log(`[release-order] ${m}`);

const baseRef = process.argv[2] ?? `origin/${process.env.GITHUB_BASE_REF || "main"}`;
let base;
try {
  base = git("merge-base", baseRef, "HEAD");
} catch {
  log(`FAIL: no merge base between ${baseRef} and HEAD. Is the checkout complete (fetch-depth: 0)?`);
  process.exit(1);
}

const result = checkReleaseOrder(parseNameStatus(git("diff", "--name-status", "-M", `${base}...HEAD`)));
log(`compared with ${baseRef} (merge base ${base.slice(0, 12)}): ${result.summary}`);
if (result.ok) {
  log("PASS");
  log("Note: this can't prove a production migration was applied. That stays a manual PR checklist item.");
  process.exit(0);
}
for (const p of result.problems) log(`FAIL: ${p}`);
log("See docs/CONVENTIONS.md § Release order.");
process.exit(1);
