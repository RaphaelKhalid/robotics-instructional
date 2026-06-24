'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { useProgress } from '@/lib/progress';
import { AVAILABLE_UNITS } from '@/lib/units';

const CircuitMap = dynamic(() => import('@/components/ui/CircuitMap'), { ssr: false });

export default function Dashboard() {
  const { solvedCount, reset } = useProgress();
  const solved = solvedCount();
  const total = 13;

  return (
    <main style={{ minHeight: '100vh', background: 'var(--bg)', padding: '0 0 80px' }}>
      {/* Header */}
      <header style={{
        borderBottom: '1px solid var(--border)',
        padding: '20px 40px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10,
            background: 'linear-gradient(135deg, #f59e0b, #ff6b6b)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 18,
          }}>⚙</div>
          <span style={{ fontWeight: 700, fontSize: 18, color: 'var(--text-primary)' }}>Robotics</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
          <span style={{ fontFamily: 'var(--font-geist-mono)', fontSize: 13, color: 'var(--text-muted)' }}>
            {solved}/{total} solved
          </span>
          {solved > 0 && (
            <button
              onClick={() => { if (confirm('Reset all progress?')) reset(); }}
              style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: 12, cursor: 'pointer', textDecoration: 'underline' }}
            >
              Reset
            </button>
          )}
        </div>
      </header>

      {/* Hero */}
      <section style={{ maxWidth: 860, margin: '0 auto', padding: '80px 40px 60px', textAlign: 'center' }}>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div style={{
            display: 'inline-block',
            fontFamily: 'var(--font-geist-mono)',
            fontSize: 11,
            letterSpacing: '0.12em',
            color: '#f59e0b',
            background: 'rgba(245,158,11,0.1)',
            border: '1px solid rgba(245,158,11,0.2)',
            borderRadius: 20,
            padding: '4px 14px',
            marginBottom: 24,
            textTransform: 'uppercase' as const,
          }}>
            Interactive Learning
          </div>
          <h1 style={{
            fontSize: 'clamp(2.5rem, 6vw, 4.5rem)',
            fontWeight: 800,
            lineHeight: 1.05,
            letterSpacing: '-0.03em',
            color: 'var(--text-primary)',
            marginBottom: 20,
          }}>
            Introduction to<br />
            <span style={{ color: '#f59e0b' }}>Robotics</span>
          </h1>
          <p style={{
            fontSize: 18,
            color: 'var(--text-secondary)',
            maxWidth: 560,
            margin: '0 auto 40px',
            lineHeight: 1.65,
          }}>
            13 units. No multiple choice. Every concept proved through hands-on simulation.
            Puzzles that only unlock through discovery.
          </p>

          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' as const, marginBottom: 32 }}>
            {[
              { label: 'Units Available', value: String(AVAILABLE_UNITS.length) },
              { label: 'Puzzles Solved', value: `${solved}/${AVAILABLE_UNITS.length}` },
              { label: 'No MCQs', value: '✓' },
            ].map(s => (
              <div key={s.label} style={{
                background: 'var(--bg-card)',
                border: '1px solid var(--border)',
                borderRadius: 10,
                padding: '14px 24px',
                minWidth: 100,
              }}>
                <div style={{ fontFamily: 'var(--font-geist-mono)', fontSize: 22, fontWeight: 700, color: '#f59e0b' }}>{s.value}</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase' as const, letterSpacing: '0.08em', marginTop: 2 }}>{s.label}</div>
              </div>
            ))}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' as const }}
        >
          {AVAILABLE_UNITS.map((unit, i) => (
            <Link key={unit.id} href={`/units/${unit.slug}`} style={{ textDecoration: 'none' }}>
              <motion.button
                whileHover={{ y: -2 }}
                whileTap={{ scale: 0.97 }}
                style={{
                  background: i === 0 ? '#f59e0b' : 'var(--bg-card)',
                  color: i === 0 ? '#0e1117' : 'var(--text-secondary)',
                  border: i === 0 ? 'none' : '1px solid var(--border)',
                  borderRadius: 10,
                  padding: '12px 22px',
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: 'pointer',
                  fontFamily: 'var(--font-geist-sans)',
                }}
              >
                Unit {unit.id}: {unit.title.split(' ').slice(0, 3).join(' ')} →
              </motion.button>
            </Link>
          ))}
        </motion.div>
      </section>

      {/* Curriculum map */}
      <section style={{ padding: '0 20px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ marginBottom: 32, textAlign: 'center' }}>
            <h2 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 6 }}>Curriculum Map</h2>
            <p style={{ fontSize: 14, color: 'var(--text-muted)' }}>Complete units light up the circuit</p>
          </div>
          <CircuitMap />
        </div>
      </section>
    </main>
  );
}
