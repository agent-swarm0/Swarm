/**
 * Orchestrator WebSocket Handler
 * 
 * Real-time bidirectional communication between dashboard and orchestrator.
 */
import type { WebSocket } from "ws";
import type { OrchestratorCommand, OrchestratorEvent } from "../types/orchestrator.js";
import { orchestratorState } from "../services/orchestratorState.js";
import { runSession, stopSession } from "../services/swarmOrchestrator.js";
import { logger } from "../utils/logger.js";

export function handleOrchestratorConnection(ws: WebSocket): void {
  logger.info("orchestrator client connected");

  // Keep-alive: the shared heartbeat pings every 30s and terminates any socket
  // whose `isAlive` is falsy. Mark this connection alive and refresh on pong,
  // otherwise long runs (>30s) get their socket reaped and the console freezes.
  const tracked = ws as WebSocket & { isAlive?: boolean };
  tracked.isAlive = true;
  ws.on("pong", () => { tracked.isAlive = true; });

  // Subscribe to orchestrator events
  const unsubscribe = orchestratorState.onEvent((event: OrchestratorEvent) => {
    if (ws.readyState === ws.OPEN) {
      ws.send(JSON.stringify(event));
    }
  });

  // Handle incoming commands from dashboard
  ws.on("message", (data: Buffer) => {
    try {
      const command = JSON.parse(data.toString()) as OrchestratorCommand;
      handleCommand(command);
    } catch (err) {
      logger.error("invalid orchestrator command", { err });
      ws.send(JSON.stringify({ type: "error", message: "Invalid command format" }));
    }
  });

  ws.on("close", () => {
    logger.info("orchestrator client disconnected");
    unsubscribe();
  });

  ws.on("error", (err) => {
    logger.error("orchestrator websocket error", { err: err.message });
  });

  // Send initial state if there's an active session
  // (In production, you'd track which session this client wants)
}

function handleCommand(command: OrchestratorCommand): void {
  switch (command.type) {
    case "session.start":
      logger.info("starting orchestrator session", { goal: command.goal });
      // Run the orchestration in-process: plan a crew, dispatch agents over the
      // Gemini/DeepSeek APIs, and stream events back over this WebSocket.
      runSession(command.goal).catch((err) =>
        logger.error("failed to start orchestrator", { err: err?.message }),
      );
      break;

    case "session.stop":
      logger.info("stopping orchestrator session", { sessionId: command.sessionId });
      stopSession(command.sessionId);
      break;

    case "approval.respond":
      logger.info("approval response", { 
        approvalId: command.approvalId, 
        approved: command.approved 
      });
      orchestratorState.resolveApproval(command.approvalId, command.approved);
      break;

    case "dashboard.command":
      logger.info("dashboard command received", { 
        command: command.command, 
        payload: command.payload 
      });
      // TODO: Signal Python orchestrator via a control channel (e.g., WebSocket or separate TCP socket)
      break;

    default:
      logger.warn("unknown orchestrator command", { command });
  }
}
