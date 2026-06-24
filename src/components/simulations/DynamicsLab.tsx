'use client';

import { useEffect, useRef, useState, useCallback } from 'react';

const W = 560, H = 320;
const DT = 1 / 60;
const L = 80;                  // pendulum length (px)
const PIV = { x: 130, y: 120 };
const PHASE = { x: 280, y: 10, w: 270, h: 300 };
const MAX_W = 8;               // phase-portrait angular-velocity range

const wrap = (a: number) => Math.atan2(Math.sin(a), Math.cos(a));

export default function DynamicsLab() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef({ theta: 0.3, omega: 0, torque: 0 });
  const trailRef = useRef<{ th: number; om: number }[]>([]);
  const keysRef = useRef<Set<string>>(new Set());
  const pdRef = useRef(false);
  const gravRef = useRef(9);
  const dampRef = useRef(0.3);
  const rafRef = useRef(0);
  const frameRef = useRef(0);

  const [pd, setPd] = useState(false);
  const [grav, setGrav] = useState(9);
  const [damp, setDamp] = useState(0.3);
  const [info, setInfo] = useState({ theta: 0, omega: 0, energy: 0, torque: 0 });

  // phase-space coordinate → screen
  const phX = (th: number) => PHASE.x + ((wrap(th) + Math.PI) / (2 * Math.PI)) * PHASE.w;
  const phY = (om: number) => PHASE.y + PHASE.h / 2 - (Math.max(-MAX_W, Math.min(MAX_W, om)) / MAX_W) * (PHASE.h / 2);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    const s = stateRef.current;
    const G = gravRef.current;

    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = '#050505';
    ctx.fillRect(0, 0, W, H);

    // ── Pendulum (left) ──
    ctx.strokeStyle = 'rgba(0,255,65,0.1)';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(PIV.x, PIV.y, L, 0, Math.PI * 2); ctx.stroke();
    // upright target marker
    ctx.fillStyle = 'rgba(245,158,11,0.5)';
    ctx.beginPath(); ctx.arc(PIV.x, PIV.y - L, 4, 0, Math.PI * 2); ctx.fill();

    const bx = PIV.x + L * Math.sin(s.theta);
    const by = PIV.y + L * Math.cos(s.theta);
    ctx.strokeStyle = '#00ff41'; ctx.lineWidth = 3; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(PIV.x, PIV.y); ctx.lineTo(bx, by); ctx.stroke();
    ctx.fillStyle = 'rgba(0,255,65,0.6)';
    ctx.beginPath(); ctx.arc(PIV.x, PIV.y, 5, 0, Math.PI * 2); ctx.fill();
    ctx.shadowColor = '#00ff41'; ctx.shadowBlur = 14;
    ctx.beginPath(); ctx.arc(bx, by, 12, 0, Math.PI * 2); ctx.fillStyle = '#00ff41'; ctx.fill();
    ctx.shadowBlur = 0;
    // torque arc indicator
    if (Math.abs(s.torque) > 0.1) {
      ctx.strokeStyle = s.torque > 0 ? '#3b82f6' : '#ff6b6b';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(PIV.x, PIV.y, 22, 0, Math.min(Math.PI, Math.abs(s.torque) * 0.3), s.torque < 0);
      ctx.stroke();
    }

    // ── Phase portrait (right) ──
    ctx.strokeStyle = 'rgba(0,255,65,0.15)';
    ctx.lineWidth = 1;
    ctx.strokeRect(PHASE.x, PHASE.y, PHASE.w, PHASE.h);
    // axes
    ctx.strokeStyle = 'rgba(0,255,65,0.1)';
    ctx.beginPath(); ctx.moveTo(PHASE.x, phY(0)); ctx.lineTo(PHASE.x + PHASE.w, phY(0)); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(phX(0), PHASE.y); ctx.lineTo(phX(0), PHASE.y + PHASE.h); ctx.stroke();
    ctx.fillStyle = 'rgba(0,255,65,0.3)';
    ctx.font = '9px monospace';
    ctx.fillText('θ̇', phX(0) + 4, PHASE.y + 10);
    ctx.fillText('θ', PHASE.x + PHASE.w - 10, phY(0) - 4);

    // Energy contours: θ̇ = ±sqrt(2(E + G cosθ))
    const levels = [-0.9, -0.5, 0, 0.5, 1, 1.6, 2.4].map(k => k * G);
    for (const E of levels) {
      const isSep = Math.abs(E - G) < 0.01 * G;
      ctx.strokeStyle = isSep ? 'rgba(255,107,107,0.5)' : 'rgba(0,255,65,0.12)';
      ctx.lineWidth = isSep ? 1.5 : 1;
      for (const sign of [1, -1]) {
        ctx.beginPath();
        let started = false;
        for (let i = 0; i <= 120; i++) {
          const th = -Math.PI + (2 * Math.PI * i) / 120;
          const inside = 2 * (E + G * Math.cos(th));
          if (inside < 0) { started = false; continue; }
          const om = sign * Math.sqrt(inside);
          if (Math.abs(om) > MAX_W) { started = false; continue; }
          const x = phX(th), y = phY(om);
          if (!started) { ctx.moveTo(x, y); started = true; } else ctx.lineTo(x, y);
        }
        ctx.stroke();
      }
    }

    // Trajectory trail
    const trail = trailRef.current;
    for (let i = 1; i < trail.length; i++) {
      const a = (i / trail.length) * 0.5;
      ctx.strokeStyle = `rgba(0,255,65,${a})`;
      ctx.lineWidth = 1.5;
      // avoid drawing wrap jumps
      if (Math.abs(wrap(trail[i].th) - wrap(trail[i - 1].th)) > Math.PI) continue;
      ctx.beginPath();
      ctx.moveTo(phX(trail[i - 1].th), phY(trail[i - 1].om));
      ctx.lineTo(phX(trail[i].th), phY(trail[i].om));
      ctx.stroke();
    }
    // current point
    ctx.fillStyle = '#00ff41';
    ctx.shadowColor = '#00ff41'; ctx.shadowBlur = 8;
    ctx.beginPath(); ctx.arc(phX(s.theta), phY(s.omega), 4, 0, Math.PI * 2); ctx.fill();
    ctx.shadowBlur = 0;

    ctx.fillStyle = 'rgba(255,107,107,0.6)';
    ctx.font = '9px monospace';
    ctx.fillText('separatrix (E = G)', PHASE.x + 6, PHASE.y + PHASE.h - 6);

    ctx.fillStyle = 'rgba(0,255,65,0.4)';
    ctx.fillText('← → torque impulses', 12, H - 8);
  }, []);

  useEffect(() => {
    const update = () => {
      const s = stateRef.current;
      const G = gravRef.current, b = dampRef.current;
      const keys = keysRef.current;

      // Torque from keys (impulse-ish) + PD stabilisation
      let tau = 0;
      if (keys.has('ArrowLeft') || keys.has('a')) tau -= 18;
      if (keys.has('ArrowRight') || keys.has('d')) tau += 18;
      if (pdRef.current) {
        const errAng = wrap(Math.PI - s.theta); // target upright
        tau += 40 * errAng - 12 * s.omega;
      }
      s.torque = tau;

      // θ̈ = -G sinθ - b θ̇ + τ   (I = 1)
      const alpha = -G * Math.sin(s.theta) - b * s.omega + tau;
      s.omega += alpha * DT;
      s.omega = Math.max(-MAX_W * 1.5, Math.min(MAX_W * 1.5, s.omega));
      s.theta += s.omega * DT;

      const trail = trailRef.current;
      trail.push({ th: s.theta, om: s.omega });
      if (trail.length > 160) trail.shift();

      draw();

      frameRef.current++;
      if (frameRef.current % 6 === 0) {
        const E = 0.5 * s.omega * s.omega - G * Math.cos(s.theta);
        setInfo({ theta: wrap(s.theta) * 180 / Math.PI, omega: s.omega, energy: E, torque: tau });
      }
      rafRef.current = requestAnimationFrame(update);
    };
    update();
    return () => cancelAnimationFrame(rafRef.current);
  }, [draw]);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (['ArrowLeft', 'ArrowRight', 'a', 'd'].includes(e.key)) { e.preventDefault(); keysRef.current.add(e.key); }
    };
    const up = (e: KeyboardEvent) => keysRef.current.delete(e.key);
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    return () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up); };
  }, []);

  return (
    <div>
      <div className="sim-canvas-wrap" style={{ marginBottom: 16 }}>
        <canvas ref={canvasRef} width={W} height={H} style={{ display: 'block', width: '100%', height: 'auto' }} tabIndex={0} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100px,1fr))', gap: 8, marginBottom: 16 }}>
        {[
          { label: 'θ (angle)', value: info.theta.toFixed(0) + '°', color: '#00ff41' },
          { label: 'θ̇ (rate)', value: info.omega.toFixed(2), color: '#3b82f6' },
          { label: 'Energy', value: info.energy.toFixed(1), color: '#f59e0b' },
          { label: 'Torque', value: info.torque.toFixed(1), color: info.torque >= 0 ? '#3b82f6' : '#ff6b6b' },
        ].map(chip => (
          <div key={chip.label} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 10px' }}>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase' as const }}>{chip.label}</div>
            <div style={{ fontFamily: 'var(--font-geist-mono)', fontSize: 14, fontWeight: 600, color: chip.color, marginTop: 2 }}>{chip.value}</div>
          </div>
        ))}
      </div>

      {([
        { key: 'grav', label: 'Gravity (G)', min: 1, max: 20, step: 0.5, val: grav, set: (v: number) => { setGrav(v); gravRef.current = v; } },
        { key: 'damp', label: 'Damping (b)', min: 0, max: 2, step: 0.05, val: damp, set: (v: number) => { setDamp(v); dampRef.current = v; } },
      ]).map(sl => (
        <div key={sl.key} style={{ marginBottom: 10 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>
            <span>{sl.label}</span>
            <span style={{ fontFamily: 'var(--font-geist-mono)', color: 'var(--text-secondary)' }}>{sl.val.toFixed(2)}</span>
          </div>
          <input type="range" min={sl.min} max={sl.max} step={sl.step} value={sl.val}
            onChange={e => sl.set(Number(e.target.value))} style={{ width: '100%', accentColor: '#00ff41' }} />
        </div>
      ))}

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' as const, marginTop: 12 }}>
        {[
          { label: `PD stabilise upright: ${pd ? 'On' : 'Off'}`, fn: () => { const n = !pd; setPd(n); pdRef.current = n; } },
          { label: 'Kick (spin)', fn: () => { stateRef.current.omega += 6; } },
          { label: 'Reset', fn: () => { stateRef.current = { theta: 0.3, omega: 0, torque: 0 }; trailRef.current = []; } },
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
