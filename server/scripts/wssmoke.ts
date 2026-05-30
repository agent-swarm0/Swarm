/** Verifies the real browser path: WS -> :8787 -> orchestrator. */
import WebSocket from "ws";

const ws = new WebSocket("ws://localhost:8787/ws/orchestrator");
const seen = new Set<string>();
let artifacts = 0;

ws.on("open", () => {
  console.log("WS connected → sending session.start");
  ws.send(JSON.stringify({ type: "session.start", goal: "Build a one-page site for a plant shop called Fern & Co" }));
});

ws.on("message", (data: Buffer) => {
  const e = JSON.parse(data.toString());
  if (!seen.has(e.type)) { seen.add(e.type); }
  if (e.type === "agent.dispatched") console.log(`  dispatched ${e.agentSlug}`);
  if (e.type === "artifact.created") { artifacts++; console.log(`  📄 ${e.path}`); }
  if (e.type === "error") console.log(`  ‼ ${e.message}`);
  if (e.type === "session.completed") {
    console.log(`✅ completed via WS — success=${e.success}, artifacts=${artifacts}`);
    console.log("event types seen:", [...seen].join(", "));
    ws.close(); process.exit(0);
  }
});

ws.on("error", (err) => { console.error("WS error:", err.message); process.exit(1); });
setTimeout(() => { console.log("timed out"); process.exit(2); }, 120_000);
