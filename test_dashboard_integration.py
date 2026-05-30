#!/usr/bin/env python3
"""Test dashboard integration by simulating God Mode orchestrator events."""

import time
import sys
from core.websocket_bridge import get_bridge

def test_dashboard_integration():
    """Simulate a full God Mode orchestrator run to test dashboard sync."""
    
    print("🧪 Testing GOD MODE dashboard integration...")
    print("📡 Make sure Node.js server is running on port 3000")
    print("🌐 Open http://localhost:3001/dashboard in your browser\n")
    
    bridge = get_bridge()
    session_id = "godmode_test_001"
    goal = "Build a high-performance landing page with auth"
    
    # 1. Session start
    print("1️⃣  Starting session...")
    bridge.session_started(session_id, goal)
    time.sleep(1)
    
    # 2. Orchestrator Thinking
    print("2️⃣  Orchestrator thinking...")
    bridge.emit_thinking(goal)
    time.sleep(1.5)
    
    # 3. Orchestrator Plan
    print("3️⃣  Generating plan...")
    subgoals = ["Research market", "Design UI", "Implement Auth", "Deploy"]
    assignments = {
        "research-01": "Research market",
        "design-02": "Design UI",
        "eng-03": "Implement Auth",
        "ops-04": "Deploy"
    }
    waves = [["research-01"], ["design-02"], ["eng-03"], ["ops-04"]]
    bridge.emit_plan(goal, subgoals, assignments, waves)
    time.sleep(1)
    
    # 4. Wave 1: Research
    print("4️⃣  Wave 1: Research...")
    bridge.emit_wave_start(1, ["research-01"], 1)
    bridge.emit_agent_dispatched("research-01", "research", "Research market", "req_001", "gpt-4o")
    time.sleep(0.5)
    bridge.emit_agent_thinking("req_001", "research-01")
    
    # Stream tokens for researcher
    tokens = "Researching current landing page trends. Found 3 high-conversion patterns...".split()
    for i, token in enumerate(tokens):
        bridge.emit_agent_token("req_001", "research-01", token + " ", i)
        time.sleep(0.05)
        
    bridge.emit_agent_phase("req_001", "executing")
    bridge.emit_agent_tool_call("req_001", "web_search", {"query": "landing page trends 2026"}, "Found 3 patterns")
    time.sleep(0.5)
    bridge.emit_agent_done("req_001", "research-01", 42, 2500, "Market research complete: 3 patterns identified.")
    time.sleep(1)
    
    # 5. Wave 2: Design
    print("5️⃣  Wave 2: Design...")
    bridge.emit_wave_start(2, ["design-02"], 1)
    bridge.emit_agent_dispatched("design-02", "design", "Design UI", "req_002", "claude-3-5-sonnet")
    time.sleep(0.5)
    bridge.emit_agent_thinking("req_002", "design-02")
    
    tokens = "Drafting the visual hierarchy. Using electric lime as accent color...".split()
    for i, token in enumerate(tokens):
        bridge.emit_agent_token("req_002", "design-02", token + " ", i)
        time.sleep(0.05)
    
    bridge.emit_agent_done("req_002", "design-02", 38, 3100, "UI design complete: Figma tokens exported.")
    time.sleep(1)
    
    # 6. Wave 3: Engineering (Parallel if we wanted, but keep it simple)
    print("6️⃣  Wave 3: Engineering...")
    bridge.emit_wave_start(3, ["eng-03"], 1)
    bridge.emit_agent_dispatched("eng-03", "engineering", "Implement Auth", "req_003", "gpt-4o")
    time.sleep(0.5)
    bridge.emit_agent_thinking("req_003", "eng-03")
    
    tokens = "Scaffolding Next.js app. Implementing NextAuth.js configuration...".split()
    for i, token in enumerate(tokens):
        bridge.emit_agent_token("req_003", "eng-03", token + " ", i)
        time.sleep(0.05)
        
    bridge.emit_agent_tool_call("req_003", "bash", {"cmd": "npm install next-auth"}, "installed successfully")
    time.sleep(0.5)
    bridge.emit_agent_done("req_003", "eng-03", 120, 5000, "Auth implementation complete: Route handlers wired.")
    time.sleep(1)
    
    # 7. Handoff Example
    print("7️⃣  Handoff: Engineering -> Ops...")
    bridge.emit_agent_handoff("eng-03", "ops-04", "Auth is ready for deployment. Please verify environment variables.")
    time.sleep(1)
    
    # 8. Wave 4: Ops
    print("8️⃣  Wave 4: Ops...")
    bridge.emit_wave_start(4, ["ops-04"], 1)
    bridge.emit_agent_dispatched("ops-04", "operations", "Deploy", "req_004", "gpt-4o")
    time.sleep(0.5)
    bridge.emit_agent_thinking("req_004", "ops-04")
    
    # Approval request
    print("⏸️  Requesting approval in dashboard...")
    bridge.approval_requested(
        approval_id="appr_godmode_001",
        agent_id="ops-04",
        action="Deploy to PRODUCTION",
        reason="Deployment of the auth-enabled landing page",
        risk="high"
    )
    
    print("   (Simulating 5 second wait, then auto-approving)")
    time.sleep(5)
    
    # Simulate deploy
    bridge.emit_agent_done("req_004", "ops-04", 25, 1200, "Deployed successfully to Vercel.")
    time.sleep(1)
    
    # 9. Session complete
    print("9️⃣  Session complete!")
    bridge.session_completed(success=True, total_agents=4, total_tokens=225, total_duration_ms=15000)
    
    print("\n✅ God Mode Test complete! Check the dashboard for real-time updates.")

if __name__ == "__main__":
    try:
        test_dashboard_integration()
    except KeyboardInterrupt:
        print("\n\n⚠️  Test interrupted")
        sys.exit(0)
    except Exception as e:
        print(f"\n\n❌ Test failed: {e}")
        sys.exit(1)
