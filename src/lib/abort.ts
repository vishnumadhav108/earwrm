/**
 * Cancellation is a normal outcome here, not a failure: search fires on a
 * debounce and aborts whatever the user typed past. It arrives in more than one
 * shape, which is why a plain `name === "AbortError"` check leaked stack traces
 * into the server log:
 *
 *   - `AbortError`      — undici/fetch, when our own AbortSignal fires
 *   - `ResponseAborted` — Next's own error when the *client* disconnects
 *     mid-response, carried on `name` or on the `digest` property
 *   - `ABORT_ERR` / code 20 — DOMException's numeric legacy code
 *
 * Anything matching is swallowed quietly; everything else is a real error and
 * must still be logged.
 */
export function isAbortError(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  const e = err as { name?: unknown; code?: unknown; digest?: unknown; message?: unknown };
  const name = typeof e.name === "string" ? e.name : "";
  const digest = typeof e.digest === "string" ? e.digest : "";
  if (name === "AbortError" || name === "ResponseAborted" || name === "TimeoutError") return true;
  if (digest === "ResponseAborted" || digest.includes("ResponseAborted")) return true;
  if (e.code === "ABORT_ERR" || e.code === 20) return true;
  return typeof e.message === "string" && /\baborted\b/i.test(e.message);
}
