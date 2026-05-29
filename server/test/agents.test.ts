/**
 * GET /api/agents tests — reads the real repo-root swarm.config.json.
 *
 * Asserts the catalog loads, is sizeable, excludes the doc pseudo-agents, and
 * supports category filtering.
 */
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import type { AddressInfo } from "node:net";
import { createServer, type Server } from "node:http";
import { createApp } from "../src/app.js";

let server: Server;
let baseUrl: string;

const DOC_PSEUDO_AGENTS = [
  "README",
  "QUICKSTART",
  "EXECUTIVE-BRIEF",
  "handoff-templates",
  "agent-activation-prompts",
];

interface Agent {
  slug: string;
  file: string;
  category: string;
}

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

test("GET /api/agents returns a populated catalog", async () => {
  const res = await fetch(`${baseUrl}/api/agents`);
  assert.equal(res.status, 200);
  const body = (await res.json()) as {
    count: number;
    categories: string[];
    agents: Agent[];
  };
  assert.ok(body.count > 200, `expected >200 agents, got ${body.count}`);
  assert.equal(body.agents.length, body.count);
  assert.ok(body.categories.length > 0);
  // Every agent has the normalised shape.
  for (const a of body.agents) {
    assert.equal(typeof a.slug, "string");
    assert.equal(typeof a.category, "string");
  }
});

test("doc pseudo-agents are never returned", async () => {
  const res = await fetch(`${baseUrl}/api/agents`);
  const body = (await res.json()) as { agents: Agent[] };
  const slugs = new Set(body.agents.map((a) => a.slug));
  for (const doc of DOC_PSEUDO_AGENTS) {
    assert.ok(!slugs.has(doc), `doc pseudo-agent leaked: ${doc}`);
  }
});

test("?category= filters to a single category", async () => {
  // Discover a real category from the unfiltered response first.
  const all = (await (await fetch(`${baseUrl}/api/agents`)).json()) as {
    categories: string[];
  };
  const category = all.categories[0]!;

  const res = await fetch(
    `${baseUrl}/api/agents?category=${encodeURIComponent(category)}`,
  );
  assert.equal(res.status, 200);
  const body = (await res.json()) as {
    category: string;
    count: number;
    agents: Agent[];
  };
  assert.equal(body.category, category);
  assert.ok(body.count > 0);
  assert.ok(body.agents.every((a) => a.category === category));
});

test("unknown category returns an empty list, not an error", async () => {
  const res = await fetch(`${baseUrl}/api/agents?category=__nope__`);
  assert.equal(res.status, 200);
  const body = (await res.json()) as { count: number; agents: Agent[] };
  assert.equal(body.count, 0);
  assert.equal(body.agents.length, 0);
});
