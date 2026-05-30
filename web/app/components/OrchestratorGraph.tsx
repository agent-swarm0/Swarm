"use client";

import { useEffect, useRef } from "react";

type A = { id: string; role: string; status: string };

export default function OrchestratorGraph({ agents, active }: { agents: A[]; active: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const agentsRef = useRef(agents);
  agentsRef.current = agents;
  const activeRef = useRef(active);
  activeRef.current = active;

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let W = 0, H = 0, raf = 0;

    const resize = () => {
      const r = canvas.getBoundingClientRect();
      W = r.width; H = r.height;
      canvas.width = Math.max(1, W * dpr);
      canvas.height = Math.max(1, H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    const MINT = "#8ee29f", GREEN = "#18bb66", AMBER = "#e3c074";
    const t0 = performance.now();

    const quad = (p0: number[], c: number[], p1: number[], t: number) => {
      const u = 1 - t;
      return [
        u * u * p0[0] + 2 * u * t * c[0] + t * t * p1[0],
        u * u * p0[1] + 2 * u * t * c[1] + t * t * p1[1],
      ];
    };

    const frame = (now: number) => {
      const time = (now - t0) / 1000;
      const ags = agentsRef.current;
      const n = Math.max(ags.length, 1);
      const cx = W / 2, cy = H / 2;
      const R = Math.min(W * 0.42, H * 0.4);

      ctx.clearRect(0, 0, W, H);

      // depth grid of faint dots
      ctx.fillStyle = "rgba(120,160,130,.05)";
      const gap = 34;
      for (let gx = (W % gap) / 2; gx < W; gx += gap)
        for (let gy = (H % gap) / 2; gy < H; gy += gap) { ctx.beginPath(); ctx.arc(gx, gy, 1, 0, 7); ctx.fill(); }

      // ambient core glow
      const vg = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(W, H) * 0.55);
      vg.addColorStop(0, activeRef.current ? "rgba(24,70,42,.5)" : "rgba(18,45,30,.34)");
      vg.addColorStop(1, "rgba(6,15,9,0)");
      ctx.fillStyle = vg;
      ctx.fillRect(0, 0, W, H);

      const pos = ags.map((_, i) => {
        const a = (i / n) * Math.PI * 2 - Math.PI / 2;
        return { x: cx + Math.cos(a) * R, y: cy + Math.sin(a) * R, a };
      });

      // curved edges + packets
      ags.forEach((ag, i) => {
        const p = pos[i];
        const working = ag.status === "working", done = ag.status === "done", blocked = ag.status === "blocked";
        const mx = (cx + p.x) / 2, my = (cy + p.y) / 2;
        const nx = -(p.y - cy), ny = (p.x - cx);
        const len = Math.hypot(nx, ny) || 1;
        const bow = R * 0.16;
        const ctrl = [mx + (nx / len) * bow, my + (ny / len) * bow];

        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.quadraticCurveTo(ctrl[0], ctrl[1], p.x, p.y);
        ctx.strokeStyle = blocked ? "rgba(227,192,116,.55)" : working ? "rgba(142,226,159,.5)" : done ? "rgba(24,187,102,.3)" : "rgba(90,120,98,.16)";
        ctx.lineWidth = working || blocked ? 1.8 : 1;
        ctx.stroke();

        if (working && !reduce) {
          for (let k = 0; k < 4; k++) {
            const t = (time * 0.55 + k / 4) % 1;
            const q = quad([cx, cy], ctrl, [p.x, p.y], t);
            ctx.beginPath();
            ctx.arc(q[0], q[1], 2.6, 0, 7);
            ctx.fillStyle = MINT;
            ctx.shadowColor = MINT; ctx.shadowBlur = 12;
            ctx.fill(); ctx.shadowBlur = 0;
          }
        }
      });

      // agent nodes
      ags.forEach((ag, i) => {
        const p = pos[i];
        const working = ag.status === "working", done = ag.status === "done", blocked = ag.status === "blocked";
        const pulse = working ? 1 + Math.sin(time * 4 + i) * 0.1 : 1;
        const rad = 24 * pulse;

        if (working) { ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(time * 1.4); ctx.beginPath(); ctx.setLineDash([3, 7]); ctx.arc(0, 0, rad + 7, 0, 7); ctx.strokeStyle = "rgba(142,226,159,.5)"; ctx.lineWidth = 1.4; ctx.stroke(); ctx.setLineDash([]); ctx.restore(); }

        ctx.beginPath();
        ctx.arc(p.x, p.y, rad, 0, 7);
        ctx.fillStyle = "#0c1a11";
        if (working) { ctx.shadowColor = MINT; ctx.shadowBlur = 24; }
        else if (blocked) { ctx.shadowColor = AMBER; ctx.shadowBlur = 18; }
        ctx.fill(); ctx.shadowBlur = 0;
        ctx.lineWidth = 2;
        ctx.strokeStyle = working ? MINT : done ? GREEN : blocked ? AMBER : "rgba(120,140,127,.5)";
        ctx.stroke();

        // initial inside
        ctx.fillStyle = working ? MINT : done ? GREEN : "rgba(170,186,172,.85)";
        ctx.font = "600 15px ui-sans-serif, system-ui, sans-serif";
        ctx.textAlign = "center"; ctx.textBaseline = "middle";
        ctx.fillText(ag.role.charAt(0).toUpperCase(), p.x, p.y + 0.5);

        // role label below
        ctx.fillStyle = "rgba(190,205,192,.9)";
        ctx.font = "11px ui-monospace, monospace";
        ctx.textBaseline = "alphabetic";
        ctx.fillText(ag.role, p.x, p.y + rad + 16);
        ctx.fillStyle = working ? "rgba(142,226,159,.8)" : done ? "rgba(24,187,102,.7)" : "rgba(120,140,127,.6)";
        ctx.font = "9px ui-monospace, monospace";
        ctx.fillText(done ? "done" : working ? "working" : blocked ? "blocked" : "idle", p.x, p.y + rad + 28);
      });

      // orchestrator core
      const op = 1 + Math.sin(time * 2) * 0.05;
      ctx.save(); ctx.translate(cx, cy); ctx.rotate(time * (activeRef.current ? 0.6 : 0.2));
      ctx.beginPath(); ctx.setLineDash([5, 10]); ctx.arc(0, 0, 42 * op, 0, 7);
      ctx.strokeStyle = "rgba(142,226,159,.55)"; ctx.lineWidth = 1.6; ctx.stroke(); ctx.setLineDash([]); ctx.restore();

      ctx.beginPath(); ctx.arc(cx, cy, 30 * op, 0, 7);
      ctx.fillStyle = "#0b2014";
      ctx.shadowColor = GREEN; ctx.shadowBlur = activeRef.current ? 34 : 16;
      ctx.fill(); ctx.shadowBlur = 0;
      ctx.lineWidth = 2.4; ctx.strokeStyle = MINT; ctx.stroke();
      ctx.fillStyle = MINT; ctx.font = "600 12px ui-monospace, monospace"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillText("swarm", cx, cy + 0.5);
      ctx.textBaseline = "alphabetic";

      raf = requestAnimationFrame(frame);
    };

    raf = requestAnimationFrame(frame);
    return () => { cancelAnimationFrame(raf); ro.disconnect(); };
  }, []);

  return <canvas ref={ref} className="block h-full w-full" />;
}
