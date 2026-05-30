/**
 * End-to-end dispatch test using stub provider adapters (no network).
 *
 * Verifies that startRun drives an adapter, publishes token/done/error frames
 * into the run's WS room, and transitions run state correctly — exercising the
 * full POST-less pipeline: registry → runService → hub → WS client.
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
import { startRun } from "../src/services/runService.js";

const okAdapter: ProviderAdapter = {
  name: "openai",
  defaultModel: "stub",
  // eslint-disable-next-line require-yield
  async *run() {
    yield { type: "token", content: "Hel" };
    yield { type: "token", content: "lo" };
    yield { type: "done", finishReason: "stop" };
  },
};

const errAdapter: ProviderAdapter = {
  name: "groq",
  defaultModel: "stub",
  async *run() {
    yield { type: "error", message: "boom", retryable: false };
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

async function waitForState(requestId: string, want: string): Promise<string> {
  for (let i = 0; i < 50; i++) {
    const run = getRun(requestId);
    if (run && run.state === want) return run.state;
    await new Promise((r) => setTimeout(r, 20));
  }
  return getRun(requestId)?.state ?? "missing";
}

before(async () => {
  registerProvider(okAdapter);
  registerProvider(errAdapter);
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

test("successful run streams tokens then done, and ends in state 'done'", async () => {
  const run = createRun({
    requestId: "req_ok",
    goal: "say hi",
    provider: "openai",
  });
  const { ws, next } = await connect(`${wsBase}?requestId=req_ok`);
  await next(); // welcome

  startRun(run, { apiKey: "stub-key" });

  const f1 = await next<{ type: string; content?: string }>();
  const f2 = await next<{ type: string; content?: string }>();
  const f3 = await next<{ type: string; summary?: string }>();

  assert.equal(f1.type, "token");
  assert.equal(f1.content, "Hel");
  assert.equal(f2.content, "lo");
  assert.equal(f3.type, "done");

  assert.equal(await waitForState("req_ok", "done"), "done");
  ws.close();
});

test("buffered frames replay to a client that connects late", async () => {
  const run = createRun({
    requestId: "req_late",
    goal: "say hi",
    provider: "openai",
  });
  // Start BEFORE connecting — frames must be buffered and replayed on join.
  startRun(run, { apiKey: "stub-key" });
  await waitForState("req_late", "done");

  const { ws, next } = await connect(`${wsBase}?requestId=req_late`);
  await next(); // welcome
  const replayed = await next<{ type: string; content?: string }>();
  assert.equal(replayed.type, "token");
  assert.equal(replayed.content, "Hel");
  ws.close();
});

test("provider error yields an error frame and state 'error'", async () => {
  const run = createRun({
    requestId: "req_err",
    goal: "explode",
    provider: "groq",
  });
  const { ws, next } = await connect(`${wsBase}?requestId=req_err`);
  await next(); // welcome

  startRun(run, { apiKey: "stub-key" });

  const f = await next<{ type: string; message?: string }>();
  assert.equal(f.type, "error");
  assert.equal(f.message, "boom");
  assert.equal(await waitForState("req_err", "error"), "error");
  ws.close();
});

test("unregistered provider fails fast with an error frame", async () => {
  const run = createRun({
    requestId: "req_noprov",
    goal: "x",
    provider: "gemini", // not registered in this test
  });
  const { ws, next } = await connect(`${wsBase}?requestId=req_noprov`);
  await next(); // welcome

  startRun(run, { apiKey: "stub-key" });

  const f = await next<{ type: string; message?: string }>();
  assert.equal(f.type, "error");
  assert.match(f.message ?? "", /not available/i);
  assert.equal(await waitForState("req_noprov", "error"), "error");
  ws.close();
});
