/**
 * WebSocket server for /ws/stream.
 *
 * Attaches to the existing HTTP server so HTTP and WS share one port. A client
 * connects with `?requestId=...` to subscribe to a run's frames. On connect it
 * receives a versioned `welcome` frame; thereafter the run dispatcher publishes
 * token/agent_status/done/error frames into the room (later commit).
 *
 * A heartbeat ping detects and reaps dead connections.
 */
import type { Server } from "node:http";
import { WebSocketServer, type WebSocket } from "ws";
import { join, leave } from "./hub.js";
import { frame } from "./protocol.js";
import { logger } from "../utils/logger.js";

const STREAM_PATH = "/ws/stream";
const HEARTBEAT_MS = 30_000;

interface TrackedSocket extends WebSocket {
  isAlive: boolean;
  requestId?: string;
}

function parseRequestId(url: string | undefined): string | undefined {
  if (!url) return undefined;
  // url is path-relative (e.g. "/ws/stream?requestId=req_123").
  const q = new URL(url, "http://localhost").searchParams.get("requestId");
  return q && q.trim() ? q.trim() : undefined;
}

export interface WebSocketHandle {
  close: () => Promise<void>;
}

export function attachWebSocketServer(server: Server): WebSocketHandle {
  const wss = new WebSocketServer({ server, path: STREAM_PATH });

  wss.on("connection", (socket: WebSocket, req) => {
    const ws = socket as TrackedSocket;
    ws.isAlive = true;
    ws.requestId = parseRequestId(req.url);

    if (ws.requestId) join(ws.requestId, ws);

    ws.on("pong", () => {
      ws.isAlive = true;
    });

    ws.on("close", () => {
      if (ws.requestId) leave(ws.requestId, ws);
    });

    ws.on("error", (err) => {
      logger.warn("ws connection error", {
        requestId: ws.requestId,
        err: err.message,
      });
    });

    ws.send(
      JSON.stringify(
        frame({
          type: "welcome",
          requestId: ws.requestId,
          serverTime: new Date().toISOString(),
        }),
      ),
    );

    logger.info("ws client connected", { requestId: ws.requestId });
  });

  // Heartbeat: terminate sockets that did not answer the previous ping.
  const heartbeat = setInterval(() => {
    for (const socket of wss.clients) {
      const ws = socket as TrackedSocket;
      if (!ws.isAlive) {
        ws.terminate();
        continue;
      }
      ws.isAlive = false;
      ws.ping();
    }
  }, HEARTBEAT_MS);
  heartbeat.unref();

  return {
    close: () =>
      new Promise<void>((resolve) => {
        clearInterval(heartbeat);
        for (const ws of wss.clients) ws.terminate();
        wss.close(() => resolve());
      }),
  };
}
