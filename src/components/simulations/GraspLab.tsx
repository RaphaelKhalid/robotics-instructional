'use client';

import { useEffect, useRef, useState, useCallback } from 'react';

const W = 560, H = 340;
const CX = 280, CY = 170, BW = 90, BH = 70;  // box half-extents

interface Contact { x: number; y: number; nx: number; ny: number; }

// Precompute unit directions on the sphere (Fibonacci) for the force-closure test
const DIRS: [number, number, number][] = (() => {
  const out: [number, number, number][] = [];
  const n = 220, phi = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < n; i++) {
    const y = 1 - (i / (n - 1)) * 2;
    const r = Math.sqrt(1 - y * y);
    const th = phi * i;
    out.push([Math.cos(th) * r, y, Math.sin(th) * r]);
  }
  return out;
})();

function projectToBox(px: number, py: number): Contact {
  const left = CX - BW, right = CX + BW, top = CY - BH, bottom = CY + BH;
  const cx = Math.max(left, Math.min(right, px));
  const cy = Math.max(top, Math.min(bottom, py));
  // distance to each edge
  const dl = Math.abs(cx - left), dr = Math.abs(cx - right), dt = Math.abs(cy - top), db = Math.abs(cy - bottom);
  const m = Math.min(dl, dr, dt, db);
  if (m === dl) return { x: left, y: cy, nx: 1, ny: 0 };
  if (m === dr) return { x: right, y: cy, nx: -1, ny: 0 };
  if (m === dt) return { x: cx, y: top, nx: 0, ny: 1 };
  return { x: cx, y: bottom, nx: 0, ny: -1 };
}

export default function GraspLab() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const contactsRef = useRef<Contact[]>([
    projectToBox(CX - BW, CY), projectToBox(CX + BW, CY), projectToBox(CX, CY - BH),
  ]);
  const muRef = useRef(0.5);
  const dragRef = useRef(-1);
  const rafRef = useRef(0);

  const [mu, setMu] = useState(0.5);
  const [info, setInfo] = useState({ closed: false, contacts: 3 });

  const evaluate = useCallback(() => {
    const mu = muRef.current;
    const cone = Math.atan(mu);
    const gens: [number, number, number][] = [];
    for (const c of contactsRef.current) {
      const base = Math.atan2(c.ny, c.nx);
      for (const s of [-1, 1]) {
        const a = base + s * cone;
        const fx = Math.cos(a), fy = Math.sin(a);
        const rx = c.x - CX, ry = c.y - CY;
        const tau = (rx * fy - ry * fx) / 100; // scale torque to similar magnitude
        const m = Math.hypot(fx, fy, tau) || 1;
        gens.push([fx / m, fy / m, tau / m]);
      }
    }
    // Force closure ⟺ generators positively span R³ ⟺ no direction w with all gᵢ·w ≤ 0
    let separable = false;
    for (const w of DIRS) {
      let allNeg = true;
      for (const g of gens) {
        if (g[0] * w[0] + g[1] * w[1] + g[2] * w[2] > 0.04) { allNeg = false; break; }
      }
      if (allNeg) { separable = true; break; }
    }
    return !separable;
  }, []);

  const draw = useCallback((closed: boolean) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    const mu = muRef.current;
    const cone = Math.atan(mu);

    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = '#050505'; ctx.fillRect(0, 0, W, H);

    // Box
    ctx.fillStyle = closed ? 'rgba(16,217,138,0.10)' : 'rgba(255,107,107,0.08)';
    ctx.strokeStyle = closed ? '#10d98a' : '#ff6b6b';
    ctx.lineWidth = 2;
    ctx.fillRect(CX - BW, CY - BH, BW * 2, BH * 2);
    ctx.strokeRect(CX - BW, CY - BH, BW * 2, BH * 2);
    // center of mass
    ctx.fillStyle = 'rgba(0,255,65,0.4)';
    ctx.beginPath(); ctx.arc(CX, CY, 3, 0, Math.PI * 2); ctx.fill();

    // Contacts + friction cones
    for (const c of contactsRef.current) {
      const base = Math.atan2(c.ny, c.nx);
      const len = 46;
      const e1 = base - cone, e2 = base + cone;
      ctx.fillStyle = 'rgba(245,158,11,0.18)';
      ctx.strokeStyle = '#f59e0b'; ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(c.x, c.y);
      ctx.lineTo(c.x + len * Math.cos(e1), c.y + len * Math.sin(e1));
      ctx.lineTo(c.x + len * Math.cos(e2), c.y + len * Math.sin(e2));
      ctx.closePath(); ctx.fill(); ctx.stroke();
      // normal
      ctx.strokeStyle = 'rgba(0,255,65,0.5)';
      ctx.beginPath(); ctx.moveTo(c.x, c.y); ctx.lineTo(c.x + 30 * c.nx, c.y + 30 * c.ny); ctx.stroke();
      // contact dot
      ctx.fillStyle = '#00ff41';
      ctx.shadowColor = '#00ff41'; ctx.shadowBlur = 8;
      ctx.beginPath(); ctx.arc(c.x, c.y, 6, 0, Math.PI * 2); ctx.fill();
      ctx.shadowBlur = 0;
    }

    // status
    ctx.fillStyle = closed ? '#10d98a' : '#ff6b6b';
    ctx.font = 'bold 13px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(closed ? '✓ FORCE CLOSURE' : '✗ NOT FORCE-CLOSED', CX, 28);
    ctx.textAlign = 'left';
    ctx.fillStyle = 'rgba(0,255,65,0.4)';
    ctx.font = '10px monospace';
    ctx.fillText('drag the green contacts around the box', 12, H - 8);
  }, []);

  useEffect(() => {
    let frame = 0;
    const loop = () => {
      const closed = evaluate();
      draw(closed);
      frame++;
      if (frame % 6 === 0) {
        setInfo(prev => (prev.closed === closed && prev.contacts === contactsRef.current.length)
          ? prev : { closed, contacts: contactsRef.current.length });
      }
      rafRef.current = requestAnimationFrame(loop);
    };
    loop();
    return () => cancelAnimationFrame(rafRef.current);
  }, [evaluate, draw]);

  const getPos = (e: React.MouseEvent) => {
    const canvas = canvasRef.current!;
    const r = canvas.getBoundingClientRect();
    return {
      x: (e.clientX - r.left) * (canvas.width / r.width),
      y: (e.clientY - r.top) * (canvas.height / r.height),
    };
  };

  const onDown = (e: React.MouseEvent) => {
    const p = getPos(e);
    dragRef.current = contactsRef.current.findIndex(c => Math.hypot(c.x - p.x, c.y - p.y) < 16);
  };
  const onMove = (e: React.MouseEvent) => {
    if (dragRef.current < 0) return;
    const p = getPos(e);
    contactsRef.current[dragRef.current] = projectToBox(p.x, p.y);
  };
  const onUp = () => { dragRef.current = -1; };

  return (
    <div>
      <div className="sim-canvas-wrap" style={{ marginBottom: 16 }}>
        <canvas ref={canvasRef} width={W} height={H}
          style={{ display: 'block', width: '100%', height: 'auto', cursor: 'grab' }}
          onMouseDown={onDown} onMouseMove={onMove} onMouseUp={onUp} onMouseLeave={onUp} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px,1fr))', gap: 8, marginBottom: 16 }}>
        {[
          { label: 'Grasp status', value: info.closed ? 'Force-closed' : 'Open', color: info.closed ? '#10d98a' : '#ff6b6b' },
          { label: 'Contacts', value: String(info.contacts), color: '#00ff41' },
          { label: 'Cone half-angle', value: (Math.atan(mu) * 180 / Math.PI).toFixed(0) + '°', color: '#f59e0b' },
        ].map(chip => (
          <div key={chip.label} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 10px' }}>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase' as const }}>{chip.label}</div>
            <div style={{ fontFamily: 'var(--font-geist-mono)', fontSize: 14, fontWeight: 600, color: chip.color, marginTop: 2 }}>{chip.value}</div>
          </div>
        ))}
      </div>

      <div style={{ marginBottom: 10 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>
          <span>Friction coefficient μ</span>
          <span style={{ fontFamily: 'var(--font-geist-mono)', color: 'var(--text-secondary)' }}>{mu.toFixed(2)}</span>
        </div>
        <input type="range" min={0} max={1.2} step={0.05} value={mu}
          onChange={e => { const v = Number(e.target.value); setMu(v); muRef.current = v; }}
          style={{ width: '100%', accentColor: '#f59e0b' }} />
      </div>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' as const, marginTop: 12 }}>
        {[
          { label: '+ Add contact', fn: () => { if (contactsRef.current.length < 4) contactsRef.current.push(projectToBox(CX, CY + BH)); } },
          { label: '− Remove contact', fn: () => { if (contactsRef.current.length > 2) contactsRef.current.pop(); } },
          { label: 'Reset (3-point)', fn: () => { contactsRef.current = [projectToBox(CX - BW, CY), projectToBox(CX + BW, CY), projectToBox(CX, CY - BH)]; } },
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
