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
import { getOutputRoot, getLatestSessionId } from "./services/swarmOrchestrator.js";

export function createApp(): Express {
  const app = express();

  // Trust a specific number of proxy hops (Railway/Render = 1) for correct
  // client IPs. A count, not `true`, so IP rate limiting can't be spoofed.
  app.set("trust proxy", config.trustProxyHops);
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

  // Live preview of generated builds. `/preview/<sessionId>/index.html` serves
  // a specific build; `/latest` redirects to the most recent one so the founder
  // always has a one-click URL to see what the swarm just shipped.
  app.use("/preview", express.static(getOutputRoot()));
  app.get("/latest", (_req, res) => {
    const id = getLatestSessionId();
    if (!id) {
      res.status(404).send("No build yet — dispatch a goal first.");
      return;
    }
    res.redirect(`/preview/${id}/index.html`);
  });

  // 404 then terminal error handler — order matters.
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
