import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Trophy, Star } from 'lucide-react';
import GameCanvas from '../components/GameCanvas';
import NewYearBackground from '../components/NewYearBackground';
import { useGameStore } from '../store/useGameStore';

const GamePage: React.FC = () => {
  const navigate = useNavigate();
  const [currentScore, setCurrentScore] = useState(0);
  const { highScore } = useGameStore();

  const handleGameOver = (finalScore: number) => {
    console.log('Game Over! Final Score:', finalScore);
  };

  const handleScoreUpdate = (score: number) => {
    setCurrentScore(score);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 relative overflow-hidden">
      <NewYearBackground />

      <div className="w-full max-w-4xl flex flex-col items-center gap-6">
        {/* Header Controls */}
        <div className="w-full flex justify-between items-center bg-black/40 backdrop-blur-md p-4 rounded-2xl border border-yellow-500/30">
          <button
            onClick={() => navigate('/')}
            className="flex items-center space-x-2 text-yellow-400 hover:text-yellow-300 transition-colors font-bold"
          >
            <ArrowLeft size={24} />
            <span>返回主页</span>
          </button>

          <div className="flex items-center space-x-8">
            <div className="flex items-center space-x-2">
              <Star className="text-yellow-400 fill-yellow-400" />
              <span className="text-white text-xl font-bold">分数: {currentScore}</span>
            </div>
            <div className="flex items-center space-x-2">
              <Trophy className="text-yellow-400 fill-yellow-400" />
              <span className="text-white text-xl font-bold">最高分: {highScore}</span>
            </div>
          </div>
        </div>

        {/* Game Area */}
        <div className="relative group">
          <div className="absolute -inset-1 bg-gradient-to-r from-yellow-400 via-red-500 to-yellow-400 rounded-2xl blur opacity-25 group-hover:opacity-50 transition duration-1000 group-hover:duration-200"></div>
          <GameCanvas onGameOver={handleGameOver} onScoreUpdate={handleScoreUpdate} />
        </div>

        {/* Footer Info */}
        <div className="text-white/60 text-center font-medium">
          使用方向键控制 🐟，吃到 🧧 或 🍬 获得分数！
        </div>
      </div>
    </div>
  );
};

export default GamePage;
