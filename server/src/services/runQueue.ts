/**
 * Run queue + concurrency limiter.
 *
 * Caps the number of runs executing at once (api_mode.concurrency_cap, default
 * 5) and queues the rest FIFO. As running slots free up, queued runs are
 * promoted in order. Queue position/depth is streamed to each waiting run's WS
 * room via `queue_status` frames so the dashboard can show the backlog.
 *
 * This is the single entry point the HTTP route calls; it owns provider
 * resolution and delegates the actual streaming to {@link executeRun}.
 */
import type { ProviderAdapter } from "../providers/types.js";
import { getProvider } from "../providers/index.js";
import { updateRunState, type RunRecord } from "./runRegistry.js";
import { executeRun, type StartRunOptions } from "./runService.js";
import { getConcurrencyCap } from "./swarmConfig.js";
import { publish } from "../websocket/hub.js";
import { frame } from "../websocket/protocol.js";
import { logger } from "../utils/logger.js";

interface QueueItem {
  run: RunRecord;
  opts: StartRunOptions;
  adapter: ProviderAdapter;
}

let active = 0;
const waiting: QueueItem[] = [];

/** Emit each waiting run's current 1-based position and the total depth. */
function broadcastQueue(): void {
  const depth = waiting.length;
  for (let i = 0; i < waiting.length; i++) {
    const { run } = waiting[i]!;
    publish(
      run.requestId,
      frame({
        type: "queue_status",
        requestId: run.requestId,
        position: i + 1,
        depth,
      }),
    );
  }
}

function dispatch(item: QueueItem): void {
  active += 1;
  void executeRun(item.run, item.adapter, item.opts)
    .catch((err) => {
      logger.error("unhandled run failure", {
        requestId: item.run.requestId,
        err: err instanceof Error ? err.message : String(err),
      });
    })
    .finally(() => {
      active -= 1;
      pump();
    });
}

/** Promote queued runs into free slots, oldest first. */
function pump(): void {
  const cap = getConcurrencyCap();
  let promoted = false;
  while (active < cap && waiting.length > 0) {
    const item = waiting.shift()!;
    // Tell the client it left the queue (position 0).
    publish(
      item.run.requestId,
      frame({
        type: "queue_status",
        requestId: item.run.requestId,
        position: 0,
        depth: waiting.length,
      }),
    );
    dispatch(item);
    promoted = true;
  }
  if (promoted) broadcastQueue();
}

/**
 * Resolve the provider and either run immediately or queue. If the provider is
 * not registered, an error frame is emitted and the run is marked failed
 * without consuming a slot.
 */
export function enqueueRun(run: RunRecord, opts: StartRunOptions): void {
  const adapter = getProvider(run.provider);
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

  const item: QueueItem = { run, opts, adapter };

  if (active < getConcurrencyCap()) {
    dispatch(item);
    return;
  }

  waiting.push(item);
  updateRunState(run.requestId, "queued");
  broadcastQueue();
}

/** Number of runs currently executing. */
export function activeRunningCount(): number {
  return active;
}

/** Number of runs waiting for a free slot. */
export function queueDepth(): number {
  return waiting.length;
}
