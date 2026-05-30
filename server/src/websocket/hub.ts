/**
 * Connection hub — maps a requestId to the set of WebSocket clients watching
 * that run, plus a bounded replay buffer.
 *
 * Because POST /api/run returns immediately and dispatch starts streaming
 * before the client has time to open its socket, frames are buffered per room
 * and replayed to a client when it joins. This makes the stream reliable
 * despite the connect race. The run dispatcher calls `publish`; HTTP and WS
 * layers share this single instance.
 */
import type { WebSocket } from "ws";
import type { WsServerFrame } from "./protocol.js";
import { logger } from "../utils/logger.js";

/** Cap on buffered frames per room — protects memory on long runs. */
const MAX_BUFFER = 2000;

interface Room {
  clients: Set<WebSocket>;
  buffer: WsServerFrame[];
}

const rooms = new Map<string, Room>();

function getOrCreate(requestId: string): Room {
  let room = rooms.get(requestId);
  if (!room) {
    room = { clients: new Set(), buffer: [] };
    rooms.set(requestId, room);
  }
  return room;
}

function send(ws: WebSocket, payload: string, requestId: string): void {
  // 1 === OPEN; skip sockets that are closing/closed.
  if (ws.readyState !== 1) return;
  ws.send(payload, (err) => {
    if (err) logger.warn("ws send failed", { requestId, err: err.message });
  });
}

/** Subscribe a client, replaying any frames it missed before connecting. */
export function join(requestId: string, ws: WebSocket): void {
  const room = getOrCreate(requestId);
  for (const f of room.buffer) send(ws, JSON.stringify(f), requestId);
  room.clients.add(ws);
}

export function leave(requestId: string, ws: WebSocket): void {
  const room = rooms.get(requestId);
  if (!room) return;
  room.clients.delete(ws);
}

/** Buffer a frame and fan it out to every currently-connected subscriber. */
export function publish(requestId: string, frame: WsServerFrame): void {
  const room = getOrCreate(requestId);
  room.buffer.push(frame);
  if (room.buffer.length > MAX_BUFFER) room.buffer.shift();

  const payload = JSON.stringify(frame);
  for (const ws of room.clients) send(ws, payload, requestId);
}

/**
 * Drop a room's buffer once the run is finished and no replay is needed.
 * Connected clients are left intact (their sockets close on their own).
 */
export function closeRoom(requestId: string): void {
  const room = rooms.get(requestId);
  if (!room) return;
  if (room.clients.size === 0) rooms.delete(requestId);
  else room.buffer = [];
}

/** Number of distinct rooms currently tracked. */
export function activeRoomCount(): number {
  return rooms.size;
}

/** Total connected clients across all rooms. */
export function totalClientCount(): number {
  let n = 0;
  for (const room of rooms.values()) n += room.clients.size;
  return n;
}
