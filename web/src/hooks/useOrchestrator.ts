import { useEffect, useRef, useState } from "react";
 
type AgentStatus = "idle" | "queued" | "thinking" | "active" | "done" | "error";
 
interface Agent {
  id: string;
  role: string;
  department: string;
  status: AgentStatus;
  action: string;
  tokenCount?: number;
  log: string[];
  tokenStream: string;
}
 
interface LogEntry {
  agentId: string;
  timestamp: number;
  level: string;
  message: string;
  artifact?: string;
}
 
interface ApprovalRequest {
  id: string;
  agentId: string;
  action: string;
  reason: string;
  risk: string;
}
 
export function useOrchestrator(wsUrl: string) {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [artifacts, setArtifacts] = useState<string[]>([]);
  const [approval, setApproval] = useState<ApprovalRequest | null>(null);
  const [phase, setPhase] = useState<"idle" | "running" | "blocked" | "done">("idle");
  const [elapsed, setElapsed] = useState(0);
  
  // God Mode State
  const [orchestrator, setOrchestrator] = useState({
    goal: "",
    isThinking: false,
    plan: null as any,
    currentWave: 0,
  });
  const [dispatchEvents, setDispatchEvents] = useState<{agentSlug: string, timestamp: number}[]>([]);
  
  const ws = useRef<WebSocket | null>(null);
  const startTime = useRef<number>(0);
 
  useEffect(() => {
    const socket = new WebSocket(wsUrl);
    ws.current = socket;
 
    socket.onopen = () => console.log("Connected to orchestrator");
 
    socket.onmessage = (event) => {
      const msg = JSON.parse(event.data);
 
      switch (msg.type) {
        case "session.started":
          startTime.current = Date.now();
          setPhase("running");
          setAgents([]);
          setLogs([]);
          setArtifacts([]);
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
          setDispatchEvents(prev => [...prev, { agentSlug: msg.agentSlug, timestamp: Date.now() }].slice(-10));
          setAgents((prev) => {
            const idx = prev.findIndex((a) => a.id === msg.agentSlug);
            const agent = { 
              id: msg.agentSlug, 
              role: "Agent", 
              department: msg.department, 
              status: "queued", 
              action: msg.goal, 
              tokenCount: 0,
              log: prev[idx]?.log || [],
              tokenStream: "",
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
            prev.map((a) => a.id === msg.agentSlug ? { ...a, status: "active", tokenCount: (a.tokenCount || 0) + 1, tokenStream: a.tokenStream + msg.token } : a)
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
 
        case "agent.updated":
          setAgents((prev) => {
            const idx = prev.findIndex((a) => a.id === msg.agent.id);
            const agent = { ...msg.agent, log: prev[idx]?.log || [] };
            return idx >= 0 ? [...prev.slice(0, idx), agent, ...prev.slice(idx + 1)] : [...prev, agent];
          });
          break;
 
        case "log.entry":
          setLogs((prev) => [...prev, msg.log].slice(-50));
          setAgents((prev) =>
            prev.map((a) =>
              a.id === msg.log.agentId ? { ...a, log: [...a.log, msg.log.message].slice(-4) } : a
            )
          );
          if (msg.log.artifact) setArtifacts((prev) => [...prev, msg.log.artifact]);
          break;
 
        case "artifact.created":
          setArtifacts((prev) => [...prev, msg.path]);
          break;
 
        case "approval.requested":
          setApproval(msg.approval);
          setPhase("blocked");
          break;
 
        case "session.completed":
          setPhase("done");
          setOrchestrator(prev => ({ ...prev, isThinking: false }));
          break;
      }
    };
 
    socket.onerror = (err) => console.error("WebSocket error:", err);
    socket.onclose = () => console.log("Disconnected from orchestrator");
 
    return () => socket.close();
  }, [wsUrl]);
 
  useEffect(() => {
    if (phase !== "running") return;
    const timer = setInterval(() => {
      setElapsed(Number(((Date.now() - startTime.current) / 1000).toFixed(1)));
    }, 100);
    return () => clearInterval(timer);
  }, [phase]);
 
  const startSession = (goal: string) => {
    if (ws.current?.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify({ type: "session.start", goal }));
    } else {
      console.error("WebSocket is not open. Current state:", ws.current?.readyState);
    }
  };
 
  const respondToApproval = (approvalId: string, approved: boolean) => {
    if (ws.current?.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify({ type: "approval.respond", approvalId, approved }));
    } else {
      console.error("WebSocket is not open. Current state:", ws.current?.readyState);
    }
    setApproval(null);
    setPhase(approved ? "running" : "done");
  };
 
  return { 
    agents, logs, artifacts, approval, phase, elapsed, 
    startSession, respondToApproval, 
    orchestrator, dispatchEvents 
  };
}
