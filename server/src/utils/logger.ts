/**
 * Structured JSON logger — zero dependencies.
 *
 * Emits one JSON object per line (NDJSON) so logs are machine-parseable in
 * production and grep-able in dev. Honours LOG_LEVEL from config. Supports a
 * `requestId` field so every run/request can be traced end to end.
 *
 * Team rule: no bare `console.log` in production paths — use this logger.
 */
import { config, type LogLevel } from "../config.js";

const LEVEL_WEIGHT: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

export interface LogContext {
  /** Correlates a log line with a single run/request. */
  requestId?: string;
  [key: string]: unknown;
}

function emit(level: LogLevel, message: string, context?: LogContext): void {
  if (LEVEL_WEIGHT[level] < LEVEL_WEIGHT[config.logLevel]) return;

  const record = {
    ts: new Date().toISOString(),
    level,
    message,
    ...context,
  };

  const line = JSON.stringify(record);
  // stderr for warn/error, stdout otherwise — keeps pipelines clean.
  if (level === "warn" || level === "error") {
    process.stderr.write(line + "\n");
  } else {
    process.stdout.write(line + "\n");
  }
}

export interface Logger {
  debug(message: string, context?: LogContext): void;
  info(message: string, context?: LogContext): void;
  warn(message: string, context?: LogContext): void;
  error(message: string, context?: LogContext): void;
  /** Returns a logger that injects `bindings` (e.g. a requestId) into every line. */
  child(bindings: LogContext): Logger;
}

function makeLogger(base: LogContext = {}): Logger {
  const merge = (ctx?: LogContext): LogContext => ({ ...base, ...ctx });
  return {
    debug: (msg, ctx) => emit("debug", msg, merge(ctx)),
    info: (msg, ctx) => emit("info", msg, merge(ctx)),
    warn: (msg, ctx) => emit("warn", msg, merge(ctx)),
    error: (msg, ctx) => emit("error", msg, merge(ctx)),
    child: (bindings) => makeLogger(merge(bindings)),
  };
}

export const logger: Logger = makeLogger();
