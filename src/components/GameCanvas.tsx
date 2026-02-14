import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useGameStore } from '../store/useGameStore';

interface Position {
  x: number;
  y: number;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
  alpha: number;
  decay: number;
}

enum Direction {
  UP = 'UP',
  DOWN = 'DOWN',
  LEFT = 'LEFT',
  RIGHT = 'RIGHT',
}

interface GameCanvasProps {
  onGameOver: (score: number) => void;
  onScoreUpdate: (score: number) => void;
}

const GRID_SIZE = 20;
const CANVAS_WIDTH = 1000;
const CANVAS_HEIGHT = 800;
const INITIAL_SNAKE: Position[] = [
  { x: 10, y: 10 },
  { x: 10, y: 11 },
  { x: 10, y: 12 },
];
const INITIAL_DIRECTION = Direction.UP;
const INITIAL_SPEED = 200;
const FOOD_PADDING = 2; // 不要太靠边际

const playEatSound = () => {
  const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  if (!AudioContextClass) return;
  const audioCtx = new AudioContextClass();
  const oscillator = audioCtx.createOscillator();
  const gainNode = audioCtx.createGain();

  oscillator.type = 'sine';
  oscillator.frequency.setValueAtTime(523.25, audioCtx.currentTime); // C5
  oscillator.frequency.exponentialRampToValueAtTime(880, audioCtx.currentTime + 0.1); // A5

  gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
  gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1);

  oscillator.connect(gainNode);
  gainNode.connect(audioCtx.destination);

  oscillator.start();
  oscillator.stop(audioCtx.currentTime + 0.1);
};

const playGameOverSound = () => {
  const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  if (!AudioContextClass) return;
  const audioCtx = new AudioContextClass();

  const playNote = (freq: number, startTime: number, duration: number) => {
    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();

    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(freq, audioCtx.currentTime + startTime);

    gainNode.gain.setValueAtTime(0, audioCtx.currentTime + startTime);
    gainNode.gain.linearRampToValueAtTime(0.1, audioCtx.currentTime + startTime + 0.05);
    gainNode.gain.linearRampToValueAtTime(0, audioCtx.currentTime + startTime + duration);

    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);

    oscillator.start(audioCtx.currentTime + startTime);
    oscillator.stop(audioCtx.currentTime + startTime + duration);
  };

  // 播放一段鼓励性的旋律 (C4, E4, G4, C5)
  playNote(261.63, 0, 0.2);
  playNote(329.63, 0.2, 0.2);
  playNote(392.00, 0.4, 0.2);
  playNote(523.25, 0.6, 0.4);
};

// 新年背景音乐类
class NewYearBGM {
  private audioCtx: AudioContext | null = null;
  private oscillator: OscillatorNode | null = null;
  private gainNode: GainNode | null = null;
  private isPlaying: boolean = false;

  start() {
    if (this.isPlaying) return;
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;
    this.audioCtx = new AudioContextClass();
    this.isPlaying = true;
    this.loop();
  }

  private loop() {
    if (!this.isPlaying || !this.audioCtx) return;

    const playNote = (freq: number, startTime: number, duration: number) => {
      if (!this.audioCtx) return;
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, this.audioCtx.currentTime + startTime);
      gain.gain.setValueAtTime(0, this.audioCtx.currentTime + startTime);
      gain.gain.linearRampToValueAtTime(0.05, this.audioCtx.currentTime + startTime + 0.1);
      gain.gain.linearRampToValueAtTime(0, this.audioCtx.currentTime + startTime + duration);
      osc.connect(gain);
      gain.connect(this.audioCtx.destination);
      osc.start(this.audioCtx.currentTime + startTime);
      osc.stop(this.audioCtx.currentTime + startTime + duration);
    };

    // 喜庆的简短旋律循环 (类似新年好)
    const notes = [
      { f: 523.25, d: 0.5 }, { f: 523.25, d: 0.5 }, { f: 523.25, d: 0.5 }, { f: 392.00, d: 0.5 },
      { f: 440.00, d: 0.5 }, { f: 440.00, d: 0.5 }, { f: 392.00, d: 1.0 },
    ];

    let time = 0;
    notes.forEach(n => {
      playNote(n.f, time, n.d);
      time += n.d;
    });

    setTimeout(() => this.loop(), time * 1000);
  }

  stop() {
    this.isPlaying = false;
    if (this.audioCtx) {
      this.audioCtx.close();
      this.audioCtx = null;
    }
  }
}

const bgmManager = new NewYearBGM();

const GameCanvas: React.FC<GameCanvasProps> = ({ onGameOver, onScoreUpdate }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [snake, setSnake] = useState<Position[]>(INITIAL_SNAKE);
  const [direction, setDirection] = useState<Direction>(INITIAL_DIRECTION);
  const [food, setFood] = useState<Position>({ x: 5, y: 5 });
  const [score, setScore] = useState(0);
  const [isGameOver, setIsGameOver] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [speed, setSpeed] = useState(INITIAL_SPEED);

  const { setHighScore, playerName } = useGameStore();
  const particlesRef = useRef<Particle[]>([]);

  const createFireworks = (x: number, y: number) => {
    const colors = ['#FFD700', '#FF0000', '#FFA500', '#FFFFFF', '#FF4500'];
    for (let i = 0; i < 30; i++) {
      particlesRef.current.push({
        x,
        y,
        vx: (Math.random() - 0.5) * 10,
        vy: (Math.random() - 0.5) * 10,
        radius: Math.random() * 3 + 1,
        color: colors[Math.floor(Math.random() * colors.length)],
        alpha: 1,
        decay: Math.random() * 0.02 + 0.01
      });
    }
  };

  const requestRef = useRef<number>();
  const lastUpdateTimeRef = useRef<number>(0);

  useEffect(() => {
    bgmManager.start();
    return () => {
      bgmManager.stop();
    };
  }, []);

  const generateFood = useCallback((currentSnake: Position[]) => {
    let newFood: Position;
    while (true) {
      newFood = {
        x: Math.floor(Math.random() * (CANVAS_WIDTH / GRID_SIZE - 2 * FOOD_PADDING)) + FOOD_PADDING,
        y: Math.floor(Math.random() * (CANVAS_HEIGHT / GRID_SIZE - 2 * FOOD_PADDING)) + FOOD_PADDING,
      };
      const isOnSnake = currentSnake.some(
        (segment) => segment.x === newFood.x && segment.y === newFood.y
      );
      if (!isOnSnake) break;
    }
    return newFood;
  }, []);

  const resetGame = () => {
    setSnake(INITIAL_SNAKE);
    setDirection(INITIAL_DIRECTION);
    setFood(generateFood(INITIAL_SNAKE));
    setScore(0);
    setIsGameOver(false);
    setIsPaused(false);
    setSpeed(INITIAL_SPEED);
    onScoreUpdate(0);
  };

  const moveSnake = useCallback(() => {
    if (isGameOver || isPaused) return;

    setSnake((prevSnake) => {
      const head = prevSnake[0];
      const newHead = { ...head };

      switch (direction) {
        case Direction.UP:
          newHead.y -= 1;
          break;
        case Direction.DOWN:
          newHead.y += 1;
          break;
        case Direction.LEFT:
          newHead.x -= 1;
          break;
        case Direction.RIGHT:
          newHead.x += 1;
          break;
      }

      // Collision detection - Walls
      if (
        newHead.x < 0 ||
        newHead.x >= CANVAS_WIDTH / GRID_SIZE ||
        newHead.y < 0 ||
        newHead.y >= CANVAS_HEIGHT / GRID_SIZE
      ) {
        setIsGameOver(true);
        onGameOver(score);
        setHighScore(score);
        playGameOverSound();
        return prevSnake;
      }

      // Collision detection - Self
      if (prevSnake.some((segment) => segment.x === newHead.x && segment.y === newHead.y)) {
        setIsGameOver(true);
        onGameOver(score);
        setHighScore(score);
        playGameOverSound();
        return prevSnake;
      }

      const newSnake = [newHead, ...prevSnake];

      // Collision detection - Food
      if (newHead.x === food.x && newHead.y === food.y) {
        const newScore = score + 10;
        setScore(newScore);
        onScoreUpdate(newScore);
        setFood(generateFood(newSnake));
        playEatSound();
        createFireworks(
          food.x * GRID_SIZE + GRID_SIZE / 2,
          food.y * GRID_SIZE + GRID_SIZE / 2
        );
        // Increase speed slightly
        setSpeed((prev) => Math.max(prev - 2, 50));
      } else {
        newSnake.pop();
      }

      return newSnake;
    });
  }, [direction, food, isGameOver, isPaused, score, generateFood, onGameOver, onScoreUpdate, setHighScore]);

  const draw = useCallback((ctx: CanvasRenderingContext2D) => {
    // Clear canvas
    const gradient = ctx.createRadialGradient(
      CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2, 50,
      CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2, CANVAS_WIDTH
    );
    gradient.addColorStop(0, '#2a0a0a'); // 深红中心
    gradient.addColorStop(1, '#1a1a1a'); // 黑色边缘
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // 绘制新年背景装饰
    ctx.save();
    ctx.fillStyle = 'rgba(255, 215, 0, 0.05)';
    ctx.font = '200px serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('福', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2);

    ctx.font = '100px serif';
    ctx.fillText('🏮', 100, 100);
    ctx.fillText('🏮', CANVAS_WIDTH - 100, 100);
    ctx.fillText('🏮', 100, CANVAS_HEIGHT - 100);
    ctx.fillText('🏮', CANVAS_WIDTH - 100, CANVAS_HEIGHT - 100);

    // 绘制金色边框
    ctx.strokeStyle = 'rgba(255, 215, 0, 0.3)';
    ctx.lineWidth = 10;
    ctx.strokeRect(10, 10, CANVAS_WIDTH - 20, CANVAS_HEIGHT - 20);
    ctx.restore();

    // Draw Grid (Optional, subtle)
    ctx.strokeStyle = 'rgba(255, 215, 0, 0.1)'; // 金色网格
    ctx.lineWidth = 0.5;
    for (let i = 0; i < CANVAS_WIDTH; i += GRID_SIZE) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i, CANVAS_HEIGHT);
      ctx.stroke();
    }
    for (let i = 0; i < CANVAS_HEIGHT; i += GRID_SIZE) {
      ctx.beginPath();
      ctx.moveTo(0, i);
      ctx.lineTo(CANVAS_WIDTH, i);
      ctx.stroke();
    }

    // Draw Food
    ctx.font = `${GRID_SIZE}px serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('🧧', food.x * GRID_SIZE + GRID_SIZE / 2, food.y * GRID_SIZE + GRID_SIZE / 2);

    // Draw Snake
    snake.forEach((segment, index) => {
      if (index === 0) {
        // Draw Snake Head with Open Mouth
        const centerX = segment.x * GRID_SIZE + GRID_SIZE / 2;
        const centerY = segment.y * GRID_SIZE + GRID_SIZE / 2;
        const radius = GRID_SIZE / 2;

        // Head color (based on character)
        let headColor = '#FFD700'; // Default Gold
        if (playerName === '萌萌') headColor = '#FF69B4';
        if (playerName === '贝贝') headColor = '#1E90FF';
        if (playerName === '子鱼') headColor = '#FF4500';

        ctx.fillStyle = headColor;
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
        ctx.fill();

        // Eyes
        ctx.fillStyle = 'white';
        const eyeSize = 3;
        if (direction === Direction.RIGHT || direction === Direction.LEFT) {
          ctx.beginPath();
          ctx.arc(centerX + (direction === Direction.RIGHT ? 4 : -4), centerY - 4, eyeSize, 0, Math.PI * 2);
          ctx.arc(centerX + (direction === Direction.RIGHT ? 4 : -4), centerY + 4, eyeSize, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = 'black';
          ctx.beginPath();
          ctx.arc(centerX + (direction === Direction.RIGHT ? 5 : -5), centerY - 4, 1.5, 0, Math.PI * 2);
          ctx.arc(centerX + (direction === Direction.RIGHT ? 5 : -5), centerY + 4, 1.5, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.beginPath();
          ctx.arc(centerX - 4, centerY + (direction === Direction.DOWN ? 4 : -4), eyeSize, 0, Math.PI * 2);
          ctx.arc(centerX + 4, centerY + (direction === Direction.DOWN ? 4 : -4), eyeSize, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = 'black';
          ctx.beginPath();
          ctx.arc(centerX - 4, centerY + (direction === Direction.DOWN ? 5 : -5), 1.5, 0, Math.PI * 2);
          ctx.arc(centerX + 4, centerY + (direction === Direction.DOWN ? 5 : -5), 1.5, 0, Math.PI * 2);
          ctx.fill();
        }

        // Open Mouth (Wedge)
        ctx.fillStyle = '#1a1a1a'; // Match background
        ctx.beginPath();
        ctx.moveTo(centerX, centerY);
        let startAngle = 0;
        let endAngle = 0;
        switch (direction) {
          case Direction.RIGHT: startAngle = -0.2 * Math.PI; endAngle = 0.2 * Math.PI; break;
          case Direction.LEFT: startAngle = 0.8 * Math.PI; endAngle = 1.2 * Math.PI; break;
          case Direction.UP: startAngle = 1.3 * Math.PI; endAngle = 1.7 * Math.PI; break;
          case Direction.DOWN: startAngle = 0.3 * Math.PI; endAngle = 0.7 * Math.PI; break;
        }
        ctx.arc(centerX, centerY, radius + 2, startAngle, endAngle);
        ctx.lineTo(centerX, centerY);
        ctx.fill();
      } else {
        const emoji = '🍬';
        ctx.fillText(emoji, segment.x * GRID_SIZE + GRID_SIZE / 2, segment.y * GRID_SIZE + GRID_SIZE / 2);
      }
    });

    // Draw Particles (Fireworks)
    particlesRef.current.forEach((particle, index) => {
      ctx.globalAlpha = particle.alpha;
      ctx.fillStyle = particle.color;
      ctx.beginPath();
      ctx.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
      ctx.fill();

      // Update particle
      particle.x += particle.vx;
      particle.y += particle.vy;
      particle.alpha -= particle.decay;

      if (particle.alpha <= 0) {
        particlesRef.current.splice(index, 1);
      }
    });
    ctx.globalAlpha = 1;

    if (isPaused) {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
      ctx.fillStyle = '#FFD700';
      ctx.font = '48px cursive';
      ctx.fillText('游戏暂停', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2);
    }

    if (isGameOver) {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
      ctx.fillStyle = '#FFD700';
      ctx.font = '48px cursive';
      ctx.fillText('游戏结束', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 40);
      ctx.font = '24px cursive';
      ctx.fillText(`最终得分: ${score}`, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 20);
      ctx.fillText(`新年快乐, ${playerName}!`, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 60);
    }
  }, [snake, food, isPaused, isGameOver, score, playerName, direction]);

  const gameLoop = useCallback(
    (time: number) => {
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          draw(ctx);
        }
      }

      if (lastUpdateTimeRef.current === 0) {
        lastUpdateTimeRef.current = time;
      }

      const deltaTime = time - lastUpdateTimeRef.current;

      if (deltaTime > speed) {
        moveSnake();
        lastUpdateTimeRef.current = time;
      }

      requestRef.current = requestAnimationFrame(gameLoop);
    },
    [moveSnake, speed, draw]
  );

  useEffect(() => {
    requestRef.current = requestAnimationFrame(gameLoop);
    return () => {
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current);
      }
    };
  }, [gameLoop]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowUp':
          if (direction !== Direction.DOWN) setDirection(Direction.UP);
          break;
        case 'ArrowDown':
          if (direction !== Direction.UP) setDirection(Direction.DOWN);
          break;
        case 'ArrowLeft':
          if (direction !== Direction.RIGHT) setDirection(Direction.LEFT);
          break;
        case 'ArrowRight':
          if (direction !== Direction.LEFT) setDirection(Direction.RIGHT);
          break;
        case ' ':
          setIsPaused((prev) => !prev);
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [direction]);

  return (
    <div className="relative">
      <canvas
        ref={canvasRef}
        width={CANVAS_WIDTH}
        height={CANVAS_HEIGHT}
        className="rounded-xl shadow-2xl border-4 border-yellow-500 bg-zinc-900"
      />
      {isGameOver && (
        <button
          onClick={resetGame}
          className="absolute top-[70%] left-1/2 -translate-x-1/2 px-8 py-3 bg-yellow-500 hover:bg-yellow-400 text-red-700 font-bold rounded-full transition-all transform hover:scale-110 shadow-lg"
        >
          重新开始
        </button>
      )}
    </div>
  );
};

export default GameCanvas;
