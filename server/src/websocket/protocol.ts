/**
 * Versioned WebSocket message protocol.
 *
 * EVERY frame carries a `v` (protocol version) and `type`. Versioning from day
 * one lets the dashboard and server evolve independently — a client can reject
 * or adapt to frames it does not understand. Frames are always typed JSON;
 * raw strings are never sent (team rule).
 *
 * The live WS server and the run→frame piping land in later commits; this file
 * is the single source of truth for the wire format.
 */

/** Current protocol version. Bump on any breaking frame-shape change. */
export const WS_PROTOCOL_VERSION = 1 as const;

export type WsProtocolVersion = typeof WS_PROTOCOL_VERSION;

interface WsFrameBase {
  /** Protocol version. */
  v: WsProtocolVersion;
  /** Correlates the frame with a run. Absent only on the initial welcome. */
  requestId?: string;
}

/** Server → client: sent immediately on connect. */
export interface WsWelcomeFrame extends WsFrameBase {
  type: "welcome";
  serverTime: string;
}

/** Server → client: a streamed token of model output. */
export interface WsTokenFrame extends WsFrameBase {
  type: "token";
  requestId: string;
  content: string;
}

/** Server → client: which agent is currently active. */
export interface WsAgentStatusFrame extends WsFrameBase {
  type: "agent_status";
  requestId: string;
  agent: string;
  state: "started" | "finished" | "failed";
}

/** Server → client: the run finished successfully. */
export interface WsDoneFrame extends WsFrameBase {
  type: "done";
  requestId: string;
  summary?: string;
}

/** Server → client: a human-readable error (never a raw stack trace). */
export interface WsErrorFrame extends WsFrameBase {
  type: "error";
  requestId?: string;
  message: string;
}

/** Union of all server→client frames. */
export type WsServerFrame =
  | WsWelcomeFrame
  | WsTokenFrame
  | WsAgentStatusFrame
  | WsDoneFrame
  | WsErrorFrame;

/**
 * Distributive Omit — applies Omit to each union member individually, so
 * member-specific fields are preserved (plain `Omit<Union, K>` collapses to the
 * union's common keys only).
 */
type DistributiveOmit<T, K extends PropertyKey> = T extends unknown
  ? Omit<T, K>
  : never;

/**
 * Stamp the protocol version onto a frame payload. The `type` discriminant
 * narrows to the right member, so fields like `serverTime`/`content` are
 * accepted while the discriminated union stays enforced.
 */
export function frame(payload: DistributiveOmit<WsServerFrame, "v">): WsServerFrame {
  return { v: WS_PROTOCOL_VERSION, ...payload } as WsServerFrame;
}
