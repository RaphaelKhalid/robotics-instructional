'use client';

import { useRef, useEffect, useLayoutEffect, useCallback, useState } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useProgress } from '@/lib/progress';
import { AVAILABLE_UNITS } from '@/lib/units';

const CircuitMap = dynamic(() => import('@/components/ui/CircuitMap'), { ssr: false });
const RobotArmCanvas = dynamic(() => import('@/components/hero/RobotArmCanvas'), { ssr: false });

const MONO = 'var(--font-jetbrains-mono, var(--font-geist-mono))';

const UNIT_DESCRIPTIONS: Record<number, string> = {
  1: 'Drag an arm end-effector and watch joints solve in real time. Discover the fold point where elbow-up and elbow-down converge.',
  2: 'Paint terrain, run four algorithms side by side. Find the map where the "obvious" path costs more than going around.',
  3: 'Drive a robot through fog. Watch uncertainty grow as landmarks are re-observed. Find the minimum loop closures needed.',
};

// ────────────────────────────────────────────────
// Micro-animation canvases
// ────────────────────────────────────────────────

function KinematicsCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    let t1 = 0;

    const draw = () => {
      const w = canvas.offsetWidth;
      const h = canvas.offsetHeight;
      canvas.width = w;
      canvas.height = h;
      ctx.clearRect(0, 0, w, h);

      const cx = w / 2;
      const cy = h / 2;
      const L1 = 80;
      const L2 = 60;
      t1 += 0.008;
      const t2 = Math.sin(t1 * 1.5) * 0.6;

      const j1x = cx;
      const j1y = cy;
      const j2x = j1x + Math.cos(t1) * L1;
      const j2y = j1y + Math.sin(t1) * L1;
      const ex = j2x + Math.cos(t1 + t2) * L2;
      const ey = j2y + Math.sin(t1 + t2) * L2;

      ctx.shadowColor = '#00ff41';
      ctx.shadowBlur = 12;

      // links
      ctx.strokeStyle = 'rgba(0,255,65,0.8)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(j1x, j1y);
      ctx.lineTo(j2x, j2y);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(j2x, j2y);
      ctx.lineTo(ex, ey);
      ctx.stroke();

      // joints
      ctx.fillStyle = '#00ff41';
      for (const [jx, jy] of [[j1x, j1y], [j2x, j2y]] as [number, number][]) {
        ctx.beginPath();
        ctx.arc(jx, jy, 5, 0, Math.PI * 2);
        ctx.fill();
      }

      // end effector
      ctx.fillStyle = '#00cc33';
      ctx.beginPath();
      ctx.arc(ex, ey, 4, 0, Math.PI * 2);
      ctx.fill();

      rafRef.current = requestAnimationFrame(draw);
    };

    rafRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  return <canvas ref={canvasRef} style={{ width: '100%', height: '100%', display: 'block' }} />;
}

function PathfindingCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const COLS = 14;
    const ROWS = 10;
    const START: [number, number] = [5, 0];
    const END: [number, number] = [8, 9];

    type State = 'empty' | 'visited' | 'frontier';
    let grid: State[][] = Array.from({ length: ROWS }, () => Array(COLS).fill('empty'));
    let frontier: [number, number][] = [START];
    grid[START[1]][START[0]] = 'frontier';
    let done = false;
    let pauseFrames = 0;
    let frame = 0;

    const bfsStep = () => {
      if (frontier.length === 0) { done = true; return; }
      const next: [number, number][] = [];
      for (const [fx, fy] of frontier) {
        grid[fy][fx] = 'visited';
        const neighbors: [number, number][] = [
          [fx - 1, fy], [fx + 1, fy], [fx, fy - 1], [fx, fy + 1],
        ];
        for (const [nx, ny] of neighbors) {
          if (nx >= 0 && nx < COLS && ny >= 0 && ny < ROWS && grid[ny][nx] === 'empty') {
            grid[ny][nx] = 'frontier';
            next.push([nx, ny]);
          }
        }
      }
      frontier = next;
      if (frontier.length === 0) done = true;
    };

    const draw = () => {
      frame++;
      const w = canvas.offsetWidth;
      const h = canvas.offsetHeight;
      canvas.width = w;
      canvas.height = h;

      if (done) {
        pauseFrames++;
        if (pauseFrames > 40) {
          grid = Array.from({ length: ROWS }, () => Array(COLS).fill('empty'));
          frontier = [START];
          grid[START[1]][START[0]] = 'frontier';
          done = false;
          pauseFrames = 0;
          frame = 0;
        }
      } else if (frame % 3 === 0) {
        bfsStep();
      }

      const cellW = w / COLS;
      const cellH = h / ROWS;

      for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
          const s = grid[r][c];
          const isStart = c === START[0] && r === START[1];
          const isEnd = c === END[0] && r === END[1];

          if (isStart || isEnd) {
            ctx.shadowColor = '#00ff41';
            ctx.shadowBlur = 10;
            ctx.fillStyle = '#00ff41';
          } else if (s === 'frontier') {
            ctx.shadowColor = '#00ff41';
            ctx.shadowBlur = 6;
            ctx.fillStyle = '#00ff41';
          } else if (s === 'visited') {
            ctx.shadowColor = 'none';
            ctx.shadowBlur = 0;
            ctx.fillStyle = 'rgba(0,255,65,0.18)';
          } else {
            ctx.shadowBlur = 0;
            ctx.fillStyle = 'rgba(0,255,65,0.04)';
          }

          ctx.fillRect(c * cellW + 1, r * cellH + 1, cellW - 2, cellH - 2);
          ctx.shadowBlur = 0;
        }
      }

      rafRef.current = requestAnimationFrame(draw);
    };

    rafRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  return <canvas ref={canvasRef} style={{ width: '100%', height: '100%', display: 'block' }} />;
}

function SLAMCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    let angle = 0;

    const LANDMARKS: [number, number][] = [[0.2, 0.3], [0.75, 0.5], [0.5, 0.8]];

    const draw = () => {
      const w = canvas.offsetWidth;
      const h = canvas.offsetHeight;
      canvas.width = w;
      canvas.height = h;
      ctx.clearRect(0, 0, w, h);

      angle += 0.012;
      const cx = w / 2 + Math.cos(angle) * 60;
      const cy = h / 2 + Math.sin(angle) * 60;

      // walls
      ctx.strokeStyle = 'rgba(0,255,65,0.2)';
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      ctx.strokeRect(w * 0.1, h * 0.1, w * 0.8, h * 0.8);
      ctx.setLineDash([]);

      // landmarks
      for (const [lx, ly] of LANDMARKS) {
        const px = lx * w;
        const py = ly * h;
        const dist = Math.hypot(cx - px, cy - py);
        const near = dist < 80;
        ctx.shadowColor = '#00ff41';
        ctx.shadowBlur = near ? 14 : 4;
        ctx.fillStyle = near ? '#00ff41' : 'rgba(0,255,65,0.4)';
        ctx.beginPath();
        ctx.arc(px, py, near ? 5 : 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      }

      // uncertainty ellipse
      ctx.strokeStyle = 'rgba(255,107,53,0.5)';
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 3]);
      const rx = 30 + Math.sin(angle * 2) * 8;
      const ry = 22 + Math.cos(angle * 3) * 5;
      ctx.beginPath();
      ctx.ellipse(cx, cy, rx, ry, angle, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);

      // robot dot
      ctx.shadowColor = '#00ff41';
      ctx.shadowBlur = 14;
      ctx.fillStyle = '#00ff41';
      ctx.beginPath();
      ctx.arc(cx, cy, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

      rafRef.current = requestAnimationFrame(draw);
    };

    rafRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  return <canvas ref={canvasRef} style={{ width: '100%', height: '100%', display: 'block' }} />;
}

// Unit 4 – PID: ball tracking a setpoint with oscillation
function PIDCanvas() {
  const ref = useRef<HTMLCanvasElement>(null);
  const raf = useRef(0);
  useEffect(() => {
    const c = ref.current; if (!c) return;
    const ctx = c.getContext('2d')!;
    let t = 0, pos = 0, vel = 0, integral = 0, prev = 0;
    const Kp = 4, Ki = 0.02, Kd = 1.2;
    const draw = () => {
      const w = c.offsetWidth, h = c.offsetHeight;
      c.width = w; c.height = h;
      ctx.fillStyle = '#050505'; ctx.fillRect(0, 0, w, h);
      t += 0.02;
      const sp = Math.sin(t * 0.5) * h * 0.3 + h / 2;
      const err = sp - pos;
      integral += err * 0.02;
      const deriv = (err - prev) / 0.02;
      const force = Kp * err + Ki * integral + Kd * deriv;
      vel = vel * 0.85 + force * 0.015;
      pos += vel;
      prev = err;
      // setpoint line
      ctx.strokeStyle = 'rgba(0,255,65,0.25)'; ctx.lineWidth = 1; ctx.setLineDash([4,4]);
      ctx.beginPath(); ctx.moveTo(0, sp); ctx.lineTo(w, sp); ctx.stroke();
      ctx.setLineDash([]);
      // ball
      ctx.shadowColor = '#00ff41'; ctx.shadowBlur = 16;
      ctx.fillStyle = '#00ff41';
      ctx.beginPath(); ctx.arc(w / 2, pos, 10, 0, Math.PI * 2); ctx.fill();
      ctx.shadowBlur = 0;
      ctx.fillStyle = 'rgba(0,255,65,0.3)'; ctx.font = '10px monospace';
      ctx.fillText('PID', 8, 16);
      raf.current = requestAnimationFrame(draw);
    };
    raf.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf.current);
  }, []);
  return <canvas ref={ref} style={{ width: '100%', height: '100%', display: 'block' }} />;
}

// Unit 5 – Kalman: noisy dots + smooth estimate line
function KalmanCanvas() {
  const ref = useRef<HTMLCanvasElement>(null);
  const raf = useRef(0);
  useEffect(() => {
    const c = ref.current; if (!c) return;
    const ctx = c.getContext('2d')!;
    let t = 0, kfPos = 0, P = 100;
    const R = 40, Q = 1;
    const hist: number[] = [];
    const draw = () => {
      const w = c.offsetWidth, h = c.offsetHeight;
      c.width = w; c.height = h;
      ctx.fillStyle = '#050505'; ctx.fillRect(0, 0, w, h);
      t += 0.025;
      const truth = Math.sin(t * 0.7) * h * 0.28 + h / 2;
      const gps = truth + (Math.random() - 0.5) * 60;
      const Pp = P + Q;
      const K = Pp / (Pp + R);
      kfPos = kfPos + K * (gps - kfPos);
      P = (1 - K) * Pp;
      hist.push(kfPos);
      if (hist.length > w) hist.shift();
      // GPS scatter
      ctx.fillStyle = 'rgba(59,130,246,0.5)';
      ctx.beginPath(); ctx.arc((hist.length / w) * w, gps, 2.5, 0, Math.PI * 2); ctx.fill();
      // Kalman line
      ctx.strokeStyle = '#00ff41'; ctx.lineWidth = 2;
      ctx.shadowColor = '#00ff41'; ctx.shadowBlur = 6;
      ctx.beginPath();
      hist.forEach((y, i) => i === 0 ? ctx.moveTo(i, y) : ctx.lineTo(i, y));
      ctx.stroke(); ctx.shadowBlur = 0;
      ctx.fillStyle = 'rgba(0,255,65,0.3)'; ctx.font = '10px monospace';
      ctx.fillText('KALMAN', 8, 16);
      raf.current = requestAnimationFrame(draw);
    };
    raf.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf.current);
  }, []);
  return <canvas ref={ref} style={{ width: '100%', height: '100%', display: 'block' }} />;
}

// Unit 6 – Dynamics: swinging pendulum
function DynamicsCanvas() {
  const ref = useRef<HTMLCanvasElement>(null);
  const raf = useRef(0);
  useEffect(() => {
    const c = ref.current; if (!c) return;
    const ctx = c.getContext('2d')!;
    let theta = 1.2, omega = 0;
    const draw = () => {
      const w = c.offsetWidth, h = c.offsetHeight;
      c.width = w; c.height = h;
      ctx.fillStyle = '#050505'; ctx.fillRect(0, 0, w, h);
      const alpha = -9 * Math.sin(theta) - 0.15 * omega;
      omega += alpha / 60; theta += omega / 60;
      const L = Math.min(w, h) * 0.35;
      const px = w / 2, py = h * 0.2;
      const bx = px + L * Math.sin(theta), by = py + L * Math.cos(theta);
      // arc hint
      ctx.strokeStyle = 'rgba(0,255,65,0.1)'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(px, py, L, 0, Math.PI * 2); ctx.stroke();
      // rod
      ctx.strokeStyle = '#00ff41'; ctx.lineWidth = 3; ctx.lineCap = 'round';
      ctx.shadowColor = '#00ff41'; ctx.shadowBlur = 8;
      ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(bx, by); ctx.stroke();
      // pivot
      ctx.fillStyle = 'rgba(0,255,65,0.5)';
      ctx.beginPath(); ctx.arc(px, py, 4, 0, Math.PI * 2); ctx.fill();
      // bob
      ctx.fillStyle = '#00ff41'; ctx.shadowBlur = 14;
      ctx.beginPath(); ctx.arc(bx, by, 11, 0, Math.PI * 2); ctx.fill();
      ctx.shadowBlur = 0;
      ctx.fillStyle = 'rgba(0,255,65,0.3)'; ctx.font = '10px monospace';
      ctx.fillText('DYNAMICS', 8, 16);
      raf.current = requestAnimationFrame(draw);
    };
    raf.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf.current);
  }, []);
  return <canvas ref={ref} style={{ width: '100%', height: '100%', display: 'block' }} />;
}

// Unit 7 – Vision: moving shapes + edge highlight
function VisionCanvas() {
  const ref = useRef<HTMLCanvasElement>(null);
  const raf = useRef(0);
  useEffect(() => {
    const c = ref.current; if (!c) return;
    const ctx = c.getContext('2d')!;
    let t = 0;
    const draw = () => {
      const w = c.offsetWidth, h = c.offsetHeight;
      c.width = w; c.height = h;
      ctx.fillStyle = '#050505'; ctx.fillRect(0, 0, w, h);
      t += 0.012;
      // shapes
      const shapes = [
        { x: w*0.25 + Math.sin(t)*20, y: h*0.45, type:'rect', color:'#1e6b3a' },
        { x: w*0.6 + Math.cos(t*0.7)*15, y: h*0.4, type:'circle', color:'#2b8cc4' },
        { x: w*0.45, y: h*0.65 + Math.sin(t*1.2)*12, type:'tri', color:'#c4912b' },
      ];
      for (const s of shapes) {
        ctx.fillStyle = s.color;
        if (s.type === 'rect') ctx.fillRect(s.x - 22, s.y - 18, 44, 36);
        else if (s.type === 'circle') { ctx.beginPath(); ctx.arc(s.x, s.y, 22, 0, Math.PI*2); ctx.fill(); }
        else { ctx.beginPath(); ctx.moveTo(s.x, s.y-20); ctx.lineTo(s.x+22, s.y+16); ctx.lineTo(s.x-22, s.y+16); ctx.closePath(); ctx.fill(); }
        // edge glow outline
        ctx.strokeStyle = '#00ff41'; ctx.lineWidth = 1.5;
        ctx.shadowColor = '#00ff41'; ctx.shadowBlur = 6;
        if (s.type === 'rect') ctx.strokeRect(s.x - 22, s.y - 18, 44, 36);
        else if (s.type === 'circle') { ctx.beginPath(); ctx.arc(s.x, s.y, 22, 0, Math.PI*2); ctx.stroke(); }
        else { ctx.beginPath(); ctx.moveTo(s.x, s.y-20); ctx.lineTo(s.x+22, s.y+16); ctx.lineTo(s.x-22, s.y+16); ctx.closePath(); ctx.stroke(); }
        ctx.shadowBlur = 0;
      }
      ctx.fillStyle = 'rgba(0,255,65,0.3)'; ctx.font = '10px monospace';
      ctx.fillText('VISION', 8, 16);
      raf.current = requestAnimationFrame(draw);
    };
    raf.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf.current);
  }, []);
  return <canvas ref={ref} style={{ width: '100%', height: '100%', display: 'block' }} />;
}

// Unit 8 – Swarm: mini boids
function SwarmCanvas() {
  const ref = useRef<HTMLCanvasElement>(null);
  const raf = useRef(0);
  useEffect(() => {
    const c = ref.current; if (!c) return;
    const ctx = c.getContext('2d')!;
    const N = 18;
    const boids = Array.from({length:N}, () => ({
      x: Math.random()*200, y: Math.random()*120,
      vx: (Math.random()-0.5)*2, vy: (Math.random()-0.5)*2,
    }));
    const draw = () => {
      const w = c.offsetWidth, h = c.offsetHeight;
      c.width = w; c.height = h;
      ctx.fillStyle = '#050505'; ctx.fillRect(0, 0, w, h);
      const R2 = 50*50;
      for (const b of boids) {
        let sx=0,sy=0,ax=0,ay=0,cx2=0,cy2=0,n=0;
        for (const o of boids) {
          if (o===b) continue;
          const dx=b.x-o.x, dy=b.y-o.y, d2=dx*dx+dy*dy;
          if (d2<R2&&d2>0) { const d=Math.sqrt(d2); sx+=dx/d2; sy+=dy/d2; ax+=o.vx; ay+=o.vy; cx2+=o.x; cy2+=o.y; n++; }
        }
        if (n>0) { b.vx+=sx*0.05+(ax/n-b.vx)*0.05+((cx2/n-b.x)/50)*0.05; b.vy+=sy*0.05+(ay/n-b.vy)*0.05+((cy2/n-b.y)/50)*0.05; }
        const sp=Math.hypot(b.vx,b.vy); if(sp>2){b.vx=b.vx/sp*2;b.vy=b.vy/sp*2;}
        b.x+=b.vx; b.y+=b.vy;
        if(b.x<0)b.x+=w; if(b.x>w)b.x-=w; if(b.y<0)b.y+=h; if(b.y>h)b.y-=h;
      }
      ctx.fillStyle = '#00ff41'; ctx.shadowColor='#00ff41'; ctx.shadowBlur=5;
      for (const b of boids) {
        const a=Math.atan2(b.vy,b.vx);
        ctx.save(); ctx.translate(b.x,b.y); ctx.rotate(a);
        ctx.beginPath(); ctx.moveTo(5,0); ctx.lineTo(-3,2.5); ctx.lineTo(-3,-2.5); ctx.closePath(); ctx.fill();
        ctx.restore();
      }
      ctx.shadowBlur=0;
      ctx.fillStyle='rgba(0,255,65,0.3)'; ctx.font='10px monospace'; ctx.fillText('SWARM',8,16);
      raf.current = requestAnimationFrame(draw);
    };
    raf.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf.current);
  }, []);
  return <canvas ref={ref} style={{ width: '100%', height: '100%', display: 'block' }} />;
}

// Unit 9 – Manipulation: rotating box with contact dots
function ManipCanvas() {
  const ref = useRef<HTMLCanvasElement>(null);
  const raf = useRef(0);
  useEffect(() => {
    const c = ref.current; if (!c) return;
    const ctx = c.getContext('2d')!;
    let t = 0;
    const draw = () => {
      const w = c.offsetWidth, h = c.offsetHeight;
      c.width = w; c.height = h;
      ctx.fillStyle = '#050505'; ctx.fillRect(0, 0, w, h);
      t += 0.008;
      const cx = w/2, cy = h/2, bw = 38, bh = 30;
      ctx.save(); ctx.translate(cx, cy); ctx.rotate(Math.sin(t)*0.3);
      ctx.strokeStyle = '#10d98a'; ctx.lineWidth = 2;
      ctx.strokeRect(-bw, -bh, bw*2, bh*2);
      // contacts
      const pts: [number,number,number,number][] = [[-bw,0,1,0],[bw,0,-1,0],[0,-bh,0,1]];
      for (const [px,py,nx,ny] of pts) {
        ctx.fillStyle='#00ff41'; ctx.shadowColor='#00ff41'; ctx.shadowBlur=8;
        ctx.beginPath(); ctx.arc(px,py,5,0,Math.PI*2); ctx.fill(); ctx.shadowBlur=0;
        // cone lines
        ctx.strokeStyle='rgba(245,158,11,0.6)'; ctx.lineWidth=1;
        const base=Math.atan2(ny,nx), cone=0.45;
        ctx.beginPath(); ctx.moveTo(px,py); ctx.lineTo(px+30*Math.cos(base-cone),py+30*Math.sin(base-cone)); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(px,py); ctx.lineTo(px+30*Math.cos(base+cone),py+30*Math.sin(base+cone)); ctx.stroke();
      }
      ctx.restore();
      ctx.fillStyle='rgba(0,255,65,0.3)'; ctx.font='10px monospace'; ctx.fillText('MANIPULATION',8,16);
      raf.current = requestAnimationFrame(draw);
    };
    raf.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf.current);
  }, []);
  return <canvas ref={ref} style={{ width: '100%', height: '100%', display: 'block' }} />;
}

// Unit 10 – VLA: pulsing pipeline nodes
function VLACanvas() {
  const ref = useRef<HTMLCanvasElement>(null);
  const raf = useRef(0);
  useEffect(() => {
    const c = ref.current; if (!c) return;
    const ctx = c.getContext('2d')!;
    let t = 0;
    const labels = ['CAM','PATCH','TOKEN','FUSE','ACT','EXEC'];
    const draw = () => {
      const w = c.offsetWidth, h = c.offsetHeight;
      c.width = w; c.height = h;
      ctx.fillStyle = '#050505'; ctx.fillRect(0, 0, w, h);
      t += 0.03;
      const n = labels.length;
      const step = w / (n + 1);
      const cy = h / 2;
      for (let i = 0; i < n; i++) {
        const x = step * (i + 1);
        const active = (Math.floor(t) % n) === i;
        const pulse = active ? 0.5 + 0.5*Math.sin(t*8) : 0;
        if (i < n-1) {
          const nx = step*(i+2);
          ctx.strokeStyle = active ? `rgba(0,255,65,${0.3+pulse*0.5})` : 'rgba(0,255,65,0.15)';
          ctx.lineWidth = 1.5; ctx.setLineDash([3,3]);
          ctx.beginPath(); ctx.moveTo(x+10, cy); ctx.lineTo(nx-10, cy); ctx.stroke();
          ctx.setLineDash([]);
        }
        ctx.fillStyle = active ? `rgba(0,255,65,${0.8+pulse*0.2})` : 'rgba(0,255,65,0.3)';
        ctx.shadowColor = '#00ff41'; ctx.shadowBlur = active ? 14+pulse*8 : 4;
        ctx.beginPath(); ctx.arc(x, cy, active ? 8 : 6, 0, Math.PI*2); ctx.fill();
        ctx.shadowBlur = 0;
        ctx.fillStyle = 'rgba(0,255,65,0.5)'; ctx.font = '8px monospace'; ctx.textAlign = 'center';
        ctx.fillText(labels[i], x, cy + 18);
      }
      ctx.textAlign = 'left';
      ctx.fillStyle='rgba(0,255,65,0.3)'; ctx.font='10px monospace'; ctx.fillText('VLA',8,16);
      raf.current = requestAnimationFrame(draw);
    };
    raf.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf.current);
  }, []);
  return <canvas ref={ref} style={{ width: '100%', height: '100%', display: 'block' }} />;
}

// Unit 11 – LLM Brain: token stream animation
function LLMCanvas() {
  const ref = useRef<HTMLCanvasElement>(null);
  const raf = useRef(0);
  useEffect(() => {
    const c = ref.current; if (!c) return;
    const ctx = c.getContext('2d')!;
    let t = 0;
    const tokens = ['PICK','UP','THE','RED','BLOCK','→','GRASP','→','LIFT','→','PLACE'];
    const draw = () => {
      const w = c.offsetWidth, h = c.offsetHeight;
      c.width = w; c.height = h;
      ctx.fillStyle = '#050505'; ctx.fillRect(0, 0, w, h);
      t += 0.018;
      const visible = Math.floor(t) % (tokens.length + 4);
      ctx.font = '11px monospace';
      let x = 12, y = h/2 - 10;
      for (let i = 0; i < Math.min(visible, tokens.length); i++) {
        const age = visible - i;
        const alpha = Math.max(0.15, 1 - age * 0.08);
        const isNew = age <= 1;
        ctx.fillStyle = isNew ? `rgba(0,255,65,${alpha})` : `rgba(0,255,65,${alpha*0.6})`;
        if (isNew) { ctx.shadowColor='#00ff41'; ctx.shadowBlur=10; }
        ctx.fillText(tokens[i], x, y);
        ctx.shadowBlur=0;
        x += ctx.measureText(tokens[i]).width + 6;
        if (x > w - 40) { x = 12; y += 18; }
      }
      // cursor blink
      if (Math.sin(t*5)>0) { ctx.fillStyle='#00ff41'; ctx.fillRect(x, y-11, 7, 13); }
      ctx.fillStyle='rgba(0,255,65,0.3)'; ctx.font='10px monospace'; ctx.fillText('LLM BRAIN',8,16);
      raf.current = requestAnimationFrame(draw);
    };
    raf.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf.current);
  }, []);
  return <canvas ref={ref} style={{ width: '100%', height: '100%', display: 'block' }} />;
}

// Unit 12 – World Models: actual vs predicted ball
function WorldModelCanvas() {
  const ref = useRef<HTMLCanvasElement>(null);
  const raf = useRef(0);
  useEffect(() => {
    const c = ref.current; if (!c) return;
    const ctx = c.getContext('2d')!;
    let t = 0;
    const draw = () => {
      const w = c.offsetWidth, h = c.offsetHeight;
      c.width = w; c.height = h;
      ctx.fillStyle = '#050505'; ctx.fillRect(0, 0, w, h);
      t += 0.02;
      const phase = (t % (Math.PI*2));
      // actual (bouncing ball)
      const ax = (phase / (Math.PI*2)) * w;
      const ay = h*0.75 - Math.abs(Math.sin(phase*1.5)) * h*0.45;
      // predicted (smooth arc — slightly off)
      const px = ax;
      const py = h*0.75 - Math.abs(Math.sin(phase*1.5 + 0.3)) * h*0.4 - 8;
      // predicted dashed
      ctx.strokeStyle = 'rgba(59,130,246,0.6)'; ctx.lineWidth = 1.5; ctx.setLineDash([4,4]);
      ctx.beginPath(); ctx.arc(px, py, 9, 0, Math.PI*2); ctx.stroke();
      ctx.setLineDash([]);
      // actual solid
      ctx.fillStyle = '#00ff41'; ctx.shadowColor='#00ff41'; ctx.shadowBlur=12;
      ctx.beginPath(); ctx.arc(ax, ay, 9, 0, Math.PI*2); ctx.fill();
      ctx.shadowBlur=0;
      // ground
      ctx.strokeStyle='rgba(0,255,65,0.15)'; ctx.lineWidth=1;
      ctx.beginPath(); ctx.moveTo(0,h*0.76); ctx.lineTo(w,h*0.76); ctx.stroke();
      ctx.fillStyle='rgba(0,255,65,0.3)'; ctx.font='10px monospace'; ctx.fillText('WORLD MODEL',8,16);
      ctx.fillStyle='rgba(59,130,246,0.5)'; ctx.fillText('-- predicted',8,30);
      raf.current = requestAnimationFrame(draw);
    };
    raf.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf.current);
  }, []);
  return <canvas ref={ref} style={{ width: '100%', height: '100%', display: 'block' }} />;
}

// Unit 13 – Edge AI: pruning network graph
function EdgeAICanvas() {
  const ref = useRef<HTMLCanvasElement>(null);
  const raf = useRef(0);
  useEffect(() => {
    const c = ref.current; if (!c) return;
    const ctx = c.getContext('2d')!;
    let t = 0;
    const layers = [3, 5, 5, 3];
    const draw = () => {
      const w = c.offsetWidth, h = c.offsetHeight;
      c.width = w; c.height = h;
      ctx.fillStyle = '#050505'; ctx.fillRect(0, 0, w, h);
      t += 0.008;
      const pruneLevel = (Math.sin(t * 0.4) * 0.5 + 0.5);
      const nodePos: [number, number][][] = layers.map((n, li) => {
        const x = (w * (li + 1)) / (layers.length + 1);
        return Array.from({length: n}, (_, ni) => [x, h/2 + (ni - (n-1)/2) * (h/(n+1))]);
      });
      // edges
      for (let li = 0; li < layers.length - 1; li++) {
        for (const [ax, ay] of nodePos[li]) {
          for (const [bx, by] of nodePos[li+1]) {
            const seed = ax * 13 + ay * 7 + bx * 3 + by;
            const pruned = ((seed % 100) / 100) < pruneLevel * 0.6;
            if (pruned) continue;
            ctx.strokeStyle = 'rgba(0,255,65,0.2)'; ctx.lineWidth = 1;
            ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by); ctx.stroke();
          }
        }
      }
      // nodes
      for (const layer of nodePos) {
        for (const [nx, ny] of layer) {
          ctx.fillStyle = '#00ff41'; ctx.shadowColor='#00ff41'; ctx.shadowBlur=6;
          ctx.beginPath(); ctx.arc(nx, ny, 5, 0, Math.PI*2); ctx.fill();
        }
      }
      ctx.shadowBlur=0;
      ctx.fillStyle='rgba(0,255,65,0.3)'; ctx.font='10px monospace'; ctx.fillText('EDGE AI',8,16);
      ctx.fillStyle='rgba(0,255,65,0.2)'; ctx.font='9px monospace';
      ctx.fillText(`pruning: ${(pruneLevel*60).toFixed(0)}%`, 8, h-8);
      raf.current = requestAnimationFrame(draw);
    };
    raf.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf.current);
  }, []);
  return <canvas ref={ref} style={{ width: '100%', height: '100%', display: 'block' }} />;
}

const MICRO_CANVASES: Record<number, React.ComponentType> = {
  1: KinematicsCanvas,
  2: PathfindingCanvas,
  3: SLAMCanvas,
  4: PIDCanvas,
  5: KalmanCanvas,
  6: DynamicsCanvas,
  7: VisionCanvas,
  8: SwarmCanvas,
  9: ManipCanvas,
  10: VLACanvas,
  11: LLMCanvas,
  12: WorldModelCanvas,
  13: EdgeAICanvas,
};

// ────────────────────────────────────────────────
// Unit card
// ────────────────────────────────────────────────

function UnitCard({ unit, index }: { unit: typeof AVAILABLE_UNITS[number]; index: number }) {
  const cardRef = useRef<HTMLDivElement>(null);
  const MicroCanvas = MICRO_CANVASES[unit.id];

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const el = cardRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    el.style.transform = `perspective(800px) rotateY(${x * 6}deg) rotateX(${-y * 6}deg)`;
    el.style.borderColor = 'rgba(0,255,65,0.4)';
    el.style.boxShadow = '0 0 40px rgba(0,255,65,0.08)';
  }, []);

  const handleMouseLeave = useCallback(() => {
    const el = cardRef.current;
    if (!el) return;
    el.style.transform = 'perspective(800px) rotateY(0deg) rotateX(0deg)';
    el.style.borderColor = 'rgba(0,255,65,0.12)';
    el.style.boxShadow = 'none';
  }, []);

  return (
    <Link href={`/units/${unit.slug}`} style={{ textDecoration: 'none', display: 'block' }}>
      <div
        ref={cardRef}
        className="unit-card-reveal"
        data-index={index}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        style={{
          background: '#000',
          border: '1px solid rgba(0,255,65,0.12)',
          borderRadius: 4,
          overflow: 'hidden',
          cursor: 'pointer',
          position: 'relative',
          transition: 'border-color 0.2s, box-shadow 0.2s',
          transformStyle: 'preserve-3d',
          opacity: 0,
          transform: 'translateY(60px)',
        }}
      >
        {/* Micro-canvas preview */}
        <div style={{ height: 200, position: 'relative', background: '#050505' }}>
          {MicroCanvas && <MicroCanvas />}
        </div>

        {/* Card body */}
        <div style={{ padding: 24 }}>
          <div style={{ fontFamily: MONO, fontSize: 11, color: '#00ff41', opacity: 0.5, marginBottom: 8 }}>
            {String(unit.id).padStart(2, '0')}
          </div>
          <div style={{ fontFamily: MONO, fontSize: 20, fontWeight: 700, color: '#e8ffe8', marginBottom: 8 }}>
            {unit.title}
          </div>
          <div style={{
            color: 'rgba(0,255,65,0.5)', fontSize: 13, lineHeight: 1.6, marginBottom: 20,
            fontFamily: MONO,
          }}>
            {UNIT_DESCRIPTIONS[unit.id] ?? unit.description}
          </div>
          <div style={{ fontFamily: MONO, fontSize: 12, color: '#00ff41' }}>→ enter</div>
        </div>
      </div>
    </Link>
  );
}

// ────────────────────────────────────────────────
// Main dashboard
// ────────────────────────────────────────────────

export default function Dashboard() {
  const { solvedCount, reset } = useProgress();
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  const solved = mounted ? solvedCount() : 0;
  const total = 13;

  const h1ScrambleRef = useRef<HTMLSpanElement>(null);
  const statsRowRef = useRef<HTMLDivElement>(null);
  const cardsRef = useRef<HTMLDivElement>(null);

  // Sequential character scramble — each letter resolves before next starts
  useEffect(() => {
    const el = h1ScrambleRef.current;
    if (!el) return;
    const target = 'ROBOTICS';
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#@$%&';
    const FLASHES = 6;
    const FLASH_MS = 90;

    const wait = (ms: number) => new Promise<void>(res => setTimeout(res, ms));

    const scrambleChar = async (index: number) => {
      for (let f = 0; f < FLASHES; f++) {
        const current = el.textContent ?? target;
        el.textContent =
          current.slice(0, index) +
          chars[Math.floor(Math.random() * chars.length)] +
          (index < current.length - 1 ? current.slice(index + 1) : '');
        await wait(FLASH_MS);
      }
      // Settle this character
      const current = el.textContent ?? target;
      el.textContent = current.slice(0, index) + target[index] + current.slice(index + 1);
    };

    const run = async () => {
      // Start with all dashes so there's something to scramble
      el.textContent = '--------';
      await wait(300);
      for (let i = 0; i < target.length; i++) {
        await scrambleChar(i);
        await wait(40); // brief pause between characters
      }
      // Glow pulse after reveal
      el.style.textShadow = '0 0 20px #00ff41';
      await wait(120);
      el.style.textShadow = '0 0 0px #00ff41';
    };

    run();
  }, []);

  // GSAP ScrollTrigger for stats row
  useLayoutEffect(() => {
    if (!statsRowRef.current) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced) return;

    gsap.registerPlugin(ScrollTrigger);
    const chips = statsRowRef.current.querySelectorAll<HTMLElement>('.stat-chip');
    const triggers: ScrollTrigger[] = [];

    chips.forEach((chip, i) => {
      const st = ScrollTrigger.create({
        trigger: chip,
        start: 'top 85%',
        onEnter: () => {
          gsap.to(chip, { opacity: 1, y: 0, duration: 0.5, delay: i * 0.15, ease: 'power2.out' });
        },
        once: true,
      });
      triggers.push(st);
    });

    return () => triggers.forEach(t => t.kill());
  }, []);

  // GSAP ScrollTrigger for unit cards
  useLayoutEffect(() => {
    if (!cardsRef.current) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced) return;

    gsap.registerPlugin(ScrollTrigger);
    const cards = cardsRef.current.querySelectorAll<HTMLElement>('.unit-card-reveal');
    const triggers: ScrollTrigger[] = [];

    cards.forEach((card) => {
      const st = ScrollTrigger.create({
        trigger: card,
        start: 'top 88%',
        onEnter: () => {
          gsap.to(card, { opacity: 1, y: 0, duration: 0.6, ease: 'power2.out' });
        },
        once: true,
      });
      triggers.push(st);
    });

    return () => triggers.forEach(t => t.kill());
  }, []);

  const scrollToUnits = () => {
    document.getElementById('units')?.scrollIntoView({ behavior: 'smooth' });
  };

  const hairlines = [10, 25, 42, 60, 78];

  return (
    <main style={{ minHeight: '100vh', background: '#000' }}>

      {/* ── HEADER ── */}
      <header style={{
        borderBottom: '1px solid rgba(0,255,65,0.1)',
        padding: '18px 40px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        position: 'sticky', top: 0, zIndex: 50,
        background: 'rgba(0,0,0,0.97)',
        backdropFilter: 'blur(8px)',
      }}>
        <span style={{ fontFamily: MONO, fontSize: 15, fontWeight: 800, color: '#00ff41', letterSpacing: '0.04em' }}>
          ROBOTICS
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
          <span style={{ fontFamily: MONO, fontSize: 11, color: '#3a5a3a', letterSpacing: '0.06em' }}>
            {solved}/{total}_solved
          </span>
          {solved > 0 && (
            <button
              onClick={() => { if (confirm('Reset all progress?')) reset(); }}
              style={{
                background: 'none', border: '1px solid rgba(0,255,65,0.1)',
                borderRadius: 2, color: '#3a5a3a', fontSize: 10, cursor: 'pointer',
                padding: '3px 8px', fontFamily: MONO, letterSpacing: '0.04em',
              }}
            >
              [reset]
            </button>
          )}
        </div>
      </header>

      {/* ── HERO ── */}
      <section style={{
        height: '100vh', position: 'relative', overflow: 'hidden', background: '#000',
      }}>
        {/* SVG hex circuit background */}
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 0,
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='80' height='92'%3E%3Cpath d='M40 4 L74 22 L74 70 L40 88 L6 70 L6 22 Z' fill='none' stroke='%2300ff41' stroke-width='0.5'/%3E%3C/svg%3E")`,
          backgroundSize: '80px 92px',
          opacity: 0.04,
        }} />

        {/* Diagonal hairlines */}
        {hairlines.map((left, i) => (
          <div key={i} style={{
            position: 'absolute', width: 1, height: '200%', top: '-50%',
            left: `${left}%`,
            background: 'rgba(0,255,65,0.05)',
            transform: 'rotate(-35deg)',
            pointerEvents: 'none', zIndex: 0,
          }} />
        ))}

        {/* Left column */}
        <div style={{
          position: 'absolute', left: '6%', top: '50%', transform: 'translateY(-50%)',
          zIndex: 10, maxWidth: '44%',
        }}>
          <div style={{ fontFamily: MONO, fontSize: 11, color: '#3a5a3a', letterSpacing: '0.14em', marginBottom: 16 }}>
            v1.0
          </div>

          <h1 style={{ margin: 0, lineHeight: 1.05 }}>
            <span style={{
              display: 'block',
              fontFamily: MONO,
              fontSize: 'clamp(2.5rem,6vw,5rem)',
              fontWeight: 800,
              color: '#fff',
            }}>
              Introduction to
            </span>
            <span
              ref={h1ScrambleRef}
              style={{
                display: 'block',
                fontFamily: MONO,
                fontSize: 'clamp(2.5rem,6vw,5rem)',
                fontWeight: 800,
                color: '#00ff41',
              }}
            >
              ROBOTICS
            </span>
          </h1>

          <p style={{
            fontFamily: MONO, fontSize: 14, color: 'rgba(0,255,65,0.5)',
            marginTop: 20, lineHeight: 1.6,
          }}>
            13 units on robotics. Each concept has a simulation. Puzzles have one correct answer — you find it.
          </p>

          <button
            onClick={scrollToUnits}
            style={{
              marginTop: 32,
              background: '#000',
              border: '1px solid rgba(0,255,65,0.4)',
              borderRadius: 2,
              color: '#00ff41',
              fontFamily: MONO,
              fontSize: 14,
              padding: '12px 24px',
              cursor: 'pointer',
              letterSpacing: '0.04em',
            }}
          >
            $ start →
          </button>

          {/* Bottom-left stats */}
          <div style={{ marginTop: 40, display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span style={{ fontFamily: MONO, fontSize: 10, color: '#00ff41', opacity: 0.5 }}>
              {AVAILABLE_UNITS.length} / UNITS_AVAILABLE
            </span>
            <span style={{ fontFamily: MONO, fontSize: 10, color: '#00ff41', opacity: 0.5 }}>
              {solved}/{AVAILABLE_UNITS.length} / PUZZLES_SOLVED
            </span>
          </div>
        </div>

        {/* Right column — 3D canvas */}
        <div style={{ position: 'absolute', right: 0, top: 0, width: '55%', height: '100%', zIndex: 5 }}>
          <div style={{
            position: 'absolute', top: 0, left: 0, bottom: 0, width: '30%', zIndex: 2,
            background: 'linear-gradient(to right, #000 0%, transparent 100%)',
          }} />
          <RobotArmCanvas />
        </div>

        {/* Scroll indicator */}
        <div style={{
          position: 'absolute', bottom: 32, left: '50%', transform: 'translateX(-50%)',
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
          zIndex: 10, color: '#00ff41', fontFamily: MONO, fontSize: 10,
          letterSpacing: '0.14em',
        }}>
          <span>SCROLL</span>
          <span style={{ animation: 'bounceArrow 1.5s ease-in-out infinite' }}>↓</span>
        </div>
      </section>

      {/* ── MARQUEE ── */}
      <div style={{
        height: 48, background: '#000',
        borderTop: '1px solid rgba(0,255,65,0.15)',
        borderBottom: '1px solid rgba(0,255,65,0.15)',
        overflow: 'hidden', display: 'flex', alignItems: 'center',
      }}>
        <div style={{
          display: 'inline-flex', whiteSpace: 'nowrap',
          animation: 'marqueeScroll 22s linear infinite',
        }}>
          {[0, 1, 2].map(i => (
            <span key={i} style={{
              fontFamily: MONO, fontSize: 12, color: '#fff', letterSpacing: '0.12em',
            }}>
              PATHFINDING · KINEMATICS · SLAM · MOTION PLANNING · PERCEPTION · LOCALIZATION · MAPPING · IK · FK · A* ·&nbsp;
            </span>
          ))}
        </div>
      </div>

      {/* ── STATS ROW ── */}
      <div id="units" ref={statsRowRef} style={{ padding: '80px 5% 40px' }}>
        <div style={{ display: 'flex', gap: 32, flexWrap: 'wrap' }}>
          {[
            { value: String(AVAILABLE_UNITS.length), label: 'UNITS_AVAILABLE' },
            { value: `${solved}/${AVAILABLE_UNITS.length}`, label: 'PUZZLES_SOLVED' },
          ].map(s => (
            <div key={s.label} className="stat-chip" style={{
              opacity: 0, transform: 'translateY(30px)',
            }}>
              <div style={{ fontFamily: MONO, fontSize: 56, fontWeight: 800, color: '#00ff41', lineHeight: 1 }}>
                {s.value}
              </div>
              <div style={{ fontFamily: MONO, fontSize: 10, color: '#3a5a3a', letterSpacing: '0.1em', marginTop: 6 }}>
                {s.label}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── SECTION HEADER ── */}
      <div style={{ padding: '0 5% 40px' }}>
        <div style={{ fontFamily: MONO, fontSize: 11, color: '#00ff41', letterSpacing: '0.14em', marginBottom: 12 }}>
          // UNITS
        </div>
      </div>

      {/* ── UNIT CARDS ── */}
      <div
        ref={cardsRef}
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: 24,
          padding: '0 5% 100px',
        }}
      >
        {AVAILABLE_UNITS.map((unit, i) => (
          <UnitCard key={unit.id} unit={unit} index={i} />
        ))}
      </div>

      {/* ── CIRCUIT MAP ── */}
      <section style={{ padding: '0 20px 80px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ marginBottom: 24, textAlign: 'center' }}>
            <h2 style={{
              fontFamily: MONO,
              fontSize: 14, fontWeight: 700, color: '#3a5a3a',
              letterSpacing: '0.1em', textTransform: 'uppercase',
              marginBottom: 4,
            }}>
              // CURRICULUM_MAP
            </h2>
            <p style={{ fontSize: 12, color: '#1a2a1a', fontFamily: MONO }}>
              solved units illuminate the grid
            </p>
          </div>
          <CircuitMap />
        </div>
      </section>

      <style>{`
        @keyframes marqueeScroll {
          from { transform: translateX(0); }
          to   { transform: translateX(-33.333%); }
        }
        @keyframes bounceArrow {
          0%, 100% { transform: translateY(0); }
          50%       { transform: translateY(6px); }
        }
      `}</style>
    </main>
  );
}
