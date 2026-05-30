# Deploying the SWARM backend

The backend is a stateless Express + WebSocket service. It binds `PORT`/`HOST`
from the environment, serves `/health` for probes, and needs no database. Below
are three deploy paths. **API keys are sent per-request by the dashboard**, so
you do **not** set provider keys on the server.

## Environment variables

| Var | Required | Default | Notes |
| --- | --- | --- | --- |
| `PORT` | platform-set | 8787 | Most platforms inject this. |
| `HOST` | no | 0.0.0.0 | Keep 0.0.0.0 in containers. |
| `NODE_ENV` | yes | development | Set `production`. |
| `CORS_ORIGINS` | yes | http://localhost:3000 | Your deployed dashboard origin(s), comma-separated. |
| `TRUST_PROXY_HOPS` | yes | 1 | Number of proxies in front (Railway/Render = 1). Never `true`. |
| `RATE_LIMIT_WINDOW_MS` | no | 60000 | Rate-limit window. |
| `RATE_LIMIT_MAX` | no | 120 | Max requests/window per IP on `/api/*`. |
| `SWARM_CONCURRENCY_CAP` | no | config (5) | Max concurrent runs; excess queued. |
| `SWARM_CONFIG_PATH` | no | repo-root resolve | Only needed if the layout differs (e.g. Docker sets it). |

The agent registry (`swarm.config.json`) and prompts (`agents/`) live at the
repo root and are resolved relative to the app's own file location.

## Option A — Render (blueprint)

A `render.yaml` blueprint is committed at the repo root.

1. Render → **New** → **Blueprint** → pick this repo.
2. It creates a `web` service with `rootDir: server`, build `npm ci && npm run build`, start `npm start`, health check `/health`.
3. Set `CORS_ORIGINS` to your dashboard URL.
4. Deploy. WebSockets work on Render's default web service (same origin/port).

## Option B — Railway

1. New Project → Deploy from repo.
2. Set the service **Root Directory** to `server`.
3. Build: `npm ci && npm run build` · Start: `npm start`.
4. Add env vars from the table (`NODE_ENV=production`, `CORS_ORIGINS=…`, `TRUST_PROXY_HOPS=1`).
5. Railway assigns `PORT` automatically. WebSockets are supported on the same domain.

## Option C — Docker (any host)

The Dockerfile bundles `swarm.config.json` + `agents/`, so **build from the repo root**:

```bash
docker build -f server/Dockerfile -t swarm-server .
docker run -p 8787:8787 \
  -e NODE_ENV=production \
  -e CORS_ORIGINS=https://your-dashboard.example \
  swarm-server
```

## Post-deploy checklist

- [ ] `GET https://<host>/health` → `200 {"status":"ok"}`
- [ ] `GET https://<host>/api/status` → providers/queue/ws block
- [ ] `GET https://<host>/api/agents` → ~241 agents (confirms config bundled)
- [ ] WS connects: `wss://<host>/ws/stream?requestId=test` → `welcome` frame
- [ ] Dashboard `API_BASE_URL` / `WS_URL` point at the deployed host
- [ ] `CORS_ORIGINS` includes the dashboard origin (no CORS errors in console)

## Notes

- **WSS**: once behind TLS, the dashboard must use `wss://` (not `ws://`).
- The service is stateless (in-memory run registry); horizontal scaling would
  split WS rooms across instances — fine for a single instance / demo.
