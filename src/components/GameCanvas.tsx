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
const CANVAS_WIDTH = 1200;
const CANVAS_HEIGHT = 900;
const INITIAL_SNAKE: Position[] = [
  { x: 10, y: 10 },
  { x: 10, y: 11 },
  { x: 10, y: 12 },
];
const INITIAL_AI_SNAKES: Position[][] = [
  [ // Opponent 1
    { x: 50, y: 30 },
    { x: 50, y: 31 },
    { x: 50, y: 32 },
  ],
  [ // Teammate 1
    { x: 10, y: 30 },
    { x: 10, y: 31 },
    { x: 10, y: 32 },
  ],
  [ // Teammate 2
    { x: 30, y: 10 },
    { x: 30, y: 11 },
    { x: 30, y: 12 },
  ]
];

interface SnakeInfo {
  segments: Position[];
  direction: Direction;
  isTeammate: boolean;
  color: string;
}

const INITIAL_DIRECTION = Direction.UP;
const INITIAL_SPEED = 200;
const FOOD_PADDING = 2; // 不要太靠边际

const playEatSound = (enabled: boolean) => {
  if (!enabled) return;
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

const playGameOverSound = (enabled: boolean) => {
  if (!enabled) return;
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
  const [aiSnakes, setAiSnakes] = useState<SnakeInfo[]>([
    { segments: INITIAL_AI_SNAKES[0], direction: Direction.UP, isTeammate: false, color: '#228B22' },
    { segments: INITIAL_AI_SNAKES[1], direction: Direction.UP, isTeammate: true, color: '#4169E1' },
    { segments: INITIAL_AI_SNAKES[2], direction: Direction.UP, isTeammate: true, color: '#9370DB' },
  ]);
  const [food, setFood] = useState<Position>({ x: 5, y: 5 });
  const [specialFood, setSpecialFood] = useState<Position | null>(null);
  const [score, setScore] = useState(0);
  const [isGameOver, setIsGameOver] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [speed, setSpeed] = useState(INITIAL_SPEED);
  const [pendingGrowth, setPendingGrowth] = useState(0);
  const specialFoodMoveCounter = useRef(0);
  const specialFoodSpawnCounter = useRef(0);

  const { setHighScore, playerName, isMusicEnabled } = useGameStore();
  const particlesRef = useRef<Particle[]>([]);

  const createFireworks = useCallback((x: number, y: number) => {
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
  }, []);

  const requestRef = useRef<number>();
  const lastUpdateTimeRef = useRef<number>(0);

  useEffect(() => {
    if (isMusicEnabled) {
      bgmManager.start();
    } else {
      bgmManager.stop();
    }
    return () => {
      bgmManager.stop();
    };
  }, [isMusicEnabled]);

  const generateFood = useCallback((allSnakes: Position[][]) => {
    let newFood: Position;
    const allSegments = allSnakes.flat();
    while (true) {
      newFood = {
        x: Math.floor(Math.random() * (CANVAS_WIDTH / GRID_SIZE - 2 * FOOD_PADDING)) + FOOD_PADDING,
        y: Math.floor(Math.random() * (CANVAS_HEIGHT / GRID_SIZE - 2 * FOOD_PADDING)) + FOOD_PADDING,
      };
      const isOnSnake = allSegments.some(
        (segment) => segment.x === newFood.x && segment.y === newFood.y
      );
      if (!isOnSnake) break;
    }
    return newFood;
  }, []);

  const resetGame = () => {
    setSnake(INITIAL_SNAKE);
    setDirection(INITIAL_DIRECTION);
    const initialAi = [
      { segments: INITIAL_AI_SNAKES[0], direction: Direction.UP, isTeammate: false, color: '#228B22' },
      { segments: INITIAL_AI_SNAKES[1], direction: Direction.UP, isTeammate: true, color: '#4169E1' },
      { segments: INITIAL_AI_SNAKES[2], direction: Direction.UP, isTeammate: true, color: '#9370DB' },
    ];
    setAiSnakes(initialAi);
    setFood(generateFood([INITIAL_SNAKE, ...initialAi.map(s => s.segments)]));
    setSpecialFood(null);
    setScore(0);
    setPendingGrowth(0);
    setIsGameOver(false);
    setIsPaused(false);
    setSpeed(INITIAL_SPEED);
    onScoreUpdate(0);
  };

  const moveAiSnakes = useCallback(() => {
    if (isGameOver || isPaused) return;

    setAiSnakes((prevAiSnakes) => {
      return prevAiSnakes.map((ai) => {
        const head = ai.segments[0];
        const targets = [food];
        if (specialFood) targets.push(specialFood);

        // Find nearest food
        const nearestFood = targets.reduce((nearest, current) => {
          const distNearest = Math.abs(head.x - nearest.x) + Math.abs(head.y - nearest.y);
          const distCurrent = Math.abs(head.x - current.x) + Math.abs(head.y - current.y);
          return distCurrent < distNearest ? current : nearest;
        });

        // Decide next direction
        let nextDirection = ai.direction;
        if (head.x < nearestFood.x && ai.direction !== Direction.LEFT) nextDirection = Direction.RIGHT;
        else if (head.x > nearestFood.x && ai.direction !== Direction.RIGHT) nextDirection = Direction.LEFT;
        else if (head.y < nearestFood.y && ai.direction !== Direction.UP) nextDirection = Direction.DOWN;
        else if (head.y > nearestFood.y && ai.direction !== Direction.DOWN) nextDirection = Direction.UP;

        const newHead = { ...head };
        switch (nextDirection) {
          case Direction.UP: newHead.y -= 1; break;
          case Direction.DOWN: newHead.y += 1; break;
          case Direction.LEFT: newHead.x -= 1; break;
          case Direction.RIGHT: newHead.x += 1; break;
        }

        // Basic wall and self collision avoidance
        const gridW = CANVAS_WIDTH / GRID_SIZE;
        const gridH = CANVAS_HEIGHT / GRID_SIZE;
        if (newHead.x < 0 || newHead.x >= gridW || newHead.y < 0 || newHead.y >= gridH ||
          ai.segments.some(s => s.x === newHead.x && s.y === newHead.y)) {
          return ai;
        }

        const newSegments = [newHead, ...ai.segments];
        if (newHead.x === food.x && newHead.y === food.y) {
          setFood(generateFood([snake, ...prevAiSnakes.map(s => s.segments)]));
        } else if (specialFood && newHead.x === specialFood.x && newHead.y === specialFood.y) {
          setSpecialFood(null);
        } else {
          newSegments.pop();
        }

        return { ...ai, segments: newSegments, direction: nextDirection };
      });
    });
  }, [food, specialFood, isGameOver, isPaused, snake, generateFood]);

  const moveSpecialFood = useCallback(() => {
    if (isGameOver || isPaused) return;

    if (!specialFood) {
      specialFoodSpawnCounter.current++;
      if (specialFoodSpawnCounter.current > 50) { // Every ~50 ticks
        setSpecialFood(generateFood([snake, ...aiSnakes.map(s => s.segments)]));
        specialFoodSpawnCounter.current = 0;
      }
      return;
    }

    specialFoodMoveCounter.current++;
    if (specialFoodMoveCounter.current > 2) { // Moves every 2 ticks
      setSpecialFood((prev) => {
        if (!prev) return null;
        const dirs = [Direction.UP, Direction.DOWN, Direction.LEFT, Direction.RIGHT];
        const randomDir = dirs[Math.floor(Math.random() * dirs.length)];
        const newPos = { ...prev };
        switch (randomDir) {
          case Direction.UP: newPos.y = Math.max(FOOD_PADDING, newPos.y - 1); break;
          case Direction.DOWN: newPos.y = Math.min(CANVAS_HEIGHT / GRID_SIZE - FOOD_PADDING - 1, newPos.y + 1); break;
          case Direction.LEFT: newPos.x = Math.max(FOOD_PADDING, newPos.x - 1); break;
          case Direction.RIGHT: newPos.x = Math.min(CANVAS_WIDTH / GRID_SIZE - FOOD_PADDING - 1, newPos.x + 1); break;
        }
        specialFoodMoveCounter.current = 0;
        return newPos;
      });
    }
  }, [specialFood, isGameOver, isPaused, snake, aiSnakes, generateFood]);

  const moveSnake = useCallback(() => {
    if (isGameOver || isPaused) return;

    moveAiSnakes();
    moveSpecialFood();

    setSnake((prevSnake) => {
      const head = prevSnake[0];
      const newHead = { ...head };

      switch (direction) {
        case Direction.UP: newHead.y -= 1; break;
        case Direction.DOWN: newHead.y += 1; break;
        case Direction.LEFT: newHead.x -= 1; break;
        case Direction.RIGHT: newHead.x += 1; break;
      }

      // Collision detection - Walls
      if (newHead.x < 0 || newHead.x >= CANVAS_WIDTH / GRID_SIZE || newHead.y < 0 || newHead.y >= CANVAS_HEIGHT / GRID_SIZE) {
        setIsGameOver(true);
        onGameOver(score);
        setHighScore(score);
        playGameOverSound(isMusicEnabled);
        return prevSnake;
      }

      // Collision detection - Self
      if (prevSnake.some((segment) => segment.x === newHead.x && segment.y === newHead.y)) {
        setIsGameOver(true);
        onGameOver(score);
        setHighScore(score);
        playGameOverSound(isMusicEnabled);
        return prevSnake;
      }

      // Collision detection - Other Snakes (Big eats small)
      let ateOther = false;
      setAiSnakes(prevAi => {
        const nextAi = [...prevAi];
        for (let i = 0; i < nextAi.length; i++) {
          const ai = nextAi[i];
          const isCollision = ai.segments.some(s => s.x === newHead.x && s.y === newHead.y);
          if (isCollision) {
            // Player is bigger or same length
            if (prevSnake.length >= ai.segments.length) {
              // Player eats AI teammate or opponent
              const bonus = ai.segments.length * 5;
              setScore(s => s + bonus);
              onScoreUpdate(score + bonus);
              createFireworks(newHead.x * GRID_SIZE, newHead.y * GRID_SIZE);
              nextAi.splice(i, 1); // Remove eaten snake
              ateOther = true;
              break;
            } else {
              // AI is bigger, Player dies
              setIsGameOver(true);
              onGameOver(score);
              setHighScore(score);
              playGameOverSound(isMusicEnabled);
            }
          }
        }
        return nextAi;
      });

      if (isGameOver) return prevSnake;

      const newSnake = [newHead, ...prevSnake];

      // Collision detection - Food
      if (newHead.x === food.x && newHead.y === food.y) {
        const newScore = score + 50; // 加五倍: 10 * 5 = 50
        setScore(newScore);
        onScoreUpdate(newScore);
        setFood(generateFood([newSnake, ...aiSnakes.map(s => s.segments)]));
        playEatSound(isMusicEnabled);
        createFireworks(food.x * GRID_SIZE + GRID_SIZE / 2, food.y * GRID_SIZE + GRID_SIZE / 2);
        setSpeed((prev) => Math.max(prev - 2, 50));
        setPendingGrowth(prev => prev + 4); // 加五倍: 1 (current) + 4 (pending) = 5
      } else if (specialFood && newHead.x === specialFood.x && newHead.y === specialFood.y) {
        const newScore = score + 250; // 加五倍: 50 * 5 = 250
        setScore(newScore);
        onScoreUpdate(newScore);
        setSpecialFood(null);
        playEatSound(isMusicEnabled);
        createFireworks(specialFood.x * GRID_SIZE + GRID_SIZE / 2, specialFood.y * GRID_SIZE + GRID_SIZE / 2);
        setPendingGrowth(prev => prev + 9); // 加五倍: 1 (current) + 9 (pending) = 10 (since special food is 2x normal)
      } else if (!ateOther) {
        if (pendingGrowth > 0) {
          setPendingGrowth(prev => prev - 1);
        } else {
          newSnake.pop();
        }
      }

      return newSnake;
    });
  }, [direction, food, specialFood, isGameOver, isPaused, score, generateFood, onGameOver, onScoreUpdate, setHighScore, aiSnakes, isMusicEnabled, moveAiSnakes, moveSpecialFood, createFireworks, pendingGrowth]);

  const draw = useCallback((ctx: CanvasRenderingContext2D) => {
    // Clear canvas
    const gradient = ctx.createRadialGradient(CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2, 50, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2, CANVAS_WIDTH);
    gradient.addColorStop(0, '#2a0a0a');
    gradient.addColorStop(1, '#1a1a1a');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Decorations
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
    ctx.strokeStyle = 'rgba(255, 215, 0, 0.3)';
    ctx.lineWidth = 10;
    ctx.strokeRect(10, 10, CANVAS_WIDTH - 20, CANVAS_HEIGHT - 20);
    ctx.restore();

    // Grid
    ctx.strokeStyle = 'rgba(255, 215, 0, 0.1)';
    ctx.lineWidth = 0.5;
    for (let i = 0; i < CANVAS_WIDTH; i += GRID_SIZE) { ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, CANVAS_HEIGHT); ctx.stroke(); }
    for (let i = 0; i < CANVAS_HEIGHT; i += GRID_SIZE) { ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(CANVAS_WIDTH, i); ctx.stroke(); }

    // Food
    ctx.font = `${GRID_SIZE}px serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('🧧', food.x * GRID_SIZE + GRID_SIZE / 2, food.y * GRID_SIZE + GRID_SIZE / 2);

    if (specialFood) {
      ctx.save();
      ctx.shadowBlur = 15; ctx.shadowColor = '#FFD700';
      ctx.font = `${GRID_SIZE * 1.5}px serif`;
      ctx.fillText('🧧', specialFood.x * GRID_SIZE + GRID_SIZE / 2, specialFood.y * GRID_SIZE + GRID_SIZE / 2);
      ctx.restore();
    }

    // AI Snakes
    aiSnakes.forEach((ai) => {
      ai.segments.forEach((segment, index) => {
        ctx.fillStyle = index === 0 ? ai.color : ai.color + 'CC';
        ctx.beginPath();
        if (index === 0) {
          ctx.arc(segment.x * GRID_SIZE + GRID_SIZE / 2, segment.y * GRID_SIZE + GRID_SIZE / 2, GRID_SIZE / 2, 0, Math.PI * 2);
        } else {
          ctx.roundRect(segment.x * GRID_SIZE + 2, segment.y * GRID_SIZE + 2, GRID_SIZE - 4, GRID_SIZE - 4, 5);
        }
        ctx.fill();
      });
    });

    // Player Snake
    snake.forEach((segment, index) => {
      if (index === 0) {
        const centerX = segment.x * GRID_SIZE + GRID_SIZE / 2;
        const centerY = segment.y * GRID_SIZE + GRID_SIZE / 2;
        const radius = GRID_SIZE / 2;
        let horseColor = '#8B4513';
        if (playerName === '萌萌') horseColor = '#FFB6C1';
        if (playerName === '贝贝') horseColor = '#87CEEB';
        if (playerName === '子鱼') horseColor = '#FF6347';
        ctx.save();
        ctx.translate(centerX, centerY);
        let rotation = 0;
        if (direction === Direction.LEFT) rotation = Math.PI;
        else if (direction === Direction.UP) rotation = -Math.PI / 2;
        else if (direction === Direction.DOWN) rotation = Math.PI / 2;
        ctx.rotate(rotation);
        ctx.fillStyle = horseColor;
        ctx.beginPath(); ctx.ellipse(0, 0, radius + 2, radius - 2, 0, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.ellipse(radius - 2, 0, radius, radius - 4, 0, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.moveTo(-radius + 4, -radius + 2); ctx.lineTo(-radius, -radius - 6); ctx.lineTo(-radius + 8, -radius + 2); ctx.fill();
        ctx.beginPath(); ctx.moveTo(-radius + 12, -radius + 2); ctx.lineTo(-radius + 8, -radius - 6); ctx.lineTo(-radius + 16, -radius + 2); ctx.fill();
        ctx.fillStyle = 'white'; ctx.beginPath(); ctx.arc(0, -4, 3, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = 'black'; ctx.beginPath(); ctx.arc(1, -4, 1.5, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#1a1a1a'; ctx.beginPath(); ctx.moveTo(radius + 4, 0); ctx.arc(radius + 4, 0, radius - 2, -0.2 * Math.PI, 0.2 * Math.PI); ctx.lineTo(radius + 4, 0); ctx.fill();
        ctx.restore();
      } else {
        ctx.font = `${GRID_SIZE}px serif`;
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText('🍬', segment.x * GRID_SIZE + GRID_SIZE / 2, segment.y * GRID_SIZE + GRID_SIZE / 2);
      }
    });

    // Particles
    particlesRef.current.forEach((p, i) => {
      ctx.globalAlpha = p.alpha; ctx.fillStyle = p.color;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2); ctx.fill();
      p.x += p.vx; p.y += p.vy; p.alpha -= p.decay;
      if (p.alpha <= 0) particlesRef.current.splice(i, 1);
    });
    ctx.globalAlpha = 1;

    if (isPaused) {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.5)'; ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
      ctx.fillStyle = '#FFD700'; ctx.font = '48px cursive'; ctx.textAlign = 'center';
      ctx.fillText('游戏暂停', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2);
    }

    if (isGameOver) {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.7)'; ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
      ctx.fillStyle = '#FFD700'; ctx.font = '48px cursive'; ctx.textAlign = 'center';
      ctx.fillText('游戏结束', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 40);
      ctx.font = '24px cursive'; ctx.fillText(`最终得分: ${score}`, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 20);
      ctx.fillText(`新年快乐, ${playerName}!`, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 60);
    }
  }, [snake, aiSnakes, food, specialFood, isPaused, isGameOver, score, playerName, direction]);

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
