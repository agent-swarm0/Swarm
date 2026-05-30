/**
 * LLM client for the Node-side orchestrator.
 *
 * Uses NON-streaming REST calls (Gemini generateContent / DeepSeek chat) which
 * are far more reliable than the SSE streaming endpoints (those intermittently
 * stall on first byte and hang the run). The returned text is replayed to
 * `onToken` in small chunks so the console still feels live. DeepSeek is the
 * default primary (the Gemini test key throttles); Gemini is the fallback.
 */
import { logger } from "../utils/logger.js";

const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";
const DEEPSEEK_MODEL = process.env.DEEPSEEK_MODEL || "deepseek-chat";

/** Per-request hard timeout so a slow call can never hang the demo. */
const REQUEST_TIMEOUT_MS = Number(process.env.LLM_TIMEOUT_MS ?? 55_000);

export type Provider = "gemini" | "deepseek";

export interface StreamOptions {
  system: string;
  prompt: string;
  onToken: (token: string) => void;
  signal?: AbortSignal;
  maxOutputTokens?: number;
}

/**
 * Strip characters that produce invalid JSON when sent to the provider APIs:
 * lone UTF-16 surrogates (from truncated emoji in agent files) and C0 control
 * chars. A lone surrogate serializes to an unpaired \uD8xx escape that strict
 * parsers (DeepSeek) reject with "unexpected end of hex escape". Tab, newline
 * and carriage return are preserved.
 */
function clean(s: string): string {
  let out = "";
  for (const ch of s) {
    const c = ch.codePointAt(0)!;
    if (c >= 0xd800 && c <= 0xdfff) continue; // lone surrogate
    if (c < 0x20 && c !== 9 && c !== 10 && c !== 13) continue; // control char
    out += ch;
  }
  return out;
}

export function geminiKey(): string | undefined {
  return process.env.GEMINI_API_KEY?.trim() || undefined;
}

export function deepseekKey(): string | undefined {
  return process.env.DEEPSEEK_API_KEY?.trim() || undefined;
}

/**
 * Provider priority. DeepSeek is primary by default — in testing the Gemini
 * test key intermittently stalls (throttling), so DeepSeek gives a far more
 * reliable demo. Override with LLM_PRIMARY=gemini in server/.env if desired.
 */
function primaryProvider(): Provider {
  return process.env.LLM_PRIMARY === "gemini" ? "gemini" : "deepseek";
}

export function availableProvider(): Provider | null {
  const primary = primaryProvider();
  if (primary === "deepseek" && deepseekKey()) return "deepseek";
  if (primary === "gemini" && geminiKey()) return "gemini";
  if (deepseekKey()) return "deepseek";
  if (geminiKey()) return "gemini";
  return null;
}

/** Combine the caller's abort signal with a timeout; returns a cleanup fn. */
function withTimeout(external: AbortSignal | undefined, ms: number): { signal: AbortSignal; done: () => void } {
  const ctrl = new AbortController();
  const onAbort = () => ctrl.abort();
  if (external) {
    if (external.aborted) ctrl.abort();
    else external.addEventListener("abort", onAbort, { once: true });
  }
  const timer = setTimeout(() => ctrl.abort(), ms);
  return {
    signal: ctrl.signal,
    done: () => {
      clearTimeout(timer);
      external?.removeEventListener("abort", onAbort);
    },
  };
}

async function geminiGenerate(opts: StreamOptions): Promise<string> {
  const key = geminiKey();
  if (!key) throw new Error("GEMINI_API_KEY is not set");
  const url =
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}` +
    `:generateContent?key=${encodeURIComponent(key)}`;

  const { signal, done } = withTimeout(opts.signal, REQUEST_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal,
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: clean(opts.system) }] },
        contents: [{ role: "user", parts: [{ text: clean(opts.prompt) }] }],
        generationConfig: {
          maxOutputTokens: opts.maxOutputTokens ?? 4096,
          temperature: 0.6,
          // 2.5-flash thinks by default, which eats the output budget — disable it.
          thinkingConfig: { thinkingBudget: 0 },
        },
      }),
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      throw new Error(`Gemini HTTP ${res.status}: ${detail.slice(0, 200)}`);
    }
    const json: any = await res.json();
    const parts = json?.candidates?.[0]?.content?.parts;
    return Array.isArray(parts) ? parts.map((p: any) => p?.text ?? "").join("") : "";
  } finally {
    done();
  }
}

async function deepseekGenerate(opts: StreamOptions): Promise<string> {
  const key = deepseekKey();
  if (!key) throw new Error("DEEPSEEK_API_KEY is not set");
  const { signal, done } = withTimeout(opts.signal, REQUEST_TIMEOUT_MS);
  try {
    const res = await fetch("https://api.deepseek.com/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      signal,
      body: JSON.stringify({
        model: DEEPSEEK_MODEL,
        stream: false,
        max_tokens: Math.min(opts.maxOutputTokens ?? 4096, 8192),
        temperature: 0.7,
        messages: [
          { role: "system", content: clean(opts.system) },
          { role: "user", content: clean(opts.prompt) },
        ],
      }),
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      throw new Error(`DeepSeek HTTP ${res.status}: ${detail.slice(0, 200)}`);
    }
    const json: any = await res.json();
    return json?.choices?.[0]?.message?.content ?? "";
  } finally {
    done();
  }
}

/** Replay a completed response to onToken in small chunks for a live feel. */
async function replay(text: string, onToken: (t: string) => void, signal?: AbortSignal): Promise<void> {
  if (!text) return;
  const STEP = 18;
  for (let i = 0; i < text.length; i += STEP) {
    if (signal?.aborted) return;
    onToken(text.slice(i, i + STEP));
    if (i % (STEP * 6) === 0) await new Promise((r) => setTimeout(r, 12));
  }
}

/**
 * Generate from the primary provider (falling back to the other), then replay
 * the text to `onToken`. Returns the full text and the provider used.
 */
export async function streamLLM(opts: StreamOptions): Promise<{ text: string; provider: Provider }> {
  const provider = availableProvider();
  if (!provider) {
    throw new Error("No LLM provider configured. Set GEMINI_API_KEY or DEEPSEEK_API_KEY in server/.env");
  }

  const run = (p: Provider) => (p === "gemini" ? geminiGenerate(opts) : deepseekGenerate(opts));
  const fallback: Provider = provider === "gemini" ? "deepseek" : "gemini";
  const fallbackKey = fallback === "gemini" ? geminiKey() : deepseekKey();

  let text = "";
  let used: Provider = provider;
  try {
    text = await run(provider);
  } catch (err: any) {
    if (opts.signal?.aborted || !fallbackKey) throw err;
    logger.warn(`${provider} failed, falling back to ${fallback}`, { err: err?.message });
    text = await run(fallback);
    used = fallback;
  }

  await replay(text, opts.onToken, opts.signal);
  return { text, provider: used };
}
