"use client";
 
import React, { useEffect, useState } from "react";
import IdentityCard from "./IdentityCard";
import WorkDisplay from "./WorkDisplay";
import HandoffChain from "./HandoffChain";
import PromptInspector from "./PromptInspector";
 
interface AgentDrawerProps {
  agentId: string | null;
  onClose: () => void;
  agents: any[];
  logs: any[];
}
 
export default function AgentDrawer({ agentId, onClose, agents, logs }: AgentDrawerProps) {
  const [metadata, setMetadata] = useState<any>(null);
  const [prompt, setPrompt] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
 
  const agent = agents.find(a => a.id === agentId);
 
  useEffect(() => {
    if (!agentId) return;
    
    async function fetchIntel() {
      setIsLoading(true);
      try {
        const [metaRes, promptRes] = await Promise.all([
          fetch(`/api/agents/${agentId}`),
          fetch(`/api/agents/${agentId}/prompt`)
        ]);
        
        if (metaRes.ok) setMetadata(await metaRes.json());
        if (promptRes.ok) {
          const data = await promptRes.json();
          setPrompt(data.prompt);
        }
      } catch (e) {
        console.error("Failed to fetch agent intel", e);
      } finally {
        setIsLoading(false);
      }
    }
    
    fetchIntel();
  }, [agentId]);
 
  if (!agentId || !agent) return null;
 
  return (
    <div className="fixed inset-y-0 right-0 z-50 w-[420px] border-l border-line bg-bg shadow-2xl animate-in slide-in-from-right duration-300">
      <div className="flex h-full flex-col">
        <div className="flex items-center justify-between border-b border-line px-6 py-4 bg-surface">
          <div className="font-mono text-[11px] uppercase tracking-wider text-dim">Agent Dossier</div>
          <button onClick={onClose} className="text-dim hover:text-ink">✕</button>
        </div>
 
        <div className="flex-1 overflow-y-auto p-6 space-y-8">
          <IdentityCard 
            agent={metadata || { slug: agent.id, category: agent.department, file: "loading..." }} 
            status={agent.status} 
          />
 
          <div className="h-[300px] overflow-hidden rounded-xl border border-line bg-surface shadow-sm">
            <WorkDisplay tokenStream={agent.tokenStream || ""} />
          </div>
 
          <HandoffChain 
            currentAgent={agent.id} 
            handoffs={logs.filter(l => l.type === "agent.handoff")} 
          />
 
          <PromptInspector 
            prompt={prompt} 
            goal={agent.action} 
          />
        </div>
      </div>
    </div>
  );
}
