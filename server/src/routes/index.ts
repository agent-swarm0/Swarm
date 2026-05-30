import { Router } from "express";
import { healthRouter } from "./health.js";
import { statusRouter } from "./status.js";
import { agentsRouter } from "./agents.js";
import { runRouter } from "./run.js";

export const apiRouter = Router();

apiRouter.use(healthRouter);
apiRouter.use(statusRouter);
apiRouter.use(agentsRouter);
apiRouter.use(runRouter);