/**
 * Orchestrator WebSocket Protocol Types
 * 
 * Real-time event stream from the Python orchestrator to the web dashboard.
 * Aligned with GOD MODE Feature Map.
 */

export type AgentStatus = "idle" | "queued" | "thinking" | "active" | "done" | "error";

export interface AgentState {
  id: string;
  role: string;
  department: string;
  status: AgentStatus;
  action: string;
  tokenCount?: number;
  progress?: number;
}

export interface LogEntry {
  agentId: string;
  timestamp: number;
  level: "info" | "warn" | "error" | "debug";
  message: string;
  artifact?: string;
}

export interface GraphEdge {
  from: string;
  to: string;
  active: boolean;
  label?: string;
}

export interface ApprovalRequest {
  id: string;
  agentId: string;
  action: string;
  reason: string;
  risk: "low" | "medium" | "high";
  metadata?: Record<string, unknown>;
}

export interface OrchestratorPhase {
  name: "QUESTIONNAIRE" | "PLANNER" | "EXECUTE" | "DEBUG" | "SHIP";
  status: "pending" | "active" | "complete" | "error";
  startedAt?: number;
  completedAt?: number;
}

export interface WaveInfo {
  waveNumber: number;
  agentSlugs: string[];
  parallelCount: number;
}

export interface ToolCall {
  requestId: string;
  tool: string;
  args: any;
  result: any;
  timestamp: number;
}

// Outbound events (server → client)
export type OrchestratorEvent =
  | { type: "session.started"; sessionId: string; goal: string; timestamp: number }
  | { type: "orchestrator.thinking"; goal: string; timestamp: number }
  | { type: "orchestrator.plan"; goal: string; subgoals: string[]; agentAssignments: Record<string, string>; waves: string[][]; timestamp: number }
  | { type: "wave.start"; waveNumber: number; agentSlugs: string[]; parallelCount: number; timestamp: number }
  | { type: "agent.dispatched"; agentSlug: string; department: string; goal: string; requestId: string; engine: string; timestamp: number }
  | { type: "agent.thinking"; requestId: string; agentSlug: string; timestamp: number }
  | { type: "agent.token"; requestId: string; agentSlug: string; token: string; tokenIndex: number; timestamp: number }
  | { type: "agent.phase"; requestId: string; phase: string; timestamp: number }
  | { type: "agent.tool_call"; toolCall: ToolCall }
  | { type: "agent.done"; requestId: string; agentSlug: string; tokenCount: number; durationMs: number; outputSummary: string; timestamp: number }
  | { type: "agent.handoff"; fromSlug: string; toSlug: string; outputPreview: string; timestamp: number }
  | { type: "agent.error"; requestId: string; agentSlug: string; error: string; retryable: boolean; timestamp: number }
  | { type: "phase.changed"; phase: OrchestratorPhase; timestamp: number }
  | { type: "log.entry"; log: LogEntry }
  | { type: "graph.updated"; edges: GraphEdge[] }
  | { type: "approval.requested"; approval: ApprovalRequest }
  | { type: "artifact.created"; path: string; url?: string; timestamp: number }
  | { type: "session.completed"; sessionId: string; success: boolean; totalAgents: number; totalTokens: number; totalDurationMs: number; timestamp: number }
  | { type: "error"; message: string; code?: string; timestamp: number };

// Inbound commands (client → server)
export type OrchestratorCommand =
  | { type: "session.start"; goal: string }
  | { type: "session.stop"; sessionId: string }
  | { type: "approval.respond"; approvalId: string; approved: boolean }
  | { type: "dashboard.command"; command: string; payload?: any }
  | { type: "ping" };

export interface OrchestratorSession {
  id: string;
  goal: string;
  startedAt: number;
  phase: OrchestratorPhase;
  agents: Map<string, AgentState>;
  logs: LogEntry[];
  artifacts: string[];
  pendingApproval?: ApprovalRequest;
  currentWave?: number;
}
