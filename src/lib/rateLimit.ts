/**
 * MusicBrainz allows roughly one unauthenticated request per second and will
 * block a client that ignores it. Every outbound MusicBrainz call is funnelled
 * through this single promise chain so requests are spaced regardless of how
 * many the UI fires at once.
 *
 * Caveat: this is per server instance. On Vercel, concurrent lambdas each hold
 * their own chain, so heavy parallel traffic could still exceed the limit. For
 * a personal-use app that is fine; a shared deploy would want a Redis or
 * Postgres-backed token bucket instead.
 */
const MIN_GAP_MS = 1100;

let chain: Promise<unknown> = Promise.resolve();
let lastAt = 0;

/**
 * `signal` matters more than it looks. Search fires on a debounce, so by the
 * time a queued request reaches the front of the chain the user has often typed
 * on and nobody wants its answer. Dropping it here — *before* the spacing wait
 * and without stamping `lastAt` — means a stale keystroke costs nothing and the
 * next real request starts immediately instead of queueing behind seconds of
 * dead work. That compounding queue was the main source of slow searches.
 */
export function throttled<T>(fn: () => Promise<T>, signal?: AbortSignal): Promise<T> {
  const run = async (): Promise<T> => {
    if (signal?.aborted) throw new DOMException("Aborted", "AbortError");
    const wait = Math.max(0, lastAt + MIN_GAP_MS - Date.now());
    if (wait > 0) await new Promise((r) => setTimeout(r, wait));
    // Re-check: the caller may have given up during the wait.
    if (signal?.aborted) throw new DOMException("Aborted", "AbortError");
    lastAt = Date.now();
    return fn();
  };
  const next = chain.then(run, run);
  // Keep the chain alive even when a call rejects.
  chain = next.catch(() => undefined);
  return next;
}

/** Small TTL cache so repeat views don't spend the rate-limit budget. */
export class TtlCache<T> {
  private map = new Map<string, { at: number; v: T }>();
  private ttlMs: number;
  private max: number;

  constructor(ttlMs: number, max = 500) {
    this.ttlMs = ttlMs;
    this.max = max;
  }

  get(k: string): T | undefined {
    const hit = this.map.get(k);
    if (!hit) return undefined;
    if (Date.now() - hit.at > this.ttlMs) {
      this.map.delete(k);
      return undefined;
    }
    // refresh LRU position
    this.map.delete(k);
    this.map.set(k, hit);
    return hit.v;
  }

  set(k: string, v: T): void {
    if (this.map.size >= this.max) {
      const oldest = this.map.keys().next().value;
      if (oldest !== undefined) this.map.delete(oldest);
    }
    this.map.set(k, { at: Date.now(), v });
  }
}
