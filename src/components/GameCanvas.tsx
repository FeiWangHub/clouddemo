import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useGameStore } from '../store/useGameStore';

interface Position {
  x: number;
  y: number;
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
const INITIAL_SNAKE: Position[] = [
  { x: 10, y: 10 },
  { x: 10, y: 11 },
  { x: 10, y: 12 },
];
const INITIAL_DIRECTION = Direction.UP;
const INITIAL_SPEED = 150;

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

  const getHeadEmoji = () => {
    switch (playerName) {
      case '萌萌': return '👧';
      case '贝贝': return '👦';
      case '子鱼': return '🐟';
      default: return '🐟';
    }
  };

  const requestRef = useRef<number>();
  const lastUpdateTimeRef = useRef<number>(0);

  const generateFood = useCallback((currentSnake: Position[]) => {
    let newFood: Position;
    while (true) {
      newFood = {
        x: Math.floor(Math.random() * (800 / GRID_SIZE)),
        y: Math.floor(Math.random() * (600 / GRID_SIZE)),
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
        newHead.x >= 800 / GRID_SIZE ||
        newHead.y < 0 ||
        newHead.y >= 600 / GRID_SIZE
      ) {
        setIsGameOver(true);
        onGameOver(score);
        setHighScore(score);
        return prevSnake;
      }

      // Collision detection - Self
      if (prevSnake.some((segment) => segment.x === newHead.x && segment.y === newHead.y)) {
        setIsGameOver(true);
        onGameOver(score);
        setHighScore(score);
        return prevSnake;
      }

      const newSnake = [newHead, ...prevSnake];

      // Collision detection - Food
      if (newHead.x === food.x && newHead.y === food.y) {
        const newScore = score + 10;
        setScore(newScore);
        onScoreUpdate(newScore);
        setFood(generateFood(newSnake));
        // Increase speed slightly
        setSpeed((prev) => Math.max(prev - 2, 50));
      } else {
        newSnake.pop();
      }

      return newSnake;
    });
  }, [direction, food, isGameOver, isPaused, score, generateFood, onGameOver, onScoreUpdate, setHighScore]);

  const gameLoop = useCallback(
    (time: number) => {
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
    [moveSnake, speed]
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

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw Grid (Optional, subtle)
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 0.5;
    for (let i = 0; i < canvas.width; i += GRID_SIZE) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i, canvas.height);
      ctx.stroke();
    }
    for (let i = 0; i < canvas.height; i += GRID_SIZE) {
      ctx.beginPath();
      ctx.moveTo(0, i);
      ctx.lineTo(canvas.width, i);
      ctx.stroke();
    }

    // Draw Food
    ctx.font = `${GRID_SIZE}px serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('🧧', food.x * GRID_SIZE + GRID_SIZE / 2, food.y * GRID_SIZE + GRID_SIZE / 2);

    // Draw Snake
    snake.forEach((segment, index) => {
      const emoji = index === 0 ? getHeadEmoji() : '🍬';
      ctx.fillText(emoji, segment.x * GRID_SIZE + GRID_SIZE / 2, segment.y * GRID_SIZE + GRID_SIZE / 2);
    });

    if (isPaused) {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#FFD700';
      ctx.font = '48px cursive';
      ctx.fillText('游戏暂停', canvas.width / 2, canvas.height / 2);
    }

    if (isGameOver) {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#FFD700';
      ctx.font = '48px cursive';
      ctx.fillText('游戏结束', canvas.width / 2, canvas.height / 2 - 40);
      ctx.font = '24px cursive';
      ctx.fillText(`最终得分: ${score}`, canvas.width / 2, canvas.height / 2 + 20);
      ctx.fillText(`新年快乐, ${playerName}!`, canvas.width / 2, canvas.height / 2 + 60);
    }
  }, [snake, food, isPaused, isGameOver, score]);

  return (
    <div className="relative">
      <canvas
        ref={canvasRef}
        width={800}
        height={600}
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
