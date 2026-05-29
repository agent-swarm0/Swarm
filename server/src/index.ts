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

const app = createApp();
const server = createServer(app);

// NOTE (later commit): attach the WebSocket server to `server` here, e.g.
//   import { attachWebSocketServer } from "./websocket/index.js";
//   attachWebSocketServer(server);

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

  // Stop accepting new connections, then exit once existing ones drain.
  server.close((err) => {
    if (err) {
      logger.error("error during shutdown", { err: err.message });
      process.exit(1);
    }
    logger.info("shutdown complete");
    process.exit(0);
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
