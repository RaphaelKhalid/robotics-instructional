'use client';

import { useEffect, useRef, useState, useCallback } from 'react';

const W = 560, H = 360;
const N = 45;
const MAX_SPEED = 2.6;
const MAX_FORCE = 0.08;

interface Boid { x: number; y: number; vx: number; vy: number; }
interface Obstacle { x: number; y: number; r: number; }

function rand(a: number, b: number) { return a + Math.random() * (b - a); }

export default function SwarmLab() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const boidsRef = useRef<Boid[]>([]);
  const obsRef = useRef<Obstacle[]>([]);
  const mouseRef = useRef({ x: -100, y: -100 });
  const paramsRef = useRef({ sep: 1.5, ali: 1.0, coh: 1.0, perc: 60 });
  const rafRef = useRef(0);

  const [params, setParams] = useState({ sep: 1.5, ali: 1.0, coh: 1.0, perc: 60 });

  if (boidsRef.current.length === 0) {
    boidsRef.current = Array.from({ length: N }, () => ({
      x: rand(0, W), y: rand(0, H),
      vx: rand(-1, 1), vy: rand(-1, 1),
    }));
  }

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = '#050505';
    ctx.fillRect(0, 0, W, H);

    // perception radius around cursor
    const m = mouseRef.current;
    if (m.x > 0) {
      ctx.strokeStyle = 'rgba(0,255,65,0.12)';
      ctx.setLineDash([3, 4]);
      ctx.beginPath(); ctx.arc(m.x, m.y, paramsRef.current.perc, 0, Math.PI * 2); ctx.stroke();
      ctx.setLineDash([]);
    }

    // obstacles
    for (const o of obsRef.current) {
      ctx.fillStyle = 'rgba(255,107,107,0.15)';
      ctx.strokeStyle = '#ff6b6b'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(o.x, o.y, o.r, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    }

    // boids
    for (const b of boidsRef.current) {
      const ang = Math.atan2(b.vy, b.vx);
      ctx.save();
      ctx.translate(b.x, b.y);
      ctx.rotate(ang);
      ctx.fillStyle = '#00ff41';
      ctx.shadowColor = '#00ff41'; ctx.shadowBlur = 6;
      ctx.beginPath();
      ctx.moveTo(6, 0); ctx.lineTo(-4, 3); ctx.lineTo(-4, -3);
      ctx.closePath(); ctx.fill();
      ctx.restore();
    }
    ctx.shadowBlur = 0;

    ctx.fillStyle = 'rgba(0,255,65,0.4)';
    ctx.font = '10px monospace';
    ctx.fillText('click to add / remove obstacles', 12, H - 8);
  }, []);

  useEffect(() => {
    const update = () => {
      const p = paramsRef.current;
      const boids = boidsRef.current;
      const obs = obsRef.current;
      const R = p.perc, R2 = R * R;

      for (const b of boids) {
        let sepX = 0, sepY = 0, aliX = 0, aliY = 0, cohX = 0, cohY = 0, count = 0;
        for (const other of boids) {
          if (other === b) continue;
          const dx = b.x - other.x, dy = b.y - other.y;
          const d2 = dx * dx + dy * dy;
          if (d2 < R2 && d2 > 0) {
            const d = Math.sqrt(d2);
            sepX += dx / d2; sepY += dy / d2;     // separation (inverse distance)
            aliX += other.vx; aliY += other.vy;   // alignment
            cohX += other.x; cohY += other.y;     // cohesion (centroid)
            count++;
          }
        }

        let ax = 0, ay = 0;
        if (count > 0) {
          // separation
          ax += sepX * p.sep * 0.9;
          ay += sepY * p.sep * 0.9;
          // alignment
          const al = Math.hypot(aliX, aliY) || 1;
          ax += (aliX / al) * p.ali * MAX_FORCE * 5;
          ay += (aliY / al) * p.ali * MAX_FORCE * 5;
          // cohesion
          const cx = cohX / count - b.x, cy = cohY / count - b.y;
          const cl = Math.hypot(cx, cy) || 1;
          ax += (cx / cl) * p.coh * MAX_FORCE * 5;
          ay += (cy / cl) * p.coh * MAX_FORCE * 5;
        }

        // obstacle avoidance
        for (const o of obs) {
          const dx = b.x - o.x, dy = b.y - o.y;
          const d = Math.hypot(dx, dy);
          if (d < o.r + 40 && d > 0) {
            const f = (o.r + 40 - d) / (o.r + 40);
            ax += (dx / d) * f * 1.2;
            ay += (dy / d) * f * 1.2;
          }
        }

        // clamp force
        const fm = Math.hypot(ax, ay);
        if (fm > MAX_FORCE * 6) { ax = (ax / fm) * MAX_FORCE * 6; ay = (ay / fm) * MAX_FORCE * 6; }

        b.vx += ax; b.vy += ay;
        const sp = Math.hypot(b.vx, b.vy);
        if (sp > MAX_SPEED) { b.vx = (b.vx / sp) * MAX_SPEED; b.vy = (b.vy / sp) * MAX_SPEED; }
        if (sp < 0.4) { b.vx *= 1.1; b.vy *= 1.1; }

        b.x += b.vx; b.y += b.vy;
        // wrap edges
        if (b.x < 0) b.x += W; if (b.x > W) b.x -= W;
        if (b.y < 0) b.y += H; if (b.y > H) b.y -= H;
      }
      draw();
      rafRef.current = requestAnimationFrame(update);
    };
    update();
    return () => cancelAnimationFrame(rafRef.current);
  }, [draw]);

  const setParam = (key: keyof typeof params, value: number) => {
    const next = { ...params, [key]: value };
    setParams(next);
    paramsRef.current = next;
  };

  const handleClick = (e: React.MouseEvent) => {
    const canvas = canvasRef.current!;
    const r = canvas.getBoundingClientRect();
    const x = (e.clientX - r.left) * (canvas.width / r.width);
    const y = (e.clientY - r.top) * (canvas.height / r.height);
    const obs = obsRef.current;
    const hit = obs.findIndex(o => Math.hypot(o.x - x, o.y - y) < o.r);
    if (hit >= 0) obs.splice(hit, 1);
    else obs.push({ x, y, r: 26 });
  };

  const handleMove = (e: React.MouseEvent) => {
    const canvas = canvasRef.current!;
    const r = canvas.getBoundingClientRect();
    mouseRef.current = {
      x: (e.clientX - r.left) * (canvas.width / r.width),
      y: (e.clientY - r.top) * (canvas.height / r.height),
    };
  };

  return (
    <div>
      <div className="sim-canvas-wrap" style={{ marginBottom: 16 }}>
        <canvas ref={canvasRef} width={W} height={H}
          style={{ display: 'block', width: '100%', height: 'auto', cursor: 'crosshair' }}
          onClick={handleClick} onMouseMove={handleMove} onMouseLeave={() => { mouseRef.current = { x: -100, y: -100 }; }} />
      </div>

      {([
        { key: 'sep', label: 'Separation', min: 0, max: 4, step: 0.1 },
        { key: 'ali', label: 'Alignment', min: 0, max: 4, step: 0.1 },
        { key: 'coh', label: 'Cohesion', min: 0, max: 4, step: 0.1 },
        { key: 'perc', label: 'Perception radius', min: 20, max: 140, step: 5 },
      ] as const).map(({ key, label, min, max, step }) => (
        <div key={key} style={{ marginBottom: 10 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>
            <span>{label}</span>
            <span style={{ fontFamily: 'var(--font-geist-mono)', color: 'var(--text-secondary)' }}>{params[key].toFixed(key === 'perc' ? 0 : 1)}</span>
          </div>
          <input type="range" min={min} max={max} step={step} value={params[key]}
            onChange={e => setParam(key, Number(e.target.value))} style={{ width: '100%', accentColor: '#00ff41' }} />
        </div>
      ))}

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' as const, marginTop: 12 }}>
        {[
          { label: 'Clear obstacles', fn: () => { obsRef.current = []; } },
          { label: 'Collapse (coh↑ sep0)', fn: () => setParams(p => { const n = { ...p, sep: 0, coh: 4 }; paramsRef.current = n; return n; }) },
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
