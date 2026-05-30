/**
 * Unit tests for the OpenAI error mapper. Pure — no network, no SDK instances.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { mapOpenAiError } from "../src/providers/openai.js";

test("401 maps to a non-retryable auth message", () => {
  const r = mapOpenAiError({ status: 401, message: "bad key" });
  assert.equal(r.retryable, false);
  assert.match(r.message, /authentication/i);
});

test("429 maps to a retryable rate-limit message", () => {
  const r = mapOpenAiError({ status: 429 });
  assert.equal(r.retryable, true);
  assert.match(r.message, /rate limit/i);
});

test("5xx maps to a retryable service message", () => {
  const r = mapOpenAiError({ status: 503 });
  assert.equal(r.retryable, true);
  assert.match(r.message, /service/i);
});

test("4xx (non-401/429) maps to a non-retryable request error", () => {
  const r = mapOpenAiError({ status: 400, message: "invalid model" });
  assert.equal(r.retryable, false);
  assert.match(r.message, /rejected/i);
});

test("connection timeout is retryable", () => {
  const r = mapOpenAiError({ name: "APIConnectionTimeoutError" });
  assert.equal(r.retryable, true);
  assert.match(r.message, /timed out/i);
});

test("connection refused is retryable", () => {
  const r = mapOpenAiError({ code: "ECONNREFUSED" });
  assert.equal(r.retryable, true);
});

test("unknown error is non-retryable with its message", () => {
  const r = mapOpenAiError(new Error("weird"));
  assert.equal(r.retryable, false);
  assert.equal(r.message, "weird");
});
