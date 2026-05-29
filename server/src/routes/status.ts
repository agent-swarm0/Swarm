/**
 * GET /api/status — operational snapshot for the dashboard.
 *
 * Reports mode, registered providers, run counts, WS protocol version and
 * uptime. Run/provider data is sourced live so this stays accurate as later
 * commits register adapters and create runs.
 */
import { Router } from "express";
import { listProviders } from "../providers/index.js";
import { activeRunCount, totalRunCount } from "../services/runRegistry.js";
import { WS_PROTOCOL_VERSION } from "../websocket/protocol.js";
import { PROVIDER_NAMES, type RunMode } from "../types/index.js";

export const statusRouter = Router();

const MODE: RunMode = "api";

statusRouter.get("/api/status", (_req, res) => {
  res.status(200).json({
    status: "ok",
    mode: MODE,
    providers: {
      supported: PROVIDER_NAMES,
      registered: listProviders(),
    },
    runs: {
      active: activeRunCount(),
      total: totalRunCount(),
    },
    ws: {
      protocolVersion: WS_PROTOCOL_VERSION,
    },
    uptimeSeconds: Math.round(process.uptime()),
  });
});
