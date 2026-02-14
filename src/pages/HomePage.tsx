import React from 'react';
import { useNavigate } from 'react-router-dom';
import NewYearBackground from '../components/NewYearBackground';
import { useGameStore } from '../store/useGameStore';

const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const { playerName, setPlayerName } = useGameStore();

  const players = [
    { name: '萌萌', emoji: '👧' },
    { name: '贝贝', emoji: '👦' },
    { name: '子鱼', emoji: '🐟' }
  ];

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 relative overflow-hidden">
      <NewYearBackground />
      
      <div className="bg-white/10 backdrop-blur-md p-10 rounded-3xl border-4 border-yellow-400 shadow-2xl text-center max-w-2xl w-full transform transition-all hover:scale-[1.02] z-10">
        <h1 className="text-6xl font-bold text-yellow-300 mb-6 drop-shadow-lg font-serif">
          {playerName}的新年贪吃蛇
        </h1>
        
        <p className="text-2xl text-white mb-10 font-medium">
          新年好！{playerName}，这是送给你的新年礼物 🧧
        </p>

        {/* 角色选择 */}
        <div className="flex justify-center space-x-6 mb-10">
          {players.map((p) => (
            <button
              key={p.name}
              onClick={() => setPlayerName(p.name)}
              className={`flex flex-col items-center p-4 rounded-2xl transition-all border-2 ${
                playerName === p.name 
                  ? 'bg-yellow-400 border-white scale-110 shadow-lg' 
                  : 'bg-red-800/40 border-yellow-500/30 hover:bg-red-700/50'
              }`}
            >
              <span className="text-5xl mb-2">{p.emoji}</span>
              <span className={`font-bold ${playerName === p.name ? 'text-red-700' : 'text-yellow-200'}`}>
                {p.name}
              </span>
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12 text-left bg-red-900/40 p-6 rounded-2xl border border-yellow-500/30">
          <div className="flex items-center space-x-4">
            <span className="text-4xl">⌨️</span>
            <p className="text-white text-lg">使用键盘方向键控制移动</p>
          </div>
          <div className="flex items-center space-x-4">
            <span className="text-4xl">🍬</span>
            <p className="text-white text-lg">帮助小蛇吃到更多糖果和红包</p>
          </div>
          <div className="flex items-center space-x-4">
            <span className="text-4xl">⏸️</span>
            <p className="text-white text-lg">按下空格键可以暂停游戏</p>
          </div>
          <div className="flex items-center space-x-4">
            <span className="text-4xl">✨</span>
            <p className="text-white text-lg">不断挑战更高的分数吧！</p>
          </div>
        </div>

        <button
          onClick={() => navigate('/game')}
          className="group relative inline-flex items-center justify-center px-12 py-6 font-bold text-white transition-all duration-200 bg-red-600 font-pj rounded-full focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-900 hover:bg-red-500 shadow-xl"
        >
          <span className="absolute inset-0 w-full h-full bg-yellow-400 rounded-full blur-lg opacity-20 group-hover:opacity-40 transition-opacity"></span>
          <span className="relative flex items-center space-x-3 text-3xl">
            <span>开始游戏</span>
            <span className="animate-bounce">🧧</span>
          </span>
        </button>
      </div>

      <div className="absolute bottom-10 text-yellow-200/50 text-sm italic">
        Made with ❤️ for {playerName}
      </div>
    </div>
  );
};

export default HomePage;
