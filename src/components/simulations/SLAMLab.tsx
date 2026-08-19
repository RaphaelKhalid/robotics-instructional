'use client';

import { useEffect, useRef, useState, useCallback } from 'react';

// ---- World geometry ----
const W = 580, H = 460;
const RAY_COUNT = 120;          // 360° lidar
const MAX_RANGE = 150;
const LANDMARK_DETECT_RANGE = 110;
const CELL = 8;                 // occupancy grid cell size (px)
const GW = Math.ceil(W / CELL); // grid width in cells
const GH = Math.ceil(H / CELL); // grid height in cells

// log-odds map params
const L_OCC = 0.85;   // increment when a ray hits a cell
const L_FREE = 0.28;  // decrement along a free ray
const L_CLAMP = 8;    // clamp magnitude
const OCC_THRESH = 1.5;
const FREE_THRESH = -1.5;

const ACCENT = '#00ff41';

interface Landmark { id: number; x: number; y: number; color: string; }
interface RobotState {
  x: number; y: number; angle: number;
  vx: number; vy: number; va: number;
  posUncertainty: number;
  driftX: number; driftY: number;   // accumulated dead-reckoning drift (visualized)
}
interface ObservedLandmark {
  id: number; observedCount: number;
  x: number; y: number;             // estimated map position
  color: string;
}
interface Waypoint { x: number; y: number; }

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

// Ray vs all walls -> nearest distance (returns MAX_RANGE if nothing hit)
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

function computeRays(ox: number, oy: number): number[] {
  const results: number[] = new Array(RAY_COUNT);
  for (let i = 0; i < RAY_COUNT; i++) {
    const a = (i / RAY_COUNT) * Math.PI * 2;   // full 360°
    results[i] = raycast(ox, oy, a);
  }
  return results;
}

export default function SLAMLab({ onUncertaintyLow }: { onUncertaintyLow?: () => void }) {
  const canvasRef    = useRef<HTMLCanvasElement>(null);
  const mapRef       = useRef<HTMLCanvasElement>(null);

  const robotRef     = useRef<RobotState>({
    x: 290, y: 230, angle: 0, vx: 0, vy: 0, va: 0,
    posUncertainty: 40, driftX: 0, driftY: 0,
  });
  const observedRef  = useRef<ObservedLandmark[]>([]);
  const waypointRef  = useRef<Waypoint | null>(null);

  // Occupancy grid stored as log-odds
  const gridRef      = useRef<Float32Array>(new Float32Array(GW * GH));

  // Visited cell tags for loop-closure detection (coarse)
  const visitedRef   = useRef<Set<number>>(new Set());
  const loopFlashRef = useRef(0);       // frames remaining for border flash
  const loopBannerRef = useRef(0);      // frames remaining for banner
  const loopCountRef = useRef(0);
  const loopCooldownRef = useRef(0);    // frames before another loop closure can fire

  const trailRef     = useRef<{ x: number; y: number; a: number }[]>([]);
  const keysRef      = useRef<Set<string>>(new Set());
  const rafRef       = useRef(0);
  const notifiedRef  = useRef(false);
  const dirtyRef     = useRef(true);
  const mapDirtyRef  = useRef(true);

  const raysRef       = useRef<number[]>([]);
  const lastRayPosRef = useRef({ x: -999, y: -999 });

  const frameCountRef = useRef(0);
  const exploredRef   = useRef(0);
  const [info, setInfo] = useState({ uncertainty: 40, observed: 0, explored: 0, loops: 0 });

  // ---------- Occupancy grid update from a lidar scan ----------
  const updateGrid = useCallback((ox: number, oy: number, rays: number[]) => {
    const grid = gridRef.current;
    for (let i = 0; i < RAY_COUNT; i++) {
      const a = (i / RAY_COUNT) * Math.PI * 2;
      const dist = rays[i];
      const ca = Math.cos(a), sa = Math.sin(a);
      const hit = dist < MAX_RANGE;
      // free space along the ray
      for (let d = 4; d < dist - 2; d += CELL * 0.6) {
        const gx = Math.floor((ox + d * ca) / CELL);
        const gy = Math.floor((oy + d * sa) / CELL);
        if (gx >= 0 && gx < GW && gy >= 0 && gy < GH) {
          const idx = gy * GW + gx;
          grid[idx] = Math.max(-L_CLAMP, grid[idx] - L_FREE);
        }
      }
      // occupied endpoint
      if (hit) {
        const gx = Math.floor((ox + dist * ca) / CELL);
        const gy = Math.floor((oy + dist * sa) / CELL);
        if (gx >= 0 && gx < GW && gy >= 0 && gy < GH) {
          const idx = gy * GW + gx;
          grid[idx] = Math.min(L_CLAMP, grid[idx] + L_OCC);
        }
      }
    }
    mapDirtyRef.current = true;
  }, []);

  // ---------- Main scene draw ----------
  const draw = useCallback((rays: number[]) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    const r = robotRef.current;

    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, W, H);

    // Grid
    ctx.strokeStyle = 'rgba(0,255,65,0.03)';
    ctx.lineWidth = 1;
    for (let x = 0; x < W; x += 30) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
    for (let y = 0; y < H; y += 30) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }

    // Waypoint marker
    const wp = waypointRef.current;
    if (wp) {
      ctx.strokeStyle = 'rgba(0,255,65,0.5)';
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(wp.x, wp.y, 8, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(wp.x - 12, wp.y); ctx.lineTo(wp.x + 12, wp.y);
      ctx.moveTo(wp.x, wp.y - 12); ctx.lineTo(wp.x, wp.y + 12); ctx.stroke();
    }

    // 360° LIDAR — faint rays, bright endpoints on hits
    for (let i = 0; i < RAY_COUNT; i++) {
      const angle = (i / RAY_COUNT) * Math.PI * 2;
      const dist = rays[i] ?? MAX_RANGE;
      const ex = r.x + dist * Math.cos(angle);
      const ey = r.y + dist * Math.sin(angle);
      ctx.globalAlpha = 0.06;
      ctx.strokeStyle = ACCENT;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(r.x, r.y);
      ctx.lineTo(ex, ey);
      ctx.stroke();
      ctx.globalAlpha = 1;
      if (dist < MAX_RANGE - 1) {
        ctx.fillStyle = ACCENT;
        ctx.fillRect(ex - 1.3, ey - 1.3, 2.6, 2.6);
      }
    }
    ctx.globalAlpha = 1;

    // Walls
    ctx.strokeStyle = 'rgba(0,255,65,0.16)';
    ctx.lineWidth = 2;
    for (const w of WALLS) { ctx.beginPath(); ctx.moveTo(w.x1, w.y1); ctx.lineTo(w.x2, w.y2); ctx.stroke(); }

    // Landmarks + detection / re-observation logic
    for (const lm of LANDMARKS) {
      const dist = Math.hypot(lm.x - r.x, lm.y - r.y);
      const obs = observedRef.current.find(o => o.id === lm.id);
      const isVisible = dist < LANDMARK_DETECT_RANGE;

      if (isVisible && !obs) {
        // first detection: estimated position carries current drift
        observedRef.current.push({
          id: lm.id, observedCount: 1,
          x: lm.x + r.driftX * 0.5, y: lm.y + r.driftY * 0.5,
          color: lm.color,
        });
      } else if (isVisible && obs) {
        obs.observedCount++;
        // re-observation reduces uncertainty and refines the estimate toward truth
        r.posUncertainty = Math.max(6, r.posUncertainty - 0.9);
        r.driftX *= 0.96; r.driftY *= 0.96;
        obs.x += (lm.x - obs.x) * 0.05;
        obs.y += (lm.y - obs.y) * 0.05;
      }

      const known = !!obs;
      // sensor link line to landmarks currently in range
      if (isVisible) {
        ctx.strokeStyle = lm.color + '66';
        ctx.setLineDash([2, 3]);
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(r.x, r.y); ctx.lineTo(lm.x, lm.y); ctx.stroke();
        ctx.setLineDash([]);
      }

      ctx.shadowColor = known ? lm.color : 'rgba(0,255,65,0.1)';
      ctx.shadowBlur = known ? 12 : 3;
      ctx.beginPath();
      ctx.arc(lm.x, lm.y, 9, 0, Math.PI * 2);
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

    // Tire trail
    const trail = trailRef.current;
    const AXLE = 6;
    for (let i = 1; i < trail.length; i++) {
      const alpha = (i / trail.length) * 0.18;
      const p = trail[i - 1], q = trail[i];
      const perpPx = Math.sin(p.a) * AXLE, perpPy = -Math.cos(p.a) * AXLE;
      const perpQx = Math.sin(q.a) * AXLE, perpQy = -Math.cos(q.a) * AXLE;
      ctx.strokeStyle = `rgba(0,180,40,${alpha})`;
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(p.x - perpPx, p.y - perpPy); ctx.lineTo(q.x - perpQx, q.y - perpQy); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(p.x + perpPx, p.y + perpPy); ctx.lineTo(q.x + perpQx, q.y + perpQy); ctx.stroke();
    }

    // Uncertainty ellipse (grows with drift, shrinks on re-sighting)
    ctx.beginPath();
    ctx.ellipse(r.x, r.y, r.posUncertainty, r.posUncertainty * 0.7, r.angle, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(255,107,53,${Math.min(0.55, r.posUncertainty / 60)})`;
    ctx.lineWidth = 1.5;
    ctx.setLineDash([3, 3]);
    ctx.stroke();
    ctx.setLineDash([]);

    // Robot body — car shape
    ctx.save();
    ctx.translate(r.x, r.y);
    ctx.rotate(r.angle);
    ctx.shadowColor = ACCENT; ctx.shadowBlur = 12;
    ctx.fillStyle = ACCENT;
    ctx.beginPath(); ctx.roundRect(-10, -6, 20, 12, 3); ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.beginPath(); ctx.roundRect(2, -4, 7, 8, 2); ctx.fill();
    ctx.fillStyle = '#003010';
    [[-7, -7], [-7, 7], [5, -7], [5, 7]].forEach(([wx, wy]) => {
      ctx.beginPath(); ctx.roundRect(wx - 3, wy - 2, 6, 4, 1); ctx.fill();
    });
    ctx.restore();

    // Loop-closure border flash
    if (loopFlashRef.current > 0) {
      const a = Math.min(0.9, loopFlashRef.current / 30);
      ctx.strokeStyle = `rgba(0,255,65,${a})`;
      ctx.lineWidth = 6;
      ctx.strokeRect(3, 3, W - 6, H - 6);
    }

    // HUD
    ctx.fillStyle = 'rgba(0,0,0,0.9)';
    ctx.fillRect(10, 10, 230, 54);
    ctx.strokeStyle = 'rgba(0,255,65,0.15)';
    ctx.lineWidth = 1;
    ctx.strokeRect(10, 10, 230, 54);
    ctx.font = '10px monospace';
    ctx.fillStyle = 'rgba(0,255,65,0.6)';
    ctx.fillText(`uncertainty: ${r.posUncertainty.toFixed(1)}px   drift: ${Math.hypot(r.driftX, r.driftY).toFixed(1)}`, 20, 28);
    ctx.fillText(`landmarks: ${observedRef.current.length}/${LANDMARKS.length}   loops: ${loopCountRef.current}`, 20, 44);
    ctx.fillText(`WASD/arrows · click = waypoint`, 20, 58);

    // Loop-closure banner
    if (loopBannerRef.current > 0) {
      ctx.fillStyle = 'rgba(0,40,10,0.92)';
      ctx.fillRect(W / 2 - 110, 16, 220, 26);
      ctx.strokeStyle = ACCENT; ctx.lineWidth = 1;
      ctx.strokeRect(W / 2 - 110, 16, 220, 26);
      ctx.fillStyle = ACCENT;
      ctx.font = 'bold 12px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('LOOP CLOSURE — MAP CORRECTED', W / 2, 33);
      ctx.textAlign = 'left';
    }
  }, []);

  // ---------- Occupancy-grid map panel draw ----------
  const drawMap = useCallback(() => {
    const canvas = mapRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    const grid = gridRef.current;

    ctx.fillStyle = '#050805';
    ctx.fillRect(0, 0, W, H);

    let known = 0;
    for (let gy = 0; gy < GH; gy++) {
      for (let gx = 0; gx < GW; gx++) {
        const v = grid[gy * GW + gx];
        if (v === 0) continue; // unknown -> leave dark background
        known++;
        if (v >= OCC_THRESH) {
          // occupied — bright accent
          const t = Math.min(1, v / L_CLAMP);
          ctx.fillStyle = `rgba(0,255,65,${0.35 + t * 0.55})`;
        } else if (v <= FREE_THRESH) {
          // free — dim green
          ctx.fillStyle = 'rgba(0,90,30,0.5)';
        } else {
          // weakly observed
          ctx.fillStyle = 'rgba(0,120,40,0.18)';
        }
        ctx.fillRect(gx * CELL, gy * CELL, CELL, CELL);
      }
    }

    // Landmarks promoted to the map with IDs
    for (const o of observedRef.current) {
      ctx.beginPath();
      ctx.arc(o.x, o.y, 6, 0, Math.PI * 2);
      ctx.fillStyle = o.color + '55';
      ctx.strokeStyle = o.color;
      ctx.lineWidth = 1.5;
      ctx.fill(); ctx.stroke();
      ctx.fillStyle = o.color;
      ctx.font = 'bold 10px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('L' + o.id, o.x, o.y - 9);
      ctx.textAlign = 'left';
    }

    // Robot pose on map
    const r = robotRef.current;
    ctx.save();
    ctx.translate(r.x, r.y);
    ctx.rotate(r.angle);
    ctx.fillStyle = ACCENT;
    ctx.beginPath();
    ctx.moveTo(8, 0); ctx.lineTo(-6, -5); ctx.lineTo(-6, 5); ctx.closePath();
    ctx.fill();
    ctx.restore();

    const explored = Math.round((known / (GW * GH)) * 100);

    // Map HUD
    ctx.fillStyle = 'rgba(0,0,0,0.85)';
    ctx.fillRect(10, 10, 170, 34);
    ctx.strokeStyle = 'rgba(0,255,65,0.15)';
    ctx.lineWidth = 1;
    ctx.strokeRect(10, 10, 170, 34);
    ctx.font = '10px monospace';
    ctx.fillStyle = 'rgba(0,255,65,0.6)';
    ctx.fillText('OCCUPANCY MAP (log-odds)', 18, 26);
    ctx.fillText(`explored: ${explored}%`, 18, 39);

    return explored;
  }, []);

  // ---------- Loop-closure detection ----------
  const checkLoopClosure = useCallback((r: RobotState) => {
    if (loopCooldownRef.current > 0) { loopCooldownRef.current--; return; }
    const key = Math.floor(r.x / 24) * 1000 + Math.floor(r.y / 24);
    const visited = visitedRef.current;
    // only counts as a real loop if we've traveled enough and accumulated drift
    const drift = Math.hypot(r.driftX, r.driftY);
    if (visited.has(key) && trailRef.current.length > 60 && drift > 6) {
      // trigger loop closure correction
      loopCountRef.current++;
      loopFlashRef.current = 40;
      loopBannerRef.current = 120;
      loopCooldownRef.current = 180;
      r.posUncertainty = Math.max(6, r.posUncertainty * 0.4);
      r.driftX *= 0.15; r.driftY *= 0.15;   // snap drift toward zero
      // pull landmark estimates back toward truth
      for (const o of observedRef.current) {
        const lm = LANDMARKS.find(l => l.id === o.id)!;
        o.x += (lm.x - o.x) * 0.6;
        o.y += (lm.y - o.y) * 0.6;
      }
    }
    visited.add(key);
  }, []);

  const resetMap = useCallback(() => {
    gridRef.current = new Float32Array(GW * GH);
    observedRef.current = [];
    visitedRef.current = new Set();
    trailRef.current = [];
    loopCountRef.current = 0;
    loopFlashRef.current = 0;
    loopBannerRef.current = 0;
    loopCooldownRef.current = 0;
    exploredRef.current = 0;
    notifiedRef.current = false;
    const r = robotRef.current;
    r.posUncertainty = 40; r.driftX = 0; r.driftY = 0;
    dirtyRef.current = true;
    mapDirtyRef.current = true;
    setInfo({ uncertainty: 40, observed: 0, explored: 0, loops: 0 });
  }, []);

  // ---------- Physics + render loop ----------
  useEffect(() => {
    const update = () => {
      const r = robotRef.current;
      const keys = keysRef.current;
      const MAX_SPEED = 4.5;
      const ACCEL = 0.45;
      const FRICTION = 0.82;
      const MAX_TURN = 0.055;

      const speed = Math.hypot(r.vx, r.vy);
      const turnFactor = Math.min(1, speed / 2);

      // ---- auto-drive toward waypoint ----
      const wp = waypointRef.current;
      let autoTurn = 0, autoThrust = false;
      if (wp) {
        const dx = wp.x - r.x, dy = wp.y - r.y;
        const distWp = Math.hypot(dx, dy);
        if (distWp < 12) {
          waypointRef.current = null;
        } else {
          const desired = Math.atan2(dy, dx);
          let da = desired - r.angle;
          while (da > Math.PI) da -= Math.PI * 2;
          while (da < -Math.PI) da += Math.PI * 2;
          autoTurn = Math.max(-1, Math.min(1, da * 3)) * MAX_TURN;
          autoThrust = Math.abs(da) < 1.0;
        }
      }

      const manualTurn = keys.has('ArrowLeft') || keys.has('a') ? -MAX_TURN * turnFactor
                       : keys.has('ArrowRight') || keys.has('d') ? MAX_TURN * turnFactor : 0;
      r.va = manualTurn !== 0 ? manualTurn : autoTurn * Math.max(0.2, turnFactor);

      if (keys.has('ArrowUp') || keys.has('w') || autoThrust) {
        r.vx += ACCEL * Math.cos(r.angle);
        r.vy += ACCEL * Math.sin(r.angle);
      } else if (keys.has('ArrowDown') || keys.has('s')) {
        r.vx -= ACCEL * Math.cos(r.angle) * 0.7;
        r.vy -= ACCEL * Math.sin(r.angle) * 0.7;
      }

      const spd0 = Math.hypot(r.vx, r.vy);
      if (spd0 > MAX_SPEED) { r.vx = (r.vx / spd0) * MAX_SPEED; r.vy = (r.vy / spd0) * MAX_SPEED; }
      r.vx *= FRICTION;
      r.vy *= FRICTION;

      const nx = r.x + r.vx, ny = r.y + r.vy;
      let blocked = false;
      for (const w of WALLS) {
        const wx = w.x2 - w.x1, wy = w.y2 - w.y1;
        const len2 = wx * wx + wy * wy;
        const t = Math.max(0, Math.min(1, ((nx - w.x1) * wx + (ny - w.y1) * wy) / len2));
        const cx = w.x1 + t * wx, cy = w.y1 + t * wy;
        if (Math.hypot(nx - cx, ny - cy) < 14) { blocked = true; break; }
      }
      if (!blocked) { r.x = nx; r.y = ny; } else { r.vx *= -0.3; r.vy *= -0.3; waypointRef.current = null; }
      r.angle += r.va;

      const spd = Math.hypot(r.vx, r.vy);
      const moving = spd > 0.2;

      // Trail
      const trail = trailRef.current;
      if (spd > 0.3) {
        trail.push({ x: r.x, y: r.y, a: r.angle });
        if (trail.length > 160) trail.shift();
        dirtyRef.current = true;
      }

      // dead-reckoning drift accumulates while moving
      if (moving && !blocked) {
        r.posUncertainty = Math.min(60, r.posUncertainty + 0.05);
        r.driftX += (Math.random() - 0.5) * 0.35 * spd * 0.3;
        r.driftY += (Math.random() - 0.5) * 0.35 * spd * 0.3;
        checkLoopClosure(r);
      }

      if (loopFlashRef.current > 0) { loopFlashRef.current--; dirtyRef.current = true; }
      if (loopBannerRef.current > 0) { loopBannerRef.current--; dirtyRef.current = true; }

      // Recompute rays + update map only when robot moved
      const lp = lastRayPosRef.current;
      const moved = Math.hypot(r.x - lp.x, r.y - lp.y) > 1.5;
      if (moved || raysRef.current.length === 0) {
        raysRef.current = computeRays(r.x, r.y);
        updateGrid(r.x, r.y, raysRef.current);
        lastRayPosRef.current = { x: r.x, y: r.y };
        dirtyRef.current = true;
      }

      if (dirtyRef.current) {
        draw(raysRef.current);
        dirtyRef.current = false;
      }

      if (mapDirtyRef.current) {
        exploredRef.current = drawMap() ?? exploredRef.current;
        mapDirtyRef.current = false;
      }

      frameCountRef.current++;
      if (frameCountRef.current % 6 === 0) {
        setInfo({
          uncertainty: r.posUncertainty,
          observed: observedRef.current.length,
          explored: exploredRef.current,
          loops: loopCountRef.current,
        });
      }

      if (r.posUncertainty < 12 && observedRef.current.length >= 3 && !notifiedRef.current) {
        notifiedRef.current = true;
        onUncertaintyLow?.();
      }

      rafRef.current = requestAnimationFrame(update);
    };
    rafRef.current = requestAnimationFrame(update);
    return () => cancelAnimationFrame(rafRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draw, drawMap, updateGrid, checkLoopClosure, onUncertaintyLow]);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      const k = e.key;
      if (['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','w','a','s','d','W','A','S','D'].includes(k)) {
        keysRef.current.add(k.length === 1 ? k.toLowerCase() : k);
        dirtyRef.current = true;
        e.preventDefault();
      }
    };
    const up = (e: KeyboardEvent) => {
      const k = e.key;
      keysRef.current.delete(k.length === 1 ? k.toLowerCase() : k);
      dirtyRef.current = true;
    };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    return () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up); };
  }, []);

  const onCanvasClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * W;
    const y = ((e.clientY - rect.top) / rect.height) * H;
    waypointRef.current = { x, y };
    dirtyRef.current = true;
  }, []);

  const chipStyle: React.CSSProperties = {
    background: '#000', border: '1px solid rgba(0,255,65,0.1)',
    borderRadius: 3, padding: '10px 12px',
  };
  const monoFont = 'var(--font-jetbrains-mono, var(--font-geist-mono))';

  return (
    <div>
      <div style={{
        marginBottom: 10, fontSize: 11, color: '#3a5a3a',
        fontFamily: monoFont, letterSpacing: '0.04em',
        display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap',
      }}>
        <span>
          drive:{' '}
          {['W','A','S','D'].map(k => (
            <kbd key={k} style={{
              background: '#000', border: '1px solid rgba(0,255,65,0.2)',
              borderRadius: 2, padding: '2px 5px', fontSize: 10, marginRight: 3,
              fontFamily: 'inherit',
            }}>{k}</kbd>
          ))}
          — click canvas to set a waypoint
        </span>
        <button
          onClick={resetMap}
          style={{
            marginLeft: 'auto', background: '#000',
            border: '1px solid rgba(0,255,65,0.35)', color: ACCENT,
            borderRadius: 3, padding: '5px 12px', fontSize: 10,
            fontFamily: monoFont, letterSpacing: '0.06em', cursor: 'pointer',
            textTransform: 'uppercase',
          }}
        >
          Reset Map
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
        <div className="sim-canvas-wrap">
          <canvas ref={canvasRef} width={W} height={H} onClick={onCanvasClick}
            style={{ display: 'block', width: '100%', height: 'auto', cursor: 'crosshair' }} />
        </div>
        <div className="sim-canvas-wrap">
          <canvas ref={mapRef} width={W} height={H}
            style={{ display: 'block', width: '100%', height: 'auto' }} />
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
        {[
          {
            label: 'POS_UNCERTAINTY',
            value: info.uncertainty.toFixed(1) + 'px',
            color: info.uncertainty < 15 ? ACCENT : info.uncertainty < 30 ? '#f59e0b' : '#ff6b35',
          },
          { label: 'LANDMARKS_SEEN', value: `${info.observed}/${LANDMARKS.length}`, color: '#e8ffe8' },
          { label: 'EXPLORED', value: info.explored + '%', color: '#e8ffe8' },
          { label: 'LOOP_CLOSURES', value: String(info.loops), color: info.loops > 0 ? ACCENT : '#3a5a3a' },
        ].map(chip => (
          <div key={chip.label} style={chipStyle}>
            <div style={{
              fontSize: 9, color: '#3a5a3a', fontFamily: monoFont,
              letterSpacing: '0.08em', textTransform: 'uppercase',
            }}>{chip.label}</div>
            <div style={{
              fontFamily: monoFont, fontSize: 14, fontWeight: 700,
              color: chip.color, marginTop: 3,
            }}>{chip.value}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
