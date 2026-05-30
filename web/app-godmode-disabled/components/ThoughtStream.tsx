"use client";
 
import React from "react";
 
interface ThoughtStreamProps {
  agent: {
    id: string;
    tokenStream: string;
    status: string;
  } | null;
}
 
export default function ThoughtStream({ agent }: ThoughtStreamProps) {
  if (!agent) return (
    <div className="flex h-full items-center justify-center text-center">
      <div className="font-mono text-[11px] text-dim">Select an active agent to view their thought stream</div>
    </div>
  );
 
  return (
    <div className="flex h-full flex-col font-mono">
      <div className="flex items-center justify-between border-b border-line px-4 py-2 bg-surface">
        <div className="flex items-center gap-2">
          <span className={`h-2 w-2 rounded-full ${agent.status === "active" ? "bg-green pulse-dot" : "bg-dim"}`} />
          <span className="text-[11px] text-ink uppercase tracking-wider">{agent.id}</span>
        </div>
        <div className="text-[10px] text-dim">streaming tokens...</div>
      </div>
      <div className="flex-1 overflow-y-auto p-4 text-[13px] leading-relaxed text-ink2 whitespace-pre-wrap">
        {agent.tokenStream || <span className="text-dim">Waiting for tokens...</span>}
        {agent.status === "active" && (
          <span className="ml-1 inline-block h-4 w-[2px] animate-pulse bg-green" />
        )}
      </div>
    </div>
  );
}
