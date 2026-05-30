/**
 * Generic retry with exponential backoff.
 *
 * Only retries when `isRetryable(err)` is true (e.g. 429 / 5xx / timeouts).
 * Used by provider adapters to absorb transient failures while establishing a
 * stream. Mid-stream failures are NOT retried by callers (that would duplicate
 * already-emitted tokens).
 */
export interface RetryOptions {
  /** Additional attempts after the first (so total tries = retries + 1). */
  retries: number;
  /** Base delay; attempt N waits baseDelayMs * 2^N. */
  baseDelayMs: number;
  /** Decide whether a thrown error is worth retrying. */
  isRetryable: (err: unknown) => boolean;
  /** Optional hook for logging each retry. */
  onRetry?: (attempt: number, delayMs: number, err: unknown) => void;
  /** Abort waiting (and stop retrying) when signalled. */
  signal?: AbortSignal;
}

function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new Error("aborted"));
      return;
    }
    const timer = setTimeout(() => {
      signal?.removeEventListener("abort", onAbort);
      resolve();
    }, ms);
    const onAbort = () => {
      clearTimeout(timer);
      reject(new Error("aborted"));
    };
    signal?.addEventListener("abort", onAbort, { once: true });
  });
}

export async function withRetry<T>(
  fn: () => Promise<T>,
  opts: RetryOptions,
): Promise<T> {
  let attempt = 0;
  for (;;) {
    try {
      return await fn();
    } catch (err) {
      if (attempt >= opts.retries || !opts.isRetryable(err)) throw err;
      const delayMs = opts.baseDelayMs * 2 ** attempt;
      opts.onRetry?.(attempt + 1, delayMs, err);
      await sleep(delayMs, opts.signal);
      attempt += 1;
    }
  }
}
