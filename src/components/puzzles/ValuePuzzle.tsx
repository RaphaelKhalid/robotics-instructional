'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useProgress } from '@/lib/progress';

const MONO = 'var(--font-geist-mono)';

interface Props {
  unitId: number;
  title: string;
  prompt: string;
  answer: number;
  tolerance: number;
  suffix?: string;
  placeholder?: string;
  explanation: string;
  hint: string;
  accent?: string;
}

export default function ValuePuzzle({
  unitId, title, prompt, answer, tolerance, suffix = '', placeholder = 'Enter value…',
  explanation, hint, accent = '#00ff41',
}: Props) {
  const { markPuzzleSolved, getUnit } = useProgress();
  const progress = getUnit(unitId);
  const [val, setVal] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [correct, setCorrect] = useState(false);

  const check = () => {
    const n = parseFloat(val.trim());
    const isCorrect = !isNaN(n) && Math.abs(n - answer) <= tolerance;
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

      <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 16 }}>
        <input
          type="number"
          value={val}
          onChange={e => { setVal(e.target.value); setSubmitted(false); }}
          placeholder={placeholder}
          style={{
            background: 'var(--bg-inset)', border: `1px solid ${submitted ? (correct ? '#10d98a' : '#ff6b6b') : 'var(--border)'}`,
            borderRadius: 8, padding: '10px 14px', fontSize: 16,
            color: 'var(--text-primary)', fontFamily: MONO,
            width: 180, outline: 'none',
          }}
          onKeyDown={e => e.key === 'Enter' && check()}
        />
        {suffix && <span style={{ fontFamily: MONO, color: 'var(--text-muted)', fontSize: 14 }}>{suffix}</span>}
        <motion.button
          onClick={check}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.97 }}
          style={{
            background: accent, color: '#000',
            border: 'none', borderRadius: 8,
            padding: '10px 20px', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: MONO,
          }}
        >
          Submit
        </motion.button>
      </div>

      <AnimatePresence>
        {submitted && !correct && (
          <motion.div
            initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            style={{
              background: 'rgba(255,107,107,0.1)', border: '1px solid rgba(255,107,107,0.3)',
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
