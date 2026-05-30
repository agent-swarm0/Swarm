#!/usr/bin/env python3
"""WebSocket Bridge - Emit orchestrator events to Node.js server."""
import json
import os
import requests
from typing import Any, Dict, List, Optional
from datetime import datetime

class OrchestratorBridge:
    def __init__(self, server_url: Optional[str] = None):
        self.server_url = server_url or os.getenv("SWARM_SERVER_URL", "http://localhost:3000")
        self.session_id: Optional[str] = None
        self.enabled = os.getenv("SWARM_DASHBOARD_ENABLED", "true").lower() == "true"
    
    def _emit(self, event_type: str, data: Dict[str, Any]) -> None:
        if not self.enabled:
            return
        try:
            payload = {"type": event_type, **data}
            if self.session_id:
                payload["sessionId"] = self.session_id
            requests.post(
                f"{self.server_url}/api/orchestrator/events",
                json=payload,
                timeout=1.0
            )
        except:
            pass

    def _now(self) -> int:
        return int(datetime.now().timestamp() * 1000)
    
    def session_started(self, session_id: str, goal: str) -> None:
        self.session_id = session_id
        self._emit("session.started", {
            "sessionId": session_id,
            "goal": goal,
            "timestamp": self._now()
        })

    def emit_thinking(self, goal: str) -> None:
        self._emit("orchestrator.thinking", {
            "goal": goal,
            "timestamp": self._now()
        })

    def emit_plan(self, goal: str, subgoals: List[str], agent_assignments: Dict[str, str], waves: List[List[str]]) -> None:
        self._emit("orchestrator.plan", {
            "goal": goal,
            "subgoals": subgoals,
            "agentAssignments": agent_assignments,
            "waves": waves,
            "timestamp": self._now()
        })

    def emit_wave_start(self, wave_number: int, agent_slugs: List[str], parallel_count: int) -> None:
        self._emit("wave.start", {
            "waveNumber": wave_number,
            "agentSlugs": agent_slugs,
            "parallelCount": parallel_count,
            "timestamp": self._now()
        })

    def emit_agent_dispatched(self, agent_slug: str, department: str, goal: str, request_id: str, engine: str) -> None:
        self._emit("agent.dispatched", {
            "agentSlug": agent_slug,
            "department": department,
            "goal": goal,
            "requestId": request_id,
            "engine": engine,
            "timestamp": self._now()
        })

    def emit_agent_thinking(self, request_id: str, agent_slug: str) -> None:
        self._emit("agent.thinking", {
            "requestId": request_id,
            "agentSlug": agent_slug,
            "timestamp": self._now()
        })

    def emit_agent_token(self, request_id: str, agent_slug: str, token: str, token_index: int) -> None:
        self._emit("agent.token", {
            "requestId": request_id,
            "agentSlug": agent_slug,
            "token": token,
            "tokenIndex": token_index,
            "timestamp": self._now()
        })

    def emit_agent_phase(self, request_id: str, phase: str) -> None:
        self._emit("agent.phase", {
            "requestId": request_id,
            "phase": phase,
            "timestamp": self._now()
        })

    def emit_agent_tool_call(self, request_id: str, tool: str, args: Any, result: Any) -> None:
        self._emit("agent.tool_call", {
            "toolCall": {
                "requestId": request_id,
                "tool": tool,
                "args": args,
                "result": result,
                "timestamp": self._now()
            }
        })

    def emit_agent_done(self, request_id: str, agent_slug: str, token_count: int, duration_ms: int, output_summary: str) -> None:
        self._emit("agent.done", {
            "requestId": request_id,
            "agentSlug": agent_slug,
            "tokenCount": token_count,
            "durationMs": duration_ms,
            "outputSummary": output_summary,
            "timestamp": self._now()
        })

    def emit_agent_handoff(self, from_slug: str, to_slug: str, output_preview: str) -> None:
        self._emit("agent.handoff", {
            "fromSlug": from_slug,
            "toSlug": to_slug,
            "outputPreview": output_preview,
            "timestamp": self._now()
        })

    def emit_agent_error(self, request_id: str, agent_slug: str, error: str, retryable: bool) -> None:
        self._emit("agent.error", {
            "requestId": request_id,
            "agentSlug": agent_slug,
            "error": error,
            "retryable": retryable,
            "timestamp": self._now()
        })

    def phase_changed(self, phase_name: str, status: str = "active") -> None:
        self._emit("phase.changed", {
            "phase": {"name": phase_name, "status": status, "startedAt": self._now()},
            "timestamp": self._now()
        })
    
    def agent_updated(self, agent_id: str, role: str, department: str, status: str, action: str, progress: Optional[float] = None) -> None:
        data = {"agent": {"id": agent_id, "role": role, "department": department, "status": status, "action": action}}
        if progress is not None:
            data["agent"]["progress"] = progress
        self._emit("agent.updated", data)
    
    def log_entry(self, agent_id: str, message: str, level: str = "info", artifact: Optional[str] = None) -> None:
        data = {"log": {"agentId": agent_id, "timestamp": self._now(), "level": level, "message": message}}
        if artifact:
            data["log"]["artifact"] = artifact
        self._emit("log.entry", data)
    
    def artifact_created(self, path: str, url: Optional[str] = None) -> None:
        data = {"path": path}
        if url:
            data["url"] = url
        self._emit("artifact.created", {**data, "timestamp": self._now()})
    
    def approval_requested(self, approval_id: str, agent_id: str, action: str, reason: str, risk: str = "medium") -> None:
        self._emit("approval.requested", {
            "approval": {"id": approval_id, "agentId": agent_id, "action": action, "reason": reason, "risk": risk}
        })
    
    def session_completed(self, success: bool, total_agents: int, total_tokens: int, total_duration_ms: int) -> None:
        if self.session_id:
            self._emit("session.completed", {
                "sessionId": self.session_id, 
                "success": success, 
                "totalAgents": total_agents,
                "totalTokens": total_tokens,
                "totalDurationMs": total_duration_ms,
                "timestamp": self._now()
            })

_bridge: Optional[OrchestratorBridge] = None

def get_bridge() -> OrchestratorBridge:
    global _bridge
    if _bridge is None:
        _bridge = OrchestratorBridge()
    return _bridge
