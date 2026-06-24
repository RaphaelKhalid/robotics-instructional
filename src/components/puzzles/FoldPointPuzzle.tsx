'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useProgress } from '@/lib/progress';

export default function FoldPointPuzzle({ unitId, unlocked }: { unitId: number; unlocked: boolean }) {
  const { markPuzzleSolved, getUnit } = useProgress();
  const progress = getUnit(unitId);
  const [answer, setAnswer] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [correct, setCorrect] = useState(false);

  const check = () => {
    const val = parseFloat(answer.trim());
    const isCorrect = Math.abs(val) < 2; // θ₂ = 0 at full extension
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
        <div style={{
          width: 36, height: 36, borderRadius: 10,
          background: 'rgba(245,158,11,0.15)', border: '1px solid rgba(245,158,11,0.3)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 18,
        }}>🔒</div>
        <div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase' as const }}>Puzzle</div>
          <h3 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' }}>The Fold Point</h3>
        </div>
      </div>

      {!unlocked ? (
        <div style={{ padding: '24px 0' }}>
          <div style={{
            fontFamily: 'var(--font-jetbrains-mono, monospace)',
            fontSize: 11, color: '#3a5a3a', letterSpacing: '0.1em', marginBottom: 16,
          }}>
            // locked — complete the lab first
          </div>
          <p style={{ color: 'var(--text-muted)', fontSize: 14, lineHeight: 1.7 }}>
            Go to the <strong style={{ color: 'var(--text-secondary)' }}>lab tab</strong> and drag the end effector outward
            until the arm is nearly fully extended. Watch for the red ring — that marks the singular configuration.
            Hold it there briefly and this puzzle will unlock.
          </p>
        </div>
      ) : (
        <>
          <p style={{ color: 'var(--text-secondary)', lineHeight: 1.65, marginBottom: 20 }}>
            You found the fold point — the exact configuration where <strong style={{ color: '#f59e0b' }}>elbow-up</strong> and <strong style={{ color: '#f59e0b' }}>elbow-down</strong> converge to the same position.
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
                Not quite. Think about what happens to the second joint when the arm is fully stretched out.
              </motion.div>
            )}
          </AnimatePresence>
        </>
      )}
    </div>
  );
}
