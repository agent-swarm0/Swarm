/**
 * Connection hub — maps a requestId to the set of WebSocket clients watching
 * that run. The run dispatcher (later commit) calls `publish` to fan a frame
 * out to every subscriber; HTTP and WS layers share this single instance.
 */
import type { WebSocket } from "ws";
import type { WsServerFrame } from "./protocol.js";
import { logger } from "../utils/logger.js";

const rooms = new Map<string, Set<WebSocket>>();

export function join(requestId: string, ws: WebSocket): void {
  let room = rooms.get(requestId);
  if (!room) {
    room = new Set();
    rooms.set(requestId, room);
  }
  room.add(ws);
}

export function leave(requestId: string, ws: WebSocket): void {
  const room = rooms.get(requestId);
  if (!room) return;
  room.delete(ws);
  if (room.size === 0) rooms.delete(requestId);
}

/** Send a versioned frame to every client subscribed to `requestId`. */
export function publish(requestId: string, frame: WsServerFrame): void {
  const room = rooms.get(requestId);
  if (!room || room.size === 0) return;
  const payload = JSON.stringify(frame);
  for (const ws of room) {
    // 1 === OPEN; skip sockets that are closing/closed.
    if (ws.readyState === 1) {
      ws.send(payload, (err) => {
        if (err) logger.warn("ws send failed", { requestId, err: err.message });
      });
    }
  }
}

/** Number of distinct rooms with at least one subscriber. */
export function activeRoomCount(): number {
  return rooms.size;
}

/** Total connected clients across all rooms. */
export function totalClientCount(): number {
  let n = 0;
  for (const room of rooms.values()) n += room.size;
  return n;
}
