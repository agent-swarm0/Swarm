"use client";
 
import { useState } from "react";
import Link from "next/link";
import OrchestratorGraph from "../components/OrchestratorGraph";
import ThoughtStream from "../components/ThoughtStream";
import AgentAnatomy from "../components/AgentAnatomy";
import WorkTimeline from "../components/WorkTimeline";
import GoalDecomposition from "../components/GoalDecomposition";
import AgentDrawer from "../components/AgentDrawer";
import { useOrchestrator } from "../../src/hooks/useOrchestrator";
 
const EXAMPLES = ["ship a landing page + dashboard", "build a REST API with auth", "migrate the database"];
 
const STATUS_DOT: Record<string, string> = {
  idle: "bg-line2", queued: "bg-dim", working: "bg-green pulse-dot", blocked: "bg-amber", done: "bg-greenb", error: "bg-red",
};
const STATUS_TX: Record<string, string> = {
  idle: "text-dim", queued: "text-dim", working: "text-green", blocked: "text-amber", done: "text-greenb", error: "text-red",
};
 
export default function Dashboard() {
  const [goal, setGoal] = useState("");
  const [spotlight, setSpotlight] = useState<string>("");
  const [view, setView] = useState<"graph" | "floor" | "plan">("graph");
  const [drawerAgent, setDrawerAgent] = useState<string | null>(null);
  
  const wsUrl = typeof window !== "undefined" 
    ? `ws://${window.location.hostname}:8787/ws/orchestrator`
    : "ws://localhost:8787/ws/orchestrator";
  
  const { agents, logs, artifacts, approval, phase, elapsed, startSession, respondToApproval, orchestrator, dispatchEvents } = useOrchestrator(wsUrl);
 
  const run = (g: string) => {
    const text = (g || EXAMPLES[0]).trim();
    setGoal(text);
    startSession(text);
  };
 
  const reset = () => {
    setGoal("");
  };
 
  const spot = agents.find((a) => a.id === spotlight);
  const doneN = agents.filter((a) => a.status === "done").length;
  const stream = logs.slice(-9).map((l) => ({ id: l.agentId, line: l.message }));
 
  return (
    <main className="min-h-screen">
      {/* TOP BAR */}
      <div className="sticky top-0 z-40 border-b border-line bg-bg/80 backdrop-blur-xl">
        <div className="mx-auto flex h-[64px] max-w-[1280px] items-center justify-between px-6">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-[9px] font-mono text-[17px] tracking-wide">
              <span className="pulse-dot h-2 w-2 rounded-full bg-greenb shadow-[0_0_9px_var(--color-greenb)]" />
              swar<b className="font-medium text-green">m</b>
            </Link>
            <span className="rounded border border-line2 px-2 py-[3px] font-mono text-[10px] uppercase tracking-wider text-dim">console</span>
          </div>
          <div className="flex items-center gap-4 font-mono text-[11px] text-ink2">
            <span className={`flex items-center gap-2 ${phase === "blocked" ? "text-amber" : phase === "running" ? "text-green" : phase === "done" ? "text-greenb" : "text-dim"}`}>
              <span className={`h-[7px] w-[7px] rounded-full ${phase === "running" ? "bg-green pulse-dot" : phase === "blocked" ? "bg-amber pulse-dot" : phase === "done" ? "bg-greenb" : "bg-dim"}`} />
              {phase === "idle" ? "ready" : phase === "running" ? "orchestrating" : phase === "blocked" ? "awaiting approval" : "shipped"}
            </span>
            <span className="text-dim">{elapsed.toFixed(1)}s</span>
            <span className="text-dim">{doneN}/{agents.length}</span>
          </div>
        </div>
      </div>
 
      {/* COMMAND BAR */}
      <div className="border-b border-line bg-surface/50">
        <div className="mx-auto max-w-[1280px] px-6 py-5">
          <div className="flex w-full items-center gap-3 rounded-xl border border-line2 bg-surface px-4 py-3 shadow-[0_20px_44px_-40px_rgba(10,40,20,.5)] focus-within:border-green">
            <span className="font-mono text-[15px] text-green">$</span>
            <span className="font-mono text-[14px] text-dim">swarm run</span>
            <input
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && phase !== "running") run(goal); }}
              placeholder="give the swarm a goal…"
              disabled={phase === "running" || phase === "blocked"}
              className="min-w-0 flex-1 bg-transparent font-mono text-[14px] text-ink outline-none placeholder:text-dim"
            />
            {phase === "idle" || phase === "done" ? (
              <button onClick={() => run(goal)} className="shrink-0 rounded-lg bg-green px-5 py-2 font-mono text-[13px] text-white transition-all hover:-translate-y-px hover:shadow-[0_12px_24px_-12px_var(--color-green)]">dispatch →</button>
            ) : (
              <button onClick={reset} className="shrink-0 rounded-lg border border-line2 px-5 py-2 font-mono text-[13px] text-ink2 transition-colors hover:border-amber hover:text-amber">stop</button>
            )}
          </div>
          {phase === "idle" && (
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className="font-mono text-[11px] text-dim">try</span>
              {EXAMPLES.map((ex) => (
                <button key={ex} onClick={() => run(ex)} className="rounded-full border border-line2 px-3 py-[5px] font-mono text-[11px] text-ink2 transition-all hover:border-green hover:text-green">{ex}</button>
              ))}
            </div>
          )}
        </div>
      </div>
 
      {/* FLOOR */}
      <div className="mx-auto grid max-w-[1280px] grid-cols-1 gap-px bg-line lg:grid-cols-[260px_1fr_320px]">
        {/* ROSTER */}
        <aside className="bg-bg p-5">
          <div className="mb-4 font-mono text-[10px] uppercase tracking-[2px] text-dim">The roster</div>
          <div className="space-y-1">
            {agents.length === 0 ? (
              <div className="text-center py-8 text-dim font-mono text-[11px]">agents will appear here</div>
            ) : (
              agents.map((a) => (
                <button key={a.id} onClick={() => { setSpotlight(a.id); setDrawerAgent(a.id); }}
                  className={`flex w-full items-center gap-3 rounded-lg border px-3 py-[10px] text-left transition-colors ${spotlight === a.id ? "border-green/40 bg-green/5" : "border-transparent hover:bg-surface"}`}>
                  <span className={`h-[8px] w-[8px] shrink-0 rounded-full ${STATUS_DOT[a.status]}`} />
                  <span className="min-w-0 flex-1">
                    <span className="block font-mono text-[12px] text-ink">{a.id}</span>
                    <span className={`block truncate font-mono text-[10px] ${STATUS_TX[a.status]}`}>{a.action}</span>
                  </span>
                </button>
              ))
            )}
          </div>
        </aside>
 
        {/* CENTER */}
        <section className="relative bg-bg p-6">
          <div className="mb-4 flex items-center justify-between">
            <div className="font-mono text-[10px] uppercase tracking-[2px] text-dim">
              {view === "graph" ? "Orchestration graph · live" : view === "plan" ? "Goal Decomposition" : "The floor"}
            </div>
            <div className="flex rounded-lg border border-line2 p-[3px] font-mono text-[11px]">
              <button onClick={() => setView("graph")} className={`rounded-md px-3 py-[5px] transition-colors ${view === "graph" ? "bg-green text-white" : "text-ink2 hover:text-ink"}`}>graph</button>
              <button onClick={() => setView("plan")} className={`rounded-md px-3 py-[5px] transition-colors ${view === "plan" ? "bg-green text-white" : "text-ink2 hover:text-ink"}`}>plan</button>
              <button onClick={() => setView("floor")} className={`rounded-md px-3 py-[5px] transition-colors ${view === "floor" ? "bg-green text-white" : "text-ink2 hover:text-ink"}`}>floor</button>
            </div>
          </div>
 
          {view === "graph" ? (
            <div className="relative overflow-hidden rounded-2xl border border-[#16221a] bg-tbg" style={{ height: 468 }}>
              <OrchestratorGraph 
                agents={agents} 
                active={phase === "running"} 
                orchestrator={orchestrator} 
                dispatchEvents={dispatchEvents}
              />
              <div className="pointer-events-none absolute left-4 top-4 font-mono text-[10px] text-[#6b7d6e]">
                {phase === "idle" ? "idle · awaiting a goal" : phase === "blocked" ? "frozen · approval required" : phase === "done" ? "shipped ✓" : "dispatching…"}
              </div>
              <div className="pointer-events-none absolute bottom-4 right-4 font-mono text-[10px] text-[#6b7d6e]">orchestrator → {agents.length} departments</div>
            </div>
          ) : view === "plan" ? (
            <div className="relative overflow-hidden rounded-2xl border border-line bg-tbg" style={{ height: 468 }}>
              <GoalDecomposition plan={orchestrator.plan} />
            </div>
          ) : phase === "idle" ? (
            <div className="flex h-[468px] flex-col items-center justify-center text-center">
              <div className="font-serif text-[clamp(28px,3.4vw,42px)] italic text-ink tracking-[-.5px]">The floor is quiet.</div>
              <p className="mt-3 max-w-[42ch] text-[15px] text-ink2">Give the swarm a goal above and watch your workforce coordinate, in parallel, in real time.</p>
            </div>
          ) : spot ? (
            <div className="grid h-[468px] grid-cols-2 gap-4">
               <div className="rounded-xl border border-line2 bg-surface shadow-[0_24px_50px_-44px_rgba(10,40,20,.4)] overflow-hidden">
                  <ThoughtStream agent={spot} />
               </div>
               <div className="rounded-xl border border-line2 bg-surface shadow-[0_24px_50px_-44px_rgba(10,40,20,.4)] overflow-hidden">
                  <AgentAnatomy agent={spot} logs={logs} />
               </div>
            </div>
          ) : null}
 
          {phase !== "idle" && stream.length > 0 && (
            <div className="mt-5 rounded-lg border border-line bg-tbg p-4">
              <div className="mb-2 font-mono text-[10px] uppercase tracking-[2px] text-[#6b7d6e]">live stream</div>
              <div className="space-y-[3px]">
                {stream.map((s, i) => (
                  <div key={i} className="font-mono text-[12px] text-[#cdd8ce]"><span className="text-mint">{s.id}</span> <span className="text-[#5f7a66]">›</span> {s.line}</div>
                ))}
              </div>
            </div>
          )}
 
          {approval && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-bg/70 p-6 backdrop-blur-sm">
              <div className="w-full max-w-[460px] overflow-hidden rounded-2xl border-2 border-amber bg-surface shadow-[0_40px_80px_-40px_rgba(120,80,10,.5)]">
                <div className="flex items-center gap-2 border-b border-line bg-amber/10 px-5 py-3 font-mono text-[12px] text-amber">
                  <span className="h-[8px] w-[8px] rounded-full bg-amber pulse-dot" /> swarm frozen · approval required
                </div>
                <div className="p-6">
                  <div className="font-mono text-[11px] text-dim">{approval.agentId} wants to</div>
                  <div className="mt-1 font-serif text-[28px] tracking-[-.4px] text-ink">{approval.action}</div>
                  <p className="mt-2 text-[14px] text-ink2">{approval.reason}</p>
                  <div className="mt-3 inline-flex items-center gap-2 rounded border border-amber/40 bg-amber/10 px-2 py-1 font-mono text-[11px] text-amber">⚠ {approval.risk}</div>
                  <div className="mt-6 flex gap-3">
                    <button onClick={() => respondToApproval(approval.id, true)} className="flex-1 rounded-lg bg-green px-4 py-3 font-mono text-[13px] text-white transition-all hover:-translate-y-px">Approve</button>
                    <button onClick={() => respondToApproval(approval.id, false)} className="flex-1 rounded-lg border border-line2 px-4 py-3 font-mono text-[13px] text-ink transition-colors hover:border-amber hover:text-amber">Deny</button>
                  </div>
                  <div className="mt-3 text-center font-mono text-[10px] text-dim">the swarm holds until you decide</div>
                </div>
              </div>
            </div>
          )}
        </section>
 
        {/* OUTPUT */}
        <aside className="bg-bg p-5">
          <div className="mb-4 font-mono text-[10px] uppercase tracking-[2px] text-dim">Timeline</div>
          {logs.length === 0 ? (
            <div className="rounded-lg border border-dashed border-line2 p-5 text-center font-mono text-[11px] text-dim">no activity yet</div>
          ) : (
            <WorkTimeline logs={logs} />
          )}
          {phase === "done" && (
            <div className="mt-5 rounded-lg border border-green/30 bg-green/5 p-4 text-center">
              <div className="font-serif text-[22px] italic text-green">Shipped.</div>
              <div className="mt-1 font-mono text-[11px] text-ink2">{elapsed.toFixed(1)}s · {agents.length} agents · {artifacts.length} artifacts</div>
              <button onClick={reset} className="mt-3 font-mono text-[11px] text-green hover:underline">run another →</button>
            </div>
          )}
        </aside>
      </div>
 
      {/* AGENT DRAWER */}
      {drawerAgent && (
        <AgentDrawer 
          agentId={drawerAgent} 
          agents={agents} 
          logs={logs} 
          onClose={() => setDrawerAgent(null)} 
        />
      )}
    </main>
  );
}
