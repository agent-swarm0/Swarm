# 🎛️ SWARM Dashboard — Real-Time Orchestration

The web dashboard is **100% synced** with the Python orchestrator. Every agent, every log, every decision flows in real-time from the terminal to the browser.

## 🚀 Quick Start

```bash
# Start everything
./start-dashboard.sh

# Test the integration
python3 test_dashboard_integration.py

# Open dashboard
open http://localhost:3001/dashboard
```

## 🏗️ Architecture

```
Python Orchestrator          Node.js Server           Web Dashboard
─────────────────           ───────────────          ─────────────
                                                      
  orchestrator.py                                     
       │                                              
       │ emit events                                  
       ▼                                              
  websocket_bridge.py                                 
       │                                              
       │ HTTP POST                                    
       ▼                                              
                          /api/orchestrator/events    
                                 │                    
                                 │ broadcast          
                                 ▼                    
                          /ws/orchestrator ◄──────── useOrchestrator()
                                                           │
                                                           ▼
                                                      Dashboard UI
```

## 📡 Real-Time Features

### What Syncs

✅ **Agent Status** — idle → working → done in real-time  
✅ **Live Logs** — Every agent output streams to dashboard  
✅ **Graph Visualization** — Smooth animated lines between active agents  
✅ **Artifacts** — Files created appear instantly  
✅ **Approval Flow** — Dashboard freezes, waits for your decision  
✅ **Phase Transitions** — QUESTIONNAIRE → PLANNER → EXECUTE → DEBUG → SHIP  
✅ **Thought Process** — See what each agent is thinking as it works

### The Graph

The mindmap graph on the dashboard shows:
- **Nodes** = Agents (colored by status)
- **Edges** = Work flow (animated when active)
- **Click agent** = See its work, logs, department, progress

### The Floor

Alternative view showing:
- **Spotlight** = Currently active agent with full details
- **Grid** = All agents with status indicators
- **Live Stream** = Scrolling log of all agent activity

## 🔌 Integration Points

### In Your Orchestrator

```python
from core.websocket_bridge import get_bridge

bridge = get_bridge()

# 1. Start session
bridge.session_started("sess_123", goal)

# 2. Phase change
bridge.phase_changed("PLANNER", "active")

# 3. Agent starts
bridge.agent_updated(
    agent_id="planner-00",
    role="Planner",
    department="strategy",
    status="working",
    action="Breaking down the goal"
)

# 4. Agent logs
bridge.log_entry("planner-00", "Created 5 tasks", artifact="plan.md")

# 5. Agent completes
bridge.agent_updated("planner-00", "Planner", "strategy", "done", "Complete")

# 6. Request approval
bridge.approval_requested(
    approval_id="appr_001",
    agent_id="ops-05",
    action="Deploy to production",
    reason="Ship the build",
    risk="high"
)

# 7. Session complete
bridge.session_completed(success=True, duration=45.2)
```

See `core/orchestrator_integration_example.py` for full example.

## 🎮 Dashboard Controls

**Command Bar**
- Type goal → press Enter or click "dispatch"
- While running: "stop" button to halt

**View Toggle**
- **Graph** — Animated mindmap of agent coordination
- **Floor** — Detailed agent spotlight + grid

**Roster** (left sidebar)
- Click any agent to spotlight it
- Status dots: ○ idle, ● working, ● done, ● blocked

**Output** (right sidebar)
- Files/artifacts appear as agents create them
- Click to view (when URLs provided)

**Approval Modal**
- Appears when orchestrator needs permission
- Swarm freezes until you approve/deny
- Shows risk level and reason

## 🧪 Testing

```bash
# Run test simulation
python3 test_dashboard_integration.py
```

This simulates a full orchestrator run:
1. Session start
2. All 5 phases
3. Multiple agents working in parallel
4. Logs and artifacts
5. Approval request
6. Session completion

Watch the dashboard update in real-time!

## 📂 File Structure

```
core/
  websocket_bridge.py          # Python → Node.js event emitter
  orchestrator_integration_example.py  # Integration guide

server/
  src/
    types/orchestrator.ts      # Event type definitions
    services/orchestratorState.ts  # Session state manager
    websocket/orchestrator.ts  # WebSocket handler
    routes/orchestrator.ts     # HTTP event receiver

web/
  src/hooks/useOrchestrator.ts # React WebSocket hook
  app/dashboard/page.tsx       # Dashboard UI
  INTEGRATION.md               # Quick reference
```

## 🔧 Configuration

**Environment Variables**

```bash
# Python
export SWARM_DASHBOARD_ENABLED=true   # Enable dashboard events
export SWARM_SERVER_URL=http://localhost:3000  # Node.js server

# Node.js (server/.env)
PORT=3000
HOST=0.0.0.0

# Next.js (web/.env)
NEXT_PUBLIC_WS_URL=ws://localhost:3000/ws/orchestrator
```

## 🐛 Troubleshooting

**Dashboard not updating?**
- Check Node.js server is running on port 3000
- Check `SWARM_DASHBOARD_ENABLED=true` in Python env
- Check browser console for WebSocket errors

**WebSocket connection failed?**
- Verify server is running: `curl http://localhost:3000/api/health`
- Check firewall isn't blocking port 3000
- Try `ws://localhost:3000/ws/orchestrator` in browser console

**Events not appearing?**
- Check server logs: `tail -f logs/server.log`
- Verify Python bridge is emitting: add `print()` in `websocket_bridge.py`
- Check `/api/orchestrator/events` endpoint is receiving POSTs

## 🚢 Production

For production deployment:

1. **Set proper URLs** in environment variables
2. **Use HTTPS/WSS** for WebSocket connections
3. **Add authentication** to WebSocket endpoint
4. **Rate limit** the `/api/orchestrator/events` endpoint
5. **Monitor** WebSocket connection health

## 📚 Learn More

- `web/INTEGRATION.md` — Quick integration reference
- `core/orchestrator_integration_example.py` — Full code example
- `test_dashboard_integration.py` — Test simulation

---

**Built during a 19-hour sprint. Zero mock data. 100% real-time.**
