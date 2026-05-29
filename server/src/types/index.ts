/**
 * Shared domain types for the SWARM backend.
 */

/** Supported API-mode providers. "cli" is reserved for the existing CLI path. */
export type ProviderName = "openai" | "anthropic" | "gemini" | "groq";

export const PROVIDER_NAMES: readonly ProviderName[] = [
  "openai",
  "anthropic",
  "gemini",
  "groq",
];

/** Operating mode of the backend. */
export type RunMode = "api" | "cli";

/** Lifecycle states a single run can be in. */
export type RunState = "pending" | "running" | "done" | "error";
