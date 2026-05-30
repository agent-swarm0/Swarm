# SWARM Backend — Architecture

> Sprint 1 foundation. This document is the source of truth for the `server/`
> package: what it is, how it is laid out, and the rules every later commit
> must follow.

## 1. What this is

An **isolated Express + TypeScript** backend that powers SWARM's **API mode** —
where a user (or the dashboard) supplies a provider API key per request and the
server calls the provider directly over HTTP, streaming output back over a
WebSocket. No local CLI agent installation is required for API mode.

It is deliberately **separate from**:

- the **Python orchestrator** (`orchestrator.py`, `recovery/…`, `core/`,
  `engines/`) — the existing CLI-mode engine. The backend does **not** modify
  it. A future CLI-mode bridge will *spawn* it (with `PYTHONIOENCODING=utf-8`
  to avoid the Windows console crash), but that is out of scope here.
- the **vendor TypeScript tree** (`src/`, `dist/` at the repo root) — a large
  Claude Code clone that backs the `swarm` npm CLI. The backend never imports
  from or edits it.

All Sprint 1 backend work lives under `server/` and nowhere else.

## 2. Package manager

**npm only.** The repo root already commits a `package-lock.json`; using a
single PM across the repo avoids mixed lockfiles and contributor friction. No
`pnpm-lock.yaml` / `bun.lock` is created here.

## 3. Directory layout

```text
server/
├─ src/
│  ├─ index.ts          # HTTP bootstrap + graceful shutdown (entry point)
│  ├─ app.ts            # Express app factory (testable, no port binding)
│  ├─ config.ts         # env-driven config (loads .env, no hardcoded secrets)
│  ├─ routes/           # HTTP routes
│  │  ├─ index.ts       #   route aggregation
│  │  ├─ health.ts      #   GET /health
│  │  └─ status.ts      #   GET /api/status
│  ├─ providers/        # API-mode provider adapters
│  │  ├─ types.ts       #   ProviderAdapter interface (defined day one)
│  │  └─ index.ts       #   provider registry (empty until adapters land)
│  ├─ services/         # process-level state / business logic
│  │  └─ runRegistry.ts #   requestId-keyed run tracking (in-memory)
│  ├─ websocket/        # WebSocket layer
│  │  └─ protocol.ts    #   versioned message protocol (v=1)
│  ├─ middleware/       # Express middleware
│  │  ├─ requestId.ts   #   assigns/propagates x-request-id + child logger
│  │  └─ errorHandler.ts#   404 + terminal error handler (no stack traces out)
│  ├─ types/            # shared domain types
│  │  └─ index.ts       #   ProviderName, RunMode, RunState
│  └─ utils/            # leaf helpers
│     ├─ logger.ts      #   structured NDJSON logger
│     └─ ids.ts         #   requestId generation
└─ test/
   └─ smoke.test.ts     # boots app, asserts /health + /api/status = 200
```

## 4. Core decisions & invariants

| Rule | Where enforced |
| --- | --- |
| **No hardcoded API keys.** Keys come from env or per-request only. | `config.ts` (keys never required server-side), `.env.example` |
| **Environment variables only** for configuration. | `config.ts` |
| **Every request/run is traceable by `requestId`.** Inbound `x-request-id` is honoured or a new id minted; echoed in the response header and bound to a child logger. | `middleware/requestId.ts`, `utils/ids.ts` |
| **`ProviderAdapter` defined from day one.** Uniform `run()` contract yielding normalised stream events. | `providers/types.ts` |
| **WebSocket messages are versioned.** Every frame carries `v` and `type`; raw strings are never sent. Current version: `1`. | `websocket/protocol.ts` |
| **No stack traces to clients.** Errors are logged server-side; clients get a human-readable message. | `middleware/errorHandler.ts` |
| **Structured logging only.** No bare `console.log` in app paths. | `utils/logger.ts` |
| **App/server split.** `app.ts` builds the app; `index.ts` binds the port — so tests run portless or on an ephemeral port. | `app.ts`, `index.ts`, `test/smoke.test.ts` |

## 5. Request lifecycle (current)

```text
client ──HTTP──► [cors] ─► [json] ─► [requestId] ─► route ─► json response
                                          │                     ▲
                                          └─ child logger ──────┘
                              (404 + error handler terminate the chain)
```

## 6. Run lifecycle (live)

```text
POST /api/run {goal, provider, apiKey, agentSlug?}
   └─ zod validate ─► runRegistry.createRun(requestId) ─► 202 {requestId, stream}
       └─ startRun (fire-and-forget)
           └─ getProvider(name) + getAgentSystemPrompt(agentSlug)
               └─ adapter.run() yields {token|done|error}
                   └─ hub.publish(requestId, frame) ─► buffered + fanned out to
                      clients on ws://…/ws/stream?requestId=…  (late joiners get replay)
```

The API key is passed to the adapter per-request and is never stored on the run
record or logged.

## 7. Endpoints

| Method | Path | Status | Purpose |
| --- | --- | --- | --- |
| GET | `/health` | ✅ live | Liveness probe for deploy platforms. |
| GET | `/api/status` | ✅ live | Mode, providers (supported/registered), run counts, WS rooms/clients, WS protocol version, uptime. |
| GET | `/api/agents` | ✅ live | Agent catalog from `swarm.config.json` (doc-files filtered); `?category=` filter. |
| POST | `/api/run` | ✅ live | Validate (zod) → register run → 202 `{requestId, stream}`; dispatch streams over WS. |
| GET | `/api/run/:requestId` | ✅ live | Poll a run's state. |
| WS | `/ws/stream?requestId=` | ✅ live | Versioned frames for a run (welcome → token… → done/error); buffered replay for late joiners. |

### Provider adapters

| Provider | Status |
| --- | --- |
| OpenAI | ✅ streaming + error mapping |
| Anthropic / Gemini / Groq | ⏳ interface ready; adapters land next (other owners) |

## 8. Local development

```bash
cd server
cp .env.example .env      # optional; sensible defaults apply without it
npm install
npm run dev               # nodemon + tsx, watches src/
npm test                  # node built-in test runner (smoke test)
npm run typecheck         # tsc --noEmit
npm run build && npm start# compiled production run
```

Defaults: `PORT=8787`, CORS allows `http://localhost:3000` (Next.js dev).
