/**
 * Orchestrator WebSocket Handler
 * 
 * Real-time bidirectional communication between dashboard and orchestrator.
 */
import type { WebSocket } from "ws";
import type { OrchestratorCommand, OrchestratorEvent } from "../types/orchestrator.js";
import { orchestratorState } from "../services/orchestratorState.js";
import { logger } from "../utils/logger.js";

export function handleOrchestratorConnection(ws: WebSocket): void {
  logger.info("orchestrator client connected");

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
      // Trigger via HTTP to orchestrator route (which spawns Python)
      fetch("http://localhost:3000/api/orchestrator/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ goal: command.goal }),
      }).catch((err) => logger.error("failed to start orchestrator", { err }));
      break;

    case "session.stop":
      logger.info("stopping orchestrator session", { sessionId: command.sessionId });
      // TODO: Signal Python orchestrator to stop
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
