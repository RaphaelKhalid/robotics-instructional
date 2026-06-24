'use client';

import { useEffect, useRef, useState, useCallback } from 'react';

const W = 560, H = 300;
const TRACK_Y = 120;
const X_MIN = 60, X_MAX = W - 60;
const DT = 1 / 60;          // fixed timestep for deterministic response
const PLANT_GAIN = 4.5;     // tuned so default gains settle in a few seconds
const SETTLE_BAND = 0.02;   // 2% settling criterion

interface PlantState {
  x: number;        // ball position (px)
  v: number;        // velocity
  integral: number; // accumulated error
  prevErr: number;
  setpoint: number;
  t: number;            // time since last step
  settledTime: number;  // last time error left the band
  maxOvershoot: number; // peak position past setpoint (px)
  stepSize: number;     // px from start to setpoint at last step
  stepStartX: number;
}

export default function PIDLab() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef<PlantState>({
    x: X_MIN + 40, v: 0, integral: 0, prevErr: 0,
    setpoint: X_MIN + (X_MAX - X_MIN) * 0.72,
    t: 0, settledTime: 0, maxOvershoot: 0,
    stepSize: (X_MAX - X_MIN) * 0.72 - 40, stepStartX: X_MIN + 40,
  });
  const gainsRef = useRef({ kp: 2, ki: 0.1, kd: 0.5 });
  const plotRef = useRef<number[]>([]);   // normalised error history
  const movingRef = useRef(false);
  const rafRef = useRef(0);
  const frameRef = useRef(0);

  const [gains, setGains] = useState({ kp: 2, ki: 0.1, kd: 0.5 });
  const [moving, setMoving] = useState(false);
  const [info, setInfo] = useState({ overshoot: 0, settling: 0, sse: 0, err: 0 });

  const range = X_MAX - X_MIN;

  const restep = useCallback((newSetpoint: number) => {
    const s = stateRef.current;
    s.stepStartX = s.x;
    s.setpoint = newSetpoint;
    s.stepSize = newSetpoint - s.x;
    s.integral = 0;
    s.t = 0;
    s.settledTime = 0;
    s.maxOvershoot = 0;
    plotRef.current = [];
  }, []);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    const s = stateRef.current;

    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = '#050505';
    ctx.fillRect(0, 0, W, H);

    // Track
    ctx.strokeStyle = 'rgba(0,255,65,0.15)';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(X_MIN, TRACK_Y); ctx.lineTo(X_MAX, TRACK_Y); ctx.stroke();
    // Track ticks
    ctx.fillStyle = 'rgba(0,255,65,0.2)';
    for (let i = 0; i <= 10; i++) {
      const tx = X_MIN + (range * i) / 10;
      ctx.fillRect(tx, TRACK_Y - 4, 1, 8);
    }

    // Setpoint marker
    ctx.strokeStyle = '#f59e0b';
    ctx.setLineDash([4, 4]);
    ctx.beginPath(); ctx.moveTo(s.setpoint, TRACK_Y - 40); ctx.lineTo(s.setpoint, TRACK_Y + 40); ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = '#f59e0b';
    ctx.font = '10px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('target', s.setpoint, TRACK_Y - 46);

    // Settling band
    const bandPx = SETTLE_BAND * Math.abs(s.stepSize);
    ctx.fillStyle = 'rgba(16,217,138,0.06)';
    ctx.fillRect(s.setpoint - bandPx, TRACK_Y - 30, bandPx * 2, 60);

    // Ball
    ctx.shadowColor = '#00ff41'; ctx.shadowBlur = 16;
    ctx.beginPath(); ctx.arc(s.x, TRACK_Y, 12, 0, Math.PI * 2);
    ctx.fillStyle = '#00ff41'; ctx.fill();
    ctx.shadowBlur = 0;

    // Error plot
    const plot = plotRef.current;
    const PY = 220, PH = 60;
    ctx.strokeStyle = 'rgba(0,255,65,0.1)';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(X_MIN, PY); ctx.lineTo(X_MAX, PY); ctx.stroke();
    ctx.fillStyle = 'rgba(0,255,65,0.3)';
    ctx.textAlign = 'left';
    ctx.fillText('error(t)', X_MIN, PY - PH / 2 - 6);
    // band lines on plot
    ctx.strokeStyle = 'rgba(16,217,138,0.2)';
    ctx.setLineDash([2, 4]);
    ctx.beginPath(); ctx.moveTo(X_MIN, PY - SETTLE_BAND * PH * 5); ctx.lineTo(X_MAX, PY - SETTLE_BAND * PH * 5); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(X_MIN, PY + SETTLE_BAND * PH * 5); ctx.lineTo(X_MAX, PY + SETTLE_BAND * PH * 5); ctx.stroke();
    ctx.setLineDash([]);

    if (plot.length > 1) {
      ctx.strokeStyle = '#00ff41';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      for (let i = 0; i < plot.length; i++) {
        const px = X_MIN + (range * i) / (plot.length - 1);
        const py = PY - Math.max(-PH / 2, Math.min(PH / 2, plot[i] * PH * 5));
        if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
      }
      ctx.stroke();
    }

    // HUD
    ctx.fillStyle = 'rgba(0,255,65,0.5)';
    ctx.font = '10px monospace';
    ctx.textAlign = 'left';
    ctx.fillText('click the track to set a new target', X_MIN, H - 8);
    ctx.textAlign = 'left';
  }, [range]);

  // Physics + render loop
  useEffect(() => {
    const step = () => {
      const s = stateRef.current;
      const g = gainsRef.current;

      // Moving target mode — sinusoidal setpoint
      if (movingRef.current) {
        s.setpoint = X_MIN + range * (0.5 + 0.32 * Math.sin(s.t * 1.1));
        s.stepSize = range * 0.32;
      }

      const err = s.setpoint - s.x;
      s.integral += err * DT;
      // anti-windup clamp
      s.integral = Math.max(-400, Math.min(400, s.integral));
      const deriv = (err - s.prevErr) / DT;
      s.prevErr = err;

      const force = g.kp * err + g.ki * s.integral + g.kd * deriv;
      const accel = PLANT_GAIN * force - 0.4 * s.v; // small natural damping
      s.v += accel * DT;
      s.x += s.v * DT;

      // Clamp to track
      if (s.x < X_MIN) { s.x = X_MIN; s.v = 0; }
      if (s.x > X_MAX) { s.x = X_MAX; s.v = 0; }

      s.t += DT;

      // Settling / overshoot tracking (step mode only)
      if (!movingRef.current && Math.abs(s.stepSize) > 1) {
        const normErr = err / s.stepSize;
        if (Math.abs(normErr) > SETTLE_BAND) s.settledTime = s.t;
        // overshoot: how far past setpoint in direction of step
        const past = (s.x - s.setpoint) * Math.sign(s.stepSize);
        if (past > s.maxOvershoot) s.maxOvershoot = past;
      }

      // Plot history (~4s window)
      if (frameRef.current % 2 === 0) {
        const normErr = Math.abs(s.stepSize) > 1 ? err / s.stepSize : err / range;
        plotRef.current.push(normErr);
        if (plotRef.current.length > 180) plotRef.current.shift();
      }

      draw();

      frameRef.current++;
      if (frameRef.current % 6 === 0) {
        const overshootPct = Math.abs(s.stepSize) > 1 ? (s.maxOvershoot / Math.abs(s.stepSize)) * 100 : 0;
        const ssePx = Math.abs(s.setpoint - s.x);
        setInfo({
          overshoot: Math.max(0, overshootPct),
          settling: s.settledTime,
          sse: ssePx,
          err: (s.setpoint - s.x),
        });
      }

      rafRef.current = requestAnimationFrame(step);
    };
    step();
    return () => cancelAnimationFrame(rafRef.current);
  }, [draw, range]);

  const handleClick = (e: React.MouseEvent) => {
    if (movingRef.current) return;
    const canvas = canvasRef.current!;
    const r = canvas.getBoundingClientRect();
    const sx = canvas.width / r.width;
    const x = (e.clientX - r.left) * sx;
    if (Math.abs((e.clientY - r.top) * (canvas.height / r.height) - TRACK_Y) < 60) {
      restep(Math.max(X_MIN, Math.min(X_MAX, x)));
    }
  };

  const setGain = (key: 'kp' | 'ki' | 'kd', value: number) => {
    const next = { ...gains, [key]: value };
    setGains(next);
    gainsRef.current = next;
  };

  const preset = (kp: number, ki: number, kd: number) => {
    const next = { kp, ki, kd };
    setGains(next);
    gainsRef.current = next;
    restep(X_MIN + range * 0.72);
  };

  return (
    <div>
      <div className="sim-canvas-wrap" style={{ marginBottom: 16 }}>
        <canvas
          ref={canvasRef}
          width={W} height={H}
          style={{ display: 'block', width: '100%', height: 'auto', cursor: moving ? 'default' : 'crosshair' }}
          onClick={handleClick}
        />
      </div>

      {/* Info chips */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100px,1fr))', gap: 8, marginBottom: 16 }}>
        {[
          { label: 'Overshoot', value: info.overshoot.toFixed(0) + '%', color: '#f59e0b' },
          { label: 'Settling time', value: info.settling.toFixed(1) + 's', color: '#00ff41' },
          { label: 'Steady-state err', value: info.sse.toFixed(1) + 'px', color: '#3b82f6' },
          { label: 'Error', value: info.err.toFixed(1) + 'px', color: info.err > 0 ? '#10d98a' : '#ff6b6b' },
        ].map(chip => (
          <div key={chip.label} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 10px' }}>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase' as const }}>{chip.label}</div>
            <div style={{ fontFamily: 'var(--font-geist-mono)', fontSize: 14, fontWeight: 600, color: chip.color, marginTop: 2 }}>{chip.value}</div>
          </div>
        ))}
      </div>

      {/* Sliders */}
      {([
        { key: 'kp', label: 'Kp — proportional', min: 0, max: 10, step: 0.1 },
        { key: 'ki', label: 'Ki — integral', min: 0, max: 2, step: 0.05 },
        { key: 'kd', label: 'Kd — derivative', min: 0, max: 3, step: 0.05 },
      ] as const).map(({ key, label, min, max, step }) => (
        <div key={key} style={{ marginBottom: 10 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>
            <span>{label}</span>
            <span style={{ fontFamily: 'var(--font-geist-mono)', color: 'var(--text-secondary)' }}>{gains[key].toFixed(2)}</span>
          </div>
          <input
            type="range" min={min} max={max} step={step}
            value={gains[key]}
            onChange={e => setGain(key, Number(e.target.value))}
            style={{ width: '100%', accentColor: '#00ff41' }}
          />
        </div>
      ))}

      {/* Buttons */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' as const, marginTop: 12 }}>
        {[
          { label: `Target: ${moving ? 'Moving' : 'Step'}`, fn: () => { const n = !moving; setMoving(n); movingRef.current = n; if (!n) restep(X_MIN + range * 0.72); } },
          { label: 'Re-step', fn: () => restep(X_MIN + range * 0.72) },
          { label: 'Preset: Underdamped', fn: () => preset(6, 0.1, 0.2) },
          { label: 'Preset: Critical', fn: () => preset(2, 0.1, 0.9) },
          { label: 'Preset: Overdamped', fn: () => preset(1, 0.05, 2.5) },
        ].map(btn => (
          <button key={btn.label} onClick={btn.fn} style={{
            background: 'var(--bg-card)', border: '1px solid var(--border)',
            color: 'var(--text-secondary)', borderRadius: 8,
            padding: '8px 14px', fontSize: 12, fontWeight: 600, cursor: 'pointer',
            fontFamily: 'var(--font-geist-sans)',
          }}>
            {btn.label}
          </button>
        ))}
      </div>
    </div>
  );
}
