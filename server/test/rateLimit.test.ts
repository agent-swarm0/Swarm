/**
 * Rate-limit integration test.
 *
 * Sets a low limit via env BEFORE importing the app (dynamic import), so the
 * limiter is constructed with the test threshold. Verifies /api is throttled
 * with a clean 429 while /health stays open.
 */
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import type { AddressInfo } from "node:net";
import { createServer, type Server } from "node:http";

// Must be set before app/config modules are imported.
process.env.RATE_LIMIT_MAX = "5";
process.env.RATE_LIMIT_WINDOW_MS = "60000";

const { createApp } = await import("../src/app.js");

let server: Server;
let baseUrl: string;

before(async () => {
  server = createServer(createApp());
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const { port } = server.address() as AddressInfo;
  baseUrl = `http://127.0.0.1:${port}`;
});

after(async () => {
  await new Promise<void>((resolve, reject) =>
    server.close((err) => (err ? reject(err) : resolve())),
  );
});

test("/api/* returns 429 with a clean body once the limit is exceeded", async () => {
  const statuses: number[] = [];
  for (let i = 0; i < 7; i++) {
    const res = await fetch(`${baseUrl}/api/status`);
    statuses.push(res.status);
    if (res.status === 429) {
      const body = (await res.json()) as { error: string; message: string };
      assert.equal(body.error, "rate_limited");
      assert.match(body.message, /too many requests/i);
    }
  }
  const okCount = statuses.filter((s) => s === 200).length;
  const limitedCount = statuses.filter((s) => s === 429).length;
  assert.equal(okCount, 5, "first 5 within the limit succeed");
  assert.ok(limitedCount >= 1, "excess requests are limited");
});

test("/health is never rate limited", async () => {
  for (let i = 0; i < 10; i++) {
    const res = await fetch(`${baseUrl}/health`);
    assert.equal(res.status, 200);
  }
});
