import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface GameState {
  highScore: number;
  playerName: string;
  isMusicEnabled: boolean;
  setHighScore: (score: number) => void;
  setPlayerName: (name: string) => void;
  toggleMusic: () => void;
}

export const useGameStore = create<GameState>()(
  persist(
    (set) => ({
      highScore: 0,
      playerName: '子鱼',
      isMusicEnabled: true,
      setHighScore: (score: number) =>
        set((state) => ({
          highScore: Math.max(state.highScore, score),
        })),
      setPlayerName: (name: string) => set({ playerName: name }),
      toggleMusic: () => set((state) => ({ isMusicEnabled: !state.isMusicEnabled })),
    }),
    {
      name: 'ziyu-snake-game-storage',
    }
  )
);
