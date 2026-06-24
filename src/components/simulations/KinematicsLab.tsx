'use client';

import { useEffect, useRef, useState, useCallback } from 'react';

interface ArmState {
  l1: number; l2: number;
  t1: number; t2: number;
  elbowUp: boolean;
  mode: 'ik' | 'fk';
  dragging: boolean;
  targetX: number; targetY: number;
  atFoldPoint: boolean;
}

function computeFK(t1: number, t2: number, l1: number, l2: number, cx: number, cy: number) {
  const j1x = cx + l1 * Math.cos(t1);
  const j1y = cy - l1 * Math.sin(t1);
  const ex  = j1x + l2 * Math.cos(t1 + t2);
  const ey  = j1y - l2 * Math.sin(t1 + t2);
  return { j1x, j1y, ex, ey };
}

function computeIK(tx: number, ty: number, l1: number, l2: number, elbowUp: boolean, cx: number, cy: number) {
  const dx = tx - cx, dy = cy - ty;
  const r2 = dx * dx + dy * dy;
  const cos2 = (r2 - l1 * l1 - l2 * l2) / (2 * l1 * l2);
  if (Math.abs(cos2) > 1) return null;
  const sign = elbowUp ? 1 : -1;
  const t2   = Math.atan2(sign * Math.sqrt(1 - cos2 * cos2), cos2);
  const k1   = l1 + l2 * Math.cos(t2);
  const k2   = l2 * Math.sin(t2);
  const t1   = Math.atan2(dy, dx) - Math.atan2(k2, k1);
  return { t1, t2 };
}

export default function KinematicsLab({ onFoldPointReached }: { onFoldPointReached?: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef<ArmState>({
    l1: 130, l2: 100,
    t1: 0.8, t2: 0.9,
    elbowUp: true, mode: 'ik',
    dragging: false,
    targetX: 0, targetY: 0,
    atFoldPoint: false,
  });
  const holdTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [info, setInfo] = useState({ t1: 0, t2: 0, x: 0, y: 0, reach: 0, reachable: true, atFold: false });
  const [mode, setMode] = useState<'ik' | 'fk'>('ik');
  const [elbowUp, setElbowUp] = useState(true);
  const [showAlt, setShowAlt] = useState(true);
  const [sliders, setSliders] = useState({ t1: 46, t2: 52, l1: 130, l2: 100 });
  const foldHoldRef = useRef(0);
  const rafRef = useRef<number>(0);

  const getCenter = () => {
    const c = canvasRef.current;
    if (!c) return { cx: 280, cy: 250 };
    return { cx: c.width / 2, cy: c.height / 2 + 30 };
  };

  const drawArm = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    const W = canvas.width, H = canvas.height;
    const { cx, cy } = getCenter();
    const s = stateRef.current;

    ctx.clearRect(0, 0, W, H);

    // Background grid
    ctx.strokeStyle = 'rgba(59,130,246,0.04)';
    ctx.lineWidth = 1;
    for (let x = 0; x < W; x += 32) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
    for (let y = 0; y < H; y += 32) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }

    const fk = computeFK(s.t1, s.t2, s.l1, s.l2, cx, cy);

    // Workspace circles
    ctx.setLineDash([5, 7]);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(cx, cy, s.l1 + s.l2, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(245,158,11,0.12)';
    ctx.stroke();
    if (Math.abs(s.l1 - s.l2) > 4) {
      ctx.beginPath();
      ctx.arc(cx, cy, Math.abs(s.l1 - s.l2), 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(255,107,107,0.12)';
      ctx.stroke();
    }
    ctx.setLineDash([]);

    // Alt solution ghost
    if (showAlt && s.mode === 'ik') {
      const altSol = computeIK(s.targetX, s.targetY, s.l1, s.l2, !s.elbowUp, cx, cy);
      if (altSol) {
        const alt = computeFK(altSol.t1, altSol.t2, s.l1, s.l2, cx, cy);
        ctx.globalAlpha = 0.18;
        ctx.strokeStyle = '#f59e0b';
        ctx.lineWidth = 4;
        ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(alt.j1x, alt.j1y); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(alt.j1x, alt.j1y); ctx.lineTo(alt.ex, alt.ey); ctx.stroke();
        ctx.globalAlpha = 1;
      }
    }

    // Link 1 glow
    ctx.shadowColor = '#3b82f6';
    ctx.shadowBlur = 14;
    ctx.strokeStyle = '#3b82f6';
    ctx.lineWidth = 7;
    ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(fk.j1x, fk.j1y); ctx.stroke();

    // Link 2
    ctx.shadowColor = '#f59e0b';
    ctx.shadowBlur = 10;
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 5;
    ctx.beginPath(); ctx.moveTo(fk.j1x, fk.j1y); ctx.lineTo(fk.ex, fk.ey); ctx.stroke();
    ctx.shadowBlur = 0;

    // Base joint
    ctx.beginPath(); ctx.arc(cx, cy, 9, 0, Math.PI * 2);
    ctx.fillStyle = '#3b82f6'; ctx.fill();
    ctx.strokeStyle = 'var(--bg)'; ctx.lineWidth = 2; ctx.stroke();

    // Elbow joint
    ctx.beginPath(); ctx.arc(fk.j1x, fk.j1y, 7, 0, Math.PI * 2);
    ctx.fillStyle = '#6366f1'; ctx.fill();
    ctx.strokeStyle = 'var(--bg)'; ctx.lineWidth = 2; ctx.stroke();

    // Fold zone indicator
    const maxReach = s.l1 + s.l2;
    const curReach = Math.hypot(fk.ex - cx, fk.ey - cy);
    const nearFold = Math.abs(curReach - maxReach) < 8 && Math.abs(s.t2 * 180 / Math.PI) < 10;

    // End effector
    const isReachable = computeIK(s.targetX, s.targetY, s.l1, s.l2, s.elbowUp, cx, cy) !== null;
    const eeColor = nearFold ? '#ff6b6b' : isReachable ? '#10d98a' : '#ef4444';
    ctx.shadowColor = eeColor;
    ctx.shadowBlur = s.dragging ? 28 : 18;
    ctx.beginPath(); ctx.arc(fk.ex, fk.ey, 13, 0, Math.PI * 2);
    ctx.fillStyle = eeColor; ctx.fill();
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.stroke();
    ctx.shadowBlur = 0;

    // Fold zone ring on canvas
    if (nearFold) {
      ctx.beginPath();
      ctx.arc(cx, cy, maxReach, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(255,107,107,0.5)';
      ctx.lineWidth = 3;
      ctx.setLineDash([]);
      ctx.stroke();
    }

    // Angle arcs
    const drawArc = (x: number, y: number, a0: number, a1: number, color: string, lbl: string) => {
      const r = 30;
      ctx.beginPath();
      ctx.arc(x, y, r, -a1, -a0, a1 < a0);
      ctx.strokeStyle = color + '88';
      ctx.lineWidth = 2; ctx.setLineDash([3, 4]);
      ctx.stroke(); ctx.setLineDash([]);
      const mid = -(a0 + a1) / 2;
      ctx.fillStyle = color;
      ctx.font = '10px var(--font-geist-mono), monospace';
      ctx.fillText(lbl, x + (r + 10) * Math.cos(mid) - 5, y + (r + 10) * Math.sin(mid) + 4);
    };
    drawArc(cx, cy, 0, s.t1, '#3b82f6', 'θ₁');
    drawArc(fk.j1x, fk.j1y, s.t1, s.t1 + s.t2, '#f59e0b', 'θ₂');

    // Labels
    ctx.font = '500 11px var(--font-geist-mono), monospace';
    ctx.fillStyle = 'rgba(59,130,246,0.8)';
    ctx.fillText('BASE', cx + 13, cy + 5);
    ctx.fillStyle = 'rgba(99,102,241,0.8)';
    ctx.fillText('J₁', fk.j1x + 11, fk.j1y - 7);
    ctx.fillStyle = eeColor;
    ctx.fillText('EE', fk.ex + 14, fk.ey + 5);

    const t1d = (s.t1 * 180 / Math.PI);
    const t2d = (s.t2 * 180 / Math.PI);
    const exW = fk.ex - cx;
    const eyW = cy - fk.ey;
    const reach = Math.hypot(fk.ex - cx, fk.ey - cy);
    setInfo({ t1: t1d, t2: t2d, x: exW, y: eyW, reach, reachable: isReachable, atFold: nearFold });
    s.atFoldPoint = nearFold;
  }, [showAlt]);

  // Fold point hold detection
  useEffect(() => {
    if (info.atFold) {
      foldHoldRef.current += 1;
      if (foldHoldRef.current > 60 && onFoldPointReached) {
        onFoldPointReached();
      }
    } else {
      foldHoldRef.current = 0;
    }
  }, [info.atFold, onFoldPointReached]);

  useEffect(() => {
    const s = stateRef.current;
    const { cx, cy } = getCenter();
    const fk = computeFK(s.t1, s.t2, s.l1, s.l2, cx, cy);
    s.targetX = fk.ex;
    s.targetY = fk.ey;

    const loop = () => { drawArm(); rafRef.current = requestAnimationFrame(loop); };
    loop();
    return () => cancelAnimationFrame(rafRef.current);
  }, [drawArm]);

  const getPos = (e: React.MouseEvent | React.TouchEvent | MouseEvent | TouchEvent) => {
    const canvas = canvasRef.current!;
    const r = canvas.getBoundingClientRect();
    const scX = canvas.width / r.width;
    const scY = canvas.height / r.height;
    const clientX = 'touches' in e ? e.touches[0].clientX : (e as MouseEvent).clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : (e as MouseEvent).clientY;
    return { x: (clientX - r.left) * scX, y: (clientY - r.top) * scY };
  };

  const hitTest = (pos: { x: number; y: number }) => {
    const s = stateRef.current;
    const { cx, cy } = getCenter();
    const fk = computeFK(s.t1, s.t2, s.l1, s.l2, cx, cy);
    return Math.hypot(pos.x - fk.ex, pos.y - fk.ey) < 24;
  };

  const moveTarget = (pos: { x: number; y: number }) => {
    const s = stateRef.current;
    const { cx, cy } = getCenter();
    s.targetX = pos.x; s.targetY = pos.y;
    const sol = computeIK(pos.x, pos.y, s.l1, s.l2, s.elbowUp, cx, cy);
    if (sol) { s.t1 = sol.t1; s.t2 = sol.t2; }
    setSliders(prev => ({ ...prev, t1: Math.round(s.t1 * 180 / Math.PI), t2: Math.round(s.t2 * 180 / Math.PI) }));
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (stateRef.current.mode === 'ik' && hitTest(getPos(e))) stateRef.current.dragging = true;
  };
  const handleMouseMove = (e: React.MouseEvent) => {
    if (stateRef.current.mode === 'ik' && stateRef.current.dragging) moveTarget(getPos(e));
  };
  const handleMouseUp = () => { stateRef.current.dragging = false; };

  const applySliders = (next: typeof sliders) => {
    const s = stateRef.current;
    const { cx, cy } = getCenter();
    s.t1 = next.t1 * Math.PI / 180;
    s.t2 = next.t2 * Math.PI / 180;
    s.l1 = next.l1; s.l2 = next.l2;
    const fk = computeFK(s.t1, s.t2, s.l1, s.l2, cx, cy);
    s.targetX = fk.ex; s.targetY = fk.ey;
  };

  const toggleMode = () => {
    const next = mode === 'ik' ? 'fk' : 'ik';
    stateRef.current.mode = next;
    setMode(next);
    if (next === 'fk') applySliders(sliders);
  };

  const toggleElbow = () => {
    const next = !elbowUp;
    stateRef.current.elbowUp = next;
    setElbowUp(next);
    const s = stateRef.current;
    const { cx, cy } = getCenter();
    const sol = computeIK(s.targetX, s.targetY, s.l1, s.l2, next, cx, cy);
    if (sol) { s.t1 = sol.t1; s.t2 = sol.t2; }
  };

  return (
    <div>
      <div className="sim-canvas-wrap" style={{ marginBottom: 16 }}>
        <canvas
          ref={canvasRef}
          width={560} height={420}
          style={{ display: 'block', width: '100%', height: 'auto', cursor: mode === 'ik' ? 'crosshair' : 'default' }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        />
      </div>

      {/* Info chips */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(90px,1fr))', gap: 8, marginBottom: 16 }}>
        {[
          { label: 'θ₁', value: info.t1.toFixed(1) + '°', color: '#3b82f6' },
          { label: 'θ₂', value: info.t2.toFixed(1) + '°', color: '#f59e0b' },
          { label: 'X', value: info.x.toFixed(0) + 'px' },
          { label: 'Y', value: info.y.toFixed(0) + 'px' },
          { label: 'Reach', value: info.reach.toFixed(0) + 'px' },
          { label: 'Status', value: info.atFold ? '🔥 Fold!' : info.reachable ? '✓ OK' : '✗ Out', color: info.atFold ? '#ff6b6b' : info.reachable ? '#10d98a' : '#ef4444' },
        ].map(chip => (
          <div key={chip.label} style={{
            background: 'var(--bg-card)', border: '1px solid var(--border)',
            borderRadius: 8, padding: '8px 10px',
          }}>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase' as const }}>{chip.label}</div>
            <div style={{ fontFamily: 'var(--font-geist-mono)', fontSize: 14, fontWeight: 600, color: chip.color ?? 'var(--text-primary)', marginTop: 2 }}>{chip.value}</div>
          </div>
        ))}
      </div>

      {/* Sliders */}
      {[
        { key: 't1', label: 'θ₁', min: -180, max: 180 },
        { key: 't2', label: 'θ₂', min: -180, max: 180 },
        { key: 'l1', label: 'Link 1', min: 50, max: 200 },
        { key: 'l2', label: 'Link 2', min: 30, max: 180 },
      ].map(({ key, label, min, max }) => (
        <div key={key} style={{ marginBottom: 10 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>
            <span>{label}</span>
            <span style={{ fontFamily: 'var(--font-geist-mono)', color: 'var(--text-secondary)' }}>
              {sliders[key as keyof typeof sliders]}{key.startsWith('t') ? '°' : 'px'}
            </span>
          </div>
          <input
            type="range" min={min} max={max}
            value={sliders[key as keyof typeof sliders]}
            onChange={e => {
              const next = { ...sliders, [key]: Number(e.target.value) };
              setSliders(next);
              if (mode === 'fk') applySliders(next);
              else {
                stateRef.current.l1 = next.l1;
                stateRef.current.l2 = next.l2;
                const s = stateRef.current;
                const { cx, cy } = getCenter();
                const sol = computeIK(s.targetX, s.targetY, next.l1, next.l2, s.elbowUp, cx, cy);
                if (sol) { s.t1 = sol.t1; s.t2 = sol.t2; }
              }
            }}
            style={{ width: '100%', accentColor: '#f59e0b' }}
          />
        </div>
      ))}

      {/* Buttons */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' as const, marginTop: 12 }}>
        {[
          { label: `Mode: ${mode === 'ik' ? 'IK (drag)' : 'FK (sliders)'}`, fn: toggleMode },
          { label: `Elbow: ${elbowUp ? 'Up' : 'Down'}`, fn: toggleElbow },
          { label: `Alt: ${showAlt ? 'On' : 'Off'}`, fn: () => setShowAlt(v => !v) },
          {
            label: 'Reset', fn: () => {
              const next = { t1: 46, t2: 52, l1: 130, l2: 100 };
              setSliders(next);
              stateRef.current.elbowUp = true;
              setElbowUp(true);
              applySliders(next);
            }
          },
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
