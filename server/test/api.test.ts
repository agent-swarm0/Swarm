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

test("GET /api/agents returns all agents with categories", async () => {
  const res = await fetch(`${baseUrl}/api/agents`);
  assert.equal(res.status, 200);
  const body = await res.json() as { total: number; agents: object; grouped: object };
  assert.ok(body.total > 0);
  assert.ok(Object.keys(body.agents).length > 0);
  assert.ok(Object.keys(body.grouped).length > 0);
});

const providers = ["openai", "anthropic", "gemini", "groq"];
for (const provider of providers) {
  test(`POST /run with provider: ${provider}`, async () => {
    const res = await fetch(`${baseUrl}/run`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ agent: "frontend-dev", task: "Create a navbar", provider }),
    });
    assert.equal(res.status, 200);
    const body = await res.json() as { provider: string; agent: string; status: string };
    assert.equal(body.provider, provider);
    assert.equal(body.agent, "frontend-dev");
    assert.equal(body.status, "queued");
  });
}

test("POST /run without agent returns 400", async () => {
  const res = await fetch(`${baseUrl}/run`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ task: "do something" }),
  });
  assert.equal(res.status, 400);
});

test("POST /run with invalid provider returns 400", async () => {
  const res = await fetch(`${baseUrl}/run`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ agent: "frontend-dev", provider: "kilocode" }),
  });
  assert.equal(res.status, 400);
});

test("POST /run with unknown agent returns 404", async () => {
  const res = await fetch(`${baseUrl}/run`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ agent: "fake-agent-xyz", provider: "anthropic" }),
  });
  assert.equal(res.status, 404);
});

test("CLI --api-key: server responds when ANTHROPIC_API_KEY is set", async () => {
  process.env.ANTHROPIC_API_KEY = "test-key-123";
  const res = await fetch(`${baseUrl}/health`);
  assert.equal(res.status, 200);
  delete process.env.ANTHROPIC_API_KEY;
});
