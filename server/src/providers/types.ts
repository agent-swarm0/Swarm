/**
 * ProviderAdapter — the contract every API-mode provider must implement.
 *
 * Defined on day one so the OpenAI / Anthropic / Gemini / Groq adapters
 * (later commits) all plug into a single router with an identical shape.
 * NOTE: streaming is intentionally NOT implemented yet — this is the
 * interface only.
 */
import type { ProviderName } from "../types/index.js";

/** A single streamed event from a provider, normalised across vendors. */
export type ProviderStreamEvent =
  | { type: "token"; content: string }
  | { type: "done"; finishReason?: string }
  | { type: "error"; message: string; retryable: boolean };

/** Input passed to a provider for one run. */
export interface ProviderRunInput {
  /** Correlates this provider call with the originating request. */
  requestId: string;
  /** The user's goal / prompt. */
  goal: string;
  /** Resolved system prompt (from the selected agent's .md), if any. */
  systemPrompt?: string;
  /** Provider API key, supplied per-request by the caller. Never logged. */
  apiKey: string;
  /** Optional model override; adapter falls back to its own default. */
  model?: string;
  /** Allows the caller to cancel an in-flight run. */
  signal?: AbortSignal;
}

/**
 * The adapter contract. `run` yields normalised stream events; the router
 * forwards them to the WebSocket layer. Implementations are added in later
 * commits — only the type exists today.
 */
export interface ProviderAdapter {
  /** Stable identifier matching {@link ProviderName}. */
  readonly name: ProviderName;
  /** Default model used when the caller does not specify one. */
  readonly defaultModel: string;
  /** Execute a run, streaming normalised events. */
  run(input: ProviderRunInput): AsyncIterable<ProviderStreamEvent>;
}
