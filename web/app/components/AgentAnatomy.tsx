"use client";
 
import React from "react";
 
interface AgentAnatomyProps {
  agent: {
    id: string;
    role: string;
    department: string;
    status: string;
  } | null;
  logs: any[];
}
 
export default function AgentAnatomy({ agent, logs }: AgentAnatomyProps) {
  if (!agent) return null;
 
  const agentLogs = logs.filter(l => l.agentId === agent.id);
 
  return (
    <div className="flex h-full flex-col font-mono">
      <div className="border-b border-line px-4 py-2 bg-surface">
        <div className="text-[10px] uppercase tracking-wider text-dim">Thought Anatomy</div>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <div className="space-y-2">
          <div className="text-[10px] text-dim uppercase">Identity</div>
          <div className="flex flex-col gap-1">
            <div className="flex justify-between text-[12px]">
              <span className="text-ink2">Role:</span>
              <span className="text-ink font-medium">{agent.role}</span>
            </div>
            <div className="flex justify-between text-[12px]">
              <span className="text-ink2">Dept:</span>
              <span className="text-ink font-medium">{agent.department}</span>
            </div>
            <div className="flex justify-between text-[12px]">
              <span className="text-ink2">Status:</span>
              <span className={`font-medium ${agent.status === "active" ? "text-green" : "text-dim"}`}>{agent.status}</span>
            </div>
          </div>
        </div>
 
        <div className="space-y-2">
          <div className="text-[10px] text-dim uppercase">Execution Log</div>
          <div className="space-y-1">
            {agentLogs.length === 0 ? (
              <div className="text-[11px] text-dim italic">No activity recorded yet</div>
            ) : (
              agentLogs.map((log, i) => (
                <div key={i} className="flex gap-2 text-[11px] border-l border-line pl-2 py-1">
                  <span className="text-dim shrink-0">{new Date(log.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', second:'2-digit'})}</span>
                  <span className="text-ink2">{log.message}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
