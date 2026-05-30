/**
 * Provider registry.
 *
 * Adapters register here so the router can resolve a {@link ProviderName} to a
 * concrete {@link ProviderAdapter}. Empty by design in Commit 1 — concrete
 * adapters (OpenAI first) land in later commits.
 */
import type { ProviderName } from "../types/index.js";
import type { ProviderAdapter } from "./types.js";

const registry = new Map<ProviderName, ProviderAdapter>();

export function registerProvider(adapter: ProviderAdapter): void {
  registry.set(adapter.name, adapter);
}

export function getProvider(name: ProviderName): ProviderAdapter | undefined {
  return registry.get(name);
}

export function listProviders(): ProviderName[] {
  return [...registry.keys()];
}
