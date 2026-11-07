/**
 * Pure decision for the Vercel preview guard (used by scripts/vercel-build.mjs).
 *
 * A preview may run against shared staging only when its supabase/migrations/ folder is
 * byte-for-byte what staging has applied, as recorded by the `staging-applied` tag
 * (moved only by the staging-migrate workflow after a verified push). Anything else,
 * including any doubt, means demo mode.
 */

/**
 * Parses `git ls-tree -r <ref> -- supabase/migrations/` output into a Map of
 * path → blob hash.
 * @param {string} text
 * @returns {Map<string, string>}
 */
export function parseLsTree(text) {
  const out = new Map();
  for (const line of text.split(/\r?\n/)) {
    const m = /^\d+\s+blob\s+([0-9a-f]{40,64})\t(.+)$/.exec(line.trim());
    if (m) out.set(m[2], m[1]);
  }
  return out;
}

/**
 * Differences between two migration trees (path → blob).
 * @param {Map<string, string>} head
 * @param {Map<string, string>} tag
 */
export function diffTrees(head, tag) {
  const added = [...head.keys()].filter((p) => !tag.has(p));
  const removed = [...tag.keys()].filter((p) => !head.has(p));
  const changed = [...head.keys()].filter((p) => tag.has(p) && tag.get(p) !== head.get(p));
  return { added, removed, changed };
}

/**
 * @param {{ vercelEnv?: string, head?: Map<string,string> | null, tag?: Map<string,string> | null, error?: string | null }} input
 * @returns {{ mode: "skip" | "full" | "demo", reason: string }}
 */
export function decideGuard({ vercelEnv, head = null, tag = null, error = null }) {
  if (vercelEnv !== "preview")
    return { mode: "skip", reason: `not a preview build (VERCEL_ENV=${vercelEnv ?? "unset"})` };
  if (error) return { mode: "demo", reason: error };
  if (!tag) return { mode: "demo", reason: "tag staging-applied not found" };
  if (!head) return { mode: "demo", reason: "could not read this commit's migrations" };
  const d = diffTrees(head, tag);
  const n = d.added.length + d.removed.length + d.changed.length;
  if (n === 0) return { mode: "full", reason: `migrations match staging-applied (${head.size} files)` };
  const parts = [];
  if (d.added.length) parts.push(`added: ${d.added.join(", ")}`);
  if (d.removed.length) parts.push(`removed: ${d.removed.join(", ")}`);
  if (d.changed.length) parts.push(`changed: ${d.changed.join(", ")}`);
  return { mode: "demo", reason: `migrations differ from staging-applied (${parts.join("; ")})` };
}
