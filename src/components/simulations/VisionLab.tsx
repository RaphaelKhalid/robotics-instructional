'use client';

import { useEffect, useRef, useState, useCallback } from 'react';

const W = 480, H = 300;

interface Corner { x: number; y: number; score: number; }

export default function VisionLab() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const camRef = useRef({ x: 0, y: 0 });
  const flowRef = useRef({ dx: 0, dy: 0, life: 0 });
  const keysRef = useRef<Set<string>>(new Set());
  const dirtyRef = useRef(true);
  const rafRef = useRef(0);

  const showEdgesRef = useRef(true);
  const showCornersRef = useRef(true);
  const [showEdges, setShowEdges] = useState(true);
  const [showCorners, setShowCorners] = useState(true);
  const [info, setInfo] = useState({ corners: 0 });

  // Draw the synthetic scene (shapes) with camera offset
  const drawScene = useCallback((ctx: CanvasRenderingContext2D) => {
    const cam = camRef.current;
    ctx.fillStyle = '#0a140a';
    ctx.fillRect(0, 0, W, H);
    ctx.save();
    ctx.translate(-cam.x, -cam.y);

    // grid of shapes in a larger world
    ctx.fillStyle = '#1e6b3a';
    ctx.fillRect(80, 60, 90, 70);
    ctx.fillStyle = '#2b8cc4';
    ctx.beginPath(); ctx.arc(320, 110, 45, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#c4912b';
    ctx.beginPath(); ctx.moveTo(180, 240); ctx.lineTo(260, 240); ctx.lineTo(220, 170); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#7a3ec4';
    ctx.fillRect(360, 200, 70, 60);
    ctx.fillStyle = '#c43e5e';
    ctx.fillRect(40, 200, 60, 40);
    ctx.strokeStyle = '#2a4a2a'; ctx.lineWidth = 3;
    ctx.strokeRect(120, 20, 260, 250);
    ctx.restore();
  }, []);

  const process = useCallback((ctx: CanvasRenderingContext2D) => {
    const img = ctx.getImageData(0, 0, W, H);
    const d = img.data;
    const gray = new Float32Array(W * H);
    for (let i = 0; i < W * H; i++) {
      gray[i] = 0.299 * d[i * 4] + 0.587 * d[i * 4 + 1] + 0.114 * d[i * 4 + 2];
    }

    // Sobel gradients
    const Ix = new Float32Array(W * H);
    const Iy = new Float32Array(W * H);
    const mag = new Float32Array(W * H);
    for (let y = 1; y < H - 1; y++) {
      for (let x = 1; x < W - 1; x++) {
        const i = y * W + x;
        const gx = (gray[i - W + 1] + 2 * gray[i + 1] + gray[i + W + 1]) - (gray[i - W - 1] + 2 * gray[i - 1] + gray[i + W - 1]);
        const gy = (gray[i + W - 1] + 2 * gray[i + W] + gray[i + W + 1]) - (gray[i - W - 1] + 2 * gray[i - W] + gray[i - W + 1]);
        Ix[i] = gx; Iy[i] = gy;
        mag[i] = Math.hypot(gx, gy);
      }
    }

    // Edge overlay (green) drawn over scene
    if (showEdgesRef.current) {
      const edge = ctx.getImageData(0, 0, W, H);
      const ed = edge.data;
      for (let i = 0; i < W * H; i++) {
        if (mag[i] > 180) {
          ed[i * 4] = 0; ed[i * 4 + 1] = 255; ed[i * 4 + 2] = 65; ed[i * 4 + 3] = 255;
        }
      }
      ctx.putImageData(edge, 0, 0);
    }

    // Harris corners
    const corners: Corner[] = [];
    if (showCornersRef.current) {
      const k = 0.05;
      const step = 3;
      for (let y = 4; y < H - 4; y += step) {
        for (let x = 4; x < W - 4; x += step) {
          let Sxx = 0, Syy = 0, Sxy = 0;
          for (let wy = -2; wy <= 2; wy++) {
            for (let wx = -2; wx <= 2; wx++) {
              const j = (y + wy) * W + (x + wx);
              Sxx += Ix[j] * Ix[j]; Syy += Iy[j] * Iy[j]; Sxy += Ix[j] * Iy[j];
            }
          }
          const det = Sxx * Syy - Sxy * Sxy;
          const trace = Sxx + Syy;
          const R = det - k * trace * trace;
          if (R > 1.0e9) corners.push({ x, y, score: R });
        }
      }
    }
    // Non-max suppression (greedy by score, 14px radius)
    corners.sort((a, b) => b.score - a.score);
    const kept: Corner[] = [];
    for (const c of corners) {
      if (kept.every(o => Math.hypot(o.x - c.x, o.y - c.y) > 14)) kept.push(c);
      if (kept.length >= 30) break;
    }
    for (const c of kept) {
      ctx.strokeStyle = '#00ff41'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(c.x, c.y, 5, 0, Math.PI * 2); ctx.stroke();
    }
    return kept.length;
  }, []);

  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
    drawScene(ctx);
    const nCorners = process(ctx);

    // Optical flow arrows
    const flow = flowRef.current;
    if (flow.life > 0) {
      const a = Math.min(1, flow.life);
      ctx.strokeStyle = `rgba(245,158,11,${a})`;
      ctx.fillStyle = `rgba(245,158,11,${a})`;
      ctx.lineWidth = 1.5;
      for (let y = 40; y < H; y += 60) {
        for (let x = 40; x < W; x += 70) {
          const ex = x + flow.dx * 5, ey = y + flow.dy * 5;
          ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(ex, ey); ctx.stroke();
          const ang = Math.atan2(ey - y, ex - x);
          ctx.beginPath();
          ctx.moveTo(ex, ey);
          ctx.lineTo(ex - 5 * Math.cos(ang - 0.4), ey - 5 * Math.sin(ang - 0.4));
          ctx.lineTo(ex - 5 * Math.cos(ang + 0.4), ey - 5 * Math.sin(ang + 0.4));
          ctx.closePath(); ctx.fill();
        }
      }
    }

    setInfo(prev => prev.corners === nCorners ? prev : { corners: nCorners });
  }, [drawScene, process]);

  useEffect(() => {
    const loop = () => {
      const keys = keysRef.current;
      const cam = camRef.current;
      let dx = 0, dy = 0;
      const sp = 3;
      if (keys.has('ArrowLeft') || keys.has('a')) dx -= sp;
      if (keys.has('ArrowRight') || keys.has('d')) dx += sp;
      if (keys.has('ArrowUp') || keys.has('w')) dy -= sp;
      if (keys.has('ArrowDown') || keys.has('s')) dy += sp;
      if (dx || dy) {
        cam.x += dx; cam.y += dy;
        // ego-motion flow is opposite the camera shift
        flowRef.current = { dx: -dx, dy: -dy, life: 1 };
        dirtyRef.current = true;
      } else if (flowRef.current.life > 0) {
        flowRef.current.life -= 0.04;
        dirtyRef.current = true;
      }

      if (dirtyRef.current) {
        render();
        if (flowRef.current.life <= 0 && !dx && !dy) dirtyRef.current = false;
      }
      rafRef.current = requestAnimationFrame(loop);
    };
    loop();
    return () => cancelAnimationFrame(rafRef.current);
  }, [render]);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'a', 'd', 'w', 's'].includes(e.key)) {
        e.preventDefault(); keysRef.current.add(e.key);
      }
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

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px,1fr))', gap: 8, marginBottom: 16 }}>
        {[
          { label: 'Corners detected', value: String(info.corners), color: '#00ff41' },
          { label: 'Drive camera', value: 'WASD / arrows', color: '#f59e0b' },
        ].map(chip => (
          <div key={chip.label} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 10px' }}>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase' as const }}>{chip.label}</div>
            <div style={{ fontFamily: 'var(--font-geist-mono)', fontSize: 14, fontWeight: 600, color: chip.color, marginTop: 2 }}>{chip.value}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' as const, marginTop: 12 }}>
        {[
          { label: `Sobel edges: ${showEdges ? 'On' : 'Off'}`, fn: () => { const n = !showEdges; setShowEdges(n); showEdgesRef.current = n; dirtyRef.current = true; } },
          { label: `Harris corners: ${showCorners ? 'On' : 'Off'}`, fn: () => { const n = !showCorners; setShowCorners(n); showCornersRef.current = n; dirtyRef.current = true; } },
          { label: 'Reset camera', fn: () => { camRef.current = { x: 0, y: 0 }; dirtyRef.current = true; } },
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
