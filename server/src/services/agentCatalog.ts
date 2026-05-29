/**
 * Agent catalog.
 *
 * Reads the agent registry from the repo-root `swarm.config.json` (read-only —
 * the backend never writes it) and exposes a normalised list for the dashboard.
 *
 * The config is parsed once and cached in memory: it is static for the lifetime
 * of the process during a sprint run. Path is overridable via SWARM_CONFIG_PATH
 * for tests / non-standard layouts.
 *
 * NOTE: a prior config cleanup removed the doc-file pseudo-agents (README,
 * QUICKSTART, …). We still filter them defensively so a stale or reverted
 * config can never leak a doc as an "agent".
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { logger } from "../utils/logger.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

/** Resolve repo-root swarm.config.json. From src|dist/services → up 3 = root. */
function resolveConfigPath(): string {
  const override = process.env.SWARM_CONFIG_PATH;
  if (override && override.trim()) return resolve(override.trim());
  return resolve(__dirname, "..", "..", "..", "swarm.config.json");
}

/** Markdown docs that were historically (mis)registered as agents. */
const DOC_PSEUDO_AGENTS = new Set([
  "README",
  "QUICKSTART",
  "EXECUTIVE-BRIEF",
  "handoff-templates",
  "agent-activation-prompts",
]);

export interface Agent {
  /** Registry key, e.g. "frontend-dev". */
  slug: string;
  /** Relative path under agents/, e.g. "engineering/frontend-dev.md". */
  file: string;
  /** Category grouping, e.g. "engineering". */
  category: string;
}

interface RawAgentEntry {
  file?: string;
  engine?: string | null;
  source?: string;
}

function deriveCategory(entry: RawAgentEntry): string {
  if (entry.source && entry.source.trim()) return entry.source.trim();
  // Fall back to the first path segment of the file, else "uncategorized".
  if (entry.file && entry.file.includes("/")) {
    return entry.file.split("/")[0]!;
  }
  return "uncategorized";
}

let cache: Agent[] | null = null;

function loadCatalog(): Agent[] {
  const path = resolveConfigPath();
  let raw: string;
  try {
    raw = readFileSync(path, "utf8");
  } catch (err) {
    logger.error("failed to read swarm.config.json", {
      path,
      err: err instanceof Error ? err.message : String(err),
    });
    throw new Error("Agent registry is unavailable");
  }

  const parsed = JSON.parse(raw) as { agents?: Record<string, RawAgentEntry> };
  const agents = parsed.agents ?? {};

  const list: Agent[] = [];
  for (const [slug, entry] of Object.entries(agents)) {
    if (DOC_PSEUDO_AGENTS.has(slug)) continue;
    if (!entry || typeof entry !== "object") continue;
    list.push({
      slug,
      file: entry.file ?? "",
      category: deriveCategory(entry),
    });
  }

  list.sort((a, b) =>
    a.category === b.category
      ? a.slug.localeCompare(b.slug)
      : a.category.localeCompare(b.category),
  );

  logger.info("agent catalog loaded", { count: list.length, path });
  return list;
}

/** Returns all agents (cached after first call). */
export function listAgents(): Agent[] {
  if (cache === null) cache = loadCatalog();
  return cache;
}

/** Returns agents in a single category (case-insensitive). */
export function listAgentsByCategory(category: string): Agent[] {
  const want = category.trim().toLowerCase();
  return listAgents().filter((a) => a.category.toLowerCase() === want);
}

/** Returns the sorted, de-duplicated set of categories. */
export function listCategories(): string[] {
  const set = new Set(listAgents().map((a) => a.category));
  return [...set].sort((a, b) => a.localeCompare(b));
}

/** Clears the cache — used by tests that swap the config path. */
export function _resetCatalogCache(): void {
  cache = null;
}
