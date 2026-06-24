'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useProgress } from '@/lib/progress';

const MONO = 'var(--font-geist-mono)';

// Fixed scenario — two paths, one obvious shortcut that's actually more expensive
// Route A: 3 steps, all water (cost 8) → total 24
// Route B: 8 steps, all clear (cost 1) → total 8
const ROUTE_A_COST = 24;
const ROUTE_B_COST = 8;

export default function ExpensiveShortcutPuzzle({ unitId }: { unitId: number }) {
  const { markPuzzleSolved, getUnit } = useProgress();
  const progress = getUnit(unitId);
  const [chosen, setChosen] = useState<'A' | 'B' | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [correct, setCorrect] = useState(false);

  const submit = () => {
    const isCorrect = chosen === 'B';
    setSubmitted(true);
    setCorrect(isCorrect);
    if (isCorrect) markPuzzleSolved(unitId);
  };

  if (progress.puzzleSolved) {
    return (
      <div style={{
        background: 'rgba(16,217,138,0.08)', border: '1px solid rgba(16,217,138,0.3)',
        borderRadius: 16, padding: 32, textAlign: 'center',
      }}>
        <div style={{ fontSize: 32, marginBottom: 12, fontFamily: MONO, color: '#10d98a' }}>✓</div>
        <h3 style={{ fontSize: 20, fontWeight: 700, color: '#10d98a', marginBottom: 8 }}>Correct</h3>
        <p style={{ color: 'var(--text-secondary)', lineHeight: 1.65 }}>
          Route B wins: 8 steps × 1 = <strong style={{ color: '#10d98a' }}>8</strong> vs Route A&apos;s 3 steps × 8 = <strong style={{ color: '#ff6b6b' }}>24</strong>.
          BFS and Greedy both fall for the shortcut. Dijkstra and A* don&apos;t — they account for terrain cost.
        </p>
      </div>
    );
  }

  return (
    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 16, padding: 32 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <div style={{ fontSize: 11, color: 'var(--text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase' as const }}>Puzzle</div>
        <h3 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' }}>The Expensive Shortcut</h3>
      </div>

      <p style={{ color: 'var(--text-secondary)', lineHeight: 1.65, marginBottom: 28 }}>
        Two routes connect <strong style={{ color: 'var(--text-primary)' }}>S</strong> to <strong style={{ color: 'var(--text-primary)' }}>G</strong>. Which does Dijkstra take?
      </p>

      {/* Visual map */}
      <div style={{ fontFamily: MONO, fontSize: 13, marginBottom: 28, lineHeight: 2 }}>
        <div style={{ marginBottom: 8, color: 'var(--text-muted)', fontSize: 11 }}>// terrain legend: · = clear (cost 1)  ~ = water (cost 8)</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {/* Route A row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ color: '#3b82f6', fontWeight: 700, minWidth: 72, fontSize: 11 }}>Route A</span>
            <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
              {['S', '~', '~', '~', 'G'].map((cell, i) => (
                <span key={i} style={{
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  width: 32, height: 32, borderRadius: 4,
                  background: cell === '~' ? 'rgba(59,130,246,0.15)' : cell === 'S' || cell === 'G' ? 'rgba(0,255,65,0.12)' : 'rgba(255,255,255,0.04)',
                  border: `1px solid ${cell === '~' ? 'rgba(59,130,246,0.3)' : cell === 'S' || cell === 'G' ? 'rgba(0,255,65,0.3)' : 'rgba(255,255,255,0.08)'}`,
                  color: cell === '~' ? '#3b82f6' : cell === 'S' || cell === 'G' ? '#00ff41' : '#555',
                  fontSize: 14, fontWeight: 700,
                }}>
                  {cell}
                </span>
              ))}
              <span style={{ color: '#3b82f6', fontSize: 11, marginLeft: 8 }}>3 steps × 8 = {ROUTE_A_COST}</span>
            </div>
          </div>
          {/* Route B row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ color: '#f59e0b', fontWeight: 700, minWidth: 72, fontSize: 11 }}>Route B</span>
            <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
              {['S', '·', '·', '·', '·', '·', '·', '·', '·', 'G'].map((cell, i) => (
                <span key={i} style={{
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  width: 32, height: 32, borderRadius: 4,
                  background: cell === '·' ? 'rgba(255,255,255,0.04)' : 'rgba(0,255,65,0.12)',
                  border: `1px solid ${cell === '·' ? 'rgba(255,255,255,0.08)' : 'rgba(0,255,65,0.3)'}`,
                  color: cell === '·' ? '#444' : '#00ff41',
                  fontSize: 14, fontWeight: 700,
                }}>
                  {cell}
                </span>
              ))}
              <span style={{ color: '#f59e0b', fontSize: 11, marginLeft: 8 }}>8 steps × 1 = {ROUTE_B_COST}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Choice buttons */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
        {(['A', 'B'] as const).map(r => (
          <motion.button
            key={r}
            onClick={() => { setChosen(r); setSubmitted(false); }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            style={{
              flex: 1, padding: '14px 0', borderRadius: 8, cursor: 'pointer',
              fontFamily: MONO, fontSize: 14, fontWeight: 700,
              border: `1px solid ${chosen === r ? (r === 'A' ? '#3b82f6' : '#f59e0b') : 'var(--border)'}`,
              background: chosen === r ? (r === 'A' ? 'rgba(59,130,246,0.12)' : 'rgba(245,158,11,0.12)') : 'transparent',
              color: chosen === r ? (r === 'A' ? '#3b82f6' : '#f59e0b') : 'var(--text-muted)',
              transition: 'all 0.15s',
            }}
          >
            Route {r} (cost {r === 'A' ? ROUTE_A_COST : ROUTE_B_COST})
          </motion.button>
        ))}
      </div>

      <motion.button
        onClick={submit}
        disabled={!chosen}
        whileHover={chosen ? { scale: 1.02 } : {}}
        whileTap={chosen ? { scale: 0.97 } : {}}
        style={{
          background: chosen ? '#00ff41' : 'rgba(0,255,65,0.1)',
          color: chosen ? '#000' : 'rgba(0,255,65,0.3)',
          border: 'none', borderRadius: 8,
          padding: '10px 24px', fontSize: 14, fontWeight: 700,
          cursor: chosen ? 'pointer' : 'not-allowed',
          fontFamily: MONO,
          transition: 'all 0.15s',
        }}
      >
        Submit
      </motion.button>

      <AnimatePresence>
        {submitted && !correct && (
          <motion.div
            initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            style={{
              marginTop: 12, background: 'rgba(255,107,107,0.1)', border: '1px solid rgba(255,107,107,0.3)',
              borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#ff8a80', fontFamily: MONO,
            }}
          >
            Route A looks shorter, but cost × steps is what matters. Add it up.
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
