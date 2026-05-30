/**
 * Manual smoke test for the Node-side orchestrator.
 *   cd server && npx tsx scripts/smoke.ts
 * Loads server/.env, subscribes to orchestrator events, runs one session,
 * and prints a compact event log + the files written to project-output/.
 */
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = resolve(__dirname, "..", ".env");
// @ts-ignore - loadEnvFile exists on Node >= 20.12
process.loadEnvFile?.(envPath);

const { orchestratorState } = await import("../src/services/orchestratorState.js");
const { runSession } = await import("../src/services/swarmOrchestrator.js");

const tokenCounts: Record<string, number> = {};
let artifacts = 0;

orchestratorState.onEvent((e: any) => {
  switch (e.type) {
    case "session.started": console.log(`\n▶ session.started — "${e.goal}"`); break;
    case "orchestrator.thinking": console.log("🧠 planning…"); break;
    case "orchestrator.plan": console.log(`📋 plan: [${e.waves.map((w: string[]) => w.join("+")).join("] → [")}]`); break;
    case "wave.start": console.log(`\n🌊 wave ${e.waveNumber}: ${e.agentSlugs.join(", ")}`); break;
    case "agent.dispatched": console.log(`  ⏺ ${e.agentSlug} (${e.department}) via ${e.engine}`); break;
    case "agent.token": tokenCounts[e.agentSlug] = (tokenCounts[e.agentSlug] || 0) + 1; break;
    case "agent.done": console.log(`  ✓ ${e.agentSlug} done — ${tokenCounts[e.agentSlug] || 0} tokens`); break;
    case "agent.error": console.log(`  ✗ ${e.agentSlug} ERROR: ${e.error}`); break;
    case "artifact.created": artifacts++; console.log(`  📄 ${e.path}`); break;
    case "error": console.log(`‼ ERROR: ${e.message}`); break;
    case "session.completed":
      console.log(`\n🏁 completed — success=${e.success}, agents=${e.totalAgents}, artifacts=${artifacts}, ${(e.totalDurationMs / 1000).toFixed(1)}s`);
      process.exit(e.success ? 0 : 1);
  }
});

const goal = process.argv.slice(2).join(" ") ||
  "Build a landing page for a coffee subscription startup called Morning Ritual";
await runSession(goal);

// Safety timeout
setTimeout(() => { console.log("\n⏱ timed out"); process.exit(2); }, 180_000);
