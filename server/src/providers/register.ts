/**
 * Registers the concrete provider adapters. Called once from the server
 * bootstrap (`index.ts`) — NOT from `createApp()`, so tests get an empty
 * registry and never make real network calls unless they opt in.
 */
import { registerProvider } from "./index.js";
import { openaiAdapter } from "./openai.js";

export function registerBuiltinProviders(): void {
  registerProvider(openaiAdapter);
  // anthropic / gemini / groq adapters register here as they land.
}
