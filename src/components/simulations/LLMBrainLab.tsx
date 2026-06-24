'use client';

import { useEffect, useRef, useState, useCallback } from 'react';

const W = 580, H = 320;

// Scene objects (top-down view)
const SCENE = {
  blocks: [
    { id: 'red',    color: '#ff4444', x: 80,  y: 140, label: 'RED'   },
    { id: 'blue',   color: '#3b82f6', x: 150, y: 100, label: 'BLUE'  },
    { id: 'green',  color: '#22c55e', x: 120, y: 200, label: 'GREEN' },
  ],
  bin: { x: 460, y: 140, w: 70, h: 50, color: '#f59e0b' },
  arm: { x: 290, y: 240 },
};

interface Block { id: string; color: string; x: number; y: number; label: string; }
interface Step { text: string; status: 'pending' | 'running' | 'done' | 'error'; hallucinated?: boolean; }

function generatePlan(goal: string): Step[] {
  const lower = goal.toLowerCase();
  const steps: Step[] = [];

  // detect words
  const hasPick   = lower.includes('pick') || lower.includes('grab') || lower.includes('take') || lower.includes('move');
  const hasStack  = lower.includes('stack') || lower.includes('on top') || lower.includes('onto');
  const hasBin    = lower.includes('bin') || lower.includes('drop') || lower.includes('place');
  const hasRed    = lower.includes('red');
  const hasBlue   = lower.includes('blue');
  const hasGreen  = lower.includes('green');

  // extract unknown object (hallucination trigger)
  const knownWords = ['red', 'blue', 'green', 'block', 'blocks', 'pick', 'grab', 'take', 'move',
    'stack', 'on', 'top', 'onto', 'bin', 'drop', 'place', 'the', 'a', 'and', 'up', 'into',
    'all', 'of', 'them', 'it', 'to', 'put', 'in'];
  const tokens = lower.split(/\s+/).filter(t => t.length > 2);
  const unknown = tokens.find(t => !knownWords.includes(t));

  steps.push({ text: 'Perceive workspace — locate objects in scene', status: 'pending' });

  if (unknown) {
    steps.push({ text: `Locate "${unknown}" object (not in scene)`, status: 'pending', hallucinated: true });
    steps.push({ text: `Grasp "${unknown}" with gripper`, status: 'pending', hallucinated: true });
  }

  const targets: string[] = [];
  if (hasRed)   targets.push('red');
  if (hasBlue)  targets.push('blue');
  if (hasGreen) targets.push('green');
  if (targets.length === 0 && hasPick) targets.push('red'); // default

  targets.forEach(t => {
    steps.push({ text: `Move arm to ${t} block position`, status: 'pending' });
    steps.push({ text: `Close gripper on ${t} block`, status: 'pending' });
    if (hasBin)   steps.push({ text: `Transport ${t} block to bin`, status: 'pending' });
    if (hasStack) steps.push({ text: `Stack ${t} block on target`, status: 'pending' });
    if (!hasBin && !hasStack) steps.push({ text: `Place ${t} block at goal position`, status: 'pending' });
    steps.push({ text: `Open gripper — release`, status: 'pending' });
  });

  steps.push({ text: 'Return arm to home position', status: 'pending' });

  return steps;
}

export default function LLMBrainLab() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef(0);
  const blocksRef = useRef<Block[]>(JSON.parse(JSON.stringify(SCENE.blocks)));
  const armRef = useRef({ x: SCENE.arm.x, y: SCENE.arm.y, holding: null as Block | null });
  const stepsRef = useRef<Step[]>([]);
  const stepIdxRef = useRef(-1);
  const stepTimerRef = useRef(0);
  const hallucBlockRef = useRef<{ x: number; y: number } | null>(null);

  const [goal, setGoal] = useState('pick up the red block and place it in the bin');
  const [steps, setSteps] = useState<Step[]>([]);
  const [running, setRunning] = useState(false);
  const runningRef = useRef(false);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = '#050505';
    ctx.fillRect(0, 0, W, H);

    // ── Left panel: plan list ──────────────────────────────────────────
    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(0, 0, 220, H);
    ctx.strokeStyle = 'rgba(0,255,65,0.1)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(220, 0);
    ctx.lineTo(220, H);
    ctx.stroke();

    ctx.fillStyle = 'rgba(0,255,65,0.4)';
    ctx.font = 'bold 10px monospace';
    ctx.textAlign = 'left';
    ctx.fillText('TASK PLAN', 8, 18);

    const steps2 = stepsRef.current;
    const idx = stepIdxRef.current;
    steps2.slice(0, 12).forEach((s, i) => {
      const y = 34 + i * 23;
      const isActive = i === idx;
      const isHall = s.hallucinated;

      // row bg
      if (isActive) {
        ctx.fillStyle = 'rgba(0,255,65,0.08)';
        ctx.fillRect(0, y - 12, 220, 22);
      }

      // status dot
      const dotColor = isHall
        ? '#ff4444'
        : s.status === 'done' ? '#00ff41'
        : s.status === 'running' ? '#f59e0b'
        : s.status === 'error' ? '#ff6b6b'
        : 'rgba(0,255,65,0.2)';
      ctx.fillStyle = dotColor;
      ctx.beginPath();
      ctx.arc(10, y - 2, 3, 0, Math.PI * 2);
      ctx.fill();

      // step text
      ctx.fillStyle = isHall ? '#ff8080'
        : s.status === 'done' ? 'rgba(0,255,65,0.6)'
        : isActive ? '#e8ffe8'
        : 'rgba(0,255,65,0.35)';
      ctx.font = `${isActive ? 'bold ' : ''}8.5px monospace`;
      ctx.textAlign = 'left';

      // word wrap at ~26 chars
      const words = s.text.split(' ');
      let line = '';
      let lineY = y - 4;
      words.forEach(w => {
        if ((line + w).length > 24) {
          ctx.fillText(line.trim(), 20, lineY);
          line = w + ' ';
          lineY += 10;
        } else {
          line += w + ' ';
        }
      });
      if (line) ctx.fillText(line.trim(), 20, lineY);
    });

    // ── Right panel: 2D scene ──────────────────────────────────────────
    ctx.fillStyle = '#080808';
    ctx.fillRect(222, 0, W - 222, H);

    // floor grid
    ctx.strokeStyle = 'rgba(0,255,65,0.04)';
    ctx.lineWidth = 0.5;
    for (let gx = 222; gx < W; gx += 30) {
      ctx.beginPath(); ctx.moveTo(gx, 0); ctx.lineTo(gx, H); ctx.stroke();
    }
    for (let gy = 0; gy < H; gy += 30) {
      ctx.beginPath(); ctx.moveTo(222, gy); ctx.lineTo(W, gy); ctx.stroke();
    }

    // bin
    const b = SCENE.bin;
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(b.x, b.y, b.w, b.h);
    ctx.fillStyle = 'rgba(245,158,11,0.06)';
    ctx.fillRect(b.x, b.y, b.w, b.h);
    ctx.fillStyle = 'rgba(245,158,11,0.7)';
    ctx.font = '9px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('BIN', b.x + b.w / 2, b.y + b.h / 2 + 3);

    // blocks
    blocksRef.current.forEach(blk => {
      ctx.fillStyle = blk.color;
      ctx.fillRect(blk.x - 12, blk.y - 10, 24, 20);
      ctx.fillStyle = '#000';
      ctx.font = 'bold 7px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(blk.label, blk.x, blk.y + 3);
    });

    // hallucinated block
    if (hallucBlockRef.current) {
      const hb = hallucBlockRef.current;
      ctx.fillStyle = 'rgba(255,68,68,0.18)';
      ctx.fillRect(hb.x - 14, hb.y - 12, 28, 24);
      ctx.strokeStyle = '#ff4444';
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 3]);
      ctx.strokeRect(hb.x - 14, hb.y - 12, 28, 24);
      ctx.setLineDash([]);
      ctx.fillStyle = '#ff4444';
      ctx.font = 'bold 7px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('HALLUCINATED', hb.x, hb.y - 16);
      ctx.fillText('???', hb.x, hb.y + 3);
    }

    // arm
    const arm = armRef.current;
    ctx.strokeStyle = 'rgba(0,255,65,0.5)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(290, 300);
    ctx.lineTo(arm.x, arm.y);
    ctx.stroke();

    ctx.fillStyle = arm.holding ? '#00ff41' : 'rgba(0,255,65,0.4)';
    ctx.beginPath();
    ctx.arc(arm.x, arm.y, 7, 0, Math.PI * 2);
    ctx.fill();

    if (arm.holding) {
      ctx.fillStyle = arm.holding.color;
      ctx.fillRect(arm.x - 8, arm.y - 16, 16, 14);
    }

    // step indicator
    const activeStep = stepIdxRef.current >= 0 && stepsRef.current[stepIdxRef.current];
    if (activeStep) {
      ctx.fillStyle = 'rgba(0,255,65,0.5)';
      ctx.font = '10px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(activeStep.text.slice(0, 36), 222 + (W - 222) / 2, 16);
    }
  }, []);

  // animation / step execution
  useEffect(() => {
    let last = performance.now();
    const loop = (ts: number) => {
      const dt = ts - last;
      last = ts;

      if (runningRef.current) {
        stepTimerRef.current += dt;
        const idx = stepIdxRef.current;
        const steps2 = stepsRef.current;

        if (idx < steps2.length) {
          steps2[idx].status = 'running';
          const delay = steps2[idx].hallucinated ? 1200 : 800;

          // move arm toward relevant block or bin
          const step = steps2[idx];
          const lower = step.text.toLowerCase();
          let targetX = arm.x, targetY = arm.y;

          if (lower.includes('perceive') || lower.includes('home')) {
            targetX = 290; targetY = 200;
          } else if (step.hallucinated) {
            targetX = 380; targetY = 80;
            if (!hallucBlockRef.current) hallucBlockRef.current = { x: 385, y: 75 };
          } else {
            const colors = ['red', 'blue', 'green'];
            for (const c of colors) {
              if (lower.includes(c)) {
                const blk = blocksRef.current.find(b => b.id === c);
                if (blk) {
                  if (lower.includes('transport') || lower.includes('place') || lower.includes('stack')) {
                    targetX = SCENE.bin.x + 35;
                    targetY = SCENE.bin.y + 25;
                    if (armRef.current.holding?.id === c) {
                      // move block too
                    }
                  } else {
                    targetX = blk.x; targetY = blk.y;
                  }
                }
                break;
              }
            }
          }

          // smooth arm movement
          const arm2 = armRef.current;
          arm2.x += (targetX - arm2.x) * 0.08;
          arm2.y += (targetY - arm2.y) * 0.08;

          // grip / release logic
          if (lower.includes('close gripper') || lower.includes('grasp')) {
            const blk = blocksRef.current.find(b =>
              Math.hypot(b.x - arm2.x, b.y - arm2.y) < 20);
            if (blk) arm2.holding = blk;
          }
          if (lower.includes('open gripper') || lower.includes('release')) {
            if (arm2.holding) {
              arm2.holding.x = arm2.x;
              arm2.holding.y = arm2.y;
              arm2.holding = null;
            }
          }
          if (arm2.holding) {
            arm2.holding.x = arm2.x;
            arm2.holding.y = arm2.y;
          }

          if (stepTimerRef.current > delay) {
            steps2[idx].status = step.hallucinated ? 'error' : 'done';
            stepIdxRef.current = idx + 1;
            stepTimerRef.current = 0;
            if (step.hallucinated) {
              // stop on hallucination error
              runningRef.current = false;
              setRunning(false);
              stepIdxRef.current = idx; // leave at error step
            }
            setSteps([...steps2]);
          }
        } else {
          runningRef.current = false;
          setRunning(false);
        }
      }

      draw();
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, [draw]);

  const arm = armRef.current; // for closure

  const handleRun = () => {
    // reset scene
    blocksRef.current = JSON.parse(JSON.stringify(SCENE.blocks));
    armRef.current = { x: SCENE.arm.x, y: SCENE.arm.y, holding: null };
    hallucBlockRef.current = null;
    const plan = generatePlan(goal);
    stepsRef.current = plan;
    stepIdxRef.current = 0;
    stepTimerRef.current = 0;
    setSteps(plan);
    runningRef.current = true;
    setRunning(true);
  };

  const handleReset = () => {
    runningRef.current = false;
    setRunning(false);
    blocksRef.current = JSON.parse(JSON.stringify(SCENE.blocks));
    armRef.current = { x: SCENE.arm.x, y: SCENE.arm.y, holding: null };
    hallucBlockRef.current = null;
    stepsRef.current = [];
    stepIdxRef.current = -1;
    setSteps([]);
  };

  return (
    <div>
      <div className="sim-canvas-wrap" style={{ marginBottom: 16 }}>
        <canvas ref={canvasRef} width={W} height={H}
          style={{ display: 'block', width: '100%', height: 'auto' }} />
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        <input
          type="text"
          value={goal}
          onChange={e => setGoal(e.target.value)}
          placeholder="e.g. pick up the red block and place in bin"
          onKeyDown={e => e.key === 'Enter' && !running && handleRun()}
          style={{
            flex: 1, background: 'var(--bg-card)', border: '1px solid var(--border)',
            borderRadius: 8, padding: '10px 14px', fontSize: 14,
            color: 'var(--text-primary)', fontFamily: 'var(--font-geist-mono)', outline: 'none',
          }}
        />
        <button onClick={running ? handleReset : handleRun} style={{
          background: running ? '#ff6b6b' : '#00ff41', color: '#000',
          border: 'none', borderRadius: 8, padding: '10px 20px',
          fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font-geist-mono)',
        }}>
          {running ? 'Stop' : 'Plan & Run'}
        </button>
      </div>

      <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
        Try mentioning an unknown object (e.g. &quot;purple sphere&quot;) to trigger a hallucination failure.
        Scene has: <span style={{ color: '#ff4444' }}>red</span>, <span style={{ color: '#3b82f6' }}>blue</span>, <span style={{ color: '#22c55e' }}>green</span> blocks + a bin.
      </p>
    </div>
  );
}
