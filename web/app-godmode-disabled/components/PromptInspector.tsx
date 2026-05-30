"use client";
 
import React, { useState } from "react";
 
interface PromptInspectorProps {
  prompt: string | null;
  goal: string;
}
 
export default function PromptInspector({ prompt, goal }: PromptInspectorProps) {
  const [expanded, setExpanded] = useState(false);
 
  return (
    <div className="space-y-2 font-mono">
      <button 
        onClick={() => setExpanded(!expanded)} 
        className="flex w-full items-center justify-between rounded-lg border border-line bg-surface px-4 py-3 text-left transition-colors hover:bg-bg3"
      >
        <div className="text-[11px] uppercase tracking-wider text-dim">Prompt Inspector</div>
        <span className="text-dim">{expanded ? "▴" : "▾"}</span>
      </button>
      
      {expanded && (
        <div className="rounded-lg border border-line bg-tbg p-4 space-y-4">
          <div>
            <div className="text-[10px] uppercase text-dim mb-1">Assigned Goal</div>
            <div className="text-[12px] text-ink2 italic">{goal}</div>
          </div>
          <div>
            <div className="text-[10px] uppercase text-dim mb-1">System Prompt</div>
            <div className="max-h-[300px] overflow-y-auto rounded border border-line bg-bg p-3 text-[11px] text-ink2 leading-relaxed whitespace-pre-wrap">
              {prompt || "No prompt available for this agent."}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
