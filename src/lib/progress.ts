'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface UnitProgress {
  visited: boolean;
  puzzleSolved: boolean;
  unlockedAt?: number;
  solvedAt?: number;
}

interface ProgressState {
  units: Record<number, UnitProgress>;
  markVisited: (id: number) => void;
  markPuzzleSolved: (id: number) => void;
  getUnit: (id: number) => UnitProgress;
  solvedCount: () => number;
  reset: () => void;
}

const defaultUnit = (): UnitProgress => ({
  visited: false,
  puzzleSolved: false,
});

export const useProgress = create<ProgressState>()(
  persist(
    (set, get) => ({
      units: {},

      markVisited: (id) =>
        set((state) => ({
          units: {
            ...state.units,
            [id]: {
              ...defaultUnit(),
              ...state.units[id],
              visited: true,
              unlockedAt: state.units[id]?.unlockedAt ?? Date.now(),
            },
          },
        })),

      markPuzzleSolved: (id) =>
        set((state) => ({
          units: {
            ...state.units,
            [id]: {
              ...defaultUnit(),
              ...state.units[id],
              puzzleSolved: true,
              solvedAt: Date.now(),
            },
          },
        })),

      getUnit: (id) => get().units[id] ?? defaultUnit(),

      solvedCount: () =>
        Object.values(get().units).filter((u) => u.puzzleSolved).length,

      reset: () => set({ units: {} }),
    }),
    {
      name: 'robotics_v2',
    }
  )
);
