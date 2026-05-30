/**
 * Express application factory.
 *
 * Kept separate from the HTTP server bootstrap (`index.ts`) so tests can import
 * a fully-wired app without binding a port.
 */
import express, { type Express } from "express";
import cors from "cors";
import { config } from "./config.js";
import { requestIdMiddleware } from "./middleware/requestId.js";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler.js";
import { apiRateLimiter } from "./middleware/rateLimit.js";
import { apiRouter } from "./routes/index.js";

export function createApp(): Express {
  const app = express();

  // Trust the platform proxy (Railway/Render) for correct client IPs.
  app.set("trust proxy", true);
  app.disable("x-powered-by");

  app.use(
    cors({
      origin: config.corsOrigins,
      credentials: true,
    }),
  );
  app.use(express.json({ limit: "1mb" }));
  app.use(requestIdMiddleware);

  // Throttle the API surface; /health is mounted outside /api and stays open.
  app.use("/api", apiRateLimiter);

  app.use(apiRouter);

  // 404 then terminal error handler — order matters.
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
