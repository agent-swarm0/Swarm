/**
 * Concurrency limiter + queue tests.
 *
 * A barrier-gated stub adapter lets the test hold runs "in flight" so it can
 * assert that no more than `cap` execute at once, that excess runs queue, and
 * that queued clients receive `queue_status` frames over WS.
 */
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import type { AddressInfo } from "node:net";
import { createServer, type Server } from "node:http";
import { WebSocket } from "ws";
import { createApp } from "../src/app.js";
import {
  attachWebSocketServer,
  type WebSocketHandle,
} from "../src/websocket/index.js";
import { registerProvider } from "../src/providers/index.js";
import type { ProviderAdapter } from "../src/providers/types.js";
import { createRun, getRun } from "../src/services/runRegistry.js";
import {
  enqueueRun,
  activeRunningCount,
  queueDepth,
} from "../src/services/runQueue.js";

// Force a small cap before anything reads it.
process.env.SWARM_CONCURRENCY_CAP = "2";

let concurrent = 0;
let peak = 0;
let resolvers: (() => void)[] = [];

function barrier(): Promise<void> {
  return new Promise<void>((res) => resolvers.push(res));
}
function releaseAll(): void {
  const r = resolvers;
  resolvers = [];
  for (const fn of r) fn();
}

const barrierAdapter: ProviderAdapter = {
  name: "openai",
  defaultModel: "stub",
  async *run() {
    concurrent += 1;
    peak = Math.max(peak, concurrent);
    await barrier();
    concurrent -= 1;
    yield { type: "token", content: "x" };
    yield { type: "done" };
  },
};

let server: Server;
let wsHandle: WebSocketHandle;
let wsBase: string;

interface Conn {
  ws: WebSocket;
  next: <T>() => Promise<T>;
}
function connect(url: string): Promise<Conn> {
  return new Promise<Conn>((resolve, reject) => {
    const ws = new WebSocket(url);
    const queue: unknown[] = [];
    const waiters: ((v: unknown) => void)[] = [];
    ws.on("message", (data: WebSocket.RawData) => {
      const msg = JSON.parse(data.toString());
      const w = waiters.shift();
      if (w) w(msg);
      else queue.push(msg);
    });
    ws.once("error", reject);
    ws.once("open", () =>
      resolve({
        ws,
        next: <T>() =>
          new Promise<T>((res) => {
            const q = queue.shift();
            if (q !== undefined) res(q as T);
            else waiters.push(res as (v: unknown) => void);
          }),
      }),
    );
  });
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function waitForState(requestId: string, want: string): Promise<string> {
  for (let i = 0; i < 100; i++) {
    if (getRun(requestId)?.state === want) return want;
    await sleep(15);
  }
  return getRun(requestId)?.state ?? "missing";
}

before(async () => {
  registerProvider(barrierAdapter);
  server = createServer(createApp());
  wsHandle = attachWebSocketServer(server);
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const { port } = server.address() as AddressInfo;
  wsBase = `ws://127.0.0.1:${port}/ws/stream`;
});

after(async () => {
  await wsHandle.close();
  await new Promise<void>((resolve, reject) =>
    server.close((err) => (err ? reject(err) : resolve())),
  );
});

test("caps concurrency at the limit and queues the excess", async () => {
  peak = 0;
  for (let i = 0; i < 5; i++) {
    enqueueRun(
      createRun({ requestId: `req_c${i}`, goal: "g", provider: "openai" }),
      { apiKey: "k" },
    );
  }

  // Let the first wave reach the barrier.
  await sleep(60);
  assert.equal(activeRunningCount(), 2, "exactly cap runs should be active");
  assert.equal(concurrent, 2, "exactly cap adapters should be in flight");
  assert.equal(queueDepth(), 3, "the rest should be queued");
  assert.equal(peak, 2, "concurrency never exceeded the cap");

  // Drain: keep releasing until everything finishes.
  const drain = setInterval(releaseAll, 10);
  for (let i = 0; i < 5; i++) {
    assert.equal(await waitForState(`req_c${i}`, "done"), "done");
  }
  clearInterval(drain);
  assert.equal(peak, 2, "cap held for the whole run");
  assert.equal(queueDepth(), 0);
});

test("a queued run receives a queue_status frame over WS", async () => {
  peak = 0;
  // Fill both slots so the next run must queue.
  enqueueRun(createRun({ requestId: "req_fill1", goal: "g", provider: "openai" }), { apiKey: "k" });
  enqueueRun(createRun({ requestId: "req_fill2", goal: "g", provider: "openai" }), { apiKey: "k" });
  await sleep(40);

  const queued = createRun({ requestId: "req_queued", goal: "g", provider: "openai" });
  enqueueRun(queued, { apiKey: "k" });
  assert.equal(getRun("req_queued")?.state, "queued");

  const { ws, next } = await connect(`${wsBase}?requestId=req_queued`);
  await next(); // welcome
  const qs = await next<{ type: string; position: number; depth: number }>();
  assert.equal(qs.type, "queue_status");
  assert.ok(qs.position >= 1, "queued run has a positive position");
  assert.ok(qs.depth >= 1);

  // Clean up: drain everything.
  const drain = setInterval(releaseAll, 10);
  await waitForState("req_queued", "done");
  clearInterval(drain);
  ws.close();
});
