"use client";

import { useEffect, useRef, useState } from "react";

type Status = "queued" | "running" | "done";
type Row = { id: string; task: string; status: Status };

const POOL: { id: string; task: string }[] = [
  { id: "planner-00", task: "Decomposing the goal" },
  { id: "research-01", task: "Scanning the space" },
  { id: "design-02", task: "Crafting the UI" },
  { id: "eng-03", task: "Writing the code" },
  { id: "writer-04", task: "Drafting the copy" },
  { id: "ops-05", task: "Deploying" },
];
const EXAMPLES = ["ship a landing page", "build a dashboard", "write launch copy"];

const FEATURES = [
  ["01", "245+ AI employees", "Pre-trained specialists for code, design, writing, ops, and research. Hire them on demand."],
  ["02", "Parallel orchestration", "Dispatch 10, 20, or 100 agents at once, all aimed at a single goal."],
  ["03", "Engine-agnostic", "Claude, Gemini, OpenAI, Groq, or local models. No lock-in, ever."],
  ["04", "Built-in tooling", "Bash, file edits, git, grep, glob. Your agents come fully equipped."],
  ["05", "Your machine, your keys", "Runs locally. Nothing sits between you and your models."],
  ["06", "Composable workflows", "Chain agents into reliable, production-grade pipelines."],
];

export default function Home() {
  const [goal, setGoal] = useState("");
  const [phase, setPhase] = useState<"idle" | "running" | "done">("idle");
  const [rows, setRows] = useState<Row[]>(POOL.slice(0, 6).map((a) => ({ ...a, status: "queued" })));
  const [field, setField] = useState<string[]>(() => Array(182).fill(""));
  const [live, setLive] = useState(0);
  const [elapsed, setElapsed] = useState(0);

  const phaseRef = useRef(phase);
  phaseRef.current = phase;
  const timers = useRef<number[]>([]);
  const tRef = useRef(0);

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const COLS = 26, ROWS = 7, CX = (COLS - 1) / 2, CY = (ROWS - 1) / 2;
    const fieldTick = () => {
      tRef.current += 1;
      const t = tRef.current * 0.5;
      const surge = phaseRef.current === "running";
      let on = 0;
      const next = Array.from({ length: COLS * ROWS }, (_, i) => {
        const x = i % COLS, y = Math.floor(i / COLS);
        const d = Math.sqrt((x - CX) ** 2 + ((y - CY) * 2.1) ** 2);
        const w = Math.sin(d * 0.5 - t * 0.85);
        const onT = surge ? 0.2 : 0.6;
        const warmT = surge ? -0.5 : 0.1;
        if (w > onT) { on++; return "on"; }
        if (w > warmT) return "warm";
        return "";
      });
      setField(next);
      setLive(surge ? 184 + (on % 60) : on * 2 + 8);
    };
    fieldTick();
    const fi = !reduce ? window.setInterval(fieldTick, 110) : 0;

    const io = new IntersectionObserver(
      (es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } }),
      { threshold: 0.12 }
    );
    document.querySelectorAll(".reveal").forEach((el) => io.observe(el));

    if (reduce) { setField(Array.from({ length: 182 }, () => (Math.random() < 0.28 ? "on" : ""))); setLive(240); }

    return () => { if (fi) clearInterval(fi); io.disconnect(); clearTimers(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const clearTimers = () => { timers.current.forEach((t) => clearTimeout(t)); timers.current = []; };

  const run = (g: string) => {
    const text = (g || "ship a landing page").trim();
    setGoal(text); clearTimers(); setElapsed(0); setPhase("running");
    setRows(POOL.slice(0, 6).map((a) => ({ ...a, status: "queued" })));

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) { setRows(POOL.slice(0, 6).map((a) => ({ ...a, status: "done" }))); setPhase("done"); setElapsed(4.2); return; }

    const startAt = 260, runGap = 230, doneStart = 1300, doneGap = 360;
    POOL.slice(0, 6).forEach((_, i) => {
      timers.current.push(window.setTimeout(() => setRows((rs) => rs.map((r, j) => (j === i ? { ...r, status: "running" } : r))), startAt + i * runGap));
      timers.current.push(window.setTimeout(() => setRows((rs) => rs.map((r, j) => (j === i ? { ...r, status: "done" } : r))), doneStart + i * doneGap));
    });
    const total = doneStart + 5 * doneGap + 500;
    let e = 0;
    const ei = window.setInterval(() => { e += 0.1; setElapsed(Number(e.toFixed(1))); }, 100);
    timers.current.push(ei as unknown as number);
    timers.current.push(window.setTimeout(() => { clearInterval(ei); setPhase("done"); setElapsed(4.2); }, total));
  };

  const reset = () => { clearTimers(); setPhase("idle"); setGoal(""); setElapsed(0); setRows(POOL.slice(0, 6).map((a) => ({ ...a, status: "queued" }))); };

  const copy = (text: string, e: React.MouseEvent<HTMLButtonElement>) => {
    navigator.clipboard?.writeText(text);
    const b = e.currentTarget, o = b.textContent;
    b.textContent = "copied ✓";
    setTimeout(() => { b.textContent = o; }, 1500);
  };

  const doneCount = rows.filter((r) => r.status === "done").length;

  return (
    <main className="overflow-x-hidden">
      {/* NAV */}
      <nav className="sticky top-0 z-50 border-b border-line bg-bg/70 backdrop-blur-xl">
        <div className="mx-auto flex h-[72px] max-w-[1180px] items-center justify-between px-8">
          <div className="flex items-center gap-[9px] font-mono text-[18px] tracking-wide">
            <span className="pulse-dot h-2 w-2 rounded-full bg-greenb shadow-[0_0_9px_var(--color-greenb)]" />
            swar<b className="font-medium text-green">m</b>
          </div>
          <div className="flex items-center gap-7">
            <a href="#features" className="hidden font-mono text-xs text-ink2 transition-colors hover:text-ink sm:inline">Features</a>
            <a href="#start" className="hidden font-mono text-xs text-ink2 transition-colors hover:text-ink sm:inline">Install</a>
            <a href="https://github.com/Anasabubakar/agent-swarm" target="_blank" rel="noopener noreferrer" className="hidden font-mono text-xs text-ink2 transition-colors hover:text-ink sm:inline">GitHub ↗</a>
            <a href="/dashboard" className="rounded bg-ink px-[18px] py-[10px] font-mono text-xs text-bg transition-all hover:-translate-y-px hover:bg-green">Get started</a>
          </div>
        </div>
      </nav>

      {/* HERO: text on the left, interactive console card on the right */}
      <header className="relative overflow-hidden pt-[100px] pb-[72px]">
        <div className="aurora"><span className="blob b1" /><span className="blob b2" /><span className="blob b3" /></div>
        <div className="pointer-events-none absolute inset-0 z-[1] bg-gradient-to-b from-bg/25 via-bg/5 to-bg/80" />

        <div className="relative z-[2] mx-auto grid max-w-[1180px] grid-cols-1 items-center gap-12 px-8 lg:grid-cols-[1.04fr_.96fr]">
          {/* LEFT: the words */}
          <div>
            <div className="mb-6 inline-flex items-center gap-[10px] font-mono text-[11px] uppercase tracking-[2.5px] text-green">
              <span className="pulse-dot h-[7px] w-[7px] rounded-full bg-greenb shadow-[0_0_9px_var(--color-greenb)]" />
              Engine-agnostic multi-agent orchestration
            </div>
            <h1 className="max-w-[15ch] font-serif text-[clamp(48px,6.4vw,86px)] leading-[.95] tracking-[-1.5px]">
              Become the CEO of an <em className="italic text-green">AI company.</em>
            </h1>
            <p className="mt-6 max-w-[52ch] text-[clamp(16px,1.4vw,19px)] leading-[1.6] text-ink2">
              Swarm is your autonomous AI workforce. Describe a goal and it hires the right specialists, engineers, designers, researchers, ops, and runs hundreds of them in parallel until the work ships. You set direction. They do the work.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-[13px]">
              <a href="/dashboard" className="rounded bg-green px-7 py-[15px] font-mono text-[13px] text-white transition-all hover:-translate-y-0.5 hover:shadow-[0_16px_34px_-16px_var(--color-green)]">Get started free →</a>
              <a href="https://github.com/Anasabubakar/agent-swarm" target="_blank" rel="noopener noreferrer" className="rounded border border-line2 bg-white/50 px-7 py-[15px] font-mono text-[13px] text-ink transition-colors hover:border-green hover:text-green">View on GitHub</a>
            </div>
            <div className="mt-8 flex flex-wrap gap-[22px] font-mono text-xs text-ink2">
              <span className="flex items-center gap-2"><i className="not-italic text-green">›</i> Your keys, your machine</span>
              <span className="flex items-center gap-2"><i className="not-italic text-green">›</i> 245+ agents</span>
              <span className="flex items-center gap-2"><i className="not-italic text-green">›</i> Open source</span>
            </div>
          </div>

          {/* RIGHT: the interactive console card */}
          <div className="overflow-hidden rounded-2xl border border-line2 bg-surface shadow-[0_44px_90px_-50px_rgba(10,40,20,.45)]">
            <div className="flex items-center gap-[10px] border-b border-line bg-bg3/60 px-4 py-[13px]">
              <span className="flex gap-[6px]">{[0, 1, 2].map((i) => <i key={i} className="block h-[9px] w-[9px] rounded-full bg-line2" />)}</span>
              <span className="font-mono text-[11px] tracking-wide text-dim">swarm · orchestrator</span>
              <span className="ml-auto flex items-center gap-2 font-mono text-[10px] text-green">
                <span className={`h-[6px] w-[6px] rounded-full ${phase === "running" ? "bg-green pulse-dot" : phase === "done" ? "bg-greenb" : "bg-line2"}`} />
                {phase === "idle" ? "ready" : phase === "running" ? "running" : "shipped"}
              </span>
            </div>

            <div className="p-5">
              {/* command line */}
              <div className="flex items-center gap-2 rounded-lg border border-line2 bg-bg/60 px-3 py-[10px] focus-within:border-green">
                <span className="font-mono text-[14px] text-green">$</span>
                <span className="font-mono text-[13px] text-dim">swarm run</span>
                <input
                  value={goal}
                  onChange={(e) => setGoal(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter" && phase !== "running") run(goal); }}
                  placeholder="describe what to build…"
                  disabled={phase === "running"}
                  className="min-w-0 flex-1 bg-transparent font-mono text-[13px] text-ink outline-none placeholder:text-dim"
                />
                {phase === "idle" || phase === "done" ? (
                  <button onClick={() => run(goal)} className="shrink-0 rounded-md bg-green px-4 py-[6px] font-mono text-[12px] text-white transition-all hover:-translate-y-px">run →</button>
                ) : (
                  <button onClick={reset} className="shrink-0 rounded-md border border-line2 px-4 py-[6px] font-mono text-[12px] text-ink2 transition-colors hover:border-green hover:text-green">reset</button>
                )}
              </div>

              {/* body: examples or live dispatch */}
              <div className="mt-4 min-h-[228px]">
                {phase === "idle" ? (
                  <div className="flex flex-col gap-3">
                    <span className="font-mono text-[11px] text-dim">try a goal</span>
                    {EXAMPLES.map((ex) => (
                      <button key={ex} onClick={() => run(ex)} className="flex items-center gap-2 rounded-lg border border-line bg-bg/40 px-3 py-[10px] text-left font-mono text-[12px] text-ink2 transition-all hover:border-green hover:text-green">
                        <span className="text-green">›</span> {ex}
                      </button>
                    ))}
                  </div>
                ) : (
                  <>
                    <div className="mb-2 flex items-center justify-between font-mono text-[11px]">
                      <span className="text-ink2">dispatching <b className="text-green">{rows.length}</b> agents</span>
                      <span className="text-dim">{doneCount}/{rows.length} · {elapsed.toFixed(1)}s</span>
                    </div>
                    <div className="divide-y divide-line">
                      {rows.map((r) => (
                        <div key={r.id} className="flex items-center gap-3 py-[8px] font-mono text-[12px]">
                          <span className={`h-[7px] w-[7px] shrink-0 rounded-full ${r.status === "running" ? "bg-green pulse-dot" : r.status === "done" ? "bg-greenb" : "bg-dim"}`} />
                          <span className="w-[96px] shrink-0 text-green">{r.id}</span>
                          <span className="flex-1 truncate text-ink2">{r.task}</span>
                          <span className={`shrink-0 text-[10px] ${r.status === "running" ? "text-green" : r.status === "done" ? "text-greenb" : "text-dim"}`}>{r.status === "done" ? "done ✓" : r.status}</span>
                        </div>
                      ))}
                    </div>
                    {phase === "done" && (
                      <div className="mt-3 flex items-center justify-between rounded-lg bg-green/5 px-3 py-[10px] font-mono text-[12px]">
                        <span className="text-green">✓ shipped in 4.2s · 14 files</span>
                        <a href="/dashboard" className="text-dim transition-colors hover:text-green">open the console →</a>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* THE SWARM: full-width, even radial ripple */}
        <div className="relative z-[2] mx-auto mt-16 max-w-[1080px] px-8">
          <div className="mb-4 flex items-center justify-between font-mono text-[11px] text-ink2">
            <span className="flex items-center gap-2"><span className="pulse-dot inline-block h-[6px] w-[6px] rounded-full bg-greenv" /> the swarm{phase === "running" ? ", dispatching" : ", live"}</span>
            <span><b className="text-green">{live}</b> agents working right now</span>
          </div>
          <div
            className="grid gap-[6px]"
            style={{
              gridTemplateColumns: "repeat(26,minmax(0,1fr))",
              WebkitMaskImage: "radial-gradient(115% 130% at 50% 50%, #000 60%, transparent 100%)",
              maskImage: "radial-gradient(115% 130% at 50% 50%, #000 60%, transparent 100%)",
            }}
            aria-hidden
          >
            {field.map((c, i) => <div key={i} className={`adot ${c}`} />)}
          </div>
        </div>
      </header>

      {/* WORKS WITH */}
      <div className="border-y border-line py-[30px]">
        <div className="mx-auto flex max-w-[1180px] flex-wrap items-center justify-center gap-7 px-8">
          <span className="font-mono text-[11px] uppercase tracking-[2px] text-dim">Works with</span>
          <div className="flex flex-wrap justify-center gap-3">
            {["Claude", "Gemini", "OpenAI", "Groq", "Kilo", "Ollama"].map((e) => (
              <span key={e} className="rounded border border-line2 px-4 py-2 font-mono text-[13px] text-ink2 transition-all hover:border-green hover:bg-green hover:text-white">{e}</span>
            ))}
          </div>
        </div>
      </div>

      {/* FEATURES */}
      <section id="features" className="border-t border-line py-[104px]">
        <div className="mx-auto max-w-[1180px] px-8">
          <div className="reveal mb-[52px] max-w-[60ch]">
            <div className="mb-4 font-mono text-[11px] uppercase tracking-[2.5px] text-green">The platform</div>
            <h2 className="font-serif text-[clamp(36px,4.4vw,58px)] leading-[1.04] tracking-[-.5px]">An entire company in <em className="italic text-green">one command.</em></h2>
            <p className="mt-4 max-w-[54ch] text-[18px] text-ink2">Everything a founder needs to run a fully autonomous AI workforce.</p>
          </div>
          <div className="reveal grid grid-cols-1 gap-px overflow-hidden rounded-lg border border-line bg-line sm:grid-cols-2 md:grid-cols-3">
            {FEATURES.map(([idx, h, p]) => (
              <div key={idx} className="bg-surface px-8 py-9 transition-colors hover:bg-bg3">
                <div className="font-mono text-[11px] tracking-wide text-green">{idx}</div>
                <div className="mb-[9px] mt-3 font-serif text-[25px] tracking-[-.2px]">{h}</div>
                <p className="text-[15px] leading-[1.55] text-ink2">{p}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* QUICKSTART */}
      <section id="start" className="border-t border-line py-[104px]">
        <div className="mx-auto max-w-[1180px] px-8">
          <div className="reveal mb-[52px] max-w-[60ch]">
            <div className="mb-4 font-mono text-[11px] uppercase tracking-[2.5px] text-green">Get started</div>
            <h2 className="font-serif text-[clamp(36px,4.4vw,58px)] leading-[1.04] tracking-[-.5px]">Two commands. <em className="italic text-green">That&apos;s the setup.</em></h2>
            <p className="mt-4 max-w-[54ch] text-[18px] text-ink2">Install once, then describe what you want built. Bring your own model keys.</p>
          </div>
          <div className="reveal grid grid-cols-1 gap-5 md:grid-cols-2">
            {[
              ["01 · install", "npm i -g @anas.abubakar/swarm", "# one global install, Node 18+"],
              ["02 · run", 'swarm run "ship a landing page"', "# the swarm assembles, works, and ships"],
            ].map(([stepLabel, cmd, note]) => (
              <div key={stepLabel} className="rounded-[10px] border border-[#1b231c] bg-tbg px-[22px] pb-5 pt-6 shadow-[0_30px_60px_-42px_rgba(11,60,30,.5)]">
                <div className="mb-[15px] font-mono text-[11px] uppercase tracking-[2px] text-mint">{stepLabel}</div>
                <div className="flex items-center justify-between gap-[14px] font-mono text-[14px] text-[#e9f2ea]">
                  <span><span className="mr-2 text-mint">$</span>{cmd}</span>
                  <button onClick={(e) => copy(cmd, e)} className="shrink-0 rounded border border-[#243027] px-[11px] py-[5px] font-mono text-[11px] text-[#7c9a83] transition-all hover:border-mint hover:text-mint">copy</button>
                </div>
                <div className="mt-[13px] font-mono text-[11.5px] text-[#7c8c7f]">{note}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="relative overflow-hidden border-t border-line py-[104px] text-center">
        <div className="pointer-events-none absolute bottom-[-50px] left-1/2 -translate-x-1/2 font-serif italic text-[clamp(120px,22vw,290px)] leading-none text-transparent [-webkit-text-stroke:1px_rgba(16,160,88,.16)]">SWARM</div>
        <div className="reveal relative z-[1] mx-auto max-w-[1180px] px-8">
          <h2 className="font-serif text-[clamp(42px,6vw,76px)] leading-none tracking-[-.5px]">Your workforce is <em className="italic text-green">one command away.</em></h2>
          <div className="mt-[30px] flex flex-wrap justify-center gap-[13px]">
            <a href="/dashboard" className="rounded bg-green px-6 py-[15px] font-mono text-[13px] text-white transition-all hover:-translate-y-0.5 hover:shadow-[0_16px_34px_-16px_var(--color-green)]">Get started free →</a>
            <a href="https://github.com/Anasabubakar/agent-swarm" target="_blank" rel="noopener noreferrer" className="rounded border border-line2 px-6 py-[15px] font-mono text-[13px] text-ink transition-colors hover:border-green hover:text-green">View on GitHub</a>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-line py-12">
        <div className="mx-auto flex max-w-[1180px] flex-wrap items-center justify-between gap-4 px-8">
          <div className="font-mono text-[16px] font-medium tracking-wide">swar<b className="text-green">m</b></div>
          <div className="font-mono text-[11px] tracking-wide text-dim">Engine-agnostic multi-agent orchestration · by Anas Abubakar · v1.0.0</div>
        </div>
      </footer>
    </main>
  );
}
