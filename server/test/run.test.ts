/**
 * POST /api/run + GET /api/run/:requestId tests.
 *
 * Covers validation failures, the happy path (202 + requestId), unknown-agent
 * rejection, and run-state lookup including the 404 case.
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

function post(body: unknown): Promise<Response> {
  return fetch(`${baseUrl}/api/run`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

test("valid request returns 202 with a requestId and stream info", async () => {
  const res = await post({
    goal: "Build a landing page",
    provider: "openai",
    apiKey: "sk-test-not-real",
  });
  assert.equal(res.status, 202);
  const body = (await res.json()) as {
    requestId: string;
    state: string;
    stream: { path: string; query: { requestId: string } };
  };
  assert.match(body.requestId, /^req_/);
  assert.equal(body.state, "pending");
  assert.equal(body.stream.path, "/ws/stream");
  assert.equal(body.stream.query.requestId, body.requestId);
});

test("missing goal fails validation with 400", async () => {
  const res = await post({ provider: "openai", apiKey: "sk-x" });
  assert.equal(res.status, 400);
  const body = (await res.json()) as { error: string; issues: unknown[] };
  assert.equal(body.error, "validation_error");
  assert.ok(Array.isArray(body.issues));
});

test("unsupported provider fails validation with 400", async () => {
  const res = await post({ goal: "x", provider: "mistral", apiKey: "k" });
  assert.equal(res.status, 400);
  const body = (await res.json()) as { error: string };
  assert.equal(body.error, "validation_error");
});

test("unknown agent is rejected with 400", async () => {
  const res = await post({
    goal: "x",
    provider: "openai",
    apiKey: "k",
    agentSlug: "__definitely_not_an_agent__",
  });
  assert.equal(res.status, 400);
  const body = (await res.json()) as { error: string };
  assert.equal(body.error, "unknown_agent");
});

test("a registered run is retrievable by requestId", async () => {
  const created = (await (
    await post({ goal: "trace me", provider: "groq", apiKey: "k" })
  ).json()) as { requestId: string };

  const res = await fetch(`${baseUrl}/api/run/${created.requestId}`);
  assert.equal(res.status, 200);
  const run = (await res.json()) as {
    requestId: string;
    goal: string;
    provider: string;
    state: string;
  };
  assert.equal(run.requestId, created.requestId);
  assert.equal(run.goal, "trace me");
  assert.equal(run.provider, "groq");
});

test("unknown run id returns 404", async () => {
  const res = await fetch(`${baseUrl}/api/run/req_does_not_exist`);
  assert.equal(res.status, 404);
});
