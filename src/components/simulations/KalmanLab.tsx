'use client';

import { useEffect, useRef, useState, useCallback } from 'react';

const W = 560, H = 340;
const DT = 1 / 30;
const HISTORY = 200;

// Box-Muller gaussian
function randn() {
  let u = 0, v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

interface KFState {
  p: number; v: number;          // estimate [pos, vel]
  P: [number, number, number, number]; // covariance 2x2 row-major
}

export default function KalmanLab() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const tRef = useRef(0);
  const truePosRef = useRef(0);
  const odomRef = useRef(0);
  const kfRef = useRef<KFState>({ p: 0, v: 0, P: [100, 0, 0, 100] });
  const spikeRef = useRef(0);
  const pausedRef = useRef(false);
  const histRef = useRef<{ t: number; gps: number; odom: number; kf: number; truth: number; sigma: number }[]>([]);
  const paramsRef = useRef({ R: 30, Q: 1 });
  const rafRef = useRef(0);
  const frameRef = useRef(0);

  const [params, setParams] = useState({ R: 30, Q: 1 });
  const [paused, setPaused] = useState(false);
  const [info, setInfo] = useState({ K: 0, sigma: 10, err: 0 });

  const toY = (pos: number) => H / 2 - pos * 0.9;

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = '#050505';
    ctx.fillRect(0, 0, W, H);

    // Centre line
    ctx.strokeStyle = 'rgba(0,255,65,0.08)';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(0, H / 2); ctx.lineTo(W, H / 2); ctx.stroke();

    const hist = histRef.current;
    if (hist.length < 2) return;
    const n = hist.length;
    const xAt = (i: number) => (W * i) / (HISTORY - 1);

    // Kalman confidence band
    ctx.fillStyle = 'rgba(0,255,65,0.10)';
    ctx.beginPath();
    for (let i = 0; i < n; i++) ctx.lineTo(xAt(i), toY(hist[i].kf + hist[i].sigma));
    for (let i = n - 1; i >= 0; i--) ctx.lineTo(xAt(i), toY(hist[i].kf - hist[i].sigma));
    ctx.closePath(); ctx.fill();

    // GPS scatter
    ctx.fillStyle = 'rgba(59,130,246,0.5)';
    for (let i = 0; i < n; i++) {
      ctx.beginPath(); ctx.arc(xAt(i), toY(hist[i].gps), 1.6, 0, Math.PI * 2); ctx.fill();
    }

    const line = (key: 'truth' | 'odom' | 'kf', color: string, width: number) => {
      ctx.strokeStyle = color; ctx.lineWidth = width;
      ctx.beginPath();
      for (let i = 0; i < n; i++) {
        const x = xAt(i), y = toY(hist[i][key]);
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.stroke();
    };
    line('truth', 'rgba(232,255,232,0.55)', 1.5); // ground truth
    line('odom', '#f59e0b', 1.5);                 // odometry drift
    ctx.shadowColor = '#00ff41'; ctx.shadowBlur = 8;
    line('kf', '#00ff41', 2);                      // kalman estimate
    ctx.shadowBlur = 0;

    // Legend
    ctx.font = '10px monospace';
    const legend: [string, string][] = [
      ['truth', 'rgba(232,255,232,0.7)'], ['gps', '#3b82f6'], ['odometry', '#f59e0b'], ['kalman', '#00ff41'],
    ];
    let lx = 12;
    legend.forEach(([label, color]) => {
      ctx.fillStyle = color;
      ctx.fillRect(lx, 12, 10, 3);
      ctx.fillText(label, lx + 14, 16);
      lx += 30 + ctx.measureText(label).width;
    });
  }, []);

  useEffect(() => {
    const step = () => {
      if (!pausedRef.current) {
        const prm = paramsRef.current;
        tRef.current += DT;
        const t = tRef.current;

        // Ground truth — smooth motion
        const truth = 120 * Math.sin(t * 0.4) + 40 * Math.sin(t * 0.9);
        const trueVel = (120 * 0.4 * Math.cos(t * 0.4) + 40 * 0.9 * Math.cos(t * 0.9));
        truePosRef.current = truth;

        // Odometry — integrates true velocity with bias + noise (drifts)
        odomRef.current += (trueVel + 4) * DT + randn() * 0.8;

        // GPS measurement — noisy, occasional injected spike
        let gps = truth + randn() * Math.sqrt(prm.R);
        if (spikeRef.current > 0) { gps += 120; spikeRef.current--; }

        // ── Kalman filter (constant-velocity model) ──
        const kf = kfRef.current;
        const [P00, P01, P10, P11] = kf.P;
        const q = prm.Q;
        // Predict
        let pp = kf.p + kf.v * DT;
        const vv = kf.v;
        // P = F P F^T + Q
        let pP00 = P00 + DT * (P10 + P01) + DT * DT * P11 + q * DT;
        let pP01 = P01 + DT * P11;
        let pP10 = P10 + DT * P11;
        let pP11 = P11 + q;
        // Update with GPS
        const S = pP00 + prm.R;
        const K0 = pP00 / S;
        const K1 = pP10 / S;
        const y = gps - pp;
        pp = pp + K0 * y;
        const newV = vv + K1 * y;
        const nP00 = (1 - K0) * pP00;
        const nP01 = (1 - K0) * pP01;
        const nP10 = pP10 - K1 * pP00;
        const nP11 = pP11 - K1 * pP01;
        kf.p = pp; kf.v = newV;
        kf.P = [nP00, nP01, nP10, nP11];

        const sigma = Math.sqrt(Math.max(0, nP00));
        const hist = histRef.current;
        hist.push({ t, gps, odom: odomRef.current, kf: kf.p, truth, sigma });
        if (hist.length > HISTORY) hist.shift();

        frameRef.current++;
        if (frameRef.current % 6 === 0) {
          setInfo({ K: K0, sigma, err: Math.abs(kf.p - truth) });
        }
      }
      draw();
      rafRef.current = requestAnimationFrame(step);
    };
    step();
    return () => cancelAnimationFrame(rafRef.current);
  }, [draw]);

  const setParam = (key: 'R' | 'Q', value: number) => {
    const next = { ...params, [key]: value };
    setParams(next);
    paramsRef.current = next;
  };

  return (
    <div>
      <div className="sim-canvas-wrap" style={{ marginBottom: 16 }}>
        <canvas ref={canvasRef} width={W} height={H} style={{ display: 'block', width: '100%', height: 'auto' }} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px,1fr))', gap: 8, marginBottom: 16 }}>
        {[
          { label: 'Kalman gain K', value: info.K.toFixed(3), color: '#00ff41' },
          { label: 'Est. σ (uncertainty)', value: '±' + info.sigma.toFixed(1), color: '#3b82f6' },
          { label: 'KF error vs truth', value: info.err.toFixed(1) + 'px', color: '#f59e0b' },
        ].map(chip => (
          <div key={chip.label} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 10px' }}>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase' as const }}>{chip.label}</div>
            <div style={{ fontFamily: 'var(--font-geist-mono)', fontSize: 14, fontWeight: 600, color: chip.color, marginTop: 2 }}>{chip.value}</div>
          </div>
        ))}
      </div>

      {([
        { key: 'R', label: 'R — measurement noise (GPS)', min: 1, max: 400, step: 1 },
        { key: 'Q', label: 'Q — process noise (model trust)', min: 0.1, max: 20, step: 0.1 },
      ] as const).map(({ key, label, min, max, step }) => (
        <div key={key} style={{ marginBottom: 10 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>
            <span>{label}</span>
            <span style={{ fontFamily: 'var(--font-geist-mono)', color: 'var(--text-secondary)' }}>{params[key].toFixed(key === 'Q' ? 1 : 0)}</span>
          </div>
          <input type="range" min={min} max={max} step={step} value={params[key]}
            onChange={e => setParam(key, Number(e.target.value))}
            style={{ width: '100%', accentColor: key === 'R' ? '#3b82f6' : '#00ff41' }} />
        </div>
      ))}

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' as const, marginTop: 12 }}>
        {[
          { label: 'Inject GPS spike', fn: () => { spikeRef.current = 4; } },
          { label: paused ? 'Resume' : 'Pause', fn: () => { const n = !paused; setPaused(n); pausedRef.current = n; } },
          { label: 'Crank R to max (see K→0)', fn: () => setParam('R', 400) },
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
