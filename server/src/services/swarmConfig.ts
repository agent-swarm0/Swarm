/**
 * Accessors for the repo-root swarm.config.json `api_mode` block.
 *
 * The concurrency cap can be overridden with SWARM_CONCURRENCY_CAP (read on
 * every call so tests can set it before exercising the queue). The config file
 * value is cached after first read.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));

function resolveConfigPath(): string {
  const override = process.env.SWARM_CONFIG_PATH;
  if (override && override.trim()) return resolve(override.trim());
  return resolve(__dirname, "..", "..", "..", "swarm.config.json");
}

const DEFAULT_CAP = 5;
let fileCapCache: number | undefined;

function readFileCap(): number {
  if (fileCapCache !== undefined) return fileCapCache;
  try {
    const raw = readFileSync(resolveConfigPath(), "utf8");
    const parsed = JSON.parse(raw) as {
      api_mode?: { concurrency_cap?: number };
    };
    const cap = parsed.api_mode?.concurrency_cap;
    fileCapCache = typeof cap === "number" && cap > 0 ? cap : DEFAULT_CAP;
  } catch {
    fileCapCache = DEFAULT_CAP;
  }
  return fileCapCache;
}

/** Maximum number of runs allowed to execute concurrently. */
export function getConcurrencyCap(): number {
  const env = process.env.SWARM_CONCURRENCY_CAP;
  if (env !== undefined) {
    const n = Number(env);
    if (Number.isFinite(n) && n >= 1) return Math.floor(n);
  }
  return readFileCap();
}
