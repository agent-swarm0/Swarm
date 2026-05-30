# 🎯 Dashboard Integration Checklist

## ✅ Infrastructure (Complete)

- [x] WebSocket protocol types defined
- [x] Python bridge created (`websocket_bridge.py`)
- [x] Node.js WebSocket server configured
- [x] React dashboard hook created
- [x] Dashboard UI updated for real-time data
- [x] Test script created
- [x] Startup script created
- [x] Documentation written

## 🔧 Integration Steps (To Do)

### 1. Test the Stack

```bash
# Start servers
./start-dashboard.sh

# In another terminal, run test
python3 test_dashboard_integration.py

# Open dashboard
open http://localhost:3001/dashboard
```

**Expected:** Dashboard shows agents appearing, logs streaming, approval modal

### 2. Integrate into Main Orchestrator

Find these locations in your orchestrator code:

#### Session Start
```python
# At the beginning of orchestrator run
from core.websocket_bridge import get_bridge
bridge = get_bridge()
bridge.session_started(session_id, goal)
```

#### Phase Transitions
```python
# When entering each phase
bridge.phase_changed("QUESTIONNAIRE", "active")  # or PLANNER, EXECUTE, DEBUG, SHIP
```

#### Agent Lifecycle
```python
# When agent starts work
bridge.agent_updated(
    agent_id="planner-00",
    role="Planner", 
    department="strategy",
    status="working",
    action="Breaking down the goal"
)

# When agent logs output
bridge.log_entry(
    agent_id="planner-00",
    message="Created 5 tasks",
    artifact="plan.md"  # optional
)

# When agent completes
bridge.agent_updated(
    agent_id="planner-00",
    role="Planner",
    department="strategy", 
    status="done",
    action="Plan ready"
)
```

#### Approval Flow
```python
# When high-risk action needs approval
approval_id = f"appr_{uuid.uuid4().hex[:8]}"
bridge.approval_requested(
    approval_id=approval_id,
    agent_id="ops-05",
    action="Deploy to PRODUCTION",
    reason="Release the build to live environment",
    risk="high"  # "low" | "medium" | "high"
)

# Wait for approval (poll orchestratorState or use callback)
# Then continue based on approval response
```

#### Session Complete
```python
# At the end of orchestrator run
duration = time.time() - start_time
bridge.session_completed(success=True, duration=duration)
```

### 3. Test with Real Orchestrator

```bash
# Enable dashboard
export SWARM_DASHBOARD_ENABLED=true

# Run a real goal
./bin/swarm "build a landing page"

# Watch dashboard update in real-time
```

### 4. Verify Each Feature

- [ ] Agents appear in roster as they start
- [ ] Agent status changes (idle → working → done)
- [ ] Logs stream to live feed
- [ ] Artifacts appear in output panel
- [ ] Graph shows animated connections
- [ ] Approval modal appears when needed
- [ ] Phase transitions show in UI
- [ ] Session completes properly

### 5. Handle Approval Responses

The dashboard sends approval responses via WebSocket. You need to:

1. **Poll for approval resolution:**
```python
from server.src.services.orchestratorState import orchestratorState

# After requesting approval, poll for response
while True:
    session = orchestratorState.getSession(session_id)
    if not session.pendingApproval:
        # Approval was resolved
        break
    time.sleep(0.5)
```

2. **Or use event listener** (recommended):
```python
# Subscribe to approval resolutions
def on_approval(data):
    if data['approved']:
        # Continue with action
        pass
    else:
        # Cancel action
        pass

orchestratorState.onApprovalResolved(on_approval)
```

### 6. Production Checklist

- [ ] Set `SWARM_SERVER_URL` to production URL
- [ ] Use WSS (secure WebSocket) in production
- [ ] Add authentication to WebSocket endpoint
- [ ] Rate limit `/api/orchestrator/events`
- [ ] Add error handling for bridge failures
- [ ] Monitor WebSocket connection health
- [ ] Add session cleanup (remove old sessions)
- [ ] Configure CORS for dashboard domain

## 📝 Quick Reference

**Start dashboard:** `./start-dashboard.sh`  
**Test integration:** `python3 test_dashboard_integration.py`  
**Dashboard URL:** `http://localhost:3001/dashboard`  
**WebSocket URL:** `ws://localhost:3000/ws/orchestrator`  

**Docs:**
- `DASHBOARD.md` — Full guide
- `web/INTEGRATION.md` — Quick reference
- `ARCHITECTURE.txt` — Visual diagrams
- `core/orchestrator_integration_example.py` — Code examples

## 🐛 Troubleshooting

**Dashboard not updating?**
1. Check Node.js server: `curl http://localhost:3000/api/health`
2. Check WebSocket: Open browser console, look for connection errors
3. Check Python bridge: `export SWARM_DASHBOARD_ENABLED=true`
4. Check server logs: `tail -f logs/server.log`

**Events not appearing?**
1. Verify bridge is emitting: Add `print()` in `websocket_bridge.py`
2. Check POST endpoint: `curl -X POST http://localhost:3000/api/orchestrator/events -d '{"type":"ping"}'`
3. Check WebSocket broadcast: Look for events in browser DevTools Network tab

**Approval not working?**
1. Check approval modal appears in dashboard
2. Check WebSocket command is sent when clicking Approve/Deny
3. Check `orchestratorState.resolveApproval()` is called
4. Implement polling or event listener in Python

## ✨ Next Enhancements

- [ ] Add session history/replay
- [ ] Add agent performance metrics
- [ ] Add graph layout customization
- [ ] Add dark/light theme toggle
- [ ] Add export session as JSON
- [ ] Add multi-session support
- [ ] Add agent dependency visualization
- [ ] Add real-time cost tracking

---

**Status: Ready for integration** 🚀

All infrastructure is in place. Just add the bridge calls to your orchestrator and watch it sync live!
