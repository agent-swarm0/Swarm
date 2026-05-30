/**
 * Run dispatch service.
 *
 * Bridges a registered run to a provider adapter and the WebSocket stream:
 * resolves the adapter + agent system prompt, drives the adapter's event
 * stream, publishes versioned frames into the run's room, and updates run
 * state. `startRun` is fire-and-forget — POST /api/run returns 202 immediately
 * and the work streams over WS.
 *
 * The API key is passed through to the adapter and is never stored on the run
 * record or logged.
 */
import type { ProviderAdapter } from "../providers/types.js";
import { getProvider } from "../providers/index.js";
import { getAgentSystemPrompt } from "./agentCatalog.js";
import { updateRunState, type RunRecord } from "./runRegistry.js";
import { publish, closeRoom } from "../websocket/hub.js";
import { frame } from "../websocket/protocol.js";
import { logger } from "../utils/logger.js";

export interface StartRunOptions {
  apiKey: string;
  model?: string;
}

/** How long to keep a finished run's replay buffer for late WS joiners. */
const ROOM_RETENTION_MS = 60_000;

/**
 * Drive an adapter to completion, publishing frames. Exported so it can be
 * tested with a stub adapter (no network).
 */
export async function executeRun(
  run: RunRecord,
  adapter: ProviderAdapter,
  opts: StartRunOptions,
): Promise<void> {
  const log = logger.child({ requestId: run.requestId });
  updateRunState(run.requestId, "running");

  const systemPrompt = run.agentSlug
    ? getAgentSystemPrompt(run.agentSlug)
    : undefined;

  let errored = false;
  try {
    for await (const ev of adapter.run({
      requestId: run.requestId,
      goal: run.goal,
      systemPrompt,
      apiKey: opts.apiKey,
      model: opts.model,
    })) {
      switch (ev.type) {
        case "token":
          publish(
            run.requestId,
            frame({ type: "token", requestId: run.requestId, content: ev.content }),
          );
          break;
        case "done":
          publish(
            run.requestId,
            frame({ type: "done", requestId: run.requestId, summary: ev.finishReason }),
          );
          break;
        case "error":
          errored = true;
          log.warn("provider error", { message: ev.message, retryable: ev.retryable });
          publish(
            run.requestId,
            frame({ type: "error", requestId: run.requestId, message: ev.message }),
          );
          break;
      }
    }
  } catch (err) {
    errored = true;
    log.error("run execution crashed", {
      err: err instanceof Error ? err.message : String(err),
    });
    publish(
      run.requestId,
      frame({
        type: "error",
        requestId: run.requestId,
        message: "Run failed unexpectedly.",
      }),
    );
  }

  updateRunState(run.requestId, errored ? "error" : "done");
  setTimeout(() => closeRoom(run.requestId), ROOM_RETENTION_MS).unref();
}

/**
 * Resolve the provider and start the run in the background. If the provider is
 * not registered, an error frame is emitted and the run is marked failed.
 */
export function startRun(run: RunRecord, opts: StartRunOptions): void {
  const adapter: ProviderAdapter | undefined = getProvider(run.provider);
  if (!adapter) {
    publish(
      run.requestId,
      frame({
        type: "error",
        requestId: run.requestId,
        message: `Provider "${run.provider}" is not available.`,
      }),
    );
    updateRunState(run.requestId, "error");
    return;
  }

  void executeRun(run, adapter, opts).catch((err) => {
    logger.error("unhandled run failure", {
      requestId: run.requestId,
      err: err instanceof Error ? err.message : String(err),
    });
  });
}
