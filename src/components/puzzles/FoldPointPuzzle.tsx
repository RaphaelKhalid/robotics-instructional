'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useProgress } from '@/lib/progress';

export default function FoldPointPuzzle({ unitId }: { unitId: number }) {
  const { markPuzzleSolved, getUnit } = useProgress();
  const progress = getUnit(unitId);
  const [answer, setAnswer] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [correct, setCorrect] = useState(false);

  const check = () => {
    const val = parseFloat(answer.trim());
    const isCorrect = Math.abs(val) < 2;
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
          At full extension, θ₂ = 0°. The two links are perfectly aligned — elbow-up and elbow-down become the same configuration.
          This is the degenerate singularity where the Jacobian loses rank and the arm momentarily has only 1 effective DOF.
        </p>
      </div>
    );
  }

  return (
    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 16, padding: 32 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase' as const }}>Puzzle</div>
          <h3 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' }}>The Fold Point</h3>
        </div>
      </div>

      <p style={{ color: 'var(--text-secondary)', lineHeight: 1.65, marginBottom: 16 }}>
        In the lab, drag the end effector outward to the edge of the workspace. You&apos;ll see the red ring — that&apos;s where elbow-up and elbow-down converge to the same configuration.
      </p>
      <p style={{ color: 'var(--text-secondary)', lineHeight: 1.65, marginBottom: 24 }}>
        At full extension, what is the value of <strong style={{ color: 'var(--text-primary)' }}>θ₂ in degrees</strong>?
      </p>

      <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 16 }}>
        <input
          type="number"
          value={answer}
          onChange={e => { setAnswer(e.target.value); setSubmitted(false); }}
          placeholder="Enter degrees..."
          style={{
            background: 'var(--bg-inset)', border: `1px solid ${submitted ? (correct ? '#10d98a' : '#ff6b6b') : 'var(--border)'}`,
            borderRadius: 8, padding: '10px 14px', fontSize: 16,
            color: 'var(--text-primary)', fontFamily: 'var(--font-geist-mono)',
            width: 160, outline: 'none',
          }}
          onKeyDown={e => e.key === 'Enter' && check()}
        />
        <motion.button
          onClick={check}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.97 }}
          style={{
            background: '#f59e0b', color: '#0e1117',
            border: 'none', borderRadius: 8,
            padding: '10px 20px', fontSize: 14, fontWeight: 700, cursor: 'pointer',
            fontFamily: 'var(--font-geist-sans)',
          }}
        >
          Submit
        </motion.button>
      </div>

      <AnimatePresence>
        {submitted && !correct && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            style={{
              background: 'rgba(255,107,107,0.1)', border: '1px solid rgba(255,107,107,0.3)',
              borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#ff8a80',
            }}
          >
            Think about what happens to the second joint when the arm is fully stretched out.
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
