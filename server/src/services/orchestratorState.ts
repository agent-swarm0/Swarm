/**
 * Orchestrator State Manager
 * 
 * Tracks active orchestrator sessions and their real-time state.
 * Updated for GOD MODE.
 */
import { EventEmitter } from "node:events";
import type {
  OrchestratorSession,
  OrchestratorEvent,
  AgentState,
  LogEntry,
  ApprovalRequest,
  OrchestratorPhase,
} from "../types/orchestrator.js";

class OrchestratorStateManager extends EventEmitter {
  private sessions = new Map<string, OrchestratorSession>();

  createSession(id: string, goal: string): OrchestratorSession {
    const session: OrchestratorSession = {
      id,
      goal,
      startedAt: Date.now(),
      phase: { name: "QUESTIONNAIRE", status: "pending" },
      agents: new Map(),
      logs: [],
      artifacts: [],
    };
    this.sessions.set(id, session);
    this.emit("event", { type: "session.started", sessionId: id, goal, timestamp: Date.now() });
    return session;
  }

  getSession(id: string): OrchestratorSession | undefined {
    return this.sessions.get(id);
  }

  /**
   * Main entry point for events coming from the Python bridge.
   * Updates internal session state and broadcasts the event.
   */
  processEvent(sessionId: string, event: OrchestratorEvent): void {
    const session = this.sessions.get(sessionId);
    if (!session) {
      // If it's a session.started event, we create the session
      if (event.type === "session.started") {
        this.createSession(sessionId, event.goal);
      } else {
        return;
      }
    }

    switch (event.type) {
      case "orchestrator.thinking":
        // Purely transient event, just broadcast
        break;
      case "orchestrator.plan":
        // Plan is stored in session state if needed, for now just broadcast
        break;
      case "wave.start":
        session.currentWave = event.waveNumber;
        break;
      case "agent.dispatched":
        session.agents.set(event.agentSlug, {
          id: event.agentSlug,
          role: "Agent", // Resolved from catalog in frontend or via separate event
          department: event.department,
          status: "queued",
          action: event.goal,
          tokenCount: 0,
        });
        break;
      case "agent.thinking":
        const thinkingAgent = session.agents.get(event.agentSlug);
        if (thinkingAgent) thinkingAgent.status = "thinking";
        break;
      case "agent.token":
        const tokenAgent = session.agents.get(event.agentSlug);
        if (tokenAgent) {
          tokenAgent.status = "active";
          tokenAgent.tokenCount = (tokenAgent.tokenCount || 0) + 1;
        }
        break;
      case "agent.phase":
        const phaseAgent = session.agents.get(event.requestId); // Using requestId as slug for simplicity or map it
        // In reality, we should map requestId -> agentSlug
        break;
      case "agent.done":
        const doneAgent = session.agents.get(event.agentSlug);
        if (doneAgent) doneAgent.status = "done";
        break;
      case "agent.error":
        const errorAgent = session.agents.get(event.agentSlug);
        if (errorAgent) errorAgent.status = "error";
        break;
      case "phase.changed":
        session.phase = event.phase;
        break;
      case "log.entry":
        session.logs.push(event.log);
        if (session.logs.length > 100) session.logs.shift();
        break;
      case "artifact.created":
        session.artifacts.push(event.path);
        break;
      case "approval.requested":
        session.pendingApproval = event.approval;
        break;
      case "session.completed":
        // Handled by completeSession
        break;
    }

    this.emit("event", event);
  }

  resolveApproval(sessionId: string, approved: boolean): void {
    const session = this.sessions.get(sessionId);
    if (!session || !session.pendingApproval) return;
    session.pendingApproval = undefined;
    this.emit("approval.resolved", { sessionId, approved });
  }

  completeSession(sessionId: string, success: boolean, totalAgents: number, totalTokens: number, totalDurationMs: number): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;
    this.emit("event", { 
      type: "session.completed", 
      sessionId, 
      success, 
      totalAgents, 
      totalTokens, 
      totalDurationMs, 
      timestamp: Date.now() 
    });
    setTimeout(() => this.sessions.delete(sessionId), 5 * 60 * 1000);
  }

  emitError(message: string, code?: string): void {
    this.emit("event", { type: "error", message, code, timestamp: Date.now() });
  }

  onEvent(handler: (event: OrchestratorEvent) => void): () => void {
    this.on("event", handler);
    return () => this.off("event", handler);
  }

  onApprovalResolved(handler: (data: { sessionId: string; approved: boolean }) => void): () => void {
    this.on("approval.resolved", handler);
    return () => this.off("approval.resolved", handler);
  }
}

export const orchestratorState = new OrchestratorStateManager();
