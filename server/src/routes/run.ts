/**
 * POST /api/run  — start an API-mode run; returns a requestId.
 * GET  /api/run/:requestId — poll a run's state (requestId tracking).
 *
 * This commit establishes the request contract and run lifecycle. Actual
 * provider dispatch + WebSocket streaming are wired in later commits; here the
 * run is validated, registered as "pending", and the client is told where to
 * connect for the stream.
 */
import { Router } from "express";
import { runRequestSchema } from "../schemas/run.js";
import { createRun, getRun } from "../services/runRegistry.js";
import { listAgents } from "../services/agentCatalog.js";
import { enqueueRun } from "../services/runQueue.js";
import type { ProviderName } from "../types/index.js";

export const runRouter = Router();

runRouter.post("/api/run", (req, res) => {
  const parsed = runRequestSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      error: "validation_error",
      message: "Invalid run request",
      issues: parsed.error.issues.map((i) => ({
        path: i.path.join("."),
        message: i.message,
      })),
      requestId: req.requestId,
    });
    return;
  }

  const { goal, provider, apiKey, agentSlug, model } = parsed.data;

  // If an agent was named, it must exist in the catalog.
  if (agentSlug && !listAgents().some((a) => a.slug === agentSlug)) {
    res.status(400).json({
      error: "unknown_agent",
      message: `Unknown agent: ${agentSlug}`,
      requestId: req.requestId,
    });
    return;
  }

  // The HTTP requestId doubles as the run id so the whole flow is traceable.
  const run = createRun({
    requestId: req.requestId,
    goal,
    provider: provider as ProviderName,
    agentSlug,
  });

  req.log.info("run accepted", { provider, agentSlug, model });

  // Respond first (client opens the WS), then start streaming in the background.
  res.status(202).json({
    requestId: run.requestId,
    state: run.state,
    stream: {
      path: "/ws/stream",
      query: { requestId: run.requestId },
    },
  });

  enqueueRun(run, { apiKey, model });
});

runRouter.get("/api/run/:requestId", (req, res) => {
  const run = getRun(req.params.requestId);
  if (!run) {
    res.status(404).json({
      error: "not_found",
      message: `No run for requestId ${req.params.requestId}`,
      requestId: req.requestId,
    });
    return;
  }
  res.status(200).json(run);
});
