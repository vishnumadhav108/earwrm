#!/usr/bin/env node
/**
 * Runs a command with an explicit local-stack environment, never .env.local:
 *
 *   node scripts/with-local-env.mjs next build
 *
 * Values come from .env.localstack (written by `npm run env:local`). In CI, where no
 * .env.localstack exists yet, the job's own env block can provide them instead. Either
 * way, **every** key in .env.example must be set and NEXT_PUBLIC_SUPABASE_URL must be a
 * loopback URL, or the command doesn't run.
 *
 * Why this is enough: Next never overrides a variable already in process.env, so with
 * every key set here, nothing from .env.local (which points at production) can reach
 * the build or the server. Vercel builds don't use this wrapper. They keep each
 * deployment's configured environment.
 */
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { isLoopbackUrl } from "./db/target.mjs";
import { exampleKeys } from "./env-local.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const log = (m) => console.error(`[local-env] ${m}`);

/** Minimal KEY=VALUE parser (no interpolation). Matches what env-local.mjs writes. */
export function parseEnvFile(text) {
  const out = {};
  for (const line of text.split(/\r?\n/)) {
    const m = /^\s*([A-Z][A-Z0-9_]*)\s*=\s*(.*)\s*$/.exec(line);
    if (m) out[m[1]] = m[2].replace(/^(['"])(.*)\1$/, "$2");
  }
  return out;
}

/** Resolves the env for a local run, or throws with a reason. Pure apart from reading the file. */
export function resolveLocalEnv(baseEnv = process.env, file = path.join(root, ".env.localstack")) {
  const fromFile = fs.existsSync(file);
  const values = fromFile ? parseEnvFile(fs.readFileSync(file, "utf8")) : {};
  const keys = exampleKeys();
  const env = { ...baseEnv };
  for (const k of keys) if (fromFile) env[k] = values[k];

  const missing = keys.filter((k) => !env[k]);
  if (missing.length) {
    throw new Error(
      `missing ${missing.join(", ")} (${fromFile ? ".env.localstack" : "environment"}). Run \`npm run env:local\`.`,
    );
  }
  if (!isLoopbackUrl(env.NEXT_PUBLIC_SUPABASE_URL)) {
    throw new Error(`NEXT_PUBLIC_SUPABASE_URL is not a local URL (${new URL(env.NEXT_PUBLIC_SUPABASE_URL).host}).`);
  }
  // Next would still load any *other* key from its own env files (e.g. VERCEL_OIDC_TOKEN
  // in .env.local). Define each of those as empty: Next never overrides a variable that
  // is already defined, so nothing from those files reaches the command.
  const blanked = [];
  for (const f of NEXT_ENV_FILES) {
    const p = path.join(root, f);
    if (!fs.existsSync(p)) continue;
    for (const k of Object.keys(parseEnvFile(fs.readFileSync(p, "utf8")))) {
      if (!keys.includes(k) && baseEnv[k] === undefined && !blanked.includes(k)) {
        env[k] = "";
        blanked.push(k);
      }
    }
  }
  env.EARWRM_LOCAL_ENV = fromFile ? "localstack" : "ci-env";
  return { env, source: fromFile ? ".env.localstack" : "environment", blanked };
}

/** Every file Next can load in development, production or test mode. */
const NEXT_ENV_FILES = [
  ".env",
  ".env.local",
  ".env.development",
  ".env.development.local",
  ".env.production",
  ".env.production.local",
  ".env.test",
  ".env.test.local",
];

function main(argv) {
  if (!argv.length) {
    log("usage: node scripts/with-local-env.mjs <command> [args...]");
    process.exit(2);
  }
  let resolved;
  try {
    resolved = resolveLocalEnv();
  } catch (err) {
    log(`REFUSED: ${err.message}`);
    process.exit(2);
  }
  log(`using ${resolved.source} → Supabase ${new URL(resolved.env.NEXT_PUBLIC_SUPABASE_URL).host}`);
  if (resolved.blanked.length) log(`blanked keys from Next's env files: ${resolved.blanked.join(", ")}`);
  const [cmd, ...args] = argv;
  const bin = cmd === "node" ? null : nodeBin(cmd);
  // Run Node CLIs (next, playwright, …) and node itself directly, so arguments reach them
  // unchanged on every platform. Only fall back to a shell for anything else on Windows,
  // where .cmd shims need one.
  const res =
    cmd === "node"
      ? spawnSync(process.execPath, args, { env: resolved.env, stdio: "inherit" })
      : bin
        ? spawnSync(process.execPath, [bin, ...args], { env: resolved.env, stdio: "inherit" })
        : spawnSync(cmd, args, { env: resolved.env, stdio: "inherit", shell: process.platform === "win32" });
  process.exit(res.status ?? 1);
}

/** The JS entry point of an installed package's CLI of the same name (e.g. next → next/dist/bin/next). */
function nodeBin(cmd) {
  try {
    const pkgPath = path.join(root, "node_modules", cmd, "package.json");
    const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
    const bin = typeof pkg.bin === "string" ? pkg.bin : pkg.bin?.[cmd];
    return bin ? path.join(path.dirname(pkgPath), bin) : null;
  } catch {
    return null;
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main(process.argv.slice(2));
