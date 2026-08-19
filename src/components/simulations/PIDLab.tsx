'use client';

import { useEffect, useRef, useState, useCallback } from 'react';

// ---- Track / rendering geometry ------------------------------------------
const W = 560;
const TRACK_H = 170;
const PLOT_H = 200;
const TRACK_Y = 96;
const X_MIN = 50, X_MAX = W - 50;
const RANGE_PX = X_MAX - X_MIN;

// ---- Plant / control constants -------------------------------------------
const DT = 1 / 60;          // fixed timestep for deterministic response
const L = 10;               // track length in "metres"
const PLANT_GAIN = 6;       // force -> acceleration scaling
const NAT_DAMP = 0.3;       // small natural viscous damping
const SETTLE_BAND = 0.02;   // 2% settling criterion
const PLOT_WINDOW = 6;      // seconds shown on the response plot
const HIST_MAX = Math.round(PLOT_WINDOW / DT);

const ACCENT = '#00ff41';
const AMBER = '#f59e0b';
const BLUE = '#38bdf8';
const RED = '#ff6b6b';

interface Sample { t: number; x: number; sp: number; u: number; sat: boolean; }

interface PlantState {
  x: number;            // position in metres
  v: number;            // velocity m/s
  integral: number;     // accumulated error
  prevErr: number;
  setpoint: number;
  t: number;            // time since last step
  settledTime: number;  // last time |err| left the band
  maxOvershoot: number; // peak position past setpoint (metres)
  riseTime: number;     // 10%->90% (stored as reached-90% time)
  reached10: number;
  stepSize: number;     // metres from start to setpoint at last step
  lastU: number;
  saturated: boolean;
  hist: Sample[];
}

const mToPx = (m: number) => X_MIN + (m / L) * RANGE_PX;

export default function PIDLab() {
  const trackRef = useRef<HTMLCanvasElement>(null);
  const plotCanvasRef = useRef<HTMLCanvasElement>(null);

  const stateRef = useRef<PlantState>({
    x: 1, v: 0, integral: 0, prevErr: 0,
    setpoint: 7,
    t: 0, settledTime: 0, maxOvershoot: 0,
    riseTime: 0, reached10: -1,
    stepSize: 6, lastU: 0, saturated: false,
    hist: [],
  });

  const gainsRef = useRef({ kp: 2, ki: 0.2, kd: 1.1 });
  const optRef = useRef({ limit: true, antiWindup: true, uMax: 9 });
  const rafRef = useRef(0);
  const frameRef = useRef(0);

  const [gains, setGains] = useState({ kp: 2, ki: 0.2, kd: 1.1 });
  const [opt, setOpt] = useState({ limit: true, antiWindup: true, uMax: 9 });
  const [info, setInfo] = useState({ overshoot: 0, settling: 0, rise: 0, sse: 0, err: 0, u: 0, sat: false });

  const restep = useCallback((newSetpoint: number) => {
    const s = stateRef.current;
    s.setpoint = Math.max(0.5, Math.min(L - 0.5, newSetpoint));
    s.stepSize = s.setpoint - s.x;
    s.integral = 0;
    s.prevErr = s.setpoint - s.x;
    s.t = 0;
    s.settledTime = 0;
    s.maxOvershoot = 0;
    s.riseTime = 0;
    s.reached10 = -1;
    s.hist = [];
  }, []);

  const impulse = useCallback(() => {
    // Kick the mass so the controller has to recover.
    const s = stateRef.current;
    const dir = Math.random() > 0.5 ? 1 : -1;
    s.v += dir * 6;
  }, []);

  // ---- Track viz ----------------------------------------------------------
  const drawTrack = useCallback(() => {
    const canvas = trackRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    const s = stateRef.current;

    ctx.clearRect(0, 0, W, TRACK_H);
    ctx.fillStyle = '#050505';
    ctx.fillRect(0, 0, W, TRACK_H);

    // Rail
    ctx.strokeStyle = 'rgba(0,255,65,0.18)';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(X_MIN, TRACK_Y + 22); ctx.lineTo(X_MAX, TRACK_Y + 22); ctx.stroke();
    ctx.fillStyle = 'rgba(0,255,65,0.25)';
    ctx.font = '9px monospace';
    ctx.textAlign = 'center';
    for (let i = 0; i <= L; i++) {
      const tx = mToPx(i);
      ctx.fillRect(tx, TRACK_Y + 18, 1, 8);
      if (i % 2 === 0) ctx.fillText(String(i), tx, TRACK_Y + 40);
    }

    // Settling band around setpoint
    const spx = mToPx(s.setpoint);
    const bandPx = (SETTLE_BAND * Math.abs(s.stepSize) / L) * RANGE_PX;
    ctx.fillStyle = 'rgba(16,217,138,0.08)';
    ctx.fillRect(spx - bandPx, TRACK_Y - 34, Math.max(2, bandPx * 2), 60);

    // Setpoint marker
    ctx.strokeStyle = AMBER;
    ctx.setLineDash([4, 4]);
    ctx.beginPath(); ctx.moveTo(spx, TRACK_Y - 34); ctx.lineTo(spx, TRACK_Y + 30); ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = AMBER;
    ctx.font = '10px monospace';
    ctx.fillText('target', spx, TRACK_Y - 40);

    // Error connector
    const cx = mToPx(s.x);
    ctx.strokeStyle = 'rgba(255,107,107,0.5)';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(cx, TRACK_Y - 26); ctx.lineTo(spx, TRACK_Y - 26); ctx.stroke();

    // Cart
    const cw = 40, ch = 24;
    ctx.save();
    ctx.shadowColor = ACCENT; ctx.shadowBlur = 14;
    ctx.fillStyle = s.saturated ? '#ffd166' : ACCENT;
    ctx.beginPath();
    const r = 5, cyTop = TRACK_Y - 4;
    ctx.roundRect(cx - cw / 2, cyTop - ch, cw, ch, r);
    ctx.fill();
    ctx.restore();
    // Wheels
    ctx.fillStyle = '#0a0a0a';
    ctx.strokeStyle = ACCENT; ctx.lineWidth = 2;
    for (const wx of [cx - 11, cx + 11]) {
      ctx.beginPath(); ctx.arc(wx, TRACK_Y + 4, 5, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    }

    // Actuator force arrow (control effort)
    const u = s.lastU;
    const arrowLen = Math.min(46, Math.abs(u) * 5);
    if (arrowLen > 2) {
      const dir = Math.sign(u);
      const ay = cyTop - ch / 2;
      const ax0 = cx + dir * (cw / 2);
      const ax1 = ax0 + dir * arrowLen;
      ctx.strokeStyle = s.saturated ? RED : BLUE;
      ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(ax0, ay); ctx.lineTo(ax1, ay); ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(ax1, ay);
      ctx.lineTo(ax1 - dir * 6, ay - 4);
      ctx.lineTo(ax1 - dir * 6, ay + 4);
      ctx.closePath();
      ctx.fillStyle = s.saturated ? RED : BLUE;
      ctx.fill();
    }

    ctx.textAlign = 'left';
    ctx.fillStyle = 'rgba(0,255,65,0.45)';
    ctx.font = '10px monospace';
    ctx.fillText('click the rail to set a new target', X_MIN, TRACK_H - 8);
    ctx.fillStyle = s.saturated ? RED : 'rgba(56,189,248,0.6)';
    ctx.textAlign = 'right';
    ctx.fillText(s.saturated ? 'actuator SATURATED' : 'u = force', X_MAX, TRACK_H - 8);
    ctx.textAlign = 'left';
  }, []);

  // ---- Response plot ------------------------------------------------------
  const drawPlot = useCallback(() => {
    const canvas = plotCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    const s = stateRef.current;
    const hist = s.hist;

    ctx.clearRect(0, 0, W, PLOT_H);
    ctx.fillStyle = '#050505';
    ctx.fillRect(0, 0, W, PLOT_H);

    const PX0 = 40, PX1 = W - 12, PY0 = 16, PY1 = PLOT_H - 24;
    const yFor = (m: number) => PY1 - (m / L) * (PY1 - PY0);
    const now = s.t;
    const tStart = Math.max(0, now - PLOT_WINDOW);
    const xFor = (t: number) => PX0 + ((t - tStart) / PLOT_WINDOW) * (PX1 - PX0);

    // Grid + y labels
    ctx.strokeStyle = 'rgba(0,255,65,0.08)';
    ctx.fillStyle = 'rgba(0,255,65,0.3)';
    ctx.font = '9px monospace';
    ctx.lineWidth = 1;
    ctx.textAlign = 'right';
    for (let m = 0; m <= L; m += 2) {
      const gy = yFor(m);
      ctx.beginPath(); ctx.moveTo(PX0, gy); ctx.lineTo(PX1, gy); ctx.stroke();
      ctx.fillText(String(m), PX0 - 4, gy + 3);
    }
    ctx.textAlign = 'left';
    ctx.fillText('position (m) vs time', PX0 + 2, PY0 - 4);

    // Settling band
    const bandM = SETTLE_BAND * Math.abs(s.stepSize);
    ctx.fillStyle = 'rgba(16,217,138,0.08)';
    ctx.fillRect(PX0, yFor(s.setpoint + bandM), PX1 - PX0, yFor(s.setpoint - bandM) - yFor(s.setpoint + bandM));

    // Setpoint line (draw actual history so it steps)
    if (hist.length > 1) {
      ctx.strokeStyle = AMBER;
      ctx.setLineDash([4, 4]);
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      for (let i = 0; i < hist.length; i++) {
        const p = hist[i];
        const px = xFor(p.t), py = yFor(p.sp);
        if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
      }
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Position response
    if (hist.length > 1) {
      ctx.strokeStyle = ACCENT;
      ctx.lineWidth = 2;
      ctx.beginPath();
      for (let i = 0; i < hist.length; i++) {
        const p = hist[i];
        const px = xFor(p.t), py = yFor(p.x);
        if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
      }
      ctx.stroke();

      // Mark saturated segments in red
      ctx.strokeStyle = RED;
      ctx.lineWidth = 2;
      ctx.beginPath();
      let pen = false;
      for (let i = 0; i < hist.length; i++) {
        const p = hist[i];
        if (p.sat) {
          const px = xFor(p.t), py = yFor(p.x);
          if (!pen) { ctx.moveTo(px, py); pen = true; } else ctx.lineTo(px, py);
        } else pen = false;
      }
      ctx.stroke();
    }

    // Overshoot marker
    if (s.maxOvershoot > 0.01 && Math.abs(s.stepSize) > 0.1) {
      const peakM = s.setpoint + Math.sign(s.stepSize) * s.maxOvershoot;
      const py = yFor(peakM);
      ctx.strokeStyle = 'rgba(255,107,107,0.5)';
      ctx.setLineDash([2, 3]);
      ctx.beginPath(); ctx.moveTo(PX0, py); ctx.lineTo(PX1, py); ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = RED;
      ctx.textAlign = 'right';
      ctx.fillText('peak', PX1 - 2, py - 3);
      ctx.textAlign = 'left';
    }
  }, []);

  // ---- Physics + render loop ---------------------------------------------
  useEffect(() => {
    const step = () => {
      const s = stateRef.current;
      const g = gainsRef.current;
      const o = optRef.current;

      const err = s.setpoint - s.x;

      // Integrate error (with optional conditional anti-windup below)
      const candidateI = s.integral + err * DT;

      const deriv = (err - s.prevErr) / DT;
      s.prevErr = err;

      // Raw control effort
      let u = g.kp * err + g.ki * candidateI + g.kd * deriv;

      // Actuator saturation
      let saturated = false;
      if (o.limit && Math.abs(u) > o.uMax) {
        u = Math.sign(u) * o.uMax;
        saturated = true;
      }

      // Anti-windup: only accumulate the integral when not saturated
      // (conditional integration / clamping). With it off, the integral
      // keeps winding up while saturated and causes large overshoot.
      if (saturated && o.antiWindup) {
        // hold integral
      } else {
        s.integral = candidateI;
      }
      // Hard safety clamp so the integral can never blow up numerically
      s.integral = Math.max(-200, Math.min(200, s.integral));

      s.lastU = u;
      s.saturated = saturated;

      const accel = PLANT_GAIN * u - NAT_DAMP * s.v;
      s.v += accel * DT;
      s.x += s.v * DT;

      // Soft walls
      if (s.x < 0) { s.x = 0; s.v = Math.abs(s.v) * 0.3; }
      if (s.x > L) { s.x = L; s.v = -Math.abs(s.v) * 0.3; }

      s.t += DT;

      // Metrics (step response, ignore tiny steps)
      if (Math.abs(s.stepSize) > 0.1) {
        const normErr = err / s.stepSize;
        if (Math.abs(normErr) > SETTLE_BAND) s.settledTime = s.t;
        const past = (s.x - s.setpoint) * Math.sign(s.stepSize);
        if (past > s.maxOvershoot) s.maxOvershoot = past;
        // rise time: fraction of the step travelled
        const frac = (s.x - (s.setpoint - s.stepSize)) / s.stepSize;
        if (s.reached10 < 0 && frac >= 0.1) s.reached10 = s.t;
        if (s.riseTime === 0 && s.reached10 >= 0 && frac >= 0.9) s.riseTime = s.t - s.reached10;
      }

      // History
      s.hist.push({ t: s.t, x: s.x, sp: s.setpoint, u, sat: saturated });
      if (s.hist.length > HIST_MAX) s.hist.shift();

      drawTrack();
      drawPlot();

      frameRef.current++;
      if (frameRef.current % 6 === 0) {
        const overshootPct = Math.abs(s.stepSize) > 0.1 ? (s.maxOvershoot / Math.abs(s.stepSize)) * 100 : 0;
        setInfo({
          overshoot: Math.max(0, overshootPct),
          settling: s.settledTime,
          rise: s.riseTime,
          sse: Math.abs(err),
          err,
          u,
          sat: saturated,
        });
      }

      rafRef.current = requestAnimationFrame(step);
    };
    step();
    return () => cancelAnimationFrame(rafRef.current);
  }, [drawTrack, drawPlot]);

  // ---- Interaction --------------------------------------------------------
  const handleClick = (e: React.MouseEvent) => {
    const canvas = trackRef.current!;
    const rect = canvas.getBoundingClientRect();
    const sx = canvas.width / rect.width;
    const px = (e.clientX - rect.left) * sx;
    const m = ((px - X_MIN) / RANGE_PX) * L;
    restep(m);
  };

  const setGain = (key: 'kp' | 'ki' | 'kd', value: number) => {
    const next = { ...gainsRef.current, [key]: value };
    setGains(next);
    gainsRef.current = next;
  };

  const setUMax = (value: number) => {
    const next = { ...optRef.current, uMax: value };
    setOpt(next);
    optRef.current = next;
  };

  const toggle = (key: 'limit' | 'antiWindup') => {
    const next = { ...optRef.current, [key]: !optRef.current[key] };
    setOpt(next);
    optRef.current = next;
  };

  const preset = (kp: number, ki: number, kd: number) => {
    const next = { kp, ki, kd };
    setGains(next);
    gainsRef.current = next;
    // A fresh step from the current position so the regime is visible.
    restep(stateRef.current.x > L / 2 ? 2 : 8);
  };

  const btnStyle: React.CSSProperties = {
    background: 'var(--bg-card)', border: '1px solid var(--border)',
    color: 'var(--text-secondary)', borderRadius: 8,
    padding: '8px 12px', fontSize: 12, fontWeight: 600, cursor: 'pointer',
    fontFamily: 'var(--font-geist-sans)',
  };

  const chips = [
    { label: 'Overshoot', value: info.overshoot.toFixed(0) + '%', color: AMBER },
    { label: 'Settling (2%)', value: info.settling.toFixed(2) + 's', color: ACCENT },
    { label: 'Rise 10-90%', value: (info.rise > 0 ? info.rise.toFixed(2) : '--') + 's', color: BLUE },
    { label: 'Steady-state err', value: info.sse.toFixed(2) + 'm', color: '#a78bfa' },
    { label: 'Control u', value: info.u.toFixed(1), color: info.sat ? RED : BLUE },
  ];

  return (
    <div>
      <div className="sim-canvas-wrap" style={{ marginBottom: 10 }}>
        <canvas
          ref={trackRef}
          width={W} height={TRACK_H}
          style={{ display: 'block', width: '100%', height: 'auto', cursor: 'crosshair' }}
          onClick={handleClick}
        />
      </div>
      <div className="sim-canvas-wrap" style={{ marginBottom: 16 }}>
        <canvas
          ref={plotCanvasRef}
          width={W} height={PLOT_H}
          style={{ display: 'block', width: '100%', height: 'auto' }}
        />
      </div>

      {/* Metrics */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(96px,1fr))', gap: 8, marginBottom: 16 }}>
        {chips.map(chip => (
          <div key={chip.label} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 10px' }}>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>{chip.label}</div>
            <div style={{ fontFamily: 'var(--font-geist-mono)', fontSize: 14, fontWeight: 600, color: chip.color, marginTop: 2 }}>{chip.value}</div>
          </div>
        ))}
      </div>

      {/* Gain sliders */}
      {([
        { key: 'kp', label: 'Kp — proportional', min: 0, max: 10, step: 0.1 },
        { key: 'ki', label: 'Ki — integral', min: 0, max: 3, step: 0.05 },
        { key: 'kd', label: 'Kd — derivative', min: 0, max: 4, step: 0.05 },
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
            style={{ width: '100%', accentColor: ACCENT }}
          />
        </div>
      ))}

      {/* Actuator limit slider */}
      <div style={{ marginBottom: 12, opacity: opt.limit ? 1 : 0.4 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>
          <span>u_max — actuator saturation limit</span>
          <span style={{ fontFamily: 'var(--font-geist-mono)', color: 'var(--text-secondary)' }}>{opt.uMax.toFixed(1)}</span>
        </div>
        <input
          type="range" min={1} max={20} step={0.5}
          value={opt.uMax}
          disabled={!opt.limit}
          onChange={e => setUMax(Number(e.target.value))}
          style={{ width: '100%', accentColor: ACCENT }}
        />
      </div>

      {/* Toggles */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
        <button onClick={() => toggle('limit')} style={{ ...btnStyle, borderColor: opt.limit ? ACCENT : 'var(--border)', color: opt.limit ? ACCENT : 'var(--text-secondary)' }}>
          Actuator limit: {opt.limit ? 'ON' : 'OFF'}
        </button>
        <button onClick={() => toggle('antiWindup')} style={{ ...btnStyle, borderColor: opt.antiWindup ? ACCENT : 'var(--border)', color: opt.antiWindup ? ACCENT : 'var(--text-secondary)' }}>
          Anti-windup: {opt.antiWindup ? 'ON' : 'OFF'}
        </button>
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
        <button onClick={() => restep(8)} style={btnStyle}>Step → 8m</button>
        <button onClick={() => restep(2)} style={btnStyle}>Step → 2m</button>
        <button onClick={impulse} style={{ ...btnStyle, borderColor: RED, color: RED }}>Disturbance kick</button>
      </div>

      {/* Presets */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button onClick={() => preset(6, 0.15, 0.25)} style={btnStyle}>Preset: Underdamped</button>
        <button onClick={() => preset(2, 0.2, 1.1)} style={btnStyle}>Preset: Critically damped</button>
        <button onClick={() => preset(1, 0.05, 2.6)} style={btnStyle}>Preset: Overdamped</button>
      </div>

      <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 14, lineHeight: 1.5 }}>
        A cart (mass) is driven along a rail by a discrete PID controller: force u = Kp·e + Ki·∫e dt + Kd·de/dt.
        Turn the actuator limit on with a low u_max and switch anti-windup off, then take a big step — the integral
        winds up while the actuator is saturated (shown in red) and the cart badly overshoots. Enable anti-windup to
        stop it. Use the disturbance kick to see the loop reject an impulse.
      </p>
    </div>
  );
}
