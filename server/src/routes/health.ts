/**
 * GET /health — liveness probe.
 *
 * Intentionally dependency-free and cheap so load balancers / deploy platforms
 * (Railway, Render) can hit it frequently.
 */
import { Router } from "express";

export const healthRouter = Router();

healthRouter.get("/health", (_req, res) => {
  res.status(200).json({ status: "ok" });
});
