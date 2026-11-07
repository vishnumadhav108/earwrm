#!/usr/bin/env node
/**
 * Database target guard.
 *
 * Every script that can touch a database runs the Supabase CLI through this
 * wrapper. It works out which database the command will hit, prints it, checks
 * it against the mode the caller asked for, and only then runs the CLI. If
 * anything is unclear it refuses (exit 2) and runs nothing.
 *
 *   node scripts/db/target.mjs <mode> -- <supabase args...>
 *
 * Modes
 *   local            The local Docker stack only. Any hosted-target flag is refused,
 *                    and `supabase status` must report loopback hosts on the ports
 *                    in the workdir's config.toml.
 *   staging          Only `--remote=<STAGING_PROJECT_REF>`. STAGING_PROJECT_REF and
 *                    PRODUCTION_PROJECT_REF must both be set and must differ.
 *                    Allowed commands: `db push`, `migration list`. `--include-seed`
 *                    is refused.
 *   production-read  Only `--remote=<PRODUCTION_PROJECT_REF>`, and only commands that
 *                    can't write: schema-only `db dump` and `migration list`. Needs
 *                    `--password` (so the CLI doesn't create a temporary login role
 *                    on production) and refuses `--yes`. SUPABASE_YES is removed
 *                    from the CLI's environment.
 *
 * There is deliberately no mode that writes to production. Those writes are
 * typed by hand, one at a time, after explicit approval.
 *
 * Supabase CLI v3 facts this relies on (verified against `supabase <cmd> --help`
 * for 3.0.0 and the v3 migration guide, 2026-11-05):
 *   - Database commands target the local stack unless --remote is given.
 *   - A bare --remote means "the linked project", and this checkout is linked to
 *     production, so a bare --remote is always refused. The ref must be explicit.
 *   - Hosted mutations need --yes or SUPABASE_YES, and fail closed without it.
 */
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

/** The one CLI version this repo uses. Must match package.json devDependencies. */
export const CLI_VERSION = "3.0.0";

const REF = /^[a-z]{20}$/;
const LOOPBACK = new Set(["127.0.0.1", "localhost", "[::1]", "::1"]);

/** Flags that point a command at something other than the local stack. */
const HOSTED_FLAGS = ["--remote", "--linked", "--db-url", "--project-ref"];

/** Data or role dumps contain user data: not allowed in production-read. */
const DUMP_DATA_FLAGS = ["--data-only", "--role-only", "--use-copy", "-x", "--exclude"];

const ALLOWED = {
  staging: [
    ["db", "push"],
    ["migration", "list"],
    ["db", "query"], // only with --read-only (checked below)
  ],
  "production-read": [
    ["db", "dump"],
    ["migration", "list"],
  ],
};

export class TargetError extends Error {}

const flagName = (a) => (a.startsWith("--") ? a.split("=")[0] : a);
const has = (args, ...names) => args.some((a) => names.includes(flagName(a)));

/** The leading non-flag words, e.g. ["db", "dump"]. */
function subcommand(args) {
  const out = [];
  for (const a of args) {
    if (a.startsWith("-")) break;
    out.push(a);
  }
  return out;
}

/** Every `--remote...` occurrence. Returns the explicit refs, and refuses bare or space-separated forms. */
function remoteRefs(args) {
  const refs = [];
  args.forEach((a, i) => {
    if (a === "--remote") {
      const next = args[i + 1];
      throw new TargetError(
        next && !next.startsWith("-")
          ? `write --remote=${next} (with "="). "--remote ${next}" is ambiguous in CLI v3.`
          : "a bare --remote means the linked project, which is production in this checkout. Pass --remote=<ref>.",
      );
    }
    if (a.startsWith("--remote=")) refs.push(a.slice("--remote=".length));
  });
  return refs;
}

function needsSubcommand(mode, args) {
  const sub = subcommand(args);
  const ok = ALLOWED[mode].some((want) => want.every((w, i) => sub[i] === w));
  if (!ok) {
    const list = ALLOWED[mode].map((w) => `"${w.join(" ")}"`).join(", ");
    throw new TargetError(`"${sub.join(" ")}" is not allowed in ${mode} mode (allowed: ${list}).`);
  }
  return sub.join(" ");
}

function exactlyRef(args, expected, label) {
  const refs = remoteRefs(args);
  if (refs.length !== 1) throw new TargetError(`pass exactly one --remote=<${label}> (found ${refs.length}).`);
  if (refs[0] !== expected) throw new TargetError(`--remote=${refs[0]} is not ${label} (${expected}).`);
  if (has(args, "--linked", "--db-url", "--project-ref")) {
    throw new TargetError("--linked, --db-url and --project-ref are not allowed. Use --remote=<ref>.");
  }
}

function refFromEnv(env, name) {
  const v = (env[name] ?? "").trim();
  if (!REF.test(v)) throw new TargetError(`${name} must be set to a 20-letter project ref (got "${v || "unset"}").`);
  return v;
}

/**
 * Pure check of one invocation. Throws TargetError, or returns what the command
 * will hit. Exported so the rules can be unit-tested without a CLI or database.
 *
 * @param {string} mode
 * @param {string[]} args
 * @param {Record<string, string | undefined>} [env]
 */
export function checkInvocation(mode, args, env = process.env) {
  if (!args.length) throw new TargetError("no supabase command given.");

  if (mode === "local") {
    if (has(args, ...HOSTED_FLAGS)) {
      throw new TargetError(`local mode refuses hosted-target flags (${HOSTED_FLAGS.join(", ")}).`);
    }
    if (has(args, "--password", "-p")) throw new TargetError("local mode refuses --password (hosted only).");
    return { mode, kind: "local", command: subcommand(args).join(" ") };
  }

  if (mode === "staging") {
    const staging = refFromEnv(env, "STAGING_PROJECT_REF");
    const production = refFromEnv(env, "PRODUCTION_PROJECT_REF");
    if (staging === production) throw new TargetError("STAGING_PROJECT_REF equals PRODUCTION_PROJECT_REF. Refusing.");
    const command = needsSubcommand(mode, args);
    exactlyRef(args, staging, "STAGING_PROJECT_REF");
    if (has(args, "--include-seed")) throw new TargetError("--include-seed is never allowed on a hosted database.");
    if (command === "db query" && !has(args, "--read-only")) {
      throw new TargetError("staging mode allows db query only with --read-only.");
    }
    return { mode, kind: "hosted", ref: staging, command };
  }

  if (mode === "production-read") {
    const production = refFromEnv(env, "PRODUCTION_PROJECT_REF");
    const command = needsSubcommand(mode, args);
    exactlyRef(args, production, "PRODUCTION_PROJECT_REF");
    if (has(args, "--yes")) throw new TargetError("--yes is never allowed against production here.");
    if (!has(args, "--password", "-p")) {
      throw new TargetError(
        "pass --password. Without it the CLI creates a temporary login role on production, which is a write.",
      );
    }
    if (command === "db dump" && has(args, ...DUMP_DATA_FLAGS)) {
      throw new TargetError("production-read allows schema-only dumps. Data and role dumps need their own approval.");
    }
    return { mode, kind: "hosted", ref: production, command, readOnly: true };
  }

  throw new TargetError(`unknown mode "${mode}" (expected local, staging or production-read).`);
}

/** Printable command line with any password value replaced. */
export function redact(args) {
  const out = [];
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a.startsWith("--password=")) out.push("--password=<redacted>");
    else if (a === "--password" || a === "-p") {
      out.push(a, "<redacted>");
      i++;
    } else out.push(a);
  }
  return out.join(" ");
}

/* ------------------------------------------------------------------ runtime -- */

const require = createRequire(import.meta.url);
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

/** The pinned CLI from node_modules, never whatever `supabase` is on PATH. */
function cliEntry() {
  const pkgPath = require.resolve("supabase/package.json", { paths: [repoRoot] });
  const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
  if (pkg.version !== CLI_VERSION) {
    throw new TargetError(`node_modules has supabase ${pkg.version}, expected ${CLI_VERSION}. Run npm ci.`);
  }
  const bin = typeof pkg.bin === "string" ? pkg.bin : pkg.bin.supabase;
  return path.join(path.dirname(pkgPath), bin);
}

function runCli(args, env, opts = {}) {
  return spawnSync(process.execPath, [cliEntry(), ...args], { env, cwd: repoRoot, encoding: "utf8", ...opts });
}

/** The value of `--workdir`, if the command was given one. */
function workdirOf(args) {
  const i = args.findIndex((a) => a === "--workdir" || a.startsWith("--workdir="));
  if (i < 0) return null;
  return args[i].includes("=") ? args[i].split("=").slice(1).join("=") : args[i + 1];
}

/** Ports the local stack should be on, read from the workdir's config.toml. */
function configuredPorts(workdir) {
  const file = path.join(workdir ?? repoRoot, "supabase", "config.toml");
  const text = fs.readFileSync(file, "utf8");
  const port = (section) => {
    const m = new RegExp(`^\\[${section}\\][^\\[]*?^port\\s*=\\s*(\\d+)`, "ms").exec(text);
    if (!m) throw new TargetError(`no [${section}] port in ${file}.`);
    return Number(m[1]);
  };
  return { api: port("api"), db: port("db") };
}

/** Confirms the running local stack is on loopback at the configured ports. Prints no secrets. */
function assertLocalStack(args, env) {
  return localStackStatus(workdirOf(args), env).description;
}

/**
 * Reads `supabase status` for the local stack, checks it's on loopback at the ports
 * config.toml expects, and returns the parsed status. The status contains keys, so
 * callers must not print it.
 */
export function localStackStatus(workdir = null, env = process.env) {
  const want = configuredPorts(workdir);
  const statusArgs = ["status", "-o", "json", ...(workdir ? ["--workdir", workdir] : [])];
  const res = runCli(statusArgs, env);
  if (res.status !== 0) throw new TargetError("`supabase status` failed. Is the local stack running (supabase start)?");
  let s;
  try {
    s = JSON.parse(res.stdout);
  } catch {
    throw new TargetError("could not parse `supabase status -o json`.");
  }
  const api = new URL(s.API_URL);
  const db = new URL(s.DB_URL);
  const okApi = LOOPBACK.has(api.hostname) && Number(api.port) === want.api;
  const okDb = LOOPBACK.has(db.hostname) && Number(db.port) === want.db;
  if (!okApi || !okDb) {
    throw new TargetError(
      `local stack is not where config.toml says: API ${api.host} (want :${want.api}), DB ${db.host} (want :${want.db}).`,
    );
  }
  return { status: s, description: `API ${api.host}, DB ${db.host}${workdir ? ` (workdir ${workdir})` : ""}` };
}

export const isLoopbackUrl = (u) => {
  try {
    return LOOPBACK.has(new URL(u).hostname);
  } catch {
    return false;
  }
};

function main(argv) {
  const sep = argv.indexOf("--");
  const mode = argv[0];
  const args = sep >= 0 ? argv.slice(sep + 1) : argv.slice(1);
  const log = (m) => console.error(`[db-target] ${m}`);

  try {
    const env = { ...process.env };
    const t = checkInvocation(mode, args, env);

    if (t.kind === "local") {
      log(`mode=local  target=${assertLocalStack(args, env)}`);
    } else {
      if (t.readOnly) delete env.SUPABASE_YES; // belt and braces: nothing here may confirm a hosted change
      log(`mode=${t.mode}  target=project ${t.ref}${t.readOnly ? "  (read-only commands only)" : ""}`);
    }
    log(`supabase ${redact(args)}`);

    const res = runCli(args, env, { stdio: "inherit", encoding: undefined });
    process.exit(res.status ?? 1);
  } catch (err) {
    if (err instanceof TargetError) {
      log(`REFUSED: ${err.message}`);
      process.exit(2);
    }
    throw err;
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main(process.argv.slice(2));
}
