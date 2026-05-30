# Dashboard ↔ Orchestrator Integration

Real-time sync between Python orchestrator and web dashboard via WebSocket.

## Quick Start

```bash
# Terminal 1: Node server
cd server && npm run dev

# Terminal 2: Dashboard
cd web && npm run dev

# Terminal 3: Run orchestrator
export SWARM_DASHBOARD_ENABLED=true
./bin/swarm "your goal here"
```

Dashboard: `http://localhost:3001/dashboard`

## Integration Points

**Python → Node.js**: HTTP POST to `/api/orchestrator/events`  
**Node.js → Browser**: WebSocket at `/ws/orchestrator`  
**Browser → Node.js**: WebSocket commands (start/stop/approve)

## Python Usage

```python
from core.websocket_bridge import get_bridge

bridge = get_bridge()
bridge.session_started("sess_123", "build a landing page")
bridge.agent_updated("planner-00", "Planner", "strategy", "working", "Planning")
bridge.log_entry("planner-00", "Created 5 tasks", artifact="plan.md")
bridge.approval_requested("appr_001", "ops-05", "Deploy to prod", "Ship it", "high")
bridge.session_completed(success=True, duration=45.2)
```

## Events

- `session.started` - New session
- `agent.updated` - Agent status change
- `log.entry` - Agent log
- `artifact.created` - File created
- `approval.requested` - Needs approval
- `session.completed` - Done
