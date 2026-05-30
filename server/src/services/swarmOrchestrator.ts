/**
 * Node-side Swarm Orchestrator.
 *
 * Drives the live dashboard console end to end: plans a crew with the LLM,
 * dispatches real agents (their system prompt = the agents/*.md file) in waves
 * with shared context, streams tokens, injects the Founder Build Doctrine into
 * builder agents, extracts <write_file> blocks to disk, and emits the
 * OrchestratorEvent protocol the console already understands.
 *
 * No Python, no CLI — just the Gemini/DeepSeek REST APIs.
 */
import { readFile, mkdir, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { orchestratorState } from "./orchestratorState.js";
import { streamLLM, availableProvider } from "./llm.js";
import { logger } from "../utils/logger.js";
import type { OrchestratorEvent } from "../types/orchestrator.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
// server/src/services -> repo root (../../..). Works from dist/ too.
const REPO_ROOT = resolve(__dirname, "..", "..", "..");
const AGENTS_DIR = join(REPO_ROOT, "agents");
const OUTPUT_ROOT = join(REPO_ROOT, "project-output");
const DOCTRINE_PATH = join(REPO_ROOT, "FOUNDER_BUILD_DOCTRINE.md");

interface CatalogAgent {
  slug: string;
  file: string;
  department: string;
  role: string;
  emoji: string;
  /** Builders write files and receive the full Founder Build Doctrine + protocol. */
  builder: boolean;
  /** Output token budget — concentrate spend on the artifact the founder sees. */
  budget: number;
}

/**
 * Curated crew tuned for a peak build on a tight token budget.
 * Advisors (research/design/content/QA) emit short, cheap text specs; only the
 * frontend (and backend when needed) spend a generous budget writing the actual
 * files. One artifact, done well — not six agents writing competing files.
 */
const CATALOG: CatalogAgent[] = [
  { slug: "research-01", file: "design/design-ux-researcher.md", department: "Research", role: "UX Researcher", emoji: "🔭", builder: false, budget: 400 },
  { slug: "design-02", file: "design/design-ui-designer.md", department: "Design", role: "UI Designer", emoji: "🎨", builder: false, budget: 900 },
  { slug: "content-05", file: "design/design-visual-storyteller.md", department: "Content", role: "Storyteller", emoji: "✍️", builder: false, budget: 700 },
  { slug: "frontend-03", file: "engineering/frontend-dev.md", department: "Engineering", role: "Frontend Dev", emoji: "⚡", builder: true, budget: 3200 },
  { slug: "backend-04", file: "engineering/backend-dev.md", department: "Engineering", role: "Backend Dev", emoji: "🔧", builder: true, budget: 2400 },
  { slug: "qa-06", file: "engineering/qa-tester.md", department: "QA", role: "QA Reviewer", emoji: "🔬", builder: false, budget: 400 },
];

const CATALOG_BY_SLUG = new Map(CATALOG.map((a) => [a.slug, a]));

let _doctrine: string | null = null;
async function loadDoctrine(): Promise<string> {
  if (_doctrine !== null) return _doctrine;
  try {
    _doctrine = await readFile(DOCTRINE_PATH, "utf8");
  } catch {
    _doctrine = EMBEDDED_DOCTRINE;
  }
  return _doctrine;
}

async function loadAgentPrompt(agent: CatalogAgent): Promise<string> {
  const path = join(AGENTS_DIR, agent.file);
  try {
    return await readFile(path, "utf8");
  } catch {
    return `You are ${agent.role}, a specialized agent in the SWARM network (${agent.department}).\nDo excellent, production-grade work and collaborate with the rest of the crew.`;
  }
}

// ── Preview helpers ──────────────────────────────────────────────────────--
let lastSessionId: string | null = null;
export function getOutputRoot(): string {
  return OUTPUT_ROOT;
}
export function getLatestSessionId(): string | null {
  return lastSessionId;
}

// ── Cancellation ───────────────────────────────────────────────────────────
const activeSessions = new Map<string, AbortController>();

export function stopSession(sessionId?: string): void {
  if (sessionId) {
    activeSessions.get(sessionId)?.abort();
    return;
  }
  // No id supplied (console sends a generic stop) — abort everything in flight.
  for (const ctrl of activeSessions.values()) ctrl.abort();
}

// ── Event helper ─────────────────────────────────────────────────────────--
function emit(sessionId: string, event: OrchestratorEvent): void {
  orchestratorState.processEvent(sessionId, event);
}

function log(sessionId: string, agentId: string, message: string, artifact?: string): void {
  emit(sessionId, {
    type: "log.entry",
    log: { agentId, timestamp: Date.now(), level: "info", message, ...(artifact ? { artifact } : {}) },
  });
}

// ── Planning ─────────────────────────────────────────────────────────────--
interface Plan {
  subgoals: string[];
  agents: string[]; // catalog slugs
}

async function planCrew(goal: string, signal: AbortSignal): Promise<Plan> {
  const catalogDesc = CATALOG.map((a) => `- ${a.slug} (${a.role}, ${a.department})`).join("\n");
  const system =
    "You are the SWARM Orchestrator Planner. Pick the smallest crew that can ship the goal " +
    "and break the goal into one concrete subgoal per chosen agent. Respond with ONLY valid JSON, no markdown.";
  const prompt =
    `Goal: "${goal}"\n\nAvailable agents:\n${catalogDesc}\n\n` +
    `Return JSON: {"agents":["slug",...],"subgoals":["one subgoal per agent in the same order",...]}\n` +
    `Choose 3-5 agents. For anything with a visible interface, always include design-02 and frontend-03. ` +
    `Include backend-04 only if the goal needs an API, auth, or data. Include qa-06 to review.`;

  try {
    let raw = "";
    await streamLLM({ system, prompt, signal, maxOutputTokens: 1024, onToken: (t) => (raw += t) });
    const cleaned = raw.replace(/```json/gi, "").replace(/```/g, "").trim();
    const parsed = JSON.parse(cleaned);
    const agents: string[] = Array.isArray(parsed.agents)
      ? parsed.agents.filter((s: string) => CATALOG_BY_SLUG.has(s))
      : [];
    const subgoals: string[] = Array.isArray(parsed.subgoals) ? parsed.subgoals.map(String) : [];
    if (agents.length >= 2) return { agents: dedupe(agents), subgoals };
  } catch (err: any) {
    if (signal.aborted) throw err;
    logger.warn("planner LLM failed, using heuristic crew", { err: err?.message });
  }

  return heuristicPlan(goal);
}

function heuristicPlan(goal: string): Plan {
  const g = goal.toLowerCase();
  const agents = ["research-01", "design-02", "frontend-03", "content-05"];
  if (/\bapi\b|auth|login|database|backend|server|payment|account/.test(g)) {
    agents.splice(3, 0, "backend-04");
  }
  agents.push("qa-06");
  const subgoals = agents.map((slug) => {
    const a = CATALOG_BY_SLUG.get(slug)!;
    return `${a.role}: contribute your specialty toward "${goal}".`;
  });
  return { agents: dedupe(agents), subgoals };
}

function dedupe(xs: string[]): string[] {
  return [...new Set(xs)];
}

/**
 * Waves: cheap advisors first (parallel) produce specs, then the builder(s)
 * consume them to write the real files, then QA reviews. This keeps the
 * expensive call (the frontend) singular and well-informed.
 */
function buildWaves(agents: string[]): string[][] {
  const wave1 = ["research-01", "design-02", "content-05"].filter((s) => agents.includes(s));
  const wave2 = ["frontend-03", "backend-04"].filter((s) => agents.includes(s));
  const wave3 = ["qa-06"].filter((s) => agents.includes(s));
  return [wave1, wave2, wave3].filter((w) => w.length > 0);
}

// ── File extraction ──────────────────────────────────────────────────────--
const WRITE_FILE_RE = /<write_file\s+path=["']([^"']+)["']\s*>([\s\S]*?)<\/write_file>/g;

async function extractAndWriteFiles(
  sessionId: string,
  slug: string,
  output: string,
  outDir: string,
): Promise<string[]> {
  const files = new Map<string, string>();

  // Primary: explicit <write_file path="…">…</write_file> blocks.
  let match: RegExpExecArray | null;
  WRITE_FILE_RE.lastIndex = 0;
  while ((match = WRITE_FILE_RE.exec(output)) !== null) {
    const rel = sanitizeRelPath(match[1]);
    if (!rel) continue;
    files.set(rel, match[2].replace(/^\n/, "").replace(/\n$/, ""));
  }

  // Fallback 1: a truncated <write_file path="…"> with no closing tag (model
  // hit the token cap) — capture from the tag to the end of the output.
  if (files.size === 0) {
    const open = /<write_file\s+path=["']([^"']+)["']\s*>([\s\S]*)$/.exec(output);
    if (open) {
      const rel = sanitizeRelPath(open[1]);
      if (rel) files.set(rel, open[2].replace(/```$/, "").trim());
    }
  }

  // Fallback 2: fenced code blocks (```html / ```css / ```js).
  if (files.size === 0) {
    for (const block of extractFencedBlocks(output)) {
      const rel = inferFilename(block.lang, block.code, files);
      if (rel) files.set(rel, block.code);
    }
  }

  // Fallback 3: raw HTML with no wrapper at all — grab the document itself.
  if (files.size === 0) {
    const html = /(<!doctype html[\s\S]*<\/html>)|(<html[\s\S]*<\/html>)/i.exec(output);
    if (html) files.set("index.html", html[0].trim());
  }

  const written: string[] = [];
  for (const [rel, content] of files) {
    try {
      const full = join(outDir, rel);
      await mkdir(dirname(full), { recursive: true });
      await writeFile(full, content, "utf8");
      const displayPath = join("project-output", sessionId, rel).replace(/\\/g, "/");
      written.push(displayPath);
      emit(sessionId, { type: "artifact.created", path: displayPath, timestamp: Date.now() });
      log(sessionId, slug, `wrote ${rel}`, displayPath);
    } catch (err: any) {
      logger.warn("failed to write artifact", { rel, err: err?.message });
    }
  }
  return written;
}

interface FencedBlock { lang: string; code: string; }

function extractFencedBlocks(text: string): FencedBlock[] {
  const re = /```([a-zA-Z0-9]*)\n([\s\S]*?)```/g;
  const blocks: FencedBlock[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    const code = m[2].trim();
    if (code) blocks.push({ lang: (m[1] || "").toLowerCase(), code });
  }
  return blocks;
}

function inferFilename(lang: string, code: string, existing: Map<string, string>): string | null {
  const looksHtml = /<!doctype html|<html[\s>]/i.test(code);
  if (lang === "html" || looksHtml) return existing.has("index.html") ? `page-${existing.size}.html` : "index.html";
  if (lang === "css") return "styles.css";
  if (lang === "js" || lang === "javascript") return "script.js";
  return null;
}

/** Block path traversal and absolute paths from model output. */
function sanitizeRelPath(p: string): string | null {
  const norm = p.replace(/\\/g, "/").replace(/^\/+/, "").trim();
  if (!norm || norm.includes("..") || norm.includes(":")) return null;
  return norm;
}

// ── Agent execution ──────────────────────────────────────────────────────--
const FILE_PROTOCOL = `
---
OUTPUT PROTOCOL — read carefully:
When you produce any code, markup, styles, or config, write the COMPLETE file contents
inside a tag block:

<write_file path="index.html">
<!doctype html>
<html>...full file, no placeholders...</html>
</write_file>

You may emit multiple <write_file> blocks. For ANY web/frontend build you MUST also write a
self-contained "index.html" at the root that renders the real interface with inline CSS and
working interactions — this is the founder's live preview. Never use "insert code here",
"…", or truncation. Ship complete, runnable files.`;

/** One-line taste guard for advisor agents (condensed doctrine pillar I). */
const TASTE_LINE =
  "Quality bar: commit to a specific, on-brand aesthetic. No generic AI defaults — " +
  "no centered-hero-plus-one-button, no purple/blue gradients, glassmorphism, blobs, " +
  "generic fonts, or fake stats. Be specific and opinionated.";

/** Keep the persona's role/identity, drop long tool lists and examples. */
function trimPersona(md: string, max = 1200): string {
  const trimmed = md.trim();
  if (trimmed.length <= max) return trimmed;
  return trimmed.slice(0, max) + "\n…";
}

interface AgentResult {
  slug: string;
  output: string;
  files: string[];
}

async function runAgent(
  sessionId: string,
  agent: CatalogAgent,
  goal: string,
  subgoal: string,
  teamContext: string,
  outDir: string,
  signal: AbortSignal,
): Promise<AgentResult> {
  const requestId = `${agent.slug}-${Date.now()}`;
  const engine = availableProvider() ?? "gemini";

  emit(sessionId, {
    type: "agent.dispatched",
    agentSlug: agent.slug,
    department: agent.department,
    goal: subgoal || goal,
    requestId,
    engine,
    timestamp: Date.now(),
  });
  emit(sessionId, { type: "agent.thinking", requestId, agentSlug: agent.slug, timestamp: Date.now() });
  log(sessionId, agent.slug, `${agent.role} dispatched`);

  // Persona is trimmed to its essence to save input tokens; builders get the
  // full doctrine + file protocol, advisors get a one-line taste reminder.
  const persona = trimPersona(await loadAgentPrompt(agent));
  let system: string;
  if (agent.builder) {
    const doctrine = await loadDoctrine();
    system = `${doctrine}\n\n---\n\n${persona}\n${FILE_PROTOCOL}`;
  } else {
    system = `${persona}\n\n${TASTE_LINE}`;
  }

  const prompt =
    `Founder's goal: "${goal}"\n\n` +
    `Your assignment: ${subgoal || `Contribute as ${agent.role}.`}\n\n` +
    (teamContext ? `What the crew has produced so far:\n${teamContext}\n\n` : "") +
    (agent.builder
      ? `Build your part as complete, production-quality files via the output protocol. ` +
        `Follow the design direction and copy from the crew above exactly.`
      : `Reply with a tight, concrete spec (bullet points, ~150 words max) the builder ` +
        `can act on directly — no preamble, no code.`);

  let tokenIndex = 0;
  const started = Date.now();
  let output = "";
  try {
    const res = await streamLLM({
      system,
      prompt,
      signal,
      maxOutputTokens: agent.budget,
      onToken: (token) => {
        output += token;
        emit(sessionId, {
          type: "agent.token",
          requestId,
          agentSlug: agent.slug,
          token,
          tokenIndex: tokenIndex++,
          timestamp: Date.now(),
        });
      },
    });
    output = res.text || output;
  } catch (err: any) {
    if (signal.aborted) throw err;
    emit(sessionId, {
      type: "agent.error",
      requestId,
      agentSlug: agent.slug,
      error: err?.message || "agent failed",
      retryable: false,
      timestamp: Date.now(),
    });
    log(sessionId, agent.slug, `error: ${err?.message || "failed"}`);
    return { slug: agent.slug, output: "", files: [] };
  }

  const files = agent.builder ? await extractAndWriteFiles(sessionId, agent.slug, output, outDir) : [];

  emit(sessionId, {
    type: "agent.done",
    requestId,
    agentSlug: agent.slug,
    tokenCount: tokenIndex,
    durationMs: Date.now() - started,
    outputSummary: summarize(output),
    timestamp: Date.now(),
  });
  log(sessionId, agent.slug, files.length ? `done · ${files.length} file(s)` : "done");
  return { slug: agent.slug, output, files };
}

function summarize(text: string): string {
  const stripped = text.replace(WRITE_FILE_RE, "[file]").replace(/\s+/g, " ").trim();
  return stripped.slice(0, 200);
}

function contextFrom(results: AgentResult[]): string {
  return results
    .map((r) => {
      const a = CATALOG_BY_SLUG.get(r.slug);
      return `• ${a?.role ?? r.slug}: ${summarize(r.output)}`;
    })
    .join("\n");
}

// ── Session entry point ──────────────────────────────────────────────────--
export function newSessionId(): string {
  return `sess_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export async function runSession(goal: string): Promise<string> {
  const sessionId = newSessionId();
  lastSessionId = sessionId;
  const controller = new AbortController();
  activeSessions.set(sessionId, controller);
  const { signal } = controller;

  // Kick off in the background; the caller (WS handler) returns immediately.
  void (async () => {
    const startedAt = Date.now();
    let totalTokens = 0;
    let totalAgents = 0;
    let success = false;
    try {
      if (!availableProvider()) {
        orchestratorState.createSession(sessionId, goal);
        emit(sessionId, {
          type: "error",
          message: "No LLM provider configured. Add GEMINI_API_KEY or DEEPSEEK_API_KEY to server/.env.",
          code: "NO_PROVIDER",
          timestamp: Date.now(),
        });
        return;
      }

      orchestratorState.createSession(sessionId, goal); // emits session.started
      const outDir = join(OUTPUT_ROOT, sessionId);
      await mkdir(outDir, { recursive: true });

      // Plan
      emit(sessionId, { type: "phase.changed", phase: { name: "PLANNER", status: "active" }, timestamp: Date.now() });
      emit(sessionId, { type: "orchestrator.thinking", goal, timestamp: Date.now() });
      const plan = await planCrew(goal, signal);
      throwIfAborted(signal);

      const agentAssignments: Record<string, string> = {};
      plan.agents.forEach((slug, i) => {
        agentAssignments[slug] = plan.subgoals[i] || "";
      });
      const waves = buildWaves(plan.agents);
      emit(sessionId, {
        type: "orchestrator.plan",
        goal,
        subgoals: plan.subgoals,
        agentAssignments,
        waves,
        timestamp: Date.now(),
      });
      log(sessionId, "planner", `selected ${plan.agents.length} agents across ${waves.length} waves`);

      // Execute waves with accumulating shared context
      emit(sessionId, { type: "phase.changed", phase: { name: "EXECUTE", status: "active" }, timestamp: Date.now() });
      const allResults: AgentResult[] = [];
      for (let w = 0; w < waves.length; w++) {
        const wave = waves[w];
        throwIfAborted(signal);
        emit(sessionId, {
          type: "wave.start",
          waveNumber: w + 1,
          agentSlugs: wave,
          parallelCount: wave.length,
          timestamp: Date.now(),
        });
        const teamContext = contextFrom(allResults);
        const waveResults = await Promise.all(
          wave.map((slug) => {
            const agent = CATALOG_BY_SLUG.get(slug)!;
            return runAgent(sessionId, agent, goal, agentAssignments[slug], teamContext, outDir, signal);
          }),
        );
        allResults.push(...waveResults);
        totalAgents += wave.length;
        totalTokens += waveResults.reduce((n, r) => n + r.output.length, 0);
      }

      const totalFiles = allResults.reduce((n, r) => n + r.files.length, 0);
      emit(sessionId, { type: "phase.changed", phase: { name: "SHIP", status: "complete" }, timestamp: Date.now() });
      log(sessionId, "swarm", `shipped · ${totalFiles} artifact(s) from ${totalAgents} agents`);
      success = true;
    } catch (err: any) {
      if (signal.aborted) {
        log(sessionId, "swarm", "session stopped by user");
      } else {
        logger.error("orchestrator session failed", { err: err?.message });
        emit(sessionId, { type: "error", message: err?.message || "Session failed", timestamp: Date.now() });
      }
    } finally {
      activeSessions.delete(sessionId);
      orchestratorState.completeSession(
        sessionId,
        success,
        totalAgents,
        Math.round(totalTokens / 4),
        Date.now() - startedAt,
      );
    }
  })();

  return sessionId;
}

function throwIfAborted(signal: AbortSignal): void {
  if (signal.aborted) throw new Error("aborted");
}

// Minimal fallback if FOUNDER_BUILD_DOCTRINE.md is missing at runtime.
const EMBEDDED_DOCTRINE = `# Founder Build Doctrine
Avoid slop: commit to a specific aesthetic; no centered-hero/one-button defaults, no
purple-blue gradients, glassmorphism, blobs, generic fonts, or fake stats. Typography and
spacing carry the design. Ship in one shot: complete, runnable files, no placeholders, and
always a self-contained index.html preview for any web build. Build for continuation: never
wipe existing files when tweaking; use clear seams and tokens so the next change is a small,
safe diff.`;
