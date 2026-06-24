'use client';

import { useState, useLayoutEffect, useRef, useEffect } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Unit } from '@/lib/units';
import { useProgress } from '@/lib/progress';

const UNIT_ACCENTS: Record<string, string> = {
  amber:  '#f59e0b',
  blue:   '#3b82f6',
  coral:  '#ff6b35',
  green:  '#00ff41',
  purple: '#8b5cf6',
};

const SECTIONS = [
  { id: 'concept', label: 'concept' },
  { id: 'lab',     label: 'lab'     },
  { id: 'puzzle',  label: 'puzzle'  },
] as const;

type SectionId = typeof SECTIONS[number]['id'];

// Unit 4+ are locked placeholders — update when new units are built
const NEXT_UNIT: Record<number, { slug: string; label: string } | null> = {
  1: { slug: 'pathfinding', label: 'Path Planning & Search' },
  2: { slug: 'slam',        label: 'SLAM' },
  3: null, // next unit not yet built
};

interface Props {
  unit: Unit;
  concept: React.ReactNode;
  lab: React.ReactNode;
  puzzle: React.ReactNode;
}

const MONO = 'var(--font-jetbrains-mono, var(--font-geist-mono))';

export default function UnitShell({ unit, concept, lab, puzzle }: Props) {
  const [active, setActive] = useState<SectionId>('concept');
  const { getUnit } = useProgress();
  const progress = getUnit(unit.id);
  const accent = UNIT_ACCENTS[unit.categoryColor] ?? '#00ff41';
  const contentRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // Escape key → back to dashboard
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') router.push('/');
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [router]);

  useLayoutEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced || !contentRef.current) return;

    gsap.registerPlugin(ScrollTrigger);
    const reveals = contentRef.current.querySelectorAll<HTMLElement>('[data-reveal]');
    const triggers: ScrollTrigger[] = [];

    reveals.forEach((el, i) => {
      gsap.set(el, { opacity: 0, y: 30 });
      const st = ScrollTrigger.create({
        trigger: el,
        start: 'top 88%',
        onEnter: () => {
          gsap.to(el, { opacity: 1, y: 0, duration: 0.5, delay: i * 0.1, ease: 'power2.out' });
        },
        once: true,
      });
      triggers.push(st);
    });

    return () => triggers.forEach(t => t.kill());
  }, [active]);

  const sectionMap: Record<SectionId, React.ReactNode> = { concept, lab, puzzle };
  const nextUnit = NEXT_UNIT[unit.id];

  return (
    <div style={{ minHeight: '100vh', background: '#000' }}>
      {/* Top nav */}
      <header style={{
        position: 'sticky', top: 0, zIndex: 50,
        borderBottom: '1px solid rgba(0,255,65,0.12)',
        background: 'rgba(0,0,0,0.95)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        padding: '0 32px',
        display: 'flex', alignItems: 'center', gap: 24, height: 52,
      }}>
        <Link href="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{
            fontFamily: MONO,
            fontSize: 13, fontWeight: 700, color: '#00ff41', letterSpacing: '0.04em',
          }}>← ROBOTICS</span>
        </Link>

        <span style={{ color: 'rgba(0,255,65,0.2)', fontSize: 14 }}>/</span>

        <span style={{
          fontFamily: 'var(--font-jetbrains-mono, var(--font-geist-mono))',
          fontSize: 11, color: 'rgba(0,255,65,0.45)', letterSpacing: '0.08em',
        }}>
          UNIT_{String(unit.id).padStart(2, '0')}
        </span>

        <span style={{
          fontSize: 12, fontWeight: 500, color: '#7a9e7a',
          flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const,
        }}>
          {unit.title}
        </span>

        {progress.puzzleSolved && (
          <span style={{
            fontFamily: 'var(--font-jetbrains-mono, var(--font-geist-mono))',
            fontSize: 10, color: '#00ff41',
            background: 'rgba(0,255,65,0.08)', border: '1px solid rgba(0,255,65,0.25)',
            borderRadius: 2, padding: '3px 8px', letterSpacing: '0.06em',
          }}>
            [SOLVED]
          </span>
        )}
      </header>

      {/* Unit hero */}
      <div style={{
        background: `linear-gradient(180deg, ${accent}08 0%, transparent 100%)`,
        borderBottom: '1px solid rgba(0,255,65,0.08)',
        padding: '44px 40px 32px',
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* Ghost unit number */}
        <div style={{
          position: 'absolute', right: '4%', top: '50%', transform: 'translateY(-50%)',
          fontSize: 'clamp(120px, 20vw, 200px)', fontWeight: 900, lineHeight: 1,
          color: 'rgba(0,255,65,0.04)',
          fontFamily: 'var(--font-jetbrains-mono, var(--font-geist-mono))',
          pointerEvents: 'none', userSelect: 'none', zIndex: 0,
        }}>
          {String(unit.id).padStart(2, '0')}
        </div>

        <div style={{ maxWidth: 800, margin: '0 auto', position: 'relative', zIndex: 1 }}>
          <div style={{
            fontFamily: 'var(--font-jetbrains-mono, var(--font-geist-mono))',
            fontSize: 10, color: accent,
            letterSpacing: '0.12em', textTransform: 'uppercase' as const, marginBottom: 14,
            opacity: 0.7,
          }}>
            {unit.category}
          </div>
          <h1 style={{
            fontFamily: 'var(--font-jetbrains-mono, var(--font-geist-mono))',
            fontSize: 'clamp(1.6rem, 4vw, 2.6rem)',
            fontWeight: 800,
            lineHeight: 1.1,
            letterSpacing: '-0.01em',
            color: '#e8ffe8',
            marginBottom: 14,
          }}>
            {unit.title}
          </h1>
          <p style={{ fontSize: 15, color: '#7a9e7a', lineHeight: 1.65, maxWidth: 540 }}>
            {unit.description}
          </p>
        </div>
      </div>

      {/* Section tabs — terminal style */}
      <div style={{
        position: 'sticky', top: 52, zIndex: 40,
        borderBottom: '1px solid rgba(0,255,65,0.1)',
        background: 'rgba(0,0,0,0.97)',
        backdropFilter: 'blur(8px)',
        display: 'flex', padding: '0 40px', gap: 0,
      }}>
        {SECTIONS.map((sec) => {
          const isActive = active === sec.id;
          return (
            <button
              key={sec.id}
              onClick={() => setActive(sec.id)}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                padding: '14px 20px', fontSize: 13,
                fontFamily: 'var(--font-jetbrains-mono, var(--font-geist-mono))',
                fontWeight: isActive ? 600 : 400,
                color: isActive ? '#00ff41' : '#3a5a3a',
                position: 'relative',
                letterSpacing: '0.04em',
                transition: 'color 0.15s',
              }}
            >
              <span style={{ opacity: isActive ? 1 : 0.4, marginRight: 4 }}>
                {isActive ? '>' : '$'}
              </span>
              {sec.label}
              {sec.id === 'puzzle' && progress.puzzleSolved && (
                <span style={{ marginLeft: 6, color: '#00ff41', fontSize: 8 }}>●</span>
              )}
              {isActive && (
                <motion.div
                  layoutId={`tab-indicator-${unit.id}`}
                  style={{
                    position: 'absolute', bottom: 0, left: 0, right: 0,
                    height: 1, background: '#00ff41',
                    pointerEvents: 'none',
                  }}
                />
              )}
            </button>
          );
        })}
      </div>

      {/* Content */}
      <div ref={contentRef} style={{ maxWidth: 920, margin: '0 auto', padding: '40px 24px', scrollMarginTop: 120 }}>
        <AnimatePresence mode="wait">
          <motion.div
            key={active}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.2 }}
          >
            {sectionMap[active]}
          </motion.div>
        </AnimatePresence>

        {/* Flow CTAs — guide concept → lab → puzzle → next unit */}
        <div style={{ marginTop: 48, paddingTop: 32, borderTop: '1px solid rgba(0,255,65,0.08)' }}>
          {active === 'concept' && (
            <button
              onClick={() => setActive('lab')}
              style={{
                background: '#000', border: '1px solid rgba(0,255,65,0.35)',
                borderRadius: 2, color: '#00ff41', fontFamily: MONO,
                fontSize: 13, padding: '12px 24px', cursor: 'pointer', letterSpacing: '0.04em',
              }}
            >
              → open lab
            </button>
          )}
          {active === 'lab' && (
            <button
              onClick={() => setActive('puzzle')}
              style={{
                background: '#000', border: '1px solid rgba(0,255,65,0.35)',
                borderRadius: 2, color: '#00ff41', fontFamily: MONO,
                fontSize: 13, padding: '12px 24px', cursor: 'pointer', letterSpacing: '0.04em',
              }}
            >
              → attempt puzzle
            </button>
          )}
          {active === 'puzzle' && progress.puzzleSolved && nextUnit && (
            <Link
              href={`/units/${nextUnit.slug}`}
              style={{
                display: 'inline-block', textDecoration: 'none',
                background: '#000', border: '1px solid rgba(0,255,65,0.5)',
                borderRadius: 2, color: '#00ff41', fontFamily: MONO,
                fontSize: 13, padding: '12px 24px', letterSpacing: '0.04em',
              }}
            >
              → next unit: {nextUnit.label}
            </Link>
          )}
        </div>
      </div>

      {/* Bottom unit nav */}
      <div style={{
        borderTop: '1px solid rgba(0,255,65,0.08)',
        padding: '24px 40px',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        maxWidth: 920, margin: '0 auto',
      }}>
        <Link
          href="/"
          style={{
            textDecoration: 'none', fontSize: 12,
            fontFamily: 'var(--font-jetbrains-mono, var(--font-geist-mono))',
            color: '#3a5a3a',
            letterSpacing: '0.04em',
          }}
        >
          ← dashboard
        </Link>

        {nextUnit ? (
          <Link
            href={`/units/${nextUnit.slug}`}
            style={{
              textDecoration: 'none',
              background: 'transparent',
              color: '#00ff41',
              border: '1px solid rgba(0,255,65,0.3)',
              borderRadius: 4,
              padding: '9px 18px',
              fontSize: 12,
              fontWeight: 600,
              fontFamily: 'var(--font-jetbrains-mono, var(--font-geist-mono))',
              letterSpacing: '0.04em',
            }}
          >
            next unit →
          </Link>
        ) : (
          <span style={{
            fontSize: 12, color: '#1a2a1a',
            fontFamily: 'var(--font-jetbrains-mono, var(--font-geist-mono))',
            letterSpacing: '0.04em',
            border: '1px solid rgba(0,255,65,0.06)',
            borderRadius: 4, padding: '9px 18px',
          }}>
            coming soon
          </span>
        )}
      </div>
    </div>
  );
}
