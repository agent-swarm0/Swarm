# ⚡ Dashboard Quick Start

Get the real-time dashboard running in 60 seconds.

## 1. Start Everything

```bash
./start-dashboard.sh
```

This starts:
- Node.js WebSocket server (port 3000)
- Next.js dashboard (port 3001)

## 2. Test It

```bash
python3 test_dashboard_integration.py
```

Open: **http://localhost:3001/dashboard**

You'll see:
- Agents appearing in real-time
- Logs streaming
- Graph animating
- Approval modal (after 5 seconds)

## 3. Use It

The dashboard is now ready. When you run the orchestrator:

```bash
export SWARM_DASHBOARD_ENABLED=true
./bin/swarm "your goal here"
```

The dashboard will sync automatically.

## That's It!

**Full docs:** `DASHBOARD.md`  
**Integration guide:** `INTEGRATION_CHECKLIST.md`  
**Architecture:** `ARCHITECTURE.txt`

---

**Built in 19 hours. Zero mock data. 100% real-time.** 🚀
