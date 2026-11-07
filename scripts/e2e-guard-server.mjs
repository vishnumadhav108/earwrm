#!/usr/bin/env node
/**
 * The server for `npm run test:e2e:guard`: a production build with the preview guard on
 * (NEXT_PUBLIC_EARWRM_PREVIEW_GUARD=1), served on 127.0.0.1:3101.
 *
 * Supabase points at the local tripwire (scripts/supabase-tripwire.mjs on :3198), and the
 * keys are dummies, so the build has no way to reach a real database. Every other key
 * from Next's env files is blanked, as in scripts/with-local-env.mjs.
 */
import { spawn, spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { resolveLocalEnv } from "./with-local-env.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const next = path.join(root, "node_modules", "next", "dist", "bin", "next");

const { env } = resolveLocalEnv(process.env, path.join(root, ".env.localstack"), {
  NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:3198",
  NEXT_PUBLIC_SUPABASE_ANON_KEY: "guard-test-anon-key",
  SUPABASE_SERVICE_ROLE_KEY: "guard-test-service-role-key",
  MUSICBRAINZ_USER_AGENT: "earwrm-guard-test/0.0.0 ( https://github.com/vishnumadhav108/earwrm )",
  NEXT_PUBLIC_EARWRM_PREVIEW_GUARD: "1",
});

const build = spawnSync(process.execPath, [next, "build"], { cwd: root, env, stdio: "inherit" });
if (build.status !== 0) process.exit(build.status ?? 1);

const server = spawn(process.execPath, [next, "start", "-p", "3101", "-H", "127.0.0.1"], {
  cwd: root,
  env,
  stdio: "inherit",
});
for (const sig of ["SIGINT", "SIGTERM"]) process.on(sig, () => server.kill(sig));
server.on("exit", (code) => process.exit(code ?? 0));
