'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useProgress } from '@/lib/progress';

export default function ExpensiveShortcutPuzzle({ unitId }: { unitId: number }) {
  const { markPuzzleSolved, getUnit } = useProgress();
  const progress = getUnit(unitId);
  const [route1, setRoute1] = useState('');
  const [route2, setRoute2] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [correct, setCorrect] = useState(false);

  const check = () => {
    const v1 = parseInt(route1.trim());
    const v2 = parseInt(route2.trim());
    // Accept a range: the puzzle doesn't have a fixed map, so validate the difference is positive
    const diff = Math.abs(v1 - v2);
    const isCorrect = !isNaN(v1) && !isNaN(v2) && v1 > 0 && v2 > 0 && diff > 0;
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
        <div style={{ fontSize: 36, marginBottom: 12 }}>✓</div>
        <h3 style={{ fontSize: 20, fontWeight: 700, color: '#10d98a', marginBottom: 8 }}>Puzzle Solved</h3>
        <p style={{ color: 'var(--text-secondary)', lineHeight: 1.6 }}>
          You discovered the key insight: <strong>fewer steps doesn&apos;t mean lower cost</strong>.
          Dijkstra finds the true minimum-cost path by accounting for terrain weights.
          A* finds it faster by focusing toward the goal — but Greedy can be fooled into the expensive shortcut.
        </p>
      </div>
    );
  }

  return (
    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 16, padding: 32 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <div style={{
          width: 36, height: 36, borderRadius: 10,
          background: 'rgba(59,130,246,0.15)', border: '1px solid rgba(59,130,246,0.3)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 18,
        }}>🗺️</div>
        <div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase' as const }}>Puzzle</div>
          <h3 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' }}>The Expensive Shortcut</h3>
        </div>
      </div>

      <p style={{ color: 'var(--text-secondary)', lineHeight: 1.65, marginBottom: 16 }}>
        Using the simulation above, build a map with two routes from start to end:
      </p>
      <ul style={{ color: 'var(--text-secondary)', lineHeight: 1.8, marginBottom: 16, paddingLeft: 20 }}>
        <li><strong style={{ color: '#3b82f6' }}>Route A:</strong> Short in steps but passes through water cells (cost ×8)</li>
        <li><strong style={{ color: '#f59e0b' }}>Route B:</strong> Long in steps but goes through empty cells only (cost ×1)</li>
      </ul>
      <p style={{ color: 'var(--text-secondary)', lineHeight: 1.65, marginBottom: 24 }}>
        Run <strong>Dijkstra</strong> on each route (use walls to block the other). Record the <strong>Path Cost</strong> shown in the info bar. Then answer:
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
        {[
          { key: 'route1', label: 'Route A cost (short, expensive)', val: route1, set: setRoute1, color: '#3b82f6' },
          { key: 'route2', label: 'Route B cost (long, cheap)', val: route2, set: setRoute2, color: '#f59e0b' },
        ].map(f => (
          <div key={f.key}>
            <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>{f.label}</label>
            <input
              type="number"
              value={f.val}
              onChange={e => { f.set(e.target.value); setSubmitted(false); }}
              placeholder="Cost..."
              style={{
                width: '100%',
                background: 'var(--bg-inset)', border: `1px solid ${submitted ? (correct ? '#10d98a' : '#ff6b6b') : 'var(--border)'}`,
                borderRadius: 8, padding: '10px 14px', fontSize: 16,
                color: f.color, fontFamily: 'var(--font-geist-mono)', outline: 'none',
              }}
            />
          </div>
        ))}
      </div>

      <motion.button
        onClick={check}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.97 }}
        style={{
          background: '#3b82f6', color: '#fff',
          border: 'none', borderRadius: 8,
          padding: '10px 24px', fontSize: 14, fontWeight: 700, cursor: 'pointer',
          fontFamily: 'var(--font-geist-sans)',
        }}
      >
        Submit
      </motion.button>

      <AnimatePresence>
        {submitted && !correct && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            style={{
              marginTop: 12,
              background: 'rgba(255,107,107,0.1)', border: '1px solid rgba(255,107,107,0.3)',
              borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#ff8a80',
            }}
          >
            Make sure both costs are positive and different from each other. Try building the two routes in the simulator first.
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
