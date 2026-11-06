#!/usr/bin/env node
/**
 * The server Playwright starts for `npm run test:e2e`: a production build of the app,
 * served by `next start` on 127.0.0.1:3100, with the explicit local-stack environment
 * from scripts/with-local-env.mjs (never .env.local). Playwright stops it when the run
 * ends.
 */
import { spawn, spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const withLocalEnv = path.join(root, "scripts", "with-local-env.mjs");

const build = spawnSync(process.execPath, [withLocalEnv, "next", "build"], { cwd: root, stdio: "inherit" });
if (build.status !== 0) process.exit(build.status ?? 1);

const server = spawn(process.execPath, [withLocalEnv, "next", "start", "-p", "3100", "-H", "127.0.0.1"], {
  cwd: root,
  stdio: "inherit",
});
for (const sig of ["SIGINT", "SIGTERM"]) process.on(sig, () => server.kill(sig));
server.on("exit", (code) => process.exit(code ?? 0));
