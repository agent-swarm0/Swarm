/**
 * API rate limiting.
 *
 * Protects the backend (and the upstream provider quotas) from bursts. Applied
 * to `/api/*` only — `/health` stays unthrottled for liveness probes. Returns a
 * clean JSON 429 with the requestId; never a raw error or stack trace.
 *
 * Window/limit are env-configurable (RATE_LIMIT_WINDOW_MS, RATE_LIMIT_MAX).
 */
import { rateLimit } from "express-rate-limit";
import type { Request, Response } from "express";
import { config } from "../config.js";

export const apiRateLimiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  limit: config.rateLimit.max,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  handler: (req: Request, res: Response) => {
    req.log?.warn("rate limit exceeded", { path: req.path });
    res.status(429).json({
      error: "rate_limited",
      message: "Too many requests — please slow down and retry shortly.",
      requestId: req.requestId,
    });
  },
});
