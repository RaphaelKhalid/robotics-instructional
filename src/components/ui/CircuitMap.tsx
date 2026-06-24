'use client';

import Link from 'next/link';
import { UNITS, Unit } from '@/lib/units';
import { useProgress } from '@/lib/progress';

const UNIT_SLUGS = ['','kinematics','pathfinding','slam','pid','sensor-fusion','dynamics','vision','swarm','manipulation','vla','llm-brain','world-models','edge-ai'];

// Grid layout: 5 columns, 3 rows (snake pattern)
const POSITIONS: { id: number; col: number; row: number }[] = [
  // Row 1 left→right
  { id: 1,  col: 0, row: 0 },
  { id: 2,  col: 1, row: 0 },
  { id: 3,  col: 2, row: 0 },
  { id: 4,  col: 3, row: 0 },
  { id: 5,  col: 4, row: 0 },
  // Row 2 right→left
  { id: 6,  col: 4, row: 1 },
  { id: 7,  col: 3, row: 1 },
  { id: 8,  col: 2, row: 1 },
  { id: 9,  col: 1, row: 1 },
  { id: 10, col: 0, row: 1 },
  // Row 3 left→right
  { id: 11, col: 0, row: 2 },
  { id: 12, col: 1, row: 2 },
  { id: 13, col: 2, row: 2 },
];

const UNIT_ACCENT: Record<string, string> = {
  amber:  '#f59e0b',
  blue:   '#3b82f6',
  coral:  '#ff6b35',
  green:  '#00ff41',
  purple: '#8b5cf6',
};

interface UnitCardProps {
  unit: Unit;
  solved: boolean;
  visited: boolean;
}

function UnitCard({ unit, solved, visited }: UnitCardProps) {
  const accent = UNIT_ACCENT[unit.categoryColor] ?? '#00ff41';
  const isAvailable = unit.available;

  const statusLabel = solved
    ? '> SOLVED'
    : isAvailable
    ? visited ? '> IN PROGRESS' : '> AVAILABLE'
    : '> LOCKED';

  const statusColor = solved
    ? '#00ff41'
    : isAvailable
    ? visited ? accent : 'rgba(0,255,65,0.5)'
    : '#1a2a1a';

  const card = (
    <div
      style={{
        position: 'relative',
        width: '100%',
        height: 96,
        background: '#000',
        border: solved
          ? `1px solid rgba(0,255,65,0.5)`
          : isAvailable
          ? `1px solid rgba(0,255,65,0.2)`
          : `1px solid rgba(0,255,65,0.05)`,
        borderLeft: solved
          ? `3px solid #00ff41`
          : isAvailable
          ? `3px solid rgba(0,255,65,0.35)`
          : `3px solid transparent`,
        borderRadius: 4,
        padding: '10px 12px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        cursor: isAvailable ? 'pointer' : 'default',
        opacity: !isAvailable ? 0.35 : 1,
        boxShadow: solved ? '0 0 18px rgba(0,255,65,0.12)' : 'none',
        overflow: 'hidden',
        transition: 'border-color 0.15s, box-shadow 0.15s',
      }}
      className={isAvailable ? 'unit-card-hover' : ''}
    >
      {/* Solved scan sweep */}
      {solved && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(to bottom, transparent 40%, rgba(0,255,65,0.06) 50%, transparent 60%)',
            animation: 'scanSweep 3s linear infinite',
            pointerEvents: 'none',
          }}
        />
      )}

      <div
        style={{
          fontFamily: 'var(--font-jetbrains-mono, var(--font-geist-mono))',
          fontSize: 9,
          letterSpacing: '0.08em',
          color: solved ? '#00ff41' : isAvailable ? 'rgba(0,255,65,0.5)' : '#1a2a1a',
          position: 'relative',
        }}
      >
        [ {String(unit.id).padStart(2, '0')} ]
      </div>

      <div
        style={{
          fontFamily: 'var(--font-jetbrains-mono, var(--font-geist-mono))',
          fontSize: 11,
          fontWeight: 600,
          letterSpacing: '0.04em',
          color: isAvailable ? '#e8ffe8' : '#2a3a2a',
          lineHeight: 1.3,
          position: 'relative',
          textTransform: 'uppercase',
        }}
      >
        {unit.title}
      </div>

      <div
        style={{
          fontFamily: 'var(--font-jetbrains-mono, var(--font-geist-mono))',
          fontSize: 9,
          color: statusColor,
          letterSpacing: '0.06em',
          position: 'relative',
        }}
      >
        {statusLabel}
      </div>
    </div>
  );

  if (!isAvailable) return card;
  return (
    <Link href={`/units/${unit.slug}`} style={{ textDecoration: 'none', display: 'block' }}>
      {card}
    </Link>
  );
}

export default function CircuitMap() {
  const { getUnit } = useProgress();

  const COLS = 5;
  const ROWS = 3;

  return (
    <div style={{ width: '100%', overflowX: 'auto' }}>
      <style>{`
        .unit-card-hover:hover {
          border-color: rgba(0,255,65,0.45) !important;
          box-shadow: 0 0 24px rgba(0,255,65,0.12) !important;
        }
      `}</style>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${COLS}, 1fr)`,
          gridTemplateRows: `repeat(${ROWS}, auto)`,
          gap: 12,
          maxWidth: 1040,
          margin: '0 auto',
          padding: '0 4px',
        }}
      >
        {POSITIONS.map(pos => {
          const unit = UNITS.find(u => u.id === pos.id);
          if (!unit) return null;
          const progress = getUnit(unit.id);
          return (
            <div
              key={unit.id}
              style={{
                gridColumn: pos.col + 1,
                gridRow: pos.row + 1,
              }}
            >
              <UnitCard
                unit={unit}
                solved={progress.puzzleSolved}
                visited={progress.visited}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
