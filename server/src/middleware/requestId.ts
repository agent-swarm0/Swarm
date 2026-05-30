/**
 * Request-ID middleware.
 *
 * Honours an inbound `x-request-id` header (so a client can correlate its run)
 * or mints a new one. The id is attached to `req.requestId`, echoed in the
 * `x-request-id` response header, and used to build a per-request child logger.
 * This guarantees every request — and every future run — is traceable.
 */
import type { NextFunction, Request, Response } from "express";
import { newRequestId } from "../utils/ids.js";
import { logger, type Logger } from "../utils/logger.js";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      requestId: string;
      log: Logger;
    }
  }
}

export function requestIdMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const inbound = req.header("x-request-id");
  const requestId = inbound && inbound.trim() ? inbound.trim() : newRequestId();

  req.requestId = requestId;
  req.log = logger.child({ requestId });
  res.setHeader("x-request-id", requestId);

  next();
}
