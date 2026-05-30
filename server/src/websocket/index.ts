/**
 * WebSocket server for /ws/stream and /ws/orchestrator.
 *
 * Attaches to the existing HTTP server so HTTP and WS share one port. 
 * - /ws/stream: Run event streaming with requestId subscription
 * - /ws/orchestrator: Real-time orchestrator dashboard events
 *
 * A heartbeat ping detects and reaps dead connections.
 */
import type { Server } from "node:http";
import { WebSocketServer, type WebSocket } from "ws";
import { join, leave } from "./hub.js";
import { frame } from "./protocol.js";
import { logger } from "../utils/logger.js";
import { handleOrchestratorConnection } from "./orchestrator.js";

const STREAM_PATH = "/ws/stream";
const ORCHESTRATOR_PATH = "/ws/orchestrator";
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
  const wss = new WebSocketServer({ noServer: true });

  // Route WebSocket connections based on path
  server.on("upgrade", (req, socket, head) => {
    const { pathname } = new URL(req.url ?? "/", `http://${req.headers.host}`);

    if (pathname === STREAM_PATH) {
      wss.handleUpgrade(req, socket, head, (ws) => {
        handleStreamConnection(ws as TrackedSocket, req);
      });
    } else if (pathname === ORCHESTRATOR_PATH) {
      wss.handleUpgrade(req, socket, head, (ws) => {
        handleOrchestratorConnection(ws);
      });
    } else {
      socket.destroy();
    }
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

function handleStreamConnection(ws: TrackedSocket, req: any): void {
  ws.isAlive = true;
  ws.requestId = parseRequestId(req.url);

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

  // Welcome first, then subscribe — `join` replays buffered run history, so
  // the client sees: welcome → any missed frames → live frames.
  ws.send(
    JSON.stringify(
      frame({
        type: "welcome",
        requestId: ws.requestId,
        serverTime: new Date().toISOString(),
      }),
    ),
  );

  if (ws.requestId) join(ws.requestId, ws);

  logger.info("ws client connected", { requestId: ws.requestId });
}
