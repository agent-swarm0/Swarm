/**
 * In-memory run registry.
 *
 * Tracks every run by `requestId` so HTTP, the router, and the WebSocket layer
 * share one source of truth. Sprint 1 keeps this in-memory (no DB); it is the
 * backbone for requestId tracking that POST /api/run and WS /ws/stream build on
 * in later commits.
 */
import type { ProviderName, RunState } from "../types/index.js";

export interface RunRecord {
  requestId: string;
  goal: string;
  provider: ProviderName;
  agentSlug?: string;
  state: RunState;
  createdAt: string;
  updatedAt: string;
}

const runs = new Map<string, RunRecord>();

export function createRun(
  input: Pick<RunRecord, "requestId" | "goal" | "provider" | "agentSlug">,
): RunRecord {
  const now = new Date().toISOString();
  const record: RunRecord = {
    ...input,
    state: "pending",
    createdAt: now,
    updatedAt: now,
  };
  runs.set(record.requestId, record);
  return record;
}

export function getRun(requestId: string): RunRecord | undefined {
  return runs.get(requestId);
}

export function updateRunState(requestId: string, state: RunState): void {
  const record = runs.get(requestId);
  if (!record) return;
  record.state = state;
  record.updatedAt = new Date().toISOString();
}

export function activeRunCount(): number {
  let count = 0;
  for (const r of runs.values()) {
    if (r.state === "pending" || r.state === "running") count += 1;
  }
  return count;
}

export function totalRunCount(): number {
  return runs.size;
}
