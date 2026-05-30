/**
 * Smoke test — proves the server boots and the two Commit 1 endpoints answer.
 *
 * Uses the Node built-in test runner (no extra deps) and binds to an ephemeral
 * port so it never collides with a running dev server. Run via `npm test`.
 */
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import type { AddressInfo } from "node:net";
import { createServer, type Server } from "node:http";
import { createApp } from "../src/app.js";

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

test("GET /health returns 200 ok", async () => {
  const res = await fetch(`${baseUrl}/health`);
  assert.equal(res.status, 200);
  const body = (await res.json()) as { status: string };
  assert.equal(body.status, "ok");
});

test("GET /api/status returns 200 with mode + ws protocol version", async () => {
  const res = await fetch(`${baseUrl}/api/status`);
  assert.equal(res.status, 200);
  const body = (await res.json()) as {
    status: string;
    mode: string;
    ws: { protocolVersion: number };
  };
  assert.equal(body.status, "ok");
  assert.equal(body.mode, "api");
  assert.equal(body.ws.protocolVersion, 1);
});

test("response carries an x-request-id header", async () => {
  const res = await fetch(`${baseUrl}/health`);
  assert.ok(res.headers.get("x-request-id"));
});

test("unknown route returns structured 404", async () => {
  const res = await fetch(`${baseUrl}/nope`);
  assert.equal(res.status, 404);
  const body = (await res.json()) as { error: string };
  assert.equal(body.error, "not_found");
});
