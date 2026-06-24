'use client';

import { useEffect, useRef, useState, useCallback } from 'react';

const W = 600, H = 340;

// Network topology: 5 layers
const LAYERS = [4, 6, 8, 6, 3];

interface Node { x: number; y: number; layer: number; idx: number; }
interface Edge { from: Node; to: Node; weight: number; pruned: boolean; }

function buildNetwork(): { nodes: Node[]; edges: Edge[] } {
  const nodes: Node[] = [];
  const startX = 70, endX = W - 70;
  const xStep = (endX - startX) / (LAYERS.length - 1);

  LAYERS.forEach((count, li) => {
    const x = startX + li * xStep;
    for (let i = 0; i < count; i++) {
      const y = H / 2 - ((count - 1) / 2) * 28 + i * 28;
      nodes.push({ x, y, layer: li, idx: i });
    }
  });

  const edges: Edge[] = [];
  for (let li = 0; li < LAYERS.length - 1; li++) {
    const fromNodes = nodes.filter(n => n.layer === li);
    const toNodes = nodes.filter(n => n.layer === li + 1);
    fromNodes.forEach(fn => {
      toNodes.forEach(tn => {
        edges.push({ from: fn, to: tn, weight: Math.random(), pruned: false });
      });
    });
  }

  return { nodes, edges };
}

// Accuracy model: realistic tradeoffs
function calcMetrics(bits: number, pruning: number, temp: number) {
  // base accuracy at FP32 = 100%
  let accuracy = 100;

  // quantisation penalty
  if (bits === 16) accuracy -= 0.1;
  else if (bits === 8) accuracy -= 0.5;
  else if (bits === 4) accuracy -= 3.5;

  // pruning penalty — cliff above 50%
  if (pruning <= 0.5) accuracy -= pruning * 4;
  else accuracy -= 0.5 * 4 + (pruning - 0.5) * 30;

  // distillation can recover some accuracy
  const distBonus = (temp > 1 && temp < 8) ? Math.min(2, (temp - 1) * 0.4) : 0;
  accuracy = Math.min(100, accuracy + distBonus);
  accuracy = Math.max(0, accuracy);

  // model size (MB) — base ~100MB FP32
  const bitRatio = bits / 32;
  const pruneRatio = 1 - pruning;
  const size = 100 * bitRatio * pruneRatio;

  // latency (ms) — base 50ms
  const latency = 50 * bitRatio * (0.5 + pruneRatio * 0.5);

  return { accuracy, size, latency };
}

export default function EdgeAILab() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef(0);

  const netRef = useRef(buildNetwork());

  const [bits, setBits] = useState(32);
  const [pruning, setPruning] = useState(0);
  const [temp, setTemp] = useState(1);
  const bitsRef = useRef(32);
  const pruningRef = useRef(0);
  const tempRef = useRef(1);

  const metrics = calcMetrics(bits, pruning, temp);

  // apply pruning to edges
  useEffect(() => {
    const net = netRef.current;
    // sort edges by weight, prune lowest p%
    const sorted = [...net.edges].sort((a, b) => a.weight - b.weight);
    const cutoff = Math.floor(sorted.length * pruning);
    const prunedSet = new Set(sorted.slice(0, cutoff).map((_, i) => i));
    // map back: find original index
    const sortedIdx = net.edges.map((e, i) => ({ e, i, w: e.weight })).sort((a, b) => a.w - b.w);
    net.edges.forEach(e => { e.pruned = false; });
    sortedIdx.slice(0, cutoff).forEach(({ i }) => { net.edges[i].pruned = true; });
  }, [pruning]);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = '#050505';
    ctx.fillRect(0, 0, W, H);

    const net = netRef.current;
    const b = bitsRef.current;
    const p = pruningRef.current;

    // colour by bit depth
    const edgeColor = b === 32 ? '#3b82f6' : b === 16 ? '#8b5cf6' : b === 8 ? '#10d98a' : '#f59e0b';

    // draw edges
    net.edges.forEach(e => {
      if (e.pruned) return;
      ctx.globalAlpha = e.weight * 0.6 + 0.1;
      ctx.strokeStyle = edgeColor;
      ctx.lineWidth = b === 4 ? 0.5 : b === 8 ? 0.8 : b === 16 ? 1 : 1.2;
      ctx.beginPath();
      ctx.moveTo(e.from.x, e.from.y);
      ctx.lineTo(e.to.x, e.to.y);
      ctx.stroke();
      ctx.globalAlpha = 1;
    });

    // draw pruned edges (very faint, dashed)
    ctx.setLineDash([2, 4]);
    net.edges.forEach(e => {
      if (!e.pruned) return;
      ctx.globalAlpha = 0.06;
      ctx.strokeStyle = '#ff6b6b';
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      ctx.moveTo(e.from.x, e.from.y);
      ctx.lineTo(e.to.x, e.to.y);
      ctx.stroke();
      ctx.globalAlpha = 1;
    });
    ctx.setLineDash([]);

    // draw nodes
    net.nodes.forEach(n => {
      ctx.shadowColor = edgeColor; ctx.shadowBlur = 6;
      ctx.fillStyle = edgeColor;
      ctx.beginPath();
      ctx.arc(n.x, n.y, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
    });

    // layer labels
    const labelColors = ['rgba(0,255,65,0.4)', 'rgba(0,255,65,0.3)', 'rgba(0,255,65,0.3)', 'rgba(0,255,65,0.3)', 'rgba(0,255,65,0.4)'];
    const labelNames = ['Input', 'Hidden', 'Hidden', 'Hidden', 'Output'];
    LAYERS.forEach((_, li) => {
      const x = 70 + li * ((W - 140) / (LAYERS.length - 1));
      ctx.fillStyle = labelColors[li];
      ctx.font = '9px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(labelNames[li], x, H - 6);
    });

    // bit-depth label
    ctx.fillStyle = edgeColor;
    ctx.font = 'bold 11px monospace';
    ctx.textAlign = 'left';
    ctx.fillText(`INT${b} weights`, 10, 16);

    if (p > 0.5) {
      ctx.fillStyle = '#ff6b6b';
      ctx.font = '10px monospace';
      ctx.textAlign = 'right';
      ctx.fillText('⚠ accuracy cliff: pruning >50%', W - 10, 16);
    }
  }, []);

  useEffect(() => {
    const loop = () => {
      draw();
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, [draw]);

  const handleBits = (v: number) => {
    bitsRef.current = v;
    setBits(v);
  };
  const handlePruning = (v: number) => {
    pruningRef.current = v;
    setPruning(v);
  };
  const handleTemp = (v: number) => {
    tempRef.current = v;
    setTemp(v);
  };

  const snapBits = (raw: number) => {
    // snap slider to 4, 8, 16, 32
    const opts = [4, 8, 16, 32];
    return opts.reduce((prev, cur) => Math.abs(cur - raw) < Math.abs(prev - raw) ? cur : prev);
  };

  const sizeRatio = metrics.size / 100;
  const latencyRatio = metrics.latency / 50;
  const accRatio = metrics.accuracy / 100;

  return (
    <div>
      <div className="sim-canvas-wrap" style={{ marginBottom: 16 }}>
        <canvas ref={canvasRef} width={W} height={H}
          style={{ display: 'block', width: '100%', height: 'auto' }} />
      </div>

      {/* Metric bars */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 16 }}>
        {[
          { label: 'Model Size', value: `${metrics.size.toFixed(1)} MB`, ratio: sizeRatio, color: '#3b82f6', invert: false },
          { label: 'Latency', value: `${metrics.latency.toFixed(1)} ms`, ratio: latencyRatio, color: '#f59e0b', invert: false },
          { label: 'Accuracy', value: `${metrics.accuracy.toFixed(1)}%`, ratio: accRatio, color: metrics.accuracy < 90 ? '#ff6b6b' : '#00ff41', invert: true },
        ].map(m => (
          <div key={m.label} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 12px' }}>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase' as const, marginBottom: 4 }}>{m.label}</div>
            <div style={{ fontFamily: 'var(--font-geist-mono)', fontSize: 16, fontWeight: 700, color: m.color, marginBottom: 6 }}>{m.value}</div>
            <div style={{ background: 'rgba(255,255,255,0.05)', borderRadius: 4, height: 6, overflow: 'hidden' }}>
              <div style={{
                width: `${Math.min(100, m.ratio * 100)}%`, height: '100%',
                background: m.color, borderRadius: 4, transition: 'width 0.2s',
              }} />
            </div>
          </div>
        ))}
      </div>

      {/* Sliders */}
      <div style={{ marginBottom: 10 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>
          <span>Bit-width (32/16/8/4)</span>
          <span style={{ fontFamily: 'var(--font-geist-mono)', color: 'var(--text-secondary)' }}>INT{bits}</span>
        </div>
        <input type="range" min={4} max={32} step={1} value={bits}
          onChange={e => handleBits(snapBits(Number(e.target.value)))}
          style={{ width: '100%', accentColor: '#3b82f6' }} />
      </div>

      <div style={{ marginBottom: 10 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>
          <span>Pruning ratio</span>
          <span style={{ fontFamily: 'var(--font-geist-mono)', color: pruning > 0.5 ? '#ff6b6b' : 'var(--text-secondary)' }}>{(pruning * 100).toFixed(0)}%</span>
        </div>
        <input type="range" min={0} max={0.8} step={0.01} value={pruning}
          onChange={e => handlePruning(Number(e.target.value))}
          style={{ width: '100%', accentColor: '#f59e0b' }} />
      </div>

      <div style={{ marginBottom: 10 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>
          <span>Distillation temperature</span>
          <span style={{ fontFamily: 'var(--font-geist-mono)', color: 'var(--text-secondary)' }}>{temp.toFixed(1)}</span>
        </div>
        <input type="range" min={1} max={10} step={0.1} value={temp}
          onChange={e => handleTemp(Number(e.target.value))}
          style={{ width: '100%', accentColor: '#8b5cf6' }} />
      </div>

      <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 8 }}>
        8-bit ≈ 4× smaller with minimal accuracy loss. 4-bit drops ~3.5%. Pruning above 50% causes a sharp accuracy cliff. Distillation (temperature 2–8) can recover ~2%.
      </p>
    </div>
  );
}
