/**
 * Unit tests for withRetry. Pure — no network, fast (1ms base delay).
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { withRetry } from "../src/utils/retry.js";

const always = () => true;

test("returns immediately when fn succeeds", async () => {
  let calls = 0;
  const result = await withRetry(
    async () => {
      calls += 1;
      return "ok";
    },
    { retries: 3, baseDelayMs: 1, isRetryable: always },
  );
  assert.equal(result, "ok");
  assert.equal(calls, 1);
});

test("retries retryable failures then succeeds", async () => {
  let calls = 0;
  const result = await withRetry(
    async () => {
      calls += 1;
      if (calls < 3) throw new Error("transient");
      return "recovered";
    },
    { retries: 5, baseDelayMs: 1, isRetryable: always },
  );
  assert.equal(result, "recovered");
  assert.equal(calls, 3);
});

test("does not retry non-retryable errors", async () => {
  let calls = 0;
  await assert.rejects(
    withRetry(
      async () => {
        calls += 1;
        throw new Error("fatal");
      },
      { retries: 5, baseDelayMs: 1, isRetryable: () => false },
    ),
    /fatal/,
  );
  assert.equal(calls, 1);
});

test("throws the last error after exhausting retries", async () => {
  let calls = 0;
  await assert.rejects(
    withRetry(
      async () => {
        calls += 1;
        throw new Error(`fail-${calls}`);
      },
      { retries: 2, baseDelayMs: 1, isRetryable: always },
    ),
    /fail-3/,
  );
  assert.equal(calls, 3); // 1 initial + 2 retries
});
