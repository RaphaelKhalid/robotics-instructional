'use client';

import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { UNITS, Unit } from '@/lib/units';
import { useProgress } from '@/lib/progress';

const COLOR_MAP = {
  amber: { base: '#f59e0b', glow: 'rgba(245,158,11,0.3)', text: '#fbbf24' },
  blue:  { base: '#3b82f6', glow: 'rgba(59,130,246,0.3)',  text: '#60a5fa' },
  coral: { base: '#ff6b6b', glow: 'rgba(255,107,107,0.3)', text: '#ff8a80' },
  green: { base: '#10d98a', glow: 'rgba(16,217,138,0.3)',  text: '#34d399' },
  purple:{ base: '#8b5cf6', glow: 'rgba(139,92,246,0.3)',  text: '#a78bfa' },
};

// Simple horizontal chain layout: 13 units in 3 rows
const POSITIONS = [
  // Row 1
  { id: 1,  x: 80,  y: 120 },
  { id: 2,  x: 280, y: 120 },
  { id: 3,  x: 480, y: 120 },
  { id: 4,  x: 680, y: 120 },
  { id: 5,  x: 880, y: 120 },
  // Row 2
  { id: 6,  x: 880, y: 300 },
  { id: 7,  x: 680, y: 300 },
  { id: 8,  x: 480, y: 300 },
  { id: 9,  x: 280, y: 300 },
  { id: 10, x: 80,  y: 300 },
  // Row 3
  { id: 11, x: 80,  y: 480 },
  { id: 12, x: 280, y: 480 },
  { id: 13, x: 480, y: 480 },
];

const EDGES = [
  [1,2],[2,3],[3,4],[4,5],
  [5,6],
  [6,7],[7,8],[8,9],[9,10],
  [10,11],
  [11,12],[12,13],
];

function NodePulse({ color }: { color: string }) {
  return (
    <motion.div
      className="absolute inset-0 rounded-full"
      style={{ background: color }}
      animate={{ scale: [1, 1.7], opacity: [0.4, 0] }}
      transition={{ duration: 2, repeat: Infinity, ease: 'easeOut' }}
    />
  );
}

interface UnitNodeProps {
  unit: Unit;
  pos: { x: number; y: number };
  solved: boolean;
  visited: boolean;
}

function UnitNode({ unit, pos, solved, visited }: UnitNodeProps) {
  const colors = COLOR_MAP[unit.categoryColor];
  const isAvailable = unit.available;

  const borderColor = solved
    ? colors.base
    : isAvailable
    ? 'rgba(255,255,255,0.2)'
    : 'rgba(255,255,255,0.06)';

  const bg = solved
    ? `radial-gradient(circle at 40% 40%, ${colors.glow}, var(--bg-card))`
    : isAvailable
    ? 'var(--bg-card)'
    : 'var(--bg-inset)';

  const textColor = isAvailable ? 'var(--text-primary)' : 'var(--text-muted)';

  const inner = (
    <motion.div
      className="absolute flex flex-col items-start justify-between p-4"
      style={{
        width: 160,
        height: 100,
        left: pos.x - 80,
        top: pos.y - 50,
        background: bg,
        border: `1px solid ${borderColor}`,
        borderRadius: 12,
        cursor: isAvailable ? 'pointer' : 'default',
        boxShadow: solved ? `0 0 20px ${colors.glow}` : 'none',
        color: textColor,
      }}
      whileHover={isAvailable ? { y: -3, boxShadow: `0 8px 30px ${colors.glow}` } : {}}
      transition={{ duration: 0.2 }}
    >
      {solved && (
        <div className="absolute inset-0 overflow-hidden rounded-xl">
          <NodePulse color={colors.glow} />
        </div>
      )}
      <div style={{ fontSize: 10, fontFamily: 'var(--font-geist-mono)', color: colors.text, letterSpacing: '0.06em', position: 'relative', zIndex: 1 }}>
        UNIT {String(unit.id).padStart(2, '0')}
      </div>
      <div style={{ fontSize: 12, fontWeight: 600, lineHeight: 1.3, position: 'relative', zIndex: 1 }}>
        {unit.title}
      </div>
      <div style={{ fontSize: 10, color: solved ? colors.text : isAvailable ? 'rgba(255,255,255,0.4)' : 'rgba(255,255,255,0.15)', position: 'relative', zIndex: 1 }}>
        {solved ? '● Solved' : isAvailable ? (visited ? '◐ In progress' : '○ Available') : '○ Locked'}
      </div>
    </motion.div>
  );

  if (!isAvailable) return inner;
  return <Link href={`/units/${unit.slug}`} style={{ textDecoration: 'none' }}>{inner}</Link>;
}

export default function CircuitMap() {
  const svgRef = useRef<SVGSVGElement>(null);
  const { getUnit } = useProgress();

  return (
    <div className="relative w-full overflow-x-auto">
      <div style={{ position: 'relative', width: 1040, height: 600, margin: '0 auto' }}>
        {/* SVG traces */}
        <svg
          ref={svgRef}
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', overflow: 'visible' }}
        >
          <defs>
            <filter id="trace-glow">
              <feGaussianBlur stdDeviation="2" result="blur" />
              <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
          </defs>
          {EDGES.map(([a, b]) => {
            const pa = POSITIONS.find(p => p.id === a)!;
            const pb = POSITIONS.find(p => p.id === b)!;
            const ua = UNITS.find(u => u.id === a)!;
            const progressA = getUnit(a);
            const active = progressA.puzzleSolved;
            const color = active ? COLOR_MAP[ua.categoryColor].base : 'rgba(255,255,255,0.06)';
            return (
              <motion.line
                key={`${a}-${b}`}
                x1={pa.x} y1={pa.y} x2={pb.x} y2={pb.y}
                stroke={color}
                strokeWidth={active ? 2 : 1}
                filter={active ? 'url(#trace-glow)' : undefined}
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 0.8, delay: a * 0.05 }}
              />
            );
          })}
        </svg>

        {/* Unit nodes */}
        {POSITIONS.map(pos => {
          const unit = UNITS.find(u => u.id === pos.id);
          if (!unit) return null;
          const progress = getUnit(unit.id);
          return (
            <UnitNode
              key={unit.id}
              unit={unit}
              pos={pos}
              solved={progress.puzzleSolved}
              visited={progress.visited}
            />
          );
        })}
      </div>
    </div>
  );
}
