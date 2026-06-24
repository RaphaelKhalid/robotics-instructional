'use client';

import { useEffect, useRef, useState, useCallback } from 'react';

const W = 580, H = 460;
const FOV = Math.PI / 2;
const RAY_COUNT = 60;
const MAX_RANGE = 140;
const LANDMARK_DETECT_RANGE = 100;

interface Landmark { id: number; x: number; y: number; color: string; }
interface RobotState {
  x: number; y: number; angle: number;
  vx: number; vy: number; va: number;
  posUncertainty: number;
}
interface ObservedLandmark { id: number; observedCount: number; x: number; y: number; color: string; }

const WALLS = [
  { x1: 30, y1: 30, x2: 550, y2: 30 },
  { x1: 550, y1: 30, x2: 550, y2: 430 },
  { x1: 550, y1: 430, x2: 30, y2: 430 },
  { x1: 30, y1: 430, x2: 30, y2: 30 },
  { x1: 150, y1: 30, x2: 150, y2: 160 },
  { x1: 150, y1: 200, x2: 150, y2: 300 },
  { x1: 300, y1: 150, x2: 430, y2: 150 },
  { x1: 380, y1: 280, x2: 380, y2: 430 },
  { x1: 200, y1: 310, x2: 320, y2: 310 },
];

const LANDMARKS: Landmark[] = [
  { id: 1, x: 80,  y: 80,  color: '#ff6b35' },
  { id: 2, x: 460, y: 80,  color: '#3b82f6' },
  { id: 3, x: 80,  y: 380, color: '#00ff41' },
  { id: 4, x: 460, y: 380, color: '#f59e0b' },
  { id: 5, x: 290, y: 230, color: '#8b5cf6' },
];

function raycast(ox: number, oy: number, angle: number): number {
  let minDist = MAX_RANGE;
  const dx = Math.cos(angle), dy = Math.sin(angle);
  for (const w of WALLS) {
    const wx = w.x2 - w.x1, wy = w.y2 - w.y1;
    const denom = dx * wy - dy * wx;
    if (Math.abs(denom) < 1e-6) continue;
    const t1 = ((w.x1 - ox) * wy - (w.y1 - oy) * wx) / denom;
    const t2 = ((w.x1 - ox) * dy - (w.y1 - oy) * dx) / denom;
    if (t1 > 0 && t2 >= 0 && t2 <= 1) minDist = Math.min(minDist, t1);
  }
  return minDist;
}

// Cache rays when robot hasn't moved
function computeRays(ox: number, oy: number, angle: number): number[] {
  const results: number[] = new Array(RAY_COUNT);
  for (let i = 0; i < RAY_COUNT; i++) {
    const a = angle - FOV / 2 + (i / RAY_COUNT) * FOV;
    results[i] = raycast(ox, oy, a);
  }
  return results;
}

export default function SLAMLab({ onUncertaintyLow }: { onUncertaintyLow?: () => void }) {
  const canvasRef    = useRef<HTMLCanvasElement>(null);
  const robotRef     = useRef<RobotState>({ x: 290, y: 230, angle: 0, vx: 0, vy: 0, va: 0, posUncertainty: 40 });
  const observedRef  = useRef<ObservedLandmark[]>([]);
  const fogRef       = useRef<boolean[][]>(
    Array.from({ length: Math.ceil(H / 8) }, () => new Array(Math.ceil(W / 8)).fill(true))
  );
  const keysRef      = useRef<Set<string>>(new Set());
  const rafRef       = useRef(0);
  const notifiedRef  = useRef(false);
  const dirtyRef     = useRef(true);

  // Cached ray results — only recompute when robot moves
  const raysRef      = useRef<number[]>([]);
  const lastRayPosRef = useRef({ x: -999, y: -999, angle: -999 });

  // Throttle React state updates to avoid 60fps re-renders
  const frameCountRef = useRef(0);
  const [robotInfo, setRobotInfo] = useState({ uncertainty: 40, observed: 0 });

  const draw = useCallback((rays: number[]) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    const r = robotRef.current;
    const fog = fogRef.current;

    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, W, H);

    // Grid
    ctx.strokeStyle = 'rgba(0,255,65,0.03)';
    ctx.lineWidth = 1;
    for (let x = 0; x < W; x += 30) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
    for (let y = 0; y < H; y += 30) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }

    // Raycast LIDAR
    ctx.save();
    ctx.globalAlpha = 0.07;
    ctx.strokeStyle = '#00ff41';
    ctx.lineWidth = 1;
    for (let i = 0; i < RAY_COUNT; i++) {
      const angle = r.angle - FOV / 2 + (i / RAY_COUNT) * FOV;
      const dist = rays[i] ?? MAX_RANGE;
      ctx.beginPath();
      ctx.moveTo(r.x, r.y);
      ctx.lineTo(r.x + dist * Math.cos(angle), r.y + dist * Math.sin(angle));
      ctx.stroke();
    }
    ctx.restore();

    // Walls
    ctx.strokeStyle = 'rgba(0,255,65,0.15)';
    ctx.lineWidth = 2;
    for (const w of WALLS) { ctx.beginPath(); ctx.moveTo(w.x1, w.y1); ctx.lineTo(w.x2, w.y2); ctx.stroke(); }

    // Reveal fog
    const cellW = Math.ceil(W / 8), cellH = Math.ceil(H / 8);
    for (let i = 0; i < RAY_COUNT; i++) {
      const angle = r.angle - FOV / 2 + (i / RAY_COUNT) * FOV;
      const dist = rays[i] ?? MAX_RANGE;
      const cx = Math.cos(angle), cy = Math.sin(angle);
      for (let d = 0; d < dist; d += 6) {
        const fx = Math.floor((r.x + d * cx) / 8);
        const fy = Math.floor((r.y + d * cy) / 8);
        if (fx >= 0 && fx < cellW && fy >= 0 && fy < cellH) fog[fy][fx] = false;
      }
    }

    // Fog of war
    ctx.fillStyle = 'rgba(0,0,0,0.9)';
    for (let fy = 0; fy < fog.length; fy++) {
      for (let fx = 0; fx < fog[fy].length; fx++) {
        if (fog[fy][fx]) ctx.fillRect(fx * 8, fy * 8, 8, 8);
      }
    }

    // Landmarks
    for (const lm of LANDMARKS) {
      const dist = Math.hypot(lm.x - r.x, lm.y - r.y);
      const obs = observedRef.current.find(o => o.id === lm.id);
      const isVisible = dist < LANDMARK_DETECT_RANGE;

      if (isVisible && !obs) {
        observedRef.current.push({ id: lm.id, observedCount: 1, x: lm.x, y: lm.y, color: lm.color });
      } else if (isVisible && obs) {
        obs.observedCount++;
        r.posUncertainty = Math.max(6, r.posUncertainty - 0.8);
      }

      const known = !!obs;
      ctx.shadowColor = known ? lm.color : 'rgba(0,255,65,0.1)';
      ctx.shadowBlur = known ? 12 : 3;
      ctx.beginPath();
      ctx.arc(lm.x, lm.y, 10, 0, Math.PI * 2);
      ctx.fillStyle = known ? lm.color + '33' : 'rgba(0,255,65,0.04)';
      ctx.strokeStyle = known ? lm.color : 'rgba(0,255,65,0.15)';
      ctx.lineWidth = 1.5;
      ctx.fill(); ctx.stroke();
      ctx.shadowBlur = 0;

      ctx.font = 'bold 11px monospace';
      ctx.fillStyle = known ? lm.color : 'rgba(0,255,65,0.25)';
      ctx.textAlign = 'center';
      ctx.fillText(known ? String(lm.id) : '?', lm.x, lm.y + 4);
      ctx.textAlign = 'left';
    }

    // Uncertainty ellipse
    ctx.beginPath();
    ctx.ellipse(r.x, r.y, r.posUncertainty, r.posUncertainty * 0.7, r.angle, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(255,107,53,${Math.min(0.55, r.posUncertainty / 60)})`;
    ctx.lineWidth = 1.5;
    ctx.setLineDash([3, 3]);
    ctx.stroke();
    ctx.setLineDash([]);

    // Robot
    ctx.shadowColor = '#00ff41'; ctx.shadowBlur = 16;
    ctx.beginPath();
    ctx.arc(r.x, r.y, 10, 0, Math.PI * 2);
    ctx.fillStyle = '#00ff41'; ctx.fill();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = '#000'; ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(r.x, r.y);
    ctx.lineTo(r.x + 16 * Math.cos(r.angle), r.y + 16 * Math.sin(r.angle));
    ctx.stroke();

    // HUD
    ctx.fillStyle = 'rgba(0,0,0,0.9)';
    ctx.fillRect(10, 10, 220, 54);
    ctx.strokeStyle = 'rgba(0,255,65,0.15)';
    ctx.lineWidth = 1;
    ctx.strokeRect(10, 10, 220, 54);
    ctx.font = '10px monospace';
    ctx.fillStyle = 'rgba(0,255,65,0.6)';
    ctx.fillText(`uncertainty: ${r.posUncertainty.toFixed(1)}px`, 20, 28);
    ctx.fillText(`landmarks: ${observedRef.current.length}/${LANDMARKS.length}`, 20, 44);
    ctx.fillText(`WASD / arrows to drive`, 20, 58);
  }, []);

  // Physics + render loop
  useEffect(() => {
    const update = () => {
      const r = robotRef.current;
      const keys = keysRef.current;
      const speed = 2.5, turnSpeed = 0.04;

      r.va = keys.has('ArrowLeft') || keys.has('a') ? -turnSpeed
           : keys.has('ArrowRight') || keys.has('d') ? turnSpeed : 0;

      const moving = keys.has('ArrowUp') || keys.has('w') || keys.has('ArrowDown') || keys.has('s');
      if (keys.has('ArrowUp') || keys.has('w')) {
        r.vx = speed * Math.cos(r.angle); r.vy = speed * Math.sin(r.angle);
      } else if (keys.has('ArrowDown') || keys.has('s')) {
        r.vx = -speed * Math.cos(r.angle); r.vy = -speed * Math.sin(r.angle);
      } else { r.vx = 0; r.vy = 0; }

      const nx = r.x + r.vx, ny = r.y + r.vy;
      let blocked = false;
      for (const w of WALLS) {
        const wx = w.x2 - w.x1, wy = w.y2 - w.y1;
        const len2 = wx * wx + wy * wy;
        const t = Math.max(0, Math.min(1, ((nx - w.x1) * wx + (ny - w.y1) * wy) / len2));
        const cx = w.x1 + t * wx, cy = w.y1 + t * wy;
        if (Math.hypot(nx - cx, ny - cy) < 14) { blocked = true; break; }
      }
      if (!blocked) { r.x = nx; r.y = ny; }
      r.angle += r.va;

      if (moving && !blocked) r.posUncertainty = Math.min(60, r.posUncertainty + 0.04);

      // Only recompute rays when robot actually moved or rotated
      const lp = lastRayPosRef.current;
      const moved = Math.hypot(r.x - lp.x, r.y - lp.y) > 0.5 || Math.abs(r.angle - lp.angle) > 0.01;
      if (moved || raysRef.current.length === 0) {
        raysRef.current = computeRays(r.x, r.y, r.angle);
        lastRayPosRef.current = { x: r.x, y: r.y, angle: r.angle };
        dirtyRef.current = true;
      }

      if (dirtyRef.current) {
        draw(raysRef.current);
        dirtyRef.current = false;
      }

      // Throttle React state update to every 6 frames (~10fps)
      frameCountRef.current++;
      if (frameCountRef.current % 6 === 0) {
        setRobotInfo({ uncertainty: r.posUncertainty, observed: observedRef.current.length });
      }

      if (r.posUncertainty < 12 && observedRef.current.length >= 3 && !notifiedRef.current) {
        notifiedRef.current = true;
        onUncertaintyLow?.();
      }

      rafRef.current = requestAnimationFrame(update);
    };
    rafRef.current = requestAnimationFrame(update);
    return () => cancelAnimationFrame(rafRef.current);
  }, [draw, onUncertaintyLow]);

  useEffect(() => {
    const down = (e: KeyboardEvent) => { keysRef.current.add(e.key); dirtyRef.current = true; e.preventDefault(); };
    const up   = (e: KeyboardEvent) => { keysRef.current.delete(e.key); dirtyRef.current = true; };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    return () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up); };
  }, []);

  const chipStyle: React.CSSProperties = {
    background: '#000', border: '1px solid rgba(0,255,65,0.1)',
    borderRadius: 3, padding: '10px 12px',
  };

  return (
    <div>
      <div style={{
        marginBottom: 10, fontSize: 11, color: '#3a5a3a',
        fontFamily: 'var(--font-jetbrains-mono, var(--font-geist-mono))',
        letterSpacing: '0.04em',
      }}>
        drive:{' '}
        {['W','A','S','D'].map(k => (
          <kbd key={k} style={{
            background: '#000', border: '1px solid rgba(0,255,65,0.2)',
            borderRadius: 2, padding: '2px 5px', fontSize: 10, marginRight: 3,
            fontFamily: 'inherit',
          }}>{k}</kbd>
        ))}
        — find all 5 landmarks to reduce uncertainty
      </div>

      <div className="sim-canvas-wrap" style={{ marginBottom: 12 }}>
        <canvas ref={canvasRef} width={W} height={H}
          style={{ display: 'block', width: '100%', height: 'auto' }} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
        {[
          {
            label: 'POS_UNCERTAINTY',
            value: robotInfo.uncertainty.toFixed(1) + 'px',
            color: robotInfo.uncertainty < 15 ? '#00ff41' : robotInfo.uncertainty < 30 ? '#f59e0b' : '#ff6b35',
          },
          { label: 'LANDMARKS_SEEN',  value: `${robotInfo.observed}/${LANDMARKS.length}`, color: '#e8ffe8' },
          {
            label: 'GOAL',
            value: robotInfo.uncertainty < 12 ? '[LOW ✓]' : '< 12px',
            color: robotInfo.uncertainty < 12 ? '#00ff41' : '#3a5a3a',
          },
        ].map(chip => (
          <div key={chip.label} style={chipStyle}>
            <div style={{
              fontSize: 9, color: '#3a5a3a',
              fontFamily: 'var(--font-jetbrains-mono, var(--font-geist-mono))',
              letterSpacing: '0.08em', textTransform: 'uppercase' as const,
            }}>{chip.label}</div>
            <div style={{
              fontFamily: 'var(--font-jetbrains-mono, var(--font-geist-mono))',
              fontSize: 14, fontWeight: 700, color: chip.color, marginTop: 3,
            }}>{chip.value}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
