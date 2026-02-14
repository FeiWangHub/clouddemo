import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface GameState {
  highScore: number;
  setHighScore: (score: number) => void;
}

export const useGameStore = create<GameState>()(
  persist(
    (set) => ({
      highScore: 0,
      setHighScore: (score: number) =>
        set((state) => ({
          highScore: Math.max(state.highScore, score),
        })),
    }),
    {
      name: 'ziyu-snake-game-storage',
    }
  )
);
