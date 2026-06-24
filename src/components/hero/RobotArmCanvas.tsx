'use client';

import { useRef, useEffect } from 'react';

export default function RobotArmCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let raf: number;
    let t = 0;
    let mouseX = 0;

    const onMouseMove = (e: MouseEvent) => {
      mouseX = (e.clientX / window.innerWidth) * 2 - 1;
    };
    window.addEventListener('mousemove', onMouseMove);

    const resize = () => {
      canvas.width = canvas.offsetWidth * window.devicePixelRatio;
      canvas.height = canvas.offsetHeight * window.devicePixelRatio;
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    };
    resize();
    window.addEventListener('resize', resize);

    const draw = () => {
      const w = canvas.offsetWidth;
      const h = canvas.offsetHeight;
      ctx.clearRect(0, 0, w, h);

      t += 0.012;

      // Arm origin — centre-right of canvas
      const ox = w * 0.5;
      const oy = h * 0.32;

      const L1 = Math.min(w, h) * 0.28;
      const L2 = L1 * 0.72;

      // Slow base rotation + mouse influence
      const a1 = t + mouseX * 0.4;
      const a2 = Math.sin(t * 0.7) * 0.9 + 0.3;

      const ex = ox + L1 * Math.cos(a1);
      const ey = oy + L1 * Math.sin(a1);
      const ex2 = ex + L2 * Math.cos(a1 + a2);
      const ey2 = ey + L2 * Math.sin(a1 + a2);

      // Glow helper
      const glow = (x: number, y: number, r: number, intensity: number) => {
        const g = ctx.createRadialGradient(x, y, 0, x, y, r * 3);
        g.addColorStop(0, `rgba(0,255,65,${intensity})`);
        g.addColorStop(1, 'rgba(0,255,65,0)');
        ctx.beginPath();
        ctx.arc(x, y, r * 3, 0, Math.PI * 2);
        ctx.fillStyle = g;
        ctx.fill();
      };

      // Link 1
      ctx.beginPath();
      ctx.moveTo(ox, oy);
      ctx.lineTo(ex, ey);
      ctx.strokeStyle = '#1a3a1a';
      ctx.lineWidth = L1 * 0.13;
      ctx.lineCap = 'round';
      ctx.stroke();

      // Link 2
      ctx.beginPath();
      ctx.moveTo(ex, ey);
      ctx.lineTo(ex2, ey2);
      ctx.strokeStyle = '#1a3a1a';
      ctx.lineWidth = L1 * 0.10;
      ctx.lineCap = 'round';
      ctx.stroke();

      // Base joint glow + dot
      glow(ox, oy, L1 * 0.07, 0.25);
      ctx.beginPath();
      ctx.arc(ox, oy, L1 * 0.07, 0, Math.PI * 2);
      ctx.fillStyle = '#00ff41';
      ctx.fill();

      // Elbow glow + dot
      glow(ex, ey, L1 * 0.06, 0.3);
      ctx.beginPath();
      ctx.arc(ex, ey, L1 * 0.06, 0, Math.PI * 2);
      ctx.fillStyle = '#00ff41';
      ctx.fill();

      // End effector glow + dot
      glow(ex2, ey2, L1 * 0.055, 0.5);
      ctx.beginPath();
      ctx.arc(ex2, ey2, L1 * 0.055, 0, Math.PI * 2);
      ctx.fillStyle = '#00ff41';
      ctx.fill();

      // Workspace circle (faint)
      ctx.beginPath();
      ctx.arc(ox, oy, L1 + L2, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(0,255,65,0.04)';
      ctx.lineWidth = 1;
      ctx.stroke();

      // DH axes at end effector
      const axisLen = L1 * 0.12;
      const totalAngle = a1 + a2;
      ctx.save();
      ctx.translate(ex2, ey2);
      ctx.rotate(totalAngle);
      ctx.beginPath();
      ctx.moveTo(0, 0); ctx.lineTo(axisLen, 0);
      ctx.strokeStyle = 'rgba(255,80,80,0.6)';
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, 0); ctx.lineTo(0, -axisLen);
      ctx.strokeStyle = 'rgba(80,120,255,0.6)';
      ctx.stroke();
      ctx.restore();

      raf = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{ width: '100%', height: '100%', display: 'block' }}
    />
  );
}
