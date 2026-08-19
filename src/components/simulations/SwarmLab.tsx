'use client';

import { useEffect, useRef, useState, useCallback } from 'react';

const W = 560, H = 360;
const N = 120;                 // swarm size — spatial hashing keeps this smooth
const MAX_SPEED = 2.7;
const MIN_SPEED = 0.9;
const MAX_FORCE = 0.09;
const ACCENT = '0,255,65';  // rgb(0,255,65) / #00ff41

type ClickMode = 'obstacle' | 'goal' | 'predator';

interface Boid { x: number; y: number; vx: number; vy: number; leader: boolean; }
interface Obstacle { x: number; y: number; r: number; }
interface Vec { x: number; y: number; }

function rand(a: number, b: number) { return a + Math.random() * (b - a); }

interface Params { sep: number; ali: number; coh: number; perc: number; goalW: number; }
const DEFAULTS: Params = { sep: 1.6, ali: 1.0, coh: 0.9, perc: 55, goalW: 1.1 };

export default function SwarmLab() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const boidsRef = useRef<Boid[]>([]);
  const obsRef = useRef<Obstacle[]>([]);
  const goalRef = useRef<Vec | null>(null);
  const predatorRef = useRef<Vec | null>(null);
  const mouseRef = useRef({ x: -100, y: -100 });
  const paramsRef = useRef<Params>({ ...DEFAULTS });
  const clickModeRef = useRef<ClickMode>('obstacle');
  const leaderModeRef = useRef(false);
  const rafRef = useRef(0);
  const gridRef = useRef<Map<number, number[]>>(new Map());

  const [params, setParams] = useState<Params>({ ...DEFAULTS });
  const [clickMode, setClickMode] = useState<ClickMode>('obstacle');
  const [leaderMode, setLeaderMode] = useState(false);

  if (boidsRef.current.length === 0) {
    boidsRef.current = Array.from({ length: N }, (_, i) => ({
      x: rand(0, W), y: rand(0, H),
      vx: rand(-1, 1), vy: rand(-1, 1),
      leader: i === 0,
    }));
    obsRef.current = [
      { x: 180, y: 130, r: 30 },
      { x: 390, y: 240, r: 36 },
    ];
  }

  // ── Spatial hash: bucket boids by cell so neighbor lookups are ~O(n) ─────────
  const buildGrid = (cell: number) => {
    const g = gridRef.current;
    g.clear();
    const cols = Math.ceil(W / cell) + 1;
    const boids = boidsRef.current;
    for (let i = 0; i < boids.length; i++) {
      const b = boids[i];
      const cx = Math.floor(b.x / cell);
      const cy = Math.floor(b.y / cell);
      const key = cy * cols + cx;
      let arr = g.get(key);
      if (!arr) { arr = []; g.set(key, arr); }
      arr.push(i);
    }
    return cols;
  };

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;

    // Trail effect: fade previous frame instead of hard clear.
    ctx.fillStyle = 'rgba(5,6,8,0.28)';
    ctx.fillRect(0, 0, W, H);

    const boids = boidsRef.current;

    // obstacles
    for (const o of obsRef.current) {
      ctx.fillStyle = 'rgba(255,107,107,0.12)';
      ctx.strokeStyle = 'rgba(255,107,107,0.75)'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(o.x, o.y, o.r, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    }

    // goal / waypoint
    const goal = goalRef.current;
    if (goal) {
      const t = (Date.now() % 1600) / 1600;
      ctx.strokeStyle = `rgba(${ACCENT},${0.7 - t * 0.6})`;
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(goal.x, goal.y, 6 + t * 22, 0, Math.PI * 2); ctx.stroke();
      ctx.fillStyle = `rgb(${ACCENT})`;
      ctx.beginPath(); ctx.arc(goal.x, goal.y, 4, 0, Math.PI * 2); ctx.fill();
    }

    // predator
    const pred = predatorRef.current;
    if (pred) {
      ctx.save();
      ctx.translate(pred.x, pred.y);
      ctx.fillStyle = '#ff5ea8';
      ctx.shadowColor = '#ff5ea8'; ctx.shadowBlur = 14;
      ctx.beginPath(); ctx.arc(0, 0, 7, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
      ctx.shadowBlur = 0;
    }

    // boids
    for (const b of boids) {
      const ang = Math.atan2(b.vy, b.vx);
      ctx.save();
      ctx.translate(b.x, b.y);
      ctx.rotate(ang);
      if (b.leader && leaderModeRef.current) {
        ctx.fillStyle = '#ffe08a';
        ctx.shadowColor = '#ffe08a'; ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.moveTo(9, 0); ctx.lineTo(-5, 4); ctx.lineTo(-5, -4);
        ctx.closePath(); ctx.fill();
      } else {
        ctx.fillStyle = `rgb(${ACCENT})`;
        ctx.shadowColor = `rgb(${ACCENT})`; ctx.shadowBlur = 5;
        ctx.beginPath();
        ctx.moveTo(6, 0); ctx.lineTo(-4, 3); ctx.lineTo(-4, -3);
        ctx.closePath(); ctx.fill();
      }
      ctx.restore();
    }
    ctx.shadowBlur = 0;
  }, []);

  useEffect(() => {
    const update = () => {
      const p = paramsRef.current;
      const boids = boidsRef.current;
      const obs = obsRef.current;
      const goal = goalRef.current;
      const pred = predatorRef.current;
      const leaderMode = leaderModeRef.current;
      const R = p.perc, R2 = R * R;
      const cell = Math.max(24, R);
      const cols = buildGrid(cell);
      const grid = gridRef.current;
      const leader = boids[0];

      for (let i = 0; i < boids.length; i++) {
        const b = boids[i];
        let sepX = 0, sepY = 0, aliX = 0, aliY = 0, cohX = 0, cohY = 0, count = 0;

        const bcx = Math.floor(b.x / cell);
        const bcy = Math.floor(b.y / cell);
        // scan 3x3 block of cells around this boid only
        for (let gy = bcy - 1; gy <= bcy + 1; gy++) {
          for (let gx = bcx - 1; gx <= bcx + 1; gx++) {
            const bucket = grid.get(gy * cols + gx);
            if (!bucket) continue;
            for (const j of bucket) {
              if (j === i) continue;
              const other = boids[j];
              const dx = b.x - other.x, dy = b.y - other.y;
              const d2 = dx * dx + dy * dy;
              if (d2 < R2 && d2 > 0) {
                sepX += dx / d2; sepY += dy / d2;   // separation (inverse-distance)
                aliX += other.vx; aliY += other.vy; // alignment
                cohX += other.x; cohY += other.y;   // cohesion (toward centroid)
                count++;
              }
            }
          }
        }

        let ax = 0, ay = 0;
        if (count > 0) {
          ax += sepX * p.sep * 0.9;
          ay += sepY * p.sep * 0.9;
          const al = Math.hypot(aliX, aliY) || 1;
          ax += (aliX / al) * p.ali * MAX_FORCE * 5;
          ay += (aliY / al) * p.ali * MAX_FORCE * 5;
          const cx = cohX / count - b.x, cy = cohY / count - b.y;
          const cl = Math.hypot(cx, cy) || 1;
          ax += (cx / cl) * p.coh * MAX_FORCE * 5;
          ay += (cy / cl) * p.coh * MAX_FORCE * 5;
        }

        // leader-follow: non-leaders steer toward the leader agent
        if (leaderMode && !b.leader && leader) {
          const dx = leader.x - b.x, dy = leader.y - b.y;
          const dl = Math.hypot(dx, dy) || 1;
          ax += (dx / dl) * p.goalW * MAX_FORCE * 5;
          ay += (dy / dl) * p.goalW * MAX_FORCE * 5;
        }

        // goal-seek: everyone (or leader, in leader mode) steers to the waypoint
        if (goal && (!leaderMode || b.leader)) {
          const dx = goal.x - b.x, dy = goal.y - b.y;
          const dl = Math.hypot(dx, dy) || 1;
          ax += (dx / dl) * p.goalW * MAX_FORCE * 6;
          ay += (dy / dl) * p.goalW * MAX_FORCE * 6;
        }

        // predator avoidance: strong flee within a fear radius
        if (pred) {
          const dx = b.x - pred.x, dy = b.y - pred.y;
          const d = Math.hypot(dx, dy);
          const FEAR = 90;
          if (d < FEAR && d > 0) {
            const f = (FEAR - d) / FEAR;
            ax += (dx / d) * f * 2.2;
            ay += (dy / d) * f * 2.2;
          }
        }

        // obstacle avoidance
        for (const o of obs) {
          const dx = b.x - o.x, dy = b.y - o.y;
          const d = Math.hypot(dx, dy);
          const margin = o.r + 34;
          if (d < margin && d > 0) {
            const f = (margin - d) / margin;
            ax += (dx / d) * f * 1.6;
            ay += (dy / d) * f * 1.6;
          }
        }

        // clamp steering force
        const fm = Math.hypot(ax, ay);
        const maxF = MAX_FORCE * 6;
        if (fm > maxF) { ax = (ax / fm) * maxF; ay = (ay / fm) * maxF; }

        b.vx += ax; b.vy += ay;
        let sp = Math.hypot(b.vx, b.vy);
        const cap = b.leader && leaderMode ? MAX_SPEED * 0.85 : MAX_SPEED;
        if (sp > cap) { b.vx = (b.vx / sp) * cap; b.vy = (b.vy / sp) * cap; sp = cap; }
        if (sp < MIN_SPEED) { const k = MIN_SPEED / (sp || 1); b.vx *= k; b.vy *= k; }

        b.x += b.vx; b.y += b.vy;
        // wrap edges (toroidal world)
        if (b.x < 0) b.x += W; else if (b.x > W) b.x -= W;
        if (b.y < 0) b.y += H; else if (b.y > H) b.y -= H;
      }
      draw();
      rafRef.current = requestAnimationFrame(update);
    };
    update();
    return () => cancelAnimationFrame(rafRef.current);
  }, [draw]);

  const setParam = (key: keyof Params, value: number) => {
    setParams(prev => {
      const next = { ...prev, [key]: value };
      paramsRef.current = next;
      return next;
    });
  };

  const toCanvas = (e: React.MouseEvent) => {
    const canvas = canvasRef.current!;
    const r = canvas.getBoundingClientRect();
    return {
      x: (e.clientX - r.left) * (canvas.width / r.width),
      y: (e.clientY - r.top) * (canvas.height / r.height),
    };
  };

  const handleClick = (e: React.MouseEvent) => {
    const { x, y } = toCanvas(e);
    const mode = clickModeRef.current;
    if (mode === 'goal') {
      goalRef.current = { x, y };
      return;
    }
    if (mode === 'predator') {
      const pr = predatorRef.current;
      // toggle off if clicking near the existing predator
      if (pr && Math.hypot(pr.x - x, pr.y - y) < 20) predatorRef.current = null;
      else predatorRef.current = { x, y };
      return;
    }
    // obstacle mode: add, or remove if clicking an existing one
    const obs = obsRef.current;
    const hit = obs.findIndex(o => Math.hypot(o.x - x, o.y - y) < o.r);
    if (hit >= 0) obs.splice(hit, 1);
    else obs.push({ x, y, r: 28 });
  };

  const handleMove = (e: React.MouseEvent) => {
    const { x, y } = toCanvas(e);
    mouseRef.current = { x, y };
    // predator follows cursor while dragging in predator mode
    if (clickModeRef.current === 'predator' && predatorRef.current && e.buttons === 1) {
      predatorRef.current = { x, y };
    }
  };

  const hint =
    clickMode === 'obstacle' ? 'Click empty space to add an obstacle · click one to remove it'
    : clickMode === 'goal' ? 'Click to set a waypoint the swarm seeks (drag Goal weight up)'
    : 'Click to drop a predator the flock flees · drag to move it · click it to remove';

  const modeBtn = (m: ClickMode, label: string) => {
    const active = clickMode === m;
    return (
      <button key={m} onClick={() => { setClickMode(m); clickModeRef.current = m; }} style={{
        background: active ? `rgba(${ACCENT},0.15)` : 'var(--bg-card)',
        border: `1px solid ${active ? `rgba(${ACCENT},0.6)` : 'var(--border)'}`,
        color: active ? `rgb(${ACCENT})` : 'var(--text-secondary)',
        borderRadius: 8, padding: '7px 12px', fontSize: 12, fontWeight: 600,
        cursor: 'pointer', fontFamily: 'var(--font-geist-sans)',
      }}>{label}</button>
    );
  };

  return (
    <div>
      <div className="sim-canvas-wrap" style={{ marginBottom: 12 }}>
        <canvas ref={canvasRef} width={W} height={H}
          style={{ display: 'block', width: '100%', height: 'auto', cursor: 'crosshair' }}
          onClick={handleClick} onMouseMove={handleMove}
          onMouseLeave={() => { mouseRef.current = { x: -100, y: -100 }; }} />
      </div>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 6 }}>
        <span style={{ fontSize: 11, color: 'var(--text-muted)', alignSelf: 'center', marginRight: 2 }}>Click adds:</span>
        {modeBtn('obstacle', 'Obstacle')}
        {modeBtn('goal', 'Goal')}
        {modeBtn('predator', 'Predator')}
      </div>
      <div style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-geist-mono)', marginBottom: 14 }}>{hint}</div>

      {([
        { key: 'sep', label: 'Separation', min: 0, max: 4, step: 0.1 },
        { key: 'ali', label: 'Alignment', min: 0, max: 4, step: 0.1 },
        { key: 'coh', label: 'Cohesion', min: 0, max: 4, step: 0.1 },
        { key: 'goalW', label: 'Goal / leader weight', min: 0, max: 3, step: 0.1 },
        { key: 'perc', label: 'Perception radius', min: 20, max: 120, step: 5 },
      ] as const).map(({ key, label, min, max, step }) => (
        <div key={key} style={{ marginBottom: 10 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>
            <span>{label}</span>
            <span style={{ fontFamily: 'var(--font-geist-mono)', color: 'var(--text-secondary)' }}>{params[key].toFixed(key === 'perc' ? 0 : 1)}</span>
          </div>
          <input type="range" min={min} max={max} step={step} value={params[key]}
            onChange={e => setParam(key, Number(e.target.value))} style={{ width: '100%', accentColor: `rgb(${ACCENT})` }} />
        </div>
      ))}

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 12 }}>
        <button onClick={() => { const v = !leaderMode; setLeaderMode(v); leaderModeRef.current = v; }} style={{
          background: leaderMode ? `rgba(${ACCENT},0.15)` : 'var(--bg-card)',
          border: `1px solid ${leaderMode ? `rgba(${ACCENT},0.6)` : 'var(--border)'}`,
          color: leaderMode ? `rgb(${ACCENT})` : 'var(--text-secondary)',
          borderRadius: 8, padding: '8px 14px', fontSize: 12, fontWeight: 600,
          cursor: 'pointer', fontFamily: 'var(--font-geist-sans)',
        }}>Leader mode: {leaderMode ? 'ON' : 'OFF'}</button>

        {[
          { label: 'Clear obstacles', fn: () => { obsRef.current = []; } },
          { label: 'Clear goal', fn: () => { goalRef.current = null; } },
          { label: 'Remove predator', fn: () => { predatorRef.current = null; } },
          { label: 'Collapse (coh↑ sep0)', fn: () => setParam('coh', 4) },
          { label: 'Reset params', fn: () => { setParams({ ...DEFAULTS }); paramsRef.current = { ...DEFAULTS }; } },
        ].map(btn => (
          <button key={btn.label} onClick={btn.fn} style={{
            background: 'var(--bg-card)', border: '1px solid var(--border)',
            color: 'var(--text-secondary)', borderRadius: 8,
            padding: '8px 14px', fontSize: 12, fontWeight: 600, cursor: 'pointer',
            fontFamily: 'var(--font-geist-sans)',
          }}>{btn.label}</button>
        ))}
      </div>
    </div>
  );
}
