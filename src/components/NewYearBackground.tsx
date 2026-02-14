import React from 'react';

const NewYearBackground: React.FC = () => {
  return (
    <div className="fixed inset-0 -z-10 overflow-hidden bg-gradient-to-b from-red-600 to-red-800">
      {/* Floating Lanterns */}
      {[...Array(6)].map((_, i) => (
        <div
          key={`lantern-${i}`}
          className="absolute text-4xl animate-bounce opacity-60"
          style={{
            top: `${Math.random() * 40}%`,
            left: `${i * 20}%`,
            animationDuration: `${3 + Math.random() * 2}s`,
            animationDelay: `${Math.random() * 2}s`,
          }}
        >
          🏮
        </div>
      ))}

      {/* New Year Elements */}
      <div className="absolute top-10 left-10 text-6xl opacity-20">福</div>
      <div className="absolute top-10 right-10 text-6xl opacity-20">福</div>
      <div className="absolute bottom-10 left-10 text-6xl opacity-20 rotate-180">福</div>
      <div className="absolute bottom-10 right-10 text-6xl opacity-20 rotate-180">福</div>

      {/* Decorative Border */}
      <div className="absolute inset-4 border-4 border-yellow-400 opacity-30 rounded-3xl pointer-events-none" />
      <div className="absolute inset-8 border-2 border-yellow-500 opacity-20 rounded-2xl pointer-events-none" />
      
      {/* Fireworks effect (simple circles) */}
      {[...Array(10)].map((_, i) => (
        <div
          key={`firework-${i}`}
          className="absolute w-2 h-2 bg-yellow-300 rounded-full animate-ping opacity-40"
          style={{
            top: `${Math.random() * 100}%`,
            left: `${Math.random() * 100}%`,
            animationDuration: `${2 + Math.random() * 3}s`,
            animationDelay: `${Math.random() * 5}s`,
          }}
        />
      ))}
    </div>
  );
};

export default NewYearBackground;
