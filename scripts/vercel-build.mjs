#!/usr/bin/env node
/**
 * Vercel's build command (vercel.json → buildCommand), for every deployment.
 *
 * - Production and any non-preview build: a plain `next build` with the deployment's
 *   own environment, exactly as before.
 * - Preview builds: compare this commit's supabase/migrations/ with the `staging-applied`
 *   tag (what staging has verifiably applied). If they match, build normally against
 *   staging. On any difference, a missing tag, a missing .git, or any error, build with
 *   NEXT_PUBLIC_EARWRM_PREVIEW_GUARD=1: the app becomes the demo, app APIs answer 503,
 *   and no Supabase client can be created (src/lib/supabase/guard.ts).
 *
 * Always logs one `[preview-guard] …` line so the decision is visible in the build log.
 */
import { execFileSync, spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { decideGuard, parseLsTree } from "./preview-guard-core.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const TAG = "staging-applied";

const git = (...args) => execFileSync("git", args, { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });

function repoUrl() {
  const owner = process.env.VERCEL_GIT_REPO_OWNER || "vishnumadhav108";
  const slug = process.env.VERCEL_GIT_REPO_SLUG || "earwrm";
  return `https://github.com/${owner}/${slug}.git`;
}

function inspect() {
  try {
    git("rev-parse", "--git-dir");
  } catch {
    return { error: "no git repository in the build environment" };
  }
  let head;
  try {
    head = parseLsTree(git("ls-tree", "-r", "HEAD", "--", "supabase/migrations/"));
  } catch {
    return { error: "could not list this commit's migrations" };
  }
  try {
    git("fetch", "--quiet", "--depth=1", "--no-tags", repoUrl(), `+refs/tags/${TAG}:refs/tags/${TAG}`);
  } catch {
    return { head, tag: null };
  }
  try {
    return { head, tag: parseLsTree(git("ls-tree", "-r", `refs/tags/${TAG}`, "--", "supabase/migrations/")) };
  } catch {
    return { error: `could not read ${TAG}'s migrations` };
  }
}

const vercelEnv = process.env.VERCEL_ENV;
const decision = vercelEnv === "preview" ? decideGuard({ vercelEnv, ...inspect() }) : decideGuard({ vercelEnv });
console.log(`[preview-guard] ${decision.mode}: ${decision.reason}`);

const env = { ...process.env };
if (decision.mode === "demo") env.NEXT_PUBLIC_EARWRM_PREVIEW_GUARD = "1";
else delete env.NEXT_PUBLIC_EARWRM_PREVIEW_GUARD;

const next = path.join(root, "node_modules", "next", "dist", "bin", "next");
const res = spawnSync(process.execPath, [next, "build"], { cwd: root, env, stdio: "inherit" });
process.exit(res.status ?? 1);
