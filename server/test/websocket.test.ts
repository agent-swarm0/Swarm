/**
 * WebSocket /ws/stream tests.
 *
 * Verifies the versioned welcome frame on connect and that hub.publish fans a
 * frame out to a subscribed client keyed by requestId.
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
import { publish } from "../src/websocket/hub.js";
import { frame } from "../src/websocket/protocol.js";

let server: Server;
let wsHandle: WebSocketHandle;
let wsBase: string;

interface Conn {
  ws: WebSocket;
  /** Resolve with the next received frame (buffered if it already arrived). */
  next: <T>() => Promise<T>;
}

/**
 * Connect and start buffering frames BEFORE `open` resolves, so the welcome
 * frame (sent immediately on the server side) is never dropped.
 */
function connect(url: string): Promise<Conn> {
  return new Promise<Conn>((resolve, reject) => {
    const ws = new WebSocket(url);
    const queue: unknown[] = [];
    const waiters: ((value: unknown) => void)[] = [];

    ws.on("message", (data: WebSocket.RawData) => {
      const msg = JSON.parse(data.toString());
      const waiter = waiters.shift();
      if (waiter) waiter(msg);
      else queue.push(msg);
    });

    ws.once("error", reject);
    ws.once("open", () => {
      resolve({
        ws,
        next: <T>() =>
          new Promise<T>((res) => {
            const queued = queue.shift();
            if (queued !== undefined) res(queued as T);
            else waiters.push(res as (value: unknown) => void);
          }),
      });
    });
  });
}

before(async () => {
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

test("client receives a versioned welcome frame echoing its requestId", async () => {
  const { ws, next } = await connect(`${wsBase}?requestId=req_welcome`);
  const msg = await next<{ v: number; type: string; requestId?: string }>();
  assert.equal(msg.v, 1);
  assert.equal(msg.type, "welcome");
  assert.equal(msg.requestId, "req_welcome");
  ws.close();
});

test("publish delivers a frame to the subscribed client", async () => {
  const { ws, next } = await connect(`${wsBase}?requestId=req_pub`);
  await next(); // consume welcome

  publish(
    "req_pub",
    frame({ type: "token", requestId: "req_pub", content: "hello" }),
  );

  const msg = await next<{ type: string; content?: string }>();
  assert.equal(msg.type, "token");
  assert.equal(msg.content, "hello");
  ws.close();
});

test("publish to an empty room is a no-op (does not throw)", () => {
  assert.doesNotThrow(() =>
    publish(
      "req_nobody",
      frame({ type: "done", requestId: "req_nobody", summary: "x" }),
    ),
  );
});
