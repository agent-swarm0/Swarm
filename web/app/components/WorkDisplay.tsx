"use client";
 
import React, { useState } from "react";
 
interface WorkDisplayProps {
  tokenStream: string;
}
 
export default function WorkDisplay({ tokenStream }: WorkDisplayProps) {
  const [view, setView] = useState<"raw" | "structured">("raw");
 
  const renderStructured = (text: string) => {
    // Simple markdown-like parsing for structured view
    const lines = text.split("\n");
    return lines.map((line, i) => {
      if (line.startsWith("#")) return <div key={i} className="font-bold text-ink mt-4 mb-2">{line.replace(/^#+\s*/, "")}</div>;
      if (line.startsWith("- ") || line.startsWith("* ")) return <div key={i} className="flex gap-2 ml-4 text-ink2 text-[12px]"><span>•</span>{line.slice(2)}</div>;
      if (line.startsWith("```")) return <div key={i} className="bg-bg p-3 rounded-lg border border-line my-2 font-mono text-xs text-green">{line}</div>;
      return <div key={i} className="text-ink2 text-[13px] leading-relaxed">{line}</div>;
    });
  };
 
  return (
    <div className="flex flex-col h-full font-mono">
      <div className="flex items-center justify-between border-b border-line px-4 py-2 bg-surface">
        <div className="text-[10px] uppercase tracking-wider text-dim">Live Work</div>
        <div className="flex rounded-lg border border-line2 p-[2px] font-mono text-[10px]">
          <button 
            onClick={() => setView("raw")} 
            className={`rounded px-2 py-1 transition-colors ${view === "raw" ? "bg-green text-white" : "text-ink2 hover:text-ink"}`}
          >
            raw
          </button>
          <button 
            onClick={() => setView("structured")} 
            className={`rounded px-2 py-1 transition-colors ${view === "structured" ? "bg-green text-white" : "text-ink2 hover:text-ink"}`}
          >
            structured
          </button>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-4 text-[13px] leading-relaxed text-ink2 whitespace-pre-wrap">
        {view === "raw" ? tokenStream : renderStructured(tokenStream)}
        {tokenStream && <span className="ml-1 inline-block h-4 w-[2px] animate-pulse bg-green" />}
      </div>
    </div>
  );
}
