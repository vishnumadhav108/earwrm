/**
 * Pure decisions for the staging-migrate workflow (scripts/staging/migrate.mjs).
 * See docs/STAGING.md and docs/RUNBOOK.md § Staging recovery.
 *
 * Two tags describe staging:
 *   staging-last-good  the newest commit whose migrations were pushed to staging AND
 *                      verified. Never deleted; only moves forward.
 *   staging-applied    published last, after verification. Preview builds compare
 *                      against it. Deleted before any push, so a preview built mid-run
 *                      falls back to demo mode.
 */

const MIGRATION_FILE = /^supabase\/migrations\/(\d+)_[^/]+\.sql$/;

/** Versions (filename timestamps) from a migration tree (path → blob). */
export function versionsFromTree(tree) {
  const out = [];
  for (const p of tree.keys()) {
    const m = MIGRATION_FILE.exec(p);
    if (m) out.push(m[1]);
  }
  return out.sort();
}

/** Versions applied on the database, from `migration list --output-format json`. */
export function appliedFromList(json) {
  return (json?.migrations ?? [])
    .map((m) => (m.remote ?? "").trim())
    .filter(Boolean)
    .sort();
}

export const sameSet = (a, b) => a.length === b.length && [...a].sort().every((v, i) => v === [...b].sort()[i]);
export const isSubset = (a, b) => a.every((v) => b.includes(v));

/** Same filenames and blob hashes. */
export function sameTree(a, b) {
  if (a.size !== b.size) return false;
  for (const [p, blob] of a) if (b.get(p) !== blob) return false;
  return true;
}

/**
 * Staging's applied versions must sit between the last verified state and the commit
 * being deployed: a superset of staging-last-good's migrations and a subset of HEAD's.
 * Anything else means the database and the tags disagree.
 */
export function checkConsistency({ applied, lastGoodVersions, headVersions }) {
  const missingFromLastGood = lastGoodVersions.filter((v) => !applied.includes(v));
  const unknown = applied.filter((v) => !headVersions.includes(v));
  const problems = [];
  if (missingFromLastGood.length) {
    problems.push(
      `staging is missing migrations that staging-last-good says were applied: ${missingFromLastGood.join(", ")}`,
    );
  }
  if (unknown.length) {
    problems.push(`staging has migrations this commit doesn't contain: ${unknown.join(", ")}`);
  }
  return { ok: problems.length === 0, problems };
}

/**
 * The no-op shortcut: skip deleting staging-applied and skip db push only when
 * (a) both tags exist and describe a consistent verified state, (b) the ancestry check
 * passed, (c) this commit's migration files are identical to staging-last-good's, and
 * (d) staging's applied versions exactly equal the expected set.
 */
export function decideNoop({
  appliedTagSha,
  lastGoodSha,
  lastGoodVersions,
  applied,
  ancestryOk,
  headTree,
  lastGoodTree,
}) {
  const reasons = [];
  if (!appliedTagSha || !lastGoodSha) reasons.push("a tag is missing");
  else if (appliedTagSha !== lastGoodSha)
    reasons.push("staging-applied and staging-last-good point at different commits");
  if (!sameSet(applied, lastGoodVersions))
    reasons.push("staging's applied versions differ from staging-last-good's migrations");
  if (!ancestryOk) reasons.push("ancestry check failed");
  if (!headTree || !lastGoodTree || !sameTree(headTree, lastGoodTree)) {
    reasons.push("this commit's migration files differ from staging-last-good's");
  }
  if (!headTree || !sameSet(applied, versionsFromTree(headTree)))
    reasons.push("applied versions differ from this commit's");
  return { noop: reasons.length === 0, reasons };
}

/** Bootstrap is allowed only on a fresh project: no checkpoint, no history, no app objects. */
export function checkBootstrap({ lastGoodSha, applied, snapshotRows }) {
  const problems = [];
  if (lastGoodSha)
    problems.push(`staging-last-good already exists (${lastGoodSha.slice(0, 12)}); bootstrap is one-time only`);
  if (applied.length) problems.push(`staging already has applied migrations: ${applied.join(", ")}`);
  const appObjects = snapshotRows.filter((r) => r.kind !== "default_acl");
  if (appObjects.length) {
    const sample = appObjects.slice(0, 5).map((r) => `${r.kind} ${r.name}`);
    problems.push(`staging already has ${appObjects.length} app-owned object(s), e.g. ${sample.join("; ")}`);
  }
  return { ok: problems.length === 0, problems };
}

/** Management API GET /v1/projects/{ref} → what it means for this run. */
export function classifyProjectStatus(httpStatus, body) {
  if (httpStatus === 401 || httpStatus === 403) {
    return {
      kind: "auth",
      message: `the access token was refused (HTTP ${httpStatus}): invalid, expired, or missing scope`,
    };
  }
  if (httpStatus === 404)
    return { kind: "auth", message: "project not found with this token (wrong ref, or no access)" };
  if (httpStatus !== 200) return { kind: "unknown", message: `unexpected HTTP ${httpStatus} from the Management API` };
  const status = body?.status ?? "UNKNOWN";
  if (status === "ACTIVE_HEALTHY") return { kind: "ok", message: "ACTIVE_HEALTHY" };
  return {
    kind: "unavailable",
    message: `staging is unavailable (status ${status}), possibly paused. See docs/RUNBOOK.md § Resume staging`,
  };
}

/** Classifies a failed CLI run (db push, migration list, db query) by its output. */
export function classifyCliError(text) {
  const t = text ?? "";
  if (
    /password authentication failed|permission denied for|Unauthorized|401|403|access token|not authorized/i.test(t)
  ) {
    return "auth";
  }
  if (/SQLSTATE|ERROR:\s|syntax error|violates|already exists|does not exist/i.test(t)) return "sql";
  if (
    /timeout|timed out|connection refused|ECONNREFUSED|ENOTFOUND|could not connect|network|paused|unreachable/i.test(t)
  ) {
    return "unavailable";
  }
  return "unknown";
}
