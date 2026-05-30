import { Router } from "express";
import { healthRouter } from "./health.js";
import { statusRouter } from "./status.js";
import { runRouter } from "./run.js";
import orchestratorRouter from "./orchestrator.js";
import agentsRouter from "./agents.js";
 
export const apiRouter = Router();
 
apiRouter.use("/health", healthRouter);
apiRouter.use("/status", statusRouter);
apiRouter.use("/run", runRouter);
apiRouter.use("/orchestrator", orchestratorRouter);
apiRouter.use("/agents", agentsRouter);
