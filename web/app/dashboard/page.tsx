"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import OrchestratorGraph from "../components/OrchestratorGraph";

type Status = "idle" | "queued" | "working" | "blocked" | "done";
type Agent = { id: string; role: string; status: Status; action: string; log: string[] };

const ROSTER: Omit<Agent, "status" | "action" | "log">[] = [
  { id: "planner-00", role: "Planner" },
  { id: "research-01", role: "Researcher" },
  { id: "design-02", role: "Designer" },
  { id: "eng-03", role: "Engineer" },
  { id: "qa-04", role: "QA" },
  { id: "ops-05", role: "Ops" },
];

const EXAMPLES = ["ship a landing page + dashboard", "build a REST API with auth", "migrate the database"];

type Step =
  | { t: "agent"; delay: number; id: string; status: Status; action: string }
  | { t: "log"; delay: number; id: string; line: string; artifact?: string }
  | { t: "approval"; id: string; action: string; reason: string; risk: string };

function buildTimeline(goal: string): Step[] {
  return [
    { t: "agent", delay: 200, id: "planner-00", status: "working", action: "Decomposing the goal" },
    { t: "log", delay: 500, id: "planner-00", line: `parsed goal: "${goal}"` },
    { t: "log", delay: 500, id: "planner-00", line: "→ 5 tasks across research, design, eng, qa, ops" },
    { t: "agent", delay: 300, id: "planner-00", status: "done", action: "Plan ready" },
    { t: "agent", delay: 250, id: "research-01", status: "working", action: "Scanning prior art" },
    { t: "agent", delay: 150, id: "design-02", status: "working", action: "Drafting the layout" },
    { t: "agent", delay: 150, id: "eng-03", status: "working", action: "Scaffolding the app" },
    { t: "log", delay: 600, id: "research-01", line: "found 3 reference patterns, picked 1" },
    { t: "log", delay: 500, id: "design-02", line: "grid + type scale set", artifact: "design/tokens.css" },
    { t: "log", delay: 550, id: "eng-03", line: "next app scaffolded", artifact: "app/page.tsx" },
    { t: "agent", delay: 300, id: "research-01", status: "done", action: "Research done" },
    { t: "log", delay: 500, id: "eng-03", line: "wired components + state", artifact: "app/components/*" },
    { t: "agent", delay: 250, id: "design-02", status: "done", action: "Design done" },
    { t: "agent", delay: 200, id: "qa-04", status: "working", action: "Running the test suite" },
    { t: "log", delay: 650, id: "qa-04", line: "24 passed, 0 failed" },
    { t: "agent", delay: 250, id: "eng-03", status: "done", action: "Build done" },
    { t: "agent", delay: 250, id: "qa-04", status: "done", action: "QA green" },
    { t: "agent", delay: 300, id: "ops-05", status: "working", action: "Preparing release" },
    { t: "log", delay: 600, id: "ops-05", line: "build artifact ready" },
    { t: "approval", id: "ops-05", action: "Deploy to PRODUCTION", reason: "release the build to the live environment", risk: "irreversible · affects live users" },
  ];
}

const STATUS_DOT: Record<Status, string> = {
  idle: "bg-line2", queued: "bg-dim", working: "bg-green pulse-dot", blocked: "bg-amber", done: "bg-greenb",
};
const STATUS_TX: Record<Status, string> = {
  idle: "text-dim", queued: "text-dim", working: "text-green", blocked: "text-amber", done: "text-greenb",
};

export default function Dashboard() {
  const seed = (): Agent[] => ROSTER.map((a) => ({ ...a, status: "idle", action: "waiting", log: [] }));
  const [goal, setGoal] = useState("");
  const [phase, setPhase] = useState<"idle" | "running" | "blocked" | "done">("idle");
  const [agents, setAgents] = useState<Agent[]>(seed);
  const [artifact, setArtifact] = useState<string[]>([]);
  const [stream, setStream] = useState<{ id: string; line: string }[]>([]);
  const [approval, setApproval] = useState<{ id: string; action: string; reason: string; risk: string } | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [spotlight, setSpotlight] = useState<string>("planner-00");
  const [view, setView] = useState<"graph" | "floor">("graph");

  const steps = useRef<Step[]>([]);
  const ptr = useRef(0);
  const timers = useRef<number[]>([]);
  const elapsedTimer = useRef<number | null>(null);

  const clearAll = () => { timers.current.forEach(clearTimeout); timers.current = []; if (elapsedTimer.current) { clearInterval(elapsedTimer.current); elapsedTimer.current = null; } };
  useEffect(() => () => clearAll(), []);

  const setAgent = (id: string, patch: Partial<Agent>) => setAgents((as) => as.map((a) => (a.id === id ? { ...a, ...patch } : a)));

  const apply = (s: Step) => {
    if (s.t === "agent") { setAgent(s.id, { status: s.status, action: s.action }); if (s.status === "working") setSpotlight(s.id); }
    else if (s.t === "log") {
      setAgents((as) => as.map((a) => (a.id === s.id ? { ...a, log: [...a.log, s.line].slice(-4) } : a)));
      setStream((st) => [...st, { id: s.id, line: s.line }].slice(-9));
      if (s.artifact) setArtifact((ar) => [...ar, s.artifact!]);
      setSpotlight(s.id);
    }
  };

  const next = () => {
    const list = steps.current;
    if (ptr.current >= list.length) return;
    const s = list[ptr.current];
    if (s.t === "approval") { setApproval({ id: s.id, action: s.action, reason: s.reason, risk: s.risk }); setAgent(s.id, { status: "blocked", action: "Awaiting your approval" }); setPhase("blocked"); setSpotlight(s.id); return; }
    apply(s);
    ptr.current += 1;
    const nx = list[ptr.current];
    const d = nx && "delay" in nx ? nx.delay : 300;
    timers.current.push(window.setTimeout(next, d));
  };

  const run = (g: string) => {
    const text = (g || EXAMPLES[0]).trim();
    setGoal(text); clearAll(); setApproval(null);
    setAgents(seed()); setArtifact([]); setStream([]); setElapsed(0); setPhase("running");
    steps.current = buildTimeline(text); ptr.current = 0;
    elapsedTimer.current = window.setInterval(() => setElapsed((e) => Number((e + 0.1).toFixed(1))), 100);
    timers.current.push(window.setTimeout(next, 250));
  };

  const decide = (ok: boolean) => {
    if (!approval) return;
    const id = approval.id;
    setApproval(null);
    if (ok) {
      setAgent(id, { status: "working", action: "Deploying (approved)" }); setPhase("running");
      setStream((st) => [...st, { id, line: "operator APPROVED deploy → shipping" }].slice(-9));
      timers.current.push(window.setTimeout(() => { setAgent(id, { status: "done", action: "Deployed ✓" }); setArtifact((a) => [...a, "https://app.live ✓ deployed"]); clearAll(); setPhase("done"); }, 1300));
    } else {
      setAgent(id, { status: "blocked", action: "Deploy held by operator" });
      setStream((st) => [...st, { id, line: "operator DENIED deploy → held for review" }].slice(-9));
      timers.current.push(window.setTimeout(() => { setAgent(id, { status: "done", action: "Rerouted: staged" }); setArtifact((a) => [...a, "staged/ (not deployed) ✓"]); clearAll(); setPhase("done"); }, 1100));
    }
  };

  const reset = () => { clearAll(); setPhase("idle"); setGoal(""); setAgents(seed()); setArtifact([]); setStream([]); setApproval(null); setElapsed(0); };

  const spot = agents.find((a) => a.id === spotlight) || agents[0];
  const doneN = agents.filter((a) => a.status === "done").length;

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
            {agents.map((a) => (
              <button key={a.id} onClick={() => setSpotlight(a.id)}
                className={`flex w-full items-center gap-3 rounded-lg border px-3 py-[10px] text-left transition-colors ${spotlight === a.id ? "border-green/40 bg-green/5" : "border-transparent hover:bg-surface"}`}>
                <span className={`h-[8px] w-[8px] shrink-0 rounded-full ${STATUS_DOT[a.status]}`} />
                <span className="min-w-0 flex-1">
                  <span className="block font-mono text-[12px] text-ink">{a.id}</span>
                  <span className={`block truncate font-mono text-[10px] ${STATUS_TX[a.status]}`}>{a.action}</span>
                </span>
              </button>
            ))}
          </div>
        </aside>

        {/* CENTER */}
        <section className="relative bg-bg p-6">
          {/* view toggle */}
          <div className="mb-4 flex items-center justify-between">
            <div className="font-mono text-[10px] uppercase tracking-[2px] text-dim">{view === "graph" ? "Orchestration graph · live" : "The floor"}</div>
            <div className="flex rounded-lg border border-line2 p-[3px] font-mono text-[11px]">
              <button onClick={() => setView("graph")} className={`rounded-md px-3 py-[5px] transition-colors ${view === "graph" ? "bg-green text-white" : "text-ink2 hover:text-ink"}`}>graph</button>
              <button onClick={() => setView("floor")} className={`rounded-md px-3 py-[5px] transition-colors ${view === "floor" ? "bg-green text-white" : "text-ink2 hover:text-ink"}`}>floor</button>
            </div>
          </div>

          {view === "graph" ? (
            <div className="relative overflow-hidden rounded-2xl border border-[#16221a] bg-tbg" style={{ height: 468 }}>
              <OrchestratorGraph agents={agents} active={phase === "running"} />
              <div className="pointer-events-none absolute left-4 top-4 font-mono text-[10px] text-[#6b7d6e]">
                {phase === "idle" ? "idle · awaiting a goal" : phase === "blocked" ? "frozen · approval required" : phase === "done" ? "shipped ✓" : "dispatching…"}
              </div>
              <div className="pointer-events-none absolute bottom-4 right-4 font-mono text-[10px] text-[#6b7d6e]">orchestrator → {agents.length} departments</div>
            </div>
          ) : phase === "idle" ? (
            <div className="flex h-[468px] flex-col items-center justify-center text-center">
              <div className="font-serif text-[clamp(28px,3.4vw,42px)] italic text-ink tracking-[-.5px]">The floor is quiet.</div>
              <p className="mt-3 max-w-[42ch] text-[15px] text-ink2">Give the swarm a goal above and watch your workforce coordinate, in parallel, in real time.</p>
            </div>
          ) : (
            <>
              <div className="rounded-xl border border-line2 bg-surface p-6 shadow-[0_24px_50px_-44px_rgba(10,40,20,.4)]">
                <div className="flex items-center justify-between">
                  <div className="font-mono text-[11px] text-dim">spotlight</div>
                  <div className={`flex items-center gap-2 font-mono text-[11px] ${STATUS_TX[spot.status]}`}>
                    <span className={`h-[7px] w-[7px] rounded-full ${STATUS_DOT[spot.status]}`} />{spot.status}
                  </div>
                </div>
                <div className="mt-2 font-serif text-[clamp(30px,3.6vw,44px)] tracking-[-.6px] text-ink">{spot.role}</div>
                <div className="font-mono text-[13px] text-green">{spot.action}</div>
                <div className="mt-4 space-y-1">
                  {spot.log.length === 0 ? <div className="font-mono text-[12px] text-dim">…</div> :
                    spot.log.map((l, i) => <div key={i} className="font-mono text-[12px] text-ink2">› {l}</div>)}
                </div>
              </div>
              <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
                {agents.map((a) => (
                  <div key={a.id} onClick={() => setSpotlight(a.id)}
                    className={`cursor-pointer rounded-lg border p-3 transition-colors ${a.id === spotlight ? "border-green/40 bg-green/5" : "border-line bg-surface hover:bg-bg3"}`}>
                    <div className="flex items-center gap-2">
                      <span className={`h-[7px] w-[7px] rounded-full ${STATUS_DOT[a.status]}`} />
                      <span className="font-mono text-[11px] text-ink">{a.role}</span>
                    </div>
                    <div className={`mt-2 truncate font-mono text-[10px] ${STATUS_TX[a.status]}`}>{a.action}</div>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* live stream — under both views while active */}
          {phase !== "idle" && (
            <div className="mt-5 rounded-lg border border-line bg-tbg p-4">
              <div className="mb-2 font-mono text-[10px] uppercase tracking-[2px] text-[#6b7d6e]">live stream</div>
              <div className="space-y-[3px]">
                {stream.length === 0 ? <div className="font-mono text-[12px] text-[#6b7d6e]">awaiting agent output…</div> :
                  stream.map((s, i) => (
                    <div key={i} className="font-mono text-[12px] text-[#cdd8ce]"><span className="text-mint">{s.id}</span> <span className="text-[#5f7a66]">›</span> {s.line}</div>
                  ))}
              </div>
            </div>
          )}

          {/* GOVERNANCE */}
          {approval && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-bg/70 p-6 backdrop-blur-sm">
              <div className="w-full max-w-[460px] overflow-hidden rounded-2xl border-2 border-amber bg-surface shadow-[0_40px_80px_-40px_rgba(120,80,10,.5)]">
                <div className="flex items-center gap-2 border-b border-line bg-amber/10 px-5 py-3 font-mono text-[12px] text-amber">
                  <span className="h-[8px] w-[8px] rounded-full bg-amber pulse-dot" /> swarm frozen · approval required
                </div>
                <div className="p-6">
                  <div className="font-mono text-[11px] text-dim">{approval.id} wants to</div>
                  <div className="mt-1 font-serif text-[28px] tracking-[-.4px] text-ink">{approval.action}</div>
                  <p className="mt-2 text-[14px] text-ink2">{approval.reason}</p>
                  <div className="mt-3 inline-flex items-center gap-2 rounded border border-amber/40 bg-amber/10 px-2 py-1 font-mono text-[11px] text-amber">⚠ {approval.risk}</div>
                  <div className="mt-6 flex gap-3">
                    <button onClick={() => decide(true)} className="flex-1 rounded-lg bg-green px-4 py-3 font-mono text-[13px] text-white transition-all hover:-translate-y-px">Approve</button>
                    <button onClick={() => decide(false)} className="flex-1 rounded-lg border border-line2 px-4 py-3 font-mono text-[13px] text-ink transition-colors hover:border-amber hover:text-amber">Deny</button>
                  </div>
                  <div className="mt-3 text-center font-mono text-[10px] text-dim">the swarm holds until you decide</div>
                </div>
              </div>
            </div>
          )}
        </section>

        {/* OUTPUT */}
        <aside className="bg-bg p-5">
          <div className="mb-4 font-mono text-[10px] uppercase tracking-[2px] text-dim">Output</div>
          {artifact.length === 0 ? (
            <div className="rounded-lg border border-dashed border-line2 p-5 text-center font-mono text-[11px] text-dim">files appear here as the swarm builds</div>
          ) : (
            <div className="space-y-1">
              {artifact.map((f, i) => (
                <div key={i} className="flex items-center gap-2 rounded-md border border-line bg-surface px-3 py-2 font-mono text-[11px] text-ink2">
                  <span className="text-greenb">✓</span> <span className="truncate">{f}</span>
                </div>
              ))}
            </div>
          )}
          {phase === "done" && (
            <div className="mt-5 rounded-lg border border-green/30 bg-green/5 p-4 text-center">
              <div className="font-serif text-[22px] italic text-green">Shipped.</div>
              <div className="mt-1 font-mono text-[11px] text-ink2">{elapsed.toFixed(1)}s · {agents.length} agents · {artifact.length} artifacts</div>
              <button onClick={reset} className="mt-3 font-mono text-[11px] text-green hover:underline">run another →</button>
            </div>
          )}
        </aside>
      </div>
    </main>
  );
}
