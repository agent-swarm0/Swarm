/**
 * HTTP server bootstrap with graceful shutdown.
 *
 * Binds the Express app to a port and wires SIGINT/SIGTERM handlers so the
 * process drains in-flight connections before exiting. The WebSocket server
 * will attach to this same HTTP server in a later commit (placeholder noted).
 */
import { createServer } from "node:http";
import { createApp } from "./app.js";
import { config } from "./config.js";
import { logger } from "./utils/logger.js";
import { attachWebSocketServer } from "./websocket/index.js";
import { registerBuiltinProviders } from "./providers/register.js";

// Wire concrete provider adapters (openai, …) into the registry.
registerBuiltinProviders();

const app = createApp();
const server = createServer(app);

// WebSocket server shares the HTTP port; serves /ws/stream.
const ws = attachWebSocketServer(server);

server.listen(config.port, config.host, () => {
  logger.info("server listening", {
    host: config.host,
    port: config.port,
    mode: "api",
    env: config.nodeEnv,
  });
});

server.on("error", (err) => {
  logger.error("server error", { err: err.message });
  process.exit(1);
});

let shuttingDown = false;

function shutdown(signal: string): void {
  if (shuttingDown) return;
  shuttingDown = true;
  logger.info("shutting down", { signal });

  // Close WS clients first, then stop accepting HTTP connections and drain.
  void ws.close().then(() => {
    server.close((err) => {
      if (err) {
        logger.error("error during shutdown", { err: err.message });
        process.exit(1);
      }
      logger.info("shutdown complete");
      process.exit(0);
    });
  });

  // Hard cap so a hung connection can't block forever.
  setTimeout(() => {
    logger.warn("forced shutdown after timeout");
    process.exit(1);
  }, 10_000).unref();
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));

export { server };
