'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useProgress } from '@/lib/progress';

export default function LostRobotPuzzle({ unitId, uncertaintyAchieved }: { unitId: number; uncertaintyAchieved: boolean }) {
  const { markPuzzleSolved, getUnit } = useProgress();
  const progress = getUnit(unitId);
  const [answer, setAnswer] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [correct, setCorrect] = useState(false);

  const check = () => {
    const val = parseInt(answer.trim());
    // Minimum 3 landmarks needed to triangulate 2D position
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
          3 landmarks. In 2D, two landmarks constrain position to two possible points on intersecting circles.
          A third landmark resolves the ambiguity uniquely. This is triangulation — the geometric heart of SLAM.
          Each re-observation also reduces covariance in EKF-SLAM, which is why loop closures are so powerful.
        </p>
      </div>
    );
  }

  return (
    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 16, padding: 32 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <div style={{
          width: 36, height: 36, borderRadius: 10,
          background: 'rgba(255,107,107,0.15)', border: '1px solid rgba(255,107,107,0.3)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 18,
        }}>📍</div>
        <div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase' as const }}>Puzzle</div>
          <h3 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' }}>The Lost Robot</h3>
        </div>
      </div>

      {!uncertaintyAchieved ? (
        <div style={{ textAlign: 'center', padding: '24px 0' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🔒</div>
          <p style={{ color: 'var(--text-muted)', fontSize: 14, lineHeight: 1.6 }}>
            Drive the robot and find landmarks to reduce the position uncertainty ellipse below 12px.
            The puzzle unlocks once you demonstrate you understand how re-observing landmarks constrains position.
          </p>
        </div>
      ) : (
        <>
          <p style={{ color: 'var(--text-secondary)', lineHeight: 1.65, marginBottom: 16 }}>
            You reduced the uncertainty! Now answer the theoretical core of what you just did:
          </p>
          <p style={{ color: 'var(--text-secondary)', lineHeight: 1.65, marginBottom: 8 }}>
            The robot starts with no map, in an unknown 2D environment.
          </p>
          <p style={{ color: 'var(--text-secondary)', lineHeight: 1.65, marginBottom: 24 }}>
            <strong style={{ color: 'var(--text-primary)' }}>What is the minimum number of unique landmarks that must be observed to unambiguously determine the robot&apos;s 2D position?</strong>
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
                Think geometrically: each observed landmark defines a circle of possible positions.
                How many circles do you need to intersect to get a single unique point?
              </motion.div>
            )}
          </AnimatePresence>
        </>
      )}
    </div>
  );
}
