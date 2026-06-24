'use client';

import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { Unit } from '@/lib/units';
import { useProgress } from '@/lib/progress';

const COLOR_MAP = {
  amber: '#f59e0b',
  blue: '#3b82f6',
  coral: '#ff6b6b',
  green: '#10d98a',
  purple: '#8b5cf6',
};

const SECTIONS = [
  { id: 'concept', label: 'Concept' },
  { id: 'lab', label: 'Lab' },
  { id: 'puzzle', label: 'Puzzle' },
] as const;

type SectionId = typeof SECTIONS[number]['id'];

interface Props {
  unit: Unit;
  concept: React.ReactNode;
  lab: React.ReactNode;
  puzzle: React.ReactNode;
}

export default function UnitShell({ unit, concept, lab, puzzle }: Props) {
  const [active, setActive] = useState<SectionId>('concept');
  const { getUnit } = useProgress();
  const progress = getUnit(unit.id);
  const accent = COLOR_MAP[unit.categoryColor];

  const sectionMap: Record<SectionId, React.ReactNode> = { concept, lab, puzzle };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      {/* Top nav */}
      <header style={{
        position: 'sticky', top: 0, zIndex: 50,
        borderBottom: '1px solid var(--border)',
        background: 'rgba(14,17,23,0.9)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        padding: '0 32px',
        display: 'flex', alignItems: 'center', gap: 24, height: 56,
      }}>
        <Link href="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{
            width: 28, height: 28, borderRadius: 8,
            background: 'linear-gradient(135deg, #f59e0b, #ff6b6b)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 14,
          }}>⚙</div>
          <span style={{ fontWeight: 700, fontSize: 15, color: 'var(--text-primary)' }}>Robotics</span>
        </Link>

        <div style={{ height: 20, width: 1, background: 'var(--border)' }} />

        <div style={{ fontFamily: 'var(--font-geist-mono)', fontSize: 11, color: 'var(--text-muted)', letterSpacing: '0.06em' }}>
          UNIT {String(unit.id).padStart(2, '0')}
        </div>
        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }}>
          {unit.title}
        </div>

        {progress.puzzleSolved && (
          <div style={{
            fontFamily: 'var(--font-geist-mono)', fontSize: 11, color: accent,
            background: `${accent}18`, border: `1px solid ${accent}40`,
            borderRadius: 20, padding: '3px 10px',
          }}>
            ● SOLVED
          </div>
        )}
      </header>

      {/* Unit hero */}
      <div style={{
        background: `linear-gradient(180deg, ${accent}10 0%, transparent 100%)`,
        borderBottom: '1px solid var(--border)',
        padding: '48px 40px 36px',
      }}>
        <div style={{ maxWidth: 800, margin: '0 auto' }}>
          <div style={{
            fontFamily: 'var(--font-geist-mono)', fontSize: 11, color: accent,
            letterSpacing: '0.1em', textTransform: 'uppercase' as const, marginBottom: 12,
          }}>
            {unit.category}
          </div>
          <h1 style={{
            fontSize: 'clamp(1.8rem, 4vw, 3rem)', fontWeight: 800,
            lineHeight: 1.1, letterSpacing: '-0.02em',
            color: 'var(--text-primary)', marginBottom: 12,
          }}>
            {unit.title}
          </h1>
          <p style={{ fontSize: 16, color: 'var(--text-secondary)', lineHeight: 1.6, maxWidth: 560 }}>
            {unit.description}
          </p>
        </div>
      </div>

      {/* Section tabs */}
      <div style={{
        position: 'sticky', top: 56, zIndex: 40,
        borderBottom: '1px solid var(--border)',
        background: 'rgba(14,17,23,0.95)',
        backdropFilter: 'blur(12px)',
        display: 'flex', padding: '0 40px', gap: 0,
      }}>
        {SECTIONS.map((sec) => {
          const isActive = active === sec.id;
          const isLocked = sec.id === 'puzzle' && !progress.visited;
          return (
            <button
              key={sec.id}
              onClick={() => !isLocked && setActive(sec.id)}
              style={{
                background: 'none', border: 'none', cursor: isLocked ? 'not-allowed' : 'pointer',
                padding: '16px 20px', fontSize: 14, fontWeight: 600,
                color: isActive ? accent : isLocked ? 'var(--text-muted)' : 'var(--text-secondary)',
                position: 'relative', transition: 'color 0.15s',
                fontFamily: 'var(--font-geist-sans)',
                opacity: isLocked ? 0.5 : 1,
              }}
            >
              {sec.label}
              {sec.id === 'puzzle' && progress.puzzleSolved && (
                <span style={{ marginLeft: 6, color: accent, fontSize: 10 }}>●</span>
              )}
              {isActive && (
                <motion.div
                  layoutId="tab-indicator"
                  style={{
                    position: 'absolute', bottom: 0, left: 0, right: 0,
                    height: 2, background: accent, borderRadius: 1,
                  }}
                />
              )}
            </button>
          );
        })}
      </div>

      {/* Content */}
      <div style={{ maxWidth: 920, margin: '0 auto', padding: '40px 24px' }}>
        <AnimatePresence mode="wait">
          <motion.div
            key={active}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25 }}
          >
            {sectionMap[active]}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Bottom unit nav */}
      <div style={{
        borderTop: '1px solid var(--border)',
        padding: '24px 40px',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        maxWidth: 920, margin: '0 auto',
      }}>
        <Link href="/" style={{ textDecoration: 'none', fontSize: 13, color: 'var(--text-muted)' }}>
          ← Dashboard
        </Link>
        {unit.id < 3 && (
          <Link
            href={`/units/${['kinematics','pathfinding','slam'][unit.id]}`}
            style={{
              textDecoration: 'none',
              background: accent, color: '#0e1117',
              borderRadius: 10, padding: '10px 20px',
              fontSize: 13, fontWeight: 700,
            }}
          >
            Next Unit →
          </Link>
        )}
      </div>
    </div>
  );
}
