/**
 * Orchestrator API Routes
 * Receives events from Python orchestrator and broadcasts to WebSocket clients.
 */
import { Router } from "express";
import { spawn } from "node:child_process";
import { orchestratorState } from "../services/orchestratorState.js";
import { logger } from "../utils/logger.js";
import type { OrchestratorEvent } from "../types/orchestrator.js";

const router = Router();

// Receive events from Python orchestrator
router.post("/events", (req, res) => {
  const event = req.body as any;
  const sessionId = event.sessionId;
  
  if (!sessionId) {
    logger.warn("received orchestrator event without sessionId", { event });
    return res.status(400).json({ error: "sessionId is required" });
  }

  // Process event and update state
  orchestratorState.processEvent(sessionId, event as OrchestratorEvent);
  
  res.status(200).json({ ok: true });
});

// Start orchestrator session (triggers Python process)
router.post("/start", (req, res) => {
  const { goal } = req.body;
  
  if (!goal || typeof goal !== "string") {
    return res.status(400).json({ error: "goal is required" });
  }

  logger.info("starting orchestrator", { goal });

  // Spawn Python orchestrator process
  const proc = spawn("python3", ["./bin/swarm", goal], {
    cwd: process.cwd() + "/..",
    env: { ...process.env, SWARM_DASHBOARD_ENABLED: "true" },
    stdio: "pipe",
  });

  proc.on("error", (err) => {
    logger.error("orchestrator spawn error", { err: err.message });
  });

  res.status(202).json({ ok: true, message: "Orchestrator started" });
});

export default router;
