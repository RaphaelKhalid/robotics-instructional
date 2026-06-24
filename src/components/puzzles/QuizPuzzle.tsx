'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useProgress } from '@/lib/progress';

const MONO = 'var(--font-geist-mono)';

export interface QuizOption {
  key: string;
  label: string;
}

interface Props {
  unitId: number;
  title: string;
  prompt: string;
  options: QuizOption[];
  correctKey: string;
  explanation: string;
  hint: string;
  accent?: string;
}

export default function QuizPuzzle({
  unitId, title, prompt, options, correctKey, explanation, hint, accent = '#00ff41',
}: Props) {
  const { markPuzzleSolved, getUnit } = useProgress();
  const progress = getUnit(unitId);
  const [chosen, setChosen] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [correct, setCorrect] = useState(false);

  const submit = () => {
    const isCorrect = chosen === correctKey;
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
        <p style={{ color: 'var(--text-secondary)', lineHeight: 1.65 }}>{explanation}</p>
      </div>
    );
  }

  return (
    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 16, padding: 32 }}>
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 11, color: 'var(--text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase' as const, marginBottom: 4 }}>Puzzle</div>
        <h3 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' }}>{title}</h3>
      </div>

      <p style={{ color: 'var(--text-secondary)', lineHeight: 1.65, marginBottom: 24 }}>{prompt}</p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
        {options.map(opt => {
          const isChosen = chosen === opt.key;
          return (
            <motion.button
              key={opt.key}
              onClick={() => { setChosen(opt.key); setSubmitted(false); }}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              style={{
                textAlign: 'left', padding: '14px 16px', borderRadius: 8, cursor: 'pointer',
                fontFamily: MONO, fontSize: 14,
                border: `1px solid ${isChosen ? accent : 'var(--border)'}`,
                background: isChosen ? accent + '15' : 'transparent',
                color: isChosen ? accent : 'var(--text-secondary)',
                transition: 'all 0.15s', display: 'flex', gap: 12, alignItems: 'center',
              }}
            >
              <span style={{ fontWeight: 700, opacity: 0.7 }}>{opt.key}</span>
              <span>{opt.label}</span>
            </motion.button>
          );
        })}
      </div>

      <motion.button
        onClick={submit}
        disabled={!chosen}
        whileHover={chosen ? { scale: 1.02 } : {}}
        whileTap={chosen ? { scale: 0.97 } : {}}
        style={{
          background: chosen ? accent : 'rgba(0,255,65,0.1)',
          color: chosen ? '#000' : 'rgba(0,255,65,0.3)',
          border: 'none', borderRadius: 8,
          padding: '10px 24px', fontSize: 14, fontWeight: 700,
          cursor: chosen ? 'pointer' : 'not-allowed', fontFamily: MONO,
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
              borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#ff8a80',
            }}
          >
            {hint}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
