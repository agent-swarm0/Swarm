"use client";
 
import React from "react";
 
interface HandoffChainProps {
  currentAgent: string;
  handoffs: { from: string; to: string; summary: string }[];
}
 
export default function HandoffChain({ currentAgent, handoffs }: HandoffChainProps) {
  const chain = handoffs.filter(h => h.from === currentAgent || h.to === currentAgent);
  
  if (chain.length === 0) return null;
 
  return (
    <div className="space-y-4 font-mono">
      <div className="text-[10px] uppercase tracking-wider text-dim border-b border-line pb-2">Handoff Chain</div>
      <div className="flex items-center gap-3 overflow-x-auto py-2">
        {chain.map((h, i) => (
          <React.Fragment key={i}>
            <div className={`px-3 py-1 rounded border text-[11px] whitespace-nowrap ${h.from === currentAgent ? "border-green bg-green/10 text-green" : "border-line bg-surface text-ink2"}`}>
              {h.from}
            </div>
            <div className="text-dim">→</div>
            <div className={`px-3 py-1 rounded border text-[11px] whitespace-nowrap ${h.to === currentAgent ? "border-green bg-green/10 text-green" : "border-line bg-surface text-ink2"}`}>
              {h.to}
            </div>
          </React.Fragment>
        ))}
      </div>
      <div className="p-3 rounded-lg border border-line bg-surface text-[11px] text-ink2 italic">
        "{chain[0]?.summary || "No summary available"}"
      </div>
    </div>
  );
}
