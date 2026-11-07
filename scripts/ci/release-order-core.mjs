/**
 * Pure rules for the "Release order" CI check (scripts/ci/release-order.mjs).
 * See docs/CONVENTIONS.md § Release order.
 *
 *  1. A migration that's already on the base branch is never modified, renamed or deleted.
 *  2. A PR that adds a migration is migration-only: besides migrations it may touch only
 *     an explicit allowlist (tests, fixtures, seed, generated types, docs). App code,
 *     package files, build scripts and config wait for a follow-up PR, after the migration
 *     has been applied and verified in production by hand.
 *
 * The check can't prove the production migration was applied. That stays a manual PR
 * checklist item.
 */

const MIGRATION = /^supabase\/migrations\/[^/]+\.sql$/;

/** Paths allowed alongside a new migration. Anything else fails. */
export const ALLOWED_WITH_MIGRATION = [
  /^supabase\/migrations\/[^/]+\.sql$/,
  /^supabase\/tests\//,
  /^supabase\/fixtures\//,
  /^supabase\/seed\.sql$/,
  /^src\/data\/database\.types\.ts$/,
  /^docs\//,
  /^tests\//,
];

/**
 * Parses `git diff --name-status -M <base>...HEAD`.
 * @param {string} text
 * @returns {{ status: string, path: string, from?: string }[]}
 */
export function parseNameStatus(text) {
  const out = [];
  for (const line of text.split(/\r?\n/)) {
    if (!line.trim()) continue;
    const [code, a, b] = line.split("\t");
    const status = code[0];
    if (status === "R" || status === "C") out.push({ status, path: b, from: a });
    else out.push({ status, path: a });
  }
  return out;
}

/**
 * @param {{ status: string, path: string, from?: string }[]} changes
 * @returns {{ ok: boolean, summary: string, problems: string[] }}
 */
export function checkReleaseOrder(changes) {
  const problems = [];

  for (const c of changes) {
    const touchesOld = (p) => p && MIGRATION.test(p);
    if (c.status === "M" && touchesOld(c.path)) problems.push(`modifies an existing migration: ${c.path}`);
    if (c.status === "D" && touchesOld(c.path)) problems.push(`deletes an existing migration: ${c.path}`);
    if (c.status === "R" && touchesOld(c.from)) problems.push(`renames an existing migration: ${c.from} → ${c.path}`);
  }

  const added = changes.filter((c) => c.status === "A" && MIGRATION.test(c.path)).map((c) => c.path);
  if (added.length) {
    const outside = changes
      .filter((c) => !(c.status === "A" && MIGRATION.test(c.path)))
      .map((c) => c.path)
      .filter((p) => !ALLOWED_WITH_MIGRATION.some((re) => re.test(p)));
    for (const p of outside) {
      problems.push(
        `changes ${p} in a PR that adds a migration. Schema changes ship as a migration-only PR; ` +
          `this change belongs in a follow-up PR after the migration is applied and verified in production`,
      );
    }
  }

  const summary = added.length
    ? `migration-only PR adding ${added.length} migration(s): ${added.join(", ")}`
    : "no new migrations";
  return { ok: problems.length === 0, summary, problems };
}
