#!/usr/bin/env node
/**
 * Best-effort staging pinger (.github/workflows/staging-keepalive.yml). Supabase Free
 * projects pause after a week without activity; calling public.keep_alive() once a day
 * keeps staging awake. Best effort only: GitHub disables scheduled workflows after 60
 * days without repository activity, and a paused project doesn't answer. See
 * docs/RUNBOOK.md § Resume staging.
 *
 * Environment: STAGING_PROJECT_REF, PRODUCTION_PROJECT_REF, STAGING_ANON_KEY.
 */
const REF_RE = /^[a-z]{20}$/;
const fail = (m) => {
  console.error(`::error::[keepalive] ${m}`);
  process.exit(1);
};

const ref = (process.env.STAGING_PROJECT_REF ?? "").trim();
const prod = (process.env.PRODUCTION_PROJECT_REF ?? "").trim();
const key = (process.env.STAGING_ANON_KEY ?? "").trim();
if (!REF_RE.test(ref)) fail("STAGING_PROJECT_REF is missing or not a project ref");
if (!REF_RE.test(prod)) fail("PRODUCTION_PROJECT_REF is missing or not a project ref");
if (ref === prod) fail("STAGING_PROJECT_REF equals PRODUCTION_PROJECT_REF; refusing to ping production");
if (!key) fail("STAGING_ANON_KEY is not set");

let res;
try {
  res = await fetch(`https://${ref}.supabase.co/rest/v1/rpc/keep_alive`, {
    method: "POST",
    headers: { apikey: key, authorization: `Bearer ${key}`, "content-type": "application/json" },
    body: "{}",
    signal: AbortSignal.timeout(20_000),
  });
} catch (err) {
  fail(`staging didn't answer (${err.name}). It may be paused: see docs/RUNBOOK.md § Resume staging`);
}
const body = await res.text();
if (!res.ok)
  fail(`HTTP ${res.status} from keep_alive. A paused project or a wrong key: see docs/RUNBOOK.md § Resume staging`);
if (body.trim() !== "1") fail(`keep_alive returned ${JSON.stringify(body.slice(0, 80))}, expected 1`);
console.log(`[keepalive] staging ${ref} answered keep_alive() = 1`);
