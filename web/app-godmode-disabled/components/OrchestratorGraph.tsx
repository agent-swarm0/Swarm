"use client";
 
import { useEffect, useRef } from "react";
 
type Agent = { id: string; role: string; status: string; department: string };
type DispatchEvent = { agentSlug: string; timestamp: number };
type OrchestratorState = { goal: string; isThinking: boolean; plan: any; currentWave: number };
 
export default function OrchestratorGraph({ 
  agents, 
  active, 
  orchestrator, 
  dispatchEvents 
}: { 
  agents: Agent[]; 
  active: boolean; 
  orchestrator: OrchestratorState;
  dispatchEvents: DispatchEvent[];
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  const agentsRef = useRef(agents);
  agentsRef.current = agents;
  const activeRef = useRef(active);
  activeRef.current = active;
  const orchRef = useRef(orchestrator);
  orchRef.current = orchestrator;
  const dispatchRef = useRef(dispatchEvents);
  dispatchRef.current = dispatchEvents;
 
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
 
    // GOD MODE COLORS
    const LIME = "#e8ff47";
    const RED = "#ff3d00";
    const CYAN = "#00e5ff";
    const GREEN = "#b8ff57";
    const DIM = "rgba(120,140,127,.3)";
    const BG_GLOW = "rgba(24,70,42,.4)";
 
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
      const orch = orchRef.current;
      const dispatches = dispatchRef.current;
      const n = Math.max(ags.length, 1);
      const cx = W / 2, cy = H / 2;
      const R = Math.min(W * 0.42, H * 0.4);
 
      ctx.clearRect(0, 0, W, H);
 
      // depth grid
      ctx.fillStyle = "rgba(120,160,130,.05)";
      const gap = 34;
      for (let gx = (W % gap) / 2; gx < W; gx += gap)
        for (let gy = (H % gap) / 2; gy < H; gy += gap) { ctx.beginPath(); ctx.arc(gx, gy, 1, 0, 7); ctx.fill(); }
 
      // ambient core glow
      const vg = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(W, H) * 0.55);
      vg.addColorStop(0, activeRef.current ? BG_GLOW : "rgba(18,45,30,.34)");
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
        const status = ag.status;
        const mx = (cx + p.x) / 2, my = (cy + p.y) / 2;
        const nx = -(p.y - cy), ny = (p.x - cx);
        const len = Math.hypot(nx, ny) || 1;
        const bow = R * 0.16;
        const ctrl = [mx + (nx / len) * bow, my + (ny / len) * bow];
 
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.quadraticCurveTo(ctrl[0], ctrl[1], p.x, p.y);
        
        // Edge color based on status
        let color = DIM;
        if (status === "active") color = "rgba(232,255,71,0.5)";
        else if (status === "thinking") color = "rgba(0,229,255,0.5)";
        else if (status === "done") color = "rgba(184,255,87,0.3)";
        else if (status === "error") color = "rgba(255,61,0,0.5)";
        
        ctx.strokeStyle = color;
        ctx.lineWidth = (status === "active" || status === "thinking") ? 2 : 1;
        ctx.stroke();
 
        // Dispatch particles
        const dispatch = dispatches.find(d => d.agentSlug === ag.id);
        if (dispatch && !reduce) {
          const age = (now - dispatch.timestamp) / 1000;
          if (age < 0.4) {
            const t = age / 0.4;
            const q = quad([cx, cy], ctrl, [p.x, p.y], t);
            ctx.beginPath();
            ctx.arc(q[0], q[1], 3, 0, 7);
            ctx.fillStyle = LIME;
            ctx.shadowColor = LIME; ctx.shadowBlur = 15;
            ctx.fill(); ctx.shadowBlur = 0;
          }
        }
 
        // Active state particles (constant stream)
        if (status === "active" && !reduce) {
          for (let k = 0; k < 3; k++) {
            const t = (time * 0.6 + k / 3) % 1;
            const q = quad([cx, cy], ctrl, [p.x, p.y], t);
            ctx.beginPath();
            ctx.arc(q[0], q[1], 2, 0, 7);
            ctx.fillStyle = LIME;
            ctx.fill();
          }
        }
      });
 
      // agent nodes
      ags.forEach((ag, i) => {
        const p = pos[i];
        const status = ag.status;
        let nodeColor = DIM;
        let glowColor = "transparent";
        let pulse = 1;
 
        if (status === "active") { nodeColor = LIME; glowColor = LIME; pulse = 1 + Math.sin(time * 5) * 0.05; }
        else if (status === "thinking") { nodeColor = CYAN; glowColor = CYAN; pulse = 1 + Math.sin(time * 3) * 0.08; }
        else if (status === "done") { nodeColor = GREEN; glowColor = "transparent"; }
        else if (status === "error") { nodeColor = RED; glowColor = RED; }
        else if (status === "queued") { nodeColor = "#e3c074"; glowColor = "transparent"; }
 
        const rad = 24 * pulse;
 
        // Node ring for thinking/active
        if ((status === "active" || status === "thinking") && !reduce) {
          ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(time * 1.5);
          ctx.beginPath(); ctx.setLineDash([4, 8]); ctx.arc(0, 0, rad + 8, 0, 7);
          ctx.strokeStyle = nodeColor; ctx.lineWidth = 1.5; ctx.stroke(); ctx.setLineDash([]); ctx.restore();
        }
 
        ctx.beginPath();
        ctx.arc(p.x, p.y, rad, 0, 7);
        ctx.fillStyle = "#0c1a11";
        if (glowColor !== "transparent") { ctx.shadowColor = glowColor; ctx.shadowBlur = 20; }
        ctx.fill(); ctx.shadowBlur = 0;
        ctx.lineWidth = 2;
        ctx.strokeStyle = nodeColor;
        ctx.stroke();
 
        // Label
        ctx.fillStyle = "rgba(190,205,192,.9)";
        ctx.font = "11px ui-monospace, monospace";
        ctx.textAlign = "center";
        ctx.fillText(ag.role || ag.id, p.x, p.y + rad + 16);
        ctx.fillStyle = nodeColor;
        ctx.font = "9px ui-monospace, monospace";
        ctx.fillText(status, p.x, p.y + rad + 28);
      });
 
      // ORCHESTRATOR CORE (GOD MODE)
      const coreOp = 1 + Math.sin(time * 2) * 0.03;
      
      // Radiating rings when thinking
      if (orch.isThinking && !reduce) {
        for (let r = 0; r < 3; r++) {
          const ringT = (time * 0.5 + r / 3) % 1;
          ctx.beginPath();
          ctx.arc(cx, cy, 40 + ringT * 100, 0, 7);
          ctx.strokeStyle = `rgba(232,255,71, ${0.3 * (1 - ringT)})`;
          ctx.lineWidth = 2;
          ctx.stroke();
        }
      }
 
      ctx.save(); ctx.translate(cx, cy); ctx.rotate(time * (activeRef.current ? 0.4 : 0.1));
      ctx.beginPath(); ctx.setLineDash([6, 12]); ctx.arc(0, 0, 45 * coreOp, 0, 7);
      ctx.strokeStyle = "rgba(142,226,159,0.4)"; ctx.lineWidth = 1.8; ctx.stroke(); ctx.setLineDash([]); ctx.restore();
 
      ctx.beginPath(); ctx.arc(cx, cy, 32 * coreOp, 0, 7);
      ctx.fillStyle = "#0b2014";
      ctx.shadowColor = LIME; ctx.shadowBlur = activeRef.current ? 30 : 10;
      ctx.fill(); ctx.shadowBlur = 0;
      ctx.lineWidth = 2.5; ctx.strokeStyle = LIME; ctx.stroke();
      
      // Goal streaming text inside core
      ctx.fillStyle = LIME; ctx.font = "600 11px ui-monospace, monospace"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
      const goalText = orch.goal || "swarm";
      const displayedGoal = goalText.slice(0, Math.floor(time * 10) % (goalText.length + 1));
      ctx.fillText(displayedGoal || "swarm", cx, cy);
 
      raf = requestAnimationFrame(frame);
    };
 
    raf = requestAnimationFrame(frame);
    return () => { cancelAnimationFrame(raf); ro.disconnect(); };
  }, []);
 
  return <canvas ref={ref} className="block h-full w-full" />;
}
