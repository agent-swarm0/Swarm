/**
 * Centralised runtime configuration.
 *
 * All configuration comes from environment variables — nothing is hardcoded.
 * `.env` is loaded (if present) via Node's built-in loader so we add no
 * `dotenv` dependency. API keys are intentionally NOT surfaced here as
 * required config: in API mode the dashboard supplies the key per request.
 */
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));

// Load `server/.env` if it exists. `process.loadEnvFile` is available in
// Node >= 20.12 / 21.7; guard it so older runtimes (and missing files) are safe.
const envPath = resolve(__dirname, "..", ".env");
if (existsSync(envPath) && typeof process.loadEnvFile === "function") {
  try {
    process.loadEnvFile(envPath);
  } catch {
    // Malformed .env should not crash boot; env vars from the shell still apply.
  }
}

export type LogLevel = "debug" | "info" | "warn" | "error";

const LOG_LEVELS: readonly LogLevel[] = ["debug", "info", "warn", "error"];

function parseLogLevel(value: string | undefined): LogLevel {
  return LOG_LEVELS.includes(value as LogLevel) ? (value as LogLevel) : "info";
}

function parseOrigins(value: string | undefined): string[] {
  if (!value) return ["http://localhost:3000"];
  return value
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean);
}

export interface AppConfig {
  readonly port: number;
  readonly host: string;
  readonly corsOrigins: string[];
  readonly logLevel: LogLevel;
  readonly nodeEnv: "development" | "production" | "test";
  readonly isProduction: boolean;
  readonly rateLimit: {
    readonly windowMs: number;
    readonly max: number;
  };
  /**
   * Number of proxy hops to trust for client IP. Deploy platforms (Railway /
   * Render) put exactly one proxy in front, so the default is 1. A specific
   * count (not `true`) is required so IP rate limiting can't be spoofed.
   */
  readonly trustProxyHops: number;
}

function parsePositiveInt(value: string | undefined, fallback: number): number {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : fallback;
}

export const config: AppConfig = (() => {
  const nodeEnvRaw = process.env.NODE_ENV ?? "development";
  const nodeEnv =
    nodeEnvRaw === "production" || nodeEnvRaw === "test"
      ? nodeEnvRaw
      : "development";

  return {
    port: Number(process.env.PORT ?? 8787),
    host: process.env.HOST ?? "0.0.0.0",
    corsOrigins: parseOrigins(process.env.CORS_ORIGINS),
    logLevel: parseLogLevel(process.env.LOG_LEVEL),
    nodeEnv,
    isProduction: nodeEnv === "production",
    rateLimit: {
      windowMs: parsePositiveInt(process.env.RATE_LIMIT_WINDOW_MS, 60_000),
      max: parsePositiveInt(process.env.RATE_LIMIT_MAX, 120),
    },
    trustProxyHops: parsePositiveInt(process.env.TRUST_PROXY_HOPS, 1),
  };
})();
