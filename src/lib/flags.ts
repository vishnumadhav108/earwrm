/**
 * Pure feature-flag evaluation, kept apart from the database read so it can be tested
 * directly. The row shape mirrors public.feature_flags.
 */
export type FlagRow = { key: string; enabled: boolean; rollout: number };

/** Stable 0–99 bucket for a user and flag (FNV-1a), so a user stays in or out across requests. */
export function bucketOf(key: string, userId: string): number {
  let h = 2166136261;
  const s = `${key}:${userId}`;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) % 100;
}

/**
 * Whether a flag is on.
 * - No row: the caller's default, so a missing flag never changes behaviour.
 * - Disabled: off.
 * - Enabled: on for users whose bucket is below `rollout`. With no user (signed out, or
 *   a background job), only a fully rolled-out flag (100) counts as on.
 */
export function flagOn(row: FlagRow | undefined, fallback: boolean, userId?: string): boolean {
  if (!row) return fallback;
  if (!row.enabled) return false;
  const rollout = Math.max(0, Math.min(100, row.rollout));
  if (rollout >= 100) return true;
  if (rollout <= 0 || !userId) return false;
  return bucketOf(row.key, userId) < rollout;
}
