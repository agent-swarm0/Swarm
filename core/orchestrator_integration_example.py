#!/usr/bin/env python3
"""
Example: Integrating WebSocket Bridge into Orchestrator

Add these calls at key points in your orchestrator flow.
"""

from core.websocket_bridge import get_bridge
import uuid
import time

def example_orchestrator_run(goal: str):
    """Example showing where to emit dashboard events."""
    
    bridge = get_bridge()
    session_id = f"sess_{uuid.uuid4().hex[:8]}"
    start_time = time.time()
    
    # 1. SESSION START
    bridge.session_started(session_id, goal)
    
    # 2. PHASE: QUESTIONNAIRE
    bridge.phase_changed("QUESTIONNAIRE", "active")
    bridge.agent_updated(
        agent_id="questionnaire-00",
        role="Questionnaire",
        department="strategy",
        status="working",
        action="Gathering requirements"
    )
    bridge.log_entry("questionnaire-00", "Analyzing goal context")
    # ... do questionnaire work ...
    bridge.agent_updated("questionnaire-00", "Questionnaire", "strategy", "done", "Requirements gathered")
    
    # 3. PHASE: PLANNER
    bridge.phase_changed("PLANNER", "active")
    bridge.agent_updated(
        agent_id="planner-00",
        role="Planner",
        department="strategy",
        status="working",
        action="Breaking down the goal"
    )
    bridge.log_entry("planner-00", f"Parsed goal: {goal}")
    bridge.log_entry("planner-00", "Created 5 tasks across 3 departments")
    bridge.artifact_created("plan.md", url="/output/plan.md")
    bridge.agent_updated("planner-00", "Planner", "strategy", "done", "Plan ready")
    
    # 4. PHASE: EXECUTE
    bridge.phase_changed("EXECUTE", "active")
    
    # Multiple agents working in parallel
    agents = [
        ("research-01", "Researcher", "research", "Scanning prior art"),
        ("design-02", "Designer", "design", "Drafting layout"),
        ("eng-03", "Engineer", "engineering", "Scaffolding app"),
    ]
    
    for agent_id, role, dept, action in agents:
        bridge.agent_updated(agent_id, role, dept, "working", action)
    
    # Simulate work with logs
    bridge.log_entry("research-01", "Found 3 reference patterns")
    bridge.log_entry("design-02", "Grid + type scale set", artifact="design/tokens.css")
    bridge.log_entry("eng-03", "Next app scaffolded", artifact="app/page.tsx")
    
    for agent_id, role, dept, _ in agents:
        bridge.agent_updated(agent_id, role, dept, "done", "Complete")
    
    # 5. PHASE: DEBUG (if needed)
    # bridge.phase_changed("DEBUG", "active")
    # ... debug work ...
    
    # 6. PHASE: SHIP
    bridge.phase_changed("SHIP", "active")
    bridge.agent_updated("ops-05", "Ops", "operations", "working", "Preparing release")
    bridge.log_entry("ops-05", "Build artifact ready")
    
    # 7. APPROVAL REQUEST (for high-risk actions)
    approval_id = f"appr_{uuid.uuid4().hex[:8]}"
    bridge.approval_requested(
        approval_id=approval_id,
        agent_id="ops-05",
        action="Deploy to PRODUCTION",
        reason="Release the build to the live environment",
        risk="high"  # "low" | "medium" | "high"
    )
    
    # Wait for approval (in real code, you'd poll or use a callback)
    # For now, just simulate approval after delay
    time.sleep(2)
    bridge.log_entry("ops-05", "Operator APPROVED deploy → shipping")
    bridge.agent_updated("ops-05", "Ops", "operations", "done", "Deployed ✓")
    bridge.artifact_created("https://app.live", url="https://app.live")
    
    # 8. SESSION COMPLETE
    duration = time.time() - start_time
    bridge.session_completed(success=True, duration=duration)


# Integration points in existing orchestrator:
"""
1. At session start (after parsing CLI args):
   bridge.session_started(session_id, goal)

2. At each phase transition:
   bridge.phase_changed("PLANNER", "active")

3. When agent starts work:
   bridge.agent_updated(agent_id, role, dept, "working", "Doing X")

4. When agent logs output:
   bridge.log_entry(agent_id, message, artifact=path)

5. When agent completes:
   bridge.agent_updated(agent_id, role, dept, "done", "Complete")

6. When approval needed:
   bridge.approval_requested(id, agent_id, action, reason, risk)

7. At session end:
   bridge.session_completed(success=True, duration=elapsed)
"""

if __name__ == "__main__":
    example_orchestrator_run("build a landing page with auth")
