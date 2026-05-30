/**
 * Centralised error handling.
 *
 * - `notFoundHandler` returns a structured 404 for unmatched routes.
 * - `errorHandler` is the terminal Express error middleware: it logs the full
 *   error server-side but returns only a human-readable message to the client.
 *   Raw stack traces are NEVER sent to clients (team rule).
 */
import type { NextFunction, Request, Response } from "express";

export class HttpError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "HttpError";
  }
}

export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json({
    error: "not_found",
    message: `Route ${req.method} ${req.path} not found`,
    requestId: req.requestId,
  });
}

// Express identifies error middleware by its 4-arg signature; `next` must stay.
export function errorHandler(
  err: unknown,
  req: Request,
  res: Response,
  _next: NextFunction,
): void {
  const status = err instanceof HttpError ? err.status : 500;
  const message =
    err instanceof HttpError
      ? err.message
      : "Internal server error";

  req.log?.error("request failed", {
    status,
    err: err instanceof Error ? err.message : String(err),
  });

  if (res.headersSent) return;

  res.status(status).json({
    error: status >= 500 ? "internal_error" : "request_error",
    message,
    requestId: req.requestId,
  });
}
