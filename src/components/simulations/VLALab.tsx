'use client';

import { useEffect, useRef, useState, useCallback } from 'react';

const W = 700, H = 340;

const STAGES = [
  { label: 'Camera', x: 40, color: '#3b82f6' },
  { label: 'Patches', x: 155, color: '#8b5cf6' },
  { label: 'Tokens', x: 270, color: '#f59e0b' },
  { label: 'Fusion', x: 385, color: '#ff6b35' },
  { label: 'Actions', x: 500, color: '#10d98a' },
  { label: 'Execute', x: 615, color: '#00ff41' },
];
const STAGE_W = 90;
const STAGE_H = 200;
const STAGE_Y = 70;

// Block colors keyed by name token
const BLOCK_COLORS: Record<string, string> = {
  red: '#ff4444', blue: '#3b82f6', green: '#22c55e', yellow: '#eab308', orange: '#f97316',
};

function parseTarget(cmd: string): { color: string; name: string } {
  const lower = cmd.toLowerCase();
  for (const [name, color] of Object.entries(BLOCK_COLORS)) {
    if (lower.includes(name)) return { color, name };
  }
  return { color: '#aaaaaa', name: 'block' };
}

export default function VLALab() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef(0);
  const progressRef = useRef(0);   // 0‥1 animation progress
  const commandRef = useRef('pick up the red block');
  const targetRef = useRef(parseTarget('pick up the red block'));
  const animatingRef = useRef(false);

  const [command, setCommand] = useState('pick up the red block');
  const [stage, setStage] = useState(-1); // -1 = idle

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = '#050505';
    ctx.fillRect(0, 0, W, H);

    const p = progressRef.current; // 0..1
    const target = targetRef.current;

    // ── Stage 0: Camera — tabletop scene ───────────────────────────────
    const s0 = STAGES[0];
    ctx.strokeStyle = 'rgba(59,130,246,0.4)';
    ctx.lineWidth = 1;
    ctx.strokeRect(s0.x, STAGE_Y, STAGE_W, STAGE_H);
    ctx.fillStyle = '#0a0a14';
    ctx.fillRect(s0.x + 1, STAGE_Y + 1, STAGE_W - 2, STAGE_H - 2);

    // tabletop surface
    ctx.fillStyle = '#1a1a2a';
    ctx.fillRect(s0.x + 4, STAGE_Y + STAGE_H - 40, STAGE_W - 8, 35);

    // blocks on table
    const blocks = [
      { color: '#ff4444', bx: 12, name: 'red' },
      { color: '#3b82f6', bx: 36, name: 'blue' },
      { color: '#22c55e', bx: 60, name: 'green' },
    ];
    blocks.forEach(b => {
      ctx.fillStyle = b.color;
      ctx.fillRect(s0.x + b.bx, STAGE_Y + STAGE_H - 54, 18, 16);
    });

    // label
    ctx.fillStyle = 'rgba(59,130,246,0.7)';
    ctx.font = '9px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('camera', s0.x + STAGE_W / 2, STAGE_Y + STAGE_H + 14);

    // ── Stage 1: Patch grid (appears at p>0.12) ────────────────────────
    const s1 = STAGES[1];
    const a1 = Math.max(0, Math.min(1, (p - 0.12) / 0.1));
    if (a1 > 0) {
      ctx.globalAlpha = a1;
      ctx.strokeStyle = 'rgba(139,92,246,0.4)';
      ctx.lineWidth = 1;
      ctx.strokeRect(s1.x, STAGE_Y, STAGE_W, STAGE_H);
      ctx.fillStyle = '#0a0a1a';
      ctx.fillRect(s1.x + 1, STAGE_Y + 1, STAGE_W - 2, STAGE_H - 2);

      const cols = 7, rows = 11, pw = 10, ph = 14, gx = 6, gy = 10;
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const v = Math.sin(r * 2 + c * 3) * 0.4 + 0.5;
          ctx.fillStyle = `rgba(139,92,246,${v * 0.7})`;
          ctx.fillRect(s1.x + gx + c * pw, STAGE_Y + gy + r * ph, pw - 1, ph - 1);
        }
      }
      ctx.fillStyle = 'rgba(139,92,246,0.7)';
      ctx.font = '9px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('patches', s1.x + STAGE_W / 2, STAGE_Y + STAGE_H + 14);
      ctx.globalAlpha = 1;
    }

    // ── Stage 2: Token embeddings (p>0.25) ────────────────────────────
    const s2 = STAGES[2];
    const a2 = Math.max(0, Math.min(1, (p - 0.25) / 0.1));
    if (a2 > 0) {
      ctx.globalAlpha = a2;
      ctx.strokeStyle = 'rgba(245,158,11,0.4)';
      ctx.lineWidth = 1;
      ctx.strokeRect(s2.x, STAGE_Y, STAGE_W, STAGE_H);
      ctx.fillStyle = '#0a0a0a';
      ctx.fillRect(s2.x + 1, STAGE_Y + 1, STAGE_W - 2, STAGE_H - 2);

      // rows of small squares = embedding dims
      const rows2 = 18, cols2 = 6;
      for (let r = 0; r < rows2; r++) {
        for (let c = 0; c < cols2; c++) {
          const v = Math.abs(Math.sin(r * 1.3 + c * 0.9 + p * 6));
          ctx.fillStyle = `rgba(245,158,11,${v * 0.8})`;
          ctx.fillRect(s2.x + 6 + c * 12, STAGE_Y + 8 + r * 10, 10, 8);
        }
      }
      ctx.fillStyle = 'rgba(245,158,11,0.7)';
      ctx.font = '9px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('tokens', s2.x + STAGE_W / 2, STAGE_Y + STAGE_H + 14);
      ctx.globalAlpha = 1;
    }

    // ── Stage 3: Fusion (cross-attention) (p>0.4) ─────────────────────
    const s3 = STAGES[3];
    const a3 = Math.max(0, Math.min(1, (p - 0.4) / 0.1));
    if (a3 > 0) {
      ctx.globalAlpha = a3;
      ctx.strokeStyle = 'rgba(255,107,53,0.4)';
      ctx.lineWidth = 1;
      ctx.strokeRect(s3.x, STAGE_Y, STAGE_W, STAGE_H);
      ctx.fillStyle = '#0a0500';
      ctx.fillRect(s3.x + 1, STAGE_Y + 1, STAGE_W - 2, STAGE_H - 2);

      // attention heatmap
      const rows3 = 10, cols3 = 10;
      for (let r = 0; r < rows3; r++) {
        for (let c = 0; c < cols3; c++) {
          const v = Math.max(0, Math.sin(r * 0.7 + c * 0.8 + p * 5) * 0.5 + 0.5);
          ctx.fillStyle = `rgba(255,107,53,${v * 0.9})`;
          ctx.fillRect(s3.x + 5 + c * 8, STAGE_Y + 5 + r * 18, 7, 16);
        }
      }
      ctx.fillStyle = 'rgba(255,107,53,0.7)';
      ctx.font = '9px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('fusion', s3.x + STAGE_W / 2, STAGE_Y + STAGE_H + 14);
      ctx.globalAlpha = 1;
    }

    // ── Stage 4: Action tokens (p>0.55) ───────────────────────────────
    const s4 = STAGES[4];
    const a4 = Math.max(0, Math.min(1, (p - 0.55) / 0.1));
    if (a4 > 0) {
      ctx.globalAlpha = a4;
      ctx.strokeStyle = 'rgba(16,217,138,0.4)';
      ctx.lineWidth = 1;
      ctx.strokeRect(s4.x, STAGE_Y, STAGE_W, STAGE_H);
      ctx.fillStyle = '#000a06';
      ctx.fillRect(s4.x + 1, STAGE_Y + 1, STAGE_W - 2, STAGE_H - 2);

      // action token bars (joint deltas)
      const joints = ['J1', 'J2', 'J3', 'J4', 'J5', 'J6', 'grip'];
      joints.forEach((j, i) => {
        const v = (Math.sin(i * 1.1 + p * 4) * 0.5 + 0.5);
        ctx.fillStyle = 'rgba(16,217,138,0.3)';
        ctx.fillRect(s4.x + 22, STAGE_Y + 12 + i * 26, 55, 16);
        ctx.fillStyle = 'rgba(16,217,138,0.9)';
        ctx.fillRect(s4.x + 22, STAGE_Y + 12 + i * 26, 55 * v, 16);
        ctx.fillStyle = 'rgba(16,217,138,0.6)';
        ctx.font = '8px monospace';
        ctx.textAlign = 'left';
        ctx.fillText(j, s4.x + 6, STAGE_Y + 24 + i * 26);
      });
      ctx.fillStyle = 'rgba(16,217,138,0.7)';
      ctx.font = '9px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('actions', s4.x + STAGE_W / 2, STAGE_Y + STAGE_H + 14);
      ctx.globalAlpha = 1;
    }

    // ── Stage 5: Execute — arm reaching (p>0.72) ──────────────────────
    const s5 = STAGES[5];
    const a5 = Math.max(0, Math.min(1, (p - 0.72) / 0.1));
    if (a5 > 0) {
      ctx.globalAlpha = a5;
      ctx.strokeStyle = 'rgba(0,255,65,0.4)';
      ctx.lineWidth = 1;
      ctx.strokeRect(s5.x, STAGE_Y, STAGE_W, STAGE_H);
      ctx.fillStyle = '#000a00';
      ctx.fillRect(s5.x + 1, STAGE_Y + 1, STAGE_W - 2, STAGE_H - 2);

      // simple arm
      const armT = Math.min(1, (p - 0.78) / 0.2);
      const baseX = s5.x + 20, baseY = STAGE_Y + STAGE_H - 10;
      const targetBX = s5.x + 68, targetBY = STAGE_Y + STAGE_H - 36;
      const elbowX = baseX + 10 + armT * 15;
      const elbowY = baseY - 50 - armT * 30;
      const tipX = baseX + 5 + armT * (targetBX - baseX - 5);
      const tipY = baseY - 10 - armT * (baseY - 10 - targetBY);

      ctx.strokeStyle = '#00ff41';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(baseX, baseY);
      ctx.lineTo(elbowX, elbowY);
      ctx.lineTo(tipX, tipY);
      ctx.stroke();

      // target block
      ctx.fillStyle = target.color;
      ctx.fillRect(s5.x + 60, STAGE_Y + STAGE_H - 50, 20, 16);

      // gripper hint at tip
      ctx.strokeStyle = '#00ff41';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(tipX - 5, tipY - 5);
      ctx.lineTo(tipX, tipY);
      ctx.lineTo(tipX + 5, tipY - 5);
      ctx.stroke();

      ctx.fillStyle = 'rgba(0,255,65,0.7)';
      ctx.font = '9px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('execute', s5.x + STAGE_W / 2, STAGE_Y + STAGE_H + 14);
      ctx.globalAlpha = 1;
    }

    // ── Flow arrows between stages ─────────────────────────────────────
    const arrowThresholds = [0.1, 0.23, 0.38, 0.53, 0.7];
    for (let i = 0; i < STAGES.length - 1; i++) {
      const ax = Math.max(0, Math.min(1, (p - arrowThresholds[i]) / 0.05));
      if (ax > 0) {
        const x0 = STAGES[i].x + STAGE_W;
        const x1 = STAGES[i + 1].x;
        const midY = STAGE_Y + STAGE_H / 2;
        ctx.globalAlpha = ax * 0.7;
        ctx.strokeStyle = STAGES[i + 1].color;
        ctx.lineWidth = 1.5;
        ctx.setLineDash([4, 3]);
        ctx.beginPath();
        ctx.moveTo(x0 + 1, midY);
        ctx.lineTo(x1 - 1, midY);
        ctx.stroke();
        ctx.setLineDash([]);
        // arrowhead
        ctx.fillStyle = STAGES[i + 1].color;
        ctx.beginPath();
        ctx.moveTo(x1 - 1, midY);
        ctx.lineTo(x1 - 6, midY - 3);
        ctx.lineTo(x1 - 6, midY + 3);
        ctx.fill();
        ctx.globalAlpha = 1;
      }
    }

    // ── Command label at top ───────────────────────────────────────────
    ctx.fillStyle = 'rgba(0,255,65,0.5)';
    ctx.font = '11px monospace';
    ctx.textAlign = 'left';
    ctx.fillText(`> "${commandRef.current}"`, 10, 22);

    // ── Active stage indicator ─────────────────────────────────────────
    const activeStage = Math.floor(p * 6);
    if (activeStage < STAGES.length) {
      const as = STAGES[activeStage];
      ctx.strokeStyle = as.color;
      ctx.lineWidth = 1.5;
      ctx.strokeRect(as.x - 1, STAGE_Y - 1, STAGE_W + 2, STAGE_H + 2);
    }

    // ── Stage label under the bars ─────────────────────────────────────
    const stageIdx = Math.min(5, Math.floor(p * 6));
    setStage(stageIdx);
  }, []);

  // animation loop
  useEffect(() => {
    let last = 0;
    const loop = (ts: number) => {
      if (animatingRef.current) {
        const dt = (ts - last) / 1000;
        last = ts;
        progressRef.current = Math.min(1, progressRef.current + dt / 2.2);
        if (progressRef.current >= 1) animatingRef.current = false;
      }
      draw();
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, [draw]);

  const submit = () => {
    commandRef.current = command;
    targetRef.current = parseTarget(command);
    progressRef.current = 0;
    animatingRef.current = true;
    setStage(0);
  };

  const stageLabel = stage >= 0 && stage < STAGES.length ? STAGES[stage].label : '';

  return (
    <div>
      <div className="sim-canvas-wrap" style={{ marginBottom: 16 }}>
        <canvas ref={canvasRef} width={W} height={H}
          style={{ display: 'block', width: '100%', height: 'auto' }} />
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        <input
          type="text"
          value={command}
          onChange={e => setCommand(e.target.value)}
          placeholder="e.g. pick up the red block"
          onKeyDown={e => e.key === 'Enter' && submit()}
          style={{
            flex: 1, background: 'var(--bg-card)', border: '1px solid var(--border)',
            borderRadius: 8, padding: '10px 14px', fontSize: 14,
            color: 'var(--text-primary)', fontFamily: 'var(--font-geist-mono)',
            outline: 'none',
          }}
        />
        <button onClick={submit} style={{
          background: '#00ff41', color: '#000', border: 'none', borderRadius: 8,
          padding: '10px 20px', fontSize: 14, fontWeight: 700, cursor: 'pointer',
          fontFamily: 'var(--font-geist-mono)',
        }}>
          Run
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100px,1fr))', gap: 8 }}>
        {STAGES.map((s, i) => (
          <div key={s.label} style={{
            background: 'var(--bg-card)', border: `1px solid ${stage === i ? s.color : 'var(--border)'}`,
            borderRadius: 8, padding: '8px 10px', opacity: stage >= i ? 1 : 0.35, transition: 'all 0.2s',
          }}>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase' as const }}>{i + 1}</div>
            <div style={{ fontFamily: 'var(--font-geist-mono)', fontSize: 13, fontWeight: 600, color: s.color }}>{s.label}</div>
          </div>
        ))}
      </div>

      <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 10 }}>
        Try: &quot;pick up the blue block&quot;, &quot;grab the green block&quot;, &quot;move the red block to the bin&quot;
      </p>
    </div>
  );
}
