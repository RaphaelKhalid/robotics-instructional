'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useProgress } from '@/lib/progress';

export default function LostRobotPuzzle({ unitId }: { unitId: number }) {
  const { markPuzzleSolved, getUnit } = useProgress();
  const progress = getUnit(unitId);
  const [answer, setAnswer] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [correct, setCorrect] = useState(false);

  const check = () => {
    const val = parseInt(answer.trim());
    const isCorrect = val === 3;
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
          3 landmarks. Two circles intersect at two possible points — a third resolves the ambiguity uniquely.
          This is trilateration, and it&apos;s the geometric core of SLAM.
        </p>
      </div>
    );
  }

  return (
    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 16, padding: 32 }}>
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 11, color: 'var(--text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase' as const, marginBottom: 4 }}>Puzzle</div>
        <h3 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' }}>The Lost Robot</h3>
      </div>

      <p style={{ color: 'var(--text-secondary)', lineHeight: 1.65, marginBottom: 16 }}>
        Drive the robot in the lab and find landmarks to reduce the orange uncertainty ellipse. Each re-observation constrains position further.
      </p>
      <p style={{ color: 'var(--text-secondary)', lineHeight: 1.65, marginBottom: 24 }}>
        <strong style={{ color: 'var(--text-primary)' }}>What is the minimum number of unique landmarks needed to unambiguously determine the robot&apos;s 2D position?</strong>
      </p>

      <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 16 }}>
        <input
          type="number"
          value={answer}
          onChange={e => { setAnswer(e.target.value); setSubmitted(false); }}
          placeholder="Number..."
          min={1} max={10}
          style={{
            background: 'var(--bg-inset)', border: `1px solid ${submitted ? (correct ? '#10d98a' : '#ff6b6b') : 'var(--border)'}`,
            borderRadius: 8, padding: '10px 14px', fontSize: 16,
            color: 'var(--text-primary)', fontFamily: 'var(--font-geist-mono)',
            width: 120, outline: 'none',
          }}
          onKeyDown={e => e.key === 'Enter' && check()}
        />
        <motion.button
          onClick={check}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.97 }}
          style={{
            background: '#ff6b6b', color: '#fff',
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
            Think geometrically: each landmark defines a circle. How many circles must intersect to get one unique point?
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
