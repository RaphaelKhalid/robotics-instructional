'use client';

import { useEffect, useRef, useState, useCallback } from 'react';

const W = 600, H = 360;
const BOX = { x: 40, y: 40, w: W - 80, h: H - 100 };
const TRAIL_LEN = 180;

interface Vec2 { x: number; y: number; }

interface BallState {
  x: number; y: number; vx: number; vy: number;
}

function cloneState(s: BallState): BallState {
  return { ...s };
}

export default function WorldModelLab() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef(0);

  // physics mode
  const modeRef = useRef<'sim' | 'real'>('sim');
  const randRef = useRef(0.3); // randomisation amount slider

  // actual ball (real physics with noise)
  const realRef = useRef<BallState>({ x: 120, y: 120, vx: 2.2, vy: 1.6 });
  // predicted ball (world model, deterministic sim physics)
  const predRef = useRef<BallState>({ x: 120, y: 120, vx: 2.2, vy: 1.6 });

  // trails
  const realTrailRef = useRef<Vec2[]>([]);
  const predTrailRef = useRef<Vec2[]>([]);

  const [mode, setMode] = useState<'sim' | 'real'>('sim');
  const [rand, setRand] = useState(0.3);
  const [divergence, setDivergence] = useState(0);

  const G_BASE = 0.06;
  const FRICTION_BASE = 0.998;

  const stepBall = (s: BallState, noise: boolean, randAmt: number): BallState => {
    let { x, y, vx, vy } = s;

    const g = G_BASE + (noise ? (Math.random() - 0.5) * randAmt * 0.08 : 0);
    const friction = FRICTION_BASE - (noise ? Math.random() * randAmt * 0.004 : 0);
    // action delay: occasionally skip an update
    if (noise && Math.random() < randAmt * 0.04) return { x, y, vx, vy };

    vy += g;
    vx *= friction;
    vy *= friction;

    x += vx;
    y += vy;

    // wall bounces with optional restitution noise
    if (x < BOX.x) {
      x = BOX.x;
      vx = -vx * (noise ? (0.8 + Math.random() * randAmt * 0.3) : 0.92);
    }
    if (x > BOX.x + BOX.w) {
      x = BOX.x + BOX.w;
      vx = -vx * (noise ? (0.8 + Math.random() * randAmt * 0.3) : 0.92);
    }
    if (y < BOX.y) {
      y = BOX.y;
      vy = -vy * (noise ? (0.8 + Math.random() * randAmt * 0.3) : 0.92);
    }
    if (y > BOX.y + BOX.h) {
      y = BOX.y + BOX.h;
      vy = -vy * (noise ? (0.75 + Math.random() * randAmt * 0.4) : 0.88);
    }

    return { x, y, vx, vy };
  };

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = '#050505';
    ctx.fillRect(0, 0, W, H);

    // box
    ctx.strokeStyle = 'rgba(0,255,65,0.25)';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(BOX.x, BOX.y, BOX.w, BOX.h);
    ctx.fillStyle = 'rgba(0,255,65,0.02)';
    ctx.fillRect(BOX.x, BOX.y, BOX.w, BOX.h);

    // labels
    ctx.fillStyle = 'rgba(0,255,65,0.3)';
    ctx.font = '10px monospace';
    ctx.textAlign = 'left';
    ctx.fillText('WORLD MODEL (predicted)', BOX.x + 4, BOX.y - 6);

    // predicted trail (dashed)
    const predT = predTrailRef.current;
    if (predT.length > 1) {
      ctx.strokeStyle = 'rgba(59,130,246,0.5)';
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 4]);
      ctx.beginPath();
      predT.forEach((pt, i) => {
        if (i === 0) ctx.moveTo(pt.x, pt.y);
        else ctx.lineTo(pt.x, pt.y);
      });
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // real trail (solid)
    const realT = realTrailRef.current;
    if (realT.length > 1) {
      ctx.strokeStyle = 'rgba(0,255,65,0.55)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      realT.forEach((pt, i) => {
        if (i === 0) ctx.moveTo(pt.x, pt.y);
        else ctx.lineTo(pt.x, pt.y);
      });
      ctx.stroke();
    }

    // divergence line
    const real = realRef.current;
    const pred = predRef.current;
    const dist = Math.hypot(real.x - pred.x, real.y - pred.y);
    if (dist > 2) {
      ctx.strokeStyle = 'rgba(255,107,107,0.35)';
      ctx.lineWidth = 1;
      ctx.setLineDash([2, 3]);
      ctx.beginPath();
      ctx.moveTo(real.x, real.y);
      ctx.lineTo(pred.x, pred.y);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // predicted ball (blue)
    ctx.shadowColor = '#3b82f6'; ctx.shadowBlur = 10;
    ctx.fillStyle = '#3b82f6';
    ctx.beginPath();
    ctx.arc(pred.x, pred.y, 9, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    // real ball (green)
    ctx.shadowColor = '#00ff41'; ctx.shadowBlur = 14;
    ctx.fillStyle = '#00ff41';
    ctx.beginPath();
    ctx.arc(real.x, real.y, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    // legend
    const lx = BOX.x, ly = BOX.y + BOX.h + 14;
    ctx.fillStyle = '#00ff41';
    ctx.beginPath(); ctx.arc(lx + 6, ly, 5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(0,255,65,0.7)';
    ctx.font = '10px monospace';
    ctx.textAlign = 'left';
    ctx.fillText('actual (real physics)', lx + 14, ly + 3);

    ctx.fillStyle = '#3b82f6';
    ctx.beginPath(); ctx.arc(lx + 150, ly, 5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(59,130,246,0.7)';
    ctx.fillText('predicted (world model)', lx + 158, ly + 3);

    ctx.fillStyle = 'rgba(255,107,107,0.7)';
    ctx.textAlign = 'right';
    ctx.fillText(`divergence: ${dist.toFixed(1)}px`, BOX.x + BOX.w, ly + 3);

    setDivergence(Math.round(dist));
  }, []);

  useEffect(() => {
    let frame = 0;
    const loop = () => {
      const isReal = modeRef.current === 'real';
      const amt = randRef.current;

      // step real ball (always has noise in real mode)
      realRef.current = stepBall(realRef.current, isReal, amt);
      // step predicted ball (deterministic sim)
      predRef.current = stepBall(predRef.current, false, 0);

      // trails
      realTrailRef.current.push({ x: realRef.current.x, y: realRef.current.y });
      if (realTrailRef.current.length > TRAIL_LEN) realTrailRef.current.shift();
      predTrailRef.current.push({ x: predRef.current.x, y: predRef.current.y });
      if (predTrailRef.current.length > TRAIL_LEN) predTrailRef.current.shift();

      draw();
      frame++;
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, [draw]);

  const toggleMode = () => {
    const next = modeRef.current === 'sim' ? 'real' : 'sim';
    modeRef.current = next;
    setMode(next);
    // re-sync predicted to current real on mode switch
    predRef.current = cloneState(realRef.current);
    realTrailRef.current = [];
    predTrailRef.current = [];
  };

  const handleRand = (v: number) => {
    randRef.current = v;
    setRand(v);
  };

  const reset = () => {
    const init: BallState = { x: 120, y: 120, vx: 2.2, vy: 1.6 };
    realRef.current = { ...init };
    predRef.current = { ...init };
    realTrailRef.current = [];
    predTrailRef.current = [];
  };

  return (
    <div>
      <div className="sim-canvas-wrap" style={{ marginBottom: 16 }}>
        <canvas ref={canvasRef} width={W} height={H}
          style={{ display: 'block', width: '100%', height: 'auto' }} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px,1fr))', gap: 8, marginBottom: 16 }}>
        {[
          { label: 'Mode', value: mode === 'sim' ? 'Sim Physics' : 'Real Physics', color: mode === 'real' ? '#ff6b35' : '#00ff41' },
          { label: 'Randomisation', value: rand.toFixed(2), color: '#f59e0b' },
          { label: 'Divergence', value: `${divergence}px`, color: divergence > 40 ? '#ff6b6b' : '#10d98a' },
        ].map(c => (
          <div key={c.label} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 10px' }}>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase' as const }}>{c.label}</div>
            <div style={{ fontFamily: 'var(--font-geist-mono)', fontSize: 14, fontWeight: 600, color: c.color, marginTop: 2 }}>{c.value}</div>
          </div>
        ))}
      </div>

      <div style={{ marginBottom: 10 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>
          <span>Randomisation amount</span>
          <span style={{ fontFamily: 'var(--font-geist-mono)', color: 'var(--text-secondary)' }}>{rand.toFixed(2)}</span>
        </div>
        <input type="range" min={0} max={1} step={0.01} value={rand}
          onChange={e => handleRand(Number(e.target.value))}
          style={{ width: '100%', accentColor: '#f59e0b' }} />
      </div>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' as const }}>
        <button onClick={toggleMode} style={{
          background: 'var(--bg-card)', border: '1px solid var(--border)',
          color: mode === 'real' ? '#ff6b35' : '#00ff41',
          borderRadius: 8, padding: '8px 16px', fontSize: 12, fontWeight: 600, cursor: 'pointer',
          fontFamily: 'var(--font-geist-sans)',
        }}>
          Mode: {mode === 'sim' ? 'Sim Physics' : 'Real Physics'}
        </button>
        <button onClick={reset} style={{
          background: 'var(--bg-card)', border: '1px solid var(--border)',
          color: 'var(--text-secondary)', borderRadius: 8,
          padding: '8px 16px', fontSize: 12, fontWeight: 600, cursor: 'pointer',
          fontFamily: 'var(--font-geist-sans)',
        }}>
          Reset
        </button>
      </div>

      <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 10 }}>
        Green = actual trajectory. Blue dashed = world model prediction. Switch to Real Physics and increase randomisation to watch the trajectories diverge — that&apos;s the sim-to-real gap.
      </p>
    </div>
  );
}
