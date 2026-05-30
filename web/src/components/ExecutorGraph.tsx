"use client";

import React, { useEffect, useRef, useState } from "react";

export type NodeStatus = "idle" | "thinking" | "streaming" | "completed" | "failed";

export interface GraphAgent {
  slug: string;
  name: string;
  emoji: string;
  color: string;
  status: NodeStatus;
  task?: string;
  output: string;
  skills?: string[];
}

interface ExecutorGraphProps {
  statusMessage: string;
  plannerReasoning: string;
  plannerActive: boolean;
  agents: GraphAgent[];
  synthesis: { status: NodeStatus; output: string };
}

const STATUS_COLOR: Record<NodeStatus, string> = {
  idle: "#7a8a7d",
  thinking: "#c2820a",
  streaming: "#12a85a",
  completed: "#0e8f4d",
  failed: "#c2410c",
};

const STATUS_LABEL: Record<NodeStatus, string> = {
  idle: "queued",
  thinking: "thinking",
  streaming: "working",
  completed: "done",
  failed: "failed",
};

function lastLines(text: string, n: number): string {
  const lines = text.replace(/\r/g, "").split("\n").filter((l) => l.trim().length > 0);
  return lines.slice(-n).join("\n");
}

function StatusPill({ status }: { status: NodeStatus }) {
  const running = status === "thinking" || status === "streaming";
  return (
    <span className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider text-ink2">
      <span
        className={`inline-block h-1.5 w-1.5 rounded-full ${running ? "pulse-dot" : ""}`}
        style={{ backgroundColor: STATUS_COLOR[status] }}
      />
      {STATUS_LABEL[status]}
    </span>
  );
}

/**
 * Custom SVG DAG of the execution: Planner → parallel agent nodes → Synthesizer.
 * Edges flow (animated dashes) while the downstream node is active. Clicking an
 * agent node expands its full live thought stream.
 */
export function ExecutorGraph({
  statusMessage,
  plannerReasoning,
  plannerActive,
  agents,
  synthesis,
}: ExecutorGraphProps) {
  const [expanded, setExpanded] = useState<string | null>(null);
  const streamRefs = useRef<Record<string, HTMLPreElement | null>>({});

  // Auto-scroll each node's mini thought stream as tokens arrive.
  useEffect(() => {
    agents.forEach((a) => {
      const el = streamRefs.current[a.slug];
      if (el) el.scrollTop = el.scrollHeight;
    });
  }, [agents]);

  const n = Math.max(agents.length, 1);
  const synthRunning = synthesis.status === "thinking" || synthesis.status === "streaming";
  const expandedAgent = agents.find((a) => a.slug === expanded) || null;

  return (
    <div className="w-full">
      {/* Status bar */}
      <div className="mb-6 flex items-center justify-between rounded-xl border border-line2 bg-surface px-5 py-3.5">
        <div className="flex items-center gap-3">
          <span className="pulse-dot inline-block h-2 w-2 rounded-full bg-green" />
          <span className="font-mono text-sm text-ink">{statusMessage}</span>
        </div>
        <span className="font-mono text-[11px] uppercase tracking-wider text-dim">
          {agents.length} agents · parallel
        </span>
      </div>

      {/* ---- Planner node ---- */}
      <div className="flex justify-center">
        <div
          className="w-full max-w-2xl rounded-xl border bg-surface p-4"
          style={{ borderColor: plannerActive ? STATUS_COLOR.streaming : "var(--color-line2)" }}
        >
          <div className="flex items-center gap-2.5">
            <span className="text-lg">🧭</span>
            <span className="font-mono text-sm font-medium text-ink">Orchestrator · Planner</span>
            <span className="ml-auto">
              <StatusPill status={plannerActive ? "streaming" : plannerReasoning ? "completed" : "idle"} />
            </span>
          </div>
          <p className="mt-2.5 font-mono text-xs leading-relaxed text-ink2">
            {plannerReasoning || "Decomposing the goal and selecting specialists…"}
          </p>
        </div>
      </div>

      {/* ---- Top fan: planner → agents ---- */}
      <div className="relative h-10">
        <svg className="absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none">
          {agents.map((a, i) => {
            const x = ((i + 0.5) / n) * 100;
            const active = a.status !== "idle";
            return (
              <line
                key={a.slug}
                x1="50"
                y1="0"
                x2={x}
                y2="100"
                stroke={active ? STATUS_COLOR[a.status] : "#b9d2bc"}
                strokeWidth="0.5"
                strokeDasharray="3 3"
                className={a.status === "thinking" || a.status === "streaming" ? "swarm-edge-active" : ""}
                vectorEffect="non-scaling-stroke"
              />
            );
          })}
        </svg>
      </div>

      {/* ---- Parallel agent nodes ---- */}
      <div
        className="grid gap-4"
        style={{ gridTemplateColumns: `repeat(${Math.min(n, 4)}, minmax(0, 1fr))` }}
      >
        {agents.map((agent) => {
          const running = agent.status === "thinking" || agent.status === "streaming";
          const preview = lastLines(agent.output, 6);
          return (
            <button
              key={agent.slug}
              type="button"
              onClick={() => setExpanded(agent.slug)}
              className="flex h-60 flex-col overflow-hidden rounded-xl border bg-surface text-left transition-colors hover:border-green/40"
              style={{ borderColor: running ? STATUS_COLOR.streaming : "var(--color-line2)" }}
            >
              <div className="flex items-center gap-2 border-b border-line px-3 py-2.5">
                <span className="text-base">{agent.emoji}</span>
                <span className="truncate font-mono text-xs font-medium text-ink">{agent.name}</span>
                <span className="ml-auto flex-shrink-0">
                  <StatusPill status={agent.status} />
                </span>
              </div>
              {agent.task && (
                <div className="border-b border-line px-3 py-2 font-mono text-[11px] leading-snug text-green">
                  {agent.task}
                </div>
              )}
              <pre
                ref={(el) => {
                  streamRefs.current[agent.slug] = el;
                }}
                className="flex-1 overflow-y-auto whitespace-pre-wrap break-words bg-bg3 px-3 py-2.5 font-mono text-[11px] leading-relaxed text-ink2"
              >
                {preview || (agent.status === "idle" ? "waiting in queue…" : "booting agent runtime…")}
              </pre>
              <div className="border-t border-line px-3 py-1.5 text-right font-mono text-[10px] text-dim">
                click to expand
              </div>
            </button>
          );
        })}
      </div>

      {/* ---- Bottom fan: agents → synthesizer ---- */}
      <div className="relative h-10">
        <svg className="absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none">
          {agents.map((a, i) => {
            const x = ((i + 0.5) / n) * 100;
            const done = a.status === "completed";
            const active = done && (synthRunning || synthesis.status === "completed");
            return (
              <line
                key={a.slug}
                x1={x}
                y1="0"
                x2="50"
                y2="100"
                stroke={done ? STATUS_COLOR.completed : "#b9d2bc"}
                strokeWidth="0.5"
                strokeDasharray="3 3"
                className={active && synthRunning ? "swarm-edge-active" : ""}
                vectorEffect="non-scaling-stroke"
              />
            );
          })}
        </svg>
      </div>

      {/* ---- Synthesizer node ---- */}
      {(synthesis.status !== "idle" || synthesis.output) && (
        <div className="flex justify-center">
          <div
            className="w-full max-w-2xl rounded-xl border bg-surface p-4"
            style={{ borderColor: synthRunning ? STATUS_COLOR.streaming : "var(--color-line2)" }}
          >
            <div className="flex items-center gap-2.5">
              <span className="text-lg">🛠️</span>
              <span className="font-mono text-sm font-medium text-ink">Lead Builder</span>
              <span className="ml-auto">
                <StatusPill status={synthesis.status} />
              </span>
            </div>
            <pre className="mt-2.5 max-h-40 overflow-y-auto whitespace-pre-wrap break-words font-mono text-xs leading-relaxed text-ink2">
              {lastLines(synthesis.output, 8) || "consolidating agent outputs…"}
            </pre>
          </div>
        </div>
      )}

      {/* ---- Expanded agent stream modal ---- */}
      {expandedAgent && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-tbg/70 p-6"
          onClick={() => setExpanded(null)}
        >
          <div
            className="flex max-h-[85vh] w-full max-w-3xl flex-col overflow-hidden rounded-lg border border-line2 bg-surface"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-2.5 border-b border-line px-4 py-3">
              <span className="text-base">{expandedAgent.emoji}</span>
              <span className="font-mono text-sm font-medium text-ink">{expandedAgent.name}</span>
              <span className="ml-2"><StatusPill status={expandedAgent.status} /></span>
              <button
                onClick={() => setExpanded(null)}
                className="ml-auto cursor-pointer font-mono text-xs text-dim hover:text-ink"
              >
                ✕ Close
              </button>
            </div>
            {expandedAgent.task && (
              <div className="border-b border-line px-4 py-2.5 font-mono text-xs text-green">
                {expandedAgent.task}
              </div>
            )}
            <pre className="flex-1 overflow-y-auto whitespace-pre-wrap break-words bg-tbg px-4 py-3.5 font-mono text-xs leading-relaxed text-mint">
              {expandedAgent.output || "no output yet…"}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}
