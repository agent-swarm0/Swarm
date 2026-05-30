"use client";
 
import React from "react";
 
interface IdentityCardProps {
  agent: {
    slug: string;
    category: string;
    file: string;
  };
  status: string;
  startTime?: number;
}
 
export default function IdentityCard({ agent, status, startTime }: IdentityCardProps) {
  const formattedName = agent.slug
    .split("-")
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
 
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-serif text-2xl text-ink">{formattedName}</h2>
          <div className="flex items-center gap-2 mt-1">
            <span className="rounded border border-line2 px-2 py-0.5 font-mono text-[10px] uppercase text-dim bg-surface">
              {agent.category}
            </span>
            <span className={`h-2 w-2 rounded-full ${status === "active" ? "bg-green pulse-dot" : "bg-dim"}`} />
            <span className="font-mono text-[10px] uppercase text-ink2">{status}</span>
          </div>
        </div>
        <div className="text-right font-mono text-[10px] text-dim">
          {agent.file}
        </div>
      </div>
    </div>
  );
}
