import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface GameState {
  highScore: number;
  playerName: string;
  setHighScore: (score: number) => void;
  setPlayerName: (name: string) => void;
}

export const useGameStore = create<GameState>()(
  persist(
    (set) => ({
      highScore: 0,
      playerName: '子鱼',
      setHighScore: (score: number) =>
        set((state) => ({
          highScore: Math.max(state.highScore, score),
        })),
      setPlayerName: (name: string) => set({ playerName: name }),
    }),
    {
      name: 'ziyu-snake-game-storage',
    }
  )
);
