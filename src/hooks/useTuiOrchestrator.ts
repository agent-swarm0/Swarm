import { useEffect, useRef, useState } from "react";
 
type AgentStatus = "idle" | "queued" | "thinking" | "active" | "done" | "error";
 
interface Agent {
  id: string;
  role: string;
  department: string;
  status: AgentStatus;
  action: string;
  tokenCount?: number;
}
 
interface OrchestratorState {
  goal: string;
  isThinking: boolean;
  plan: any;
  currentWave: number;
}
 
export function useTuiOrchestrator(wsUrl: string) {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [phase, setPhase] = useState<string>("idle");
  const [orchestrator, setOrchestrator] = useState<OrchestratorState>({
    goal: "",
    isThinking: false,
    plan: null,
    currentWave: 0,
  });
  const ws = useRef<WebSocket | null>(null);
 
  useEffect(() => {
    const socket = new WebSocket(wsUrl);
    ws.current = socket;
 
    socket.onmessage = (event) => {
      const msg = JSON.parse(event.data);
 
      switch (msg.type) {
        case "session.started":
          setPhase("running");
          setAgents([]);
          setOrchestrator(prev => ({ ...prev, goal: msg.goal, isThinking: false }));
          break;
        
        case "orchestrator.thinking":
          setOrchestrator(prev => ({ ...prev, isThinking: true }));
          break;
          
        case "orchestrator.plan":
          setOrchestrator(prev => ({ ...prev, plan: msg, isThinking: false }));
          break;
          
        case "wave.start":
          setOrchestrator(prev => ({ ...prev, currentWave: msg.waveNumber }));
          break;
          
        case "agent.dispatched":
          setAgents((prev) => {
            const idx = prev.findIndex((a) => a.id === msg.agentSlug);
            const agent = { 
              id: msg.agentSlug, 
              role: "Agent", 
              department: msg.department, 
              status: "queued", 
              action: msg.goal, 
              tokenCount: 0,
            };
            return idx >= 0 ? [...prev.slice(0, idx), agent, ...prev.slice(idx + 1)] : [...prev, agent];
          });
          break;

        case "agent.thinking":
          setAgents((prev) =>
            prev.map((a) => a.id === msg.agentSlug ? { ...a, status: "thinking" } : a)
          );
          break;

        case "agent.token":
          setAgents((prev) =>
            prev.map((a) => a.id === msg.agentSlug ? { ...a, status: "active", tokenCount: (a.tokenCount || 0) + 1 } : a)
          );
          break;

        case "agent.done":
          setAgents((prev) =>
            prev.map((a) => a.id === msg.agentSlug ? { ...a, status: "done" } : a)
          );
          break;

        case "agent.error":
          setAgents((prev) =>
            prev.map((a) => a.id === msg.agentSlug ? { ...a, status: "error" } : a)
          );
          break;
 
        case "phase.changed":
          setPhase(msg.phase.name.toLowerCase());
          break;
 
        case "session.completed":
          setPhase("done");
          setOrchestrator(prev => ({ ...prev, isThinking: false }));
          break;
      }
    };
 
    return () => socket.close();
  }, [wsUrl]);
 
  const sendCommand = (command: any) => {
    if (ws.current?.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify(command));
    } else {
      console.error("WebSocket is not open. Current state:", ws.current?.readyState);
    }
  };
 
  return { agents, phase, orchestrator, sendCommand };
}
