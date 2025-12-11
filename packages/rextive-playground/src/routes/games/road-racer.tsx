import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { signal } from "rextive";
import { patch } from "rextive/helpers";
import { rx, useScope } from "rextive/react";
import { energyLogic, selectedProfileLogic, modalLogic } from "@/logic";
import { gameProgressRepository } from "@/infrastructure/repositories";
import { useEffect, useRef, useCallback, useState } from "react";
import { Icon } from "@/components/Icons";
import {
  GameMenu,
  type Difficulty,
  type DifficultyOption,
} from "@/components/GameMenu";
import {
  playCoinSound,
  playCollisionSound,
  backgroundMusic,
  playClickSound,
} from "@/hooks/useSound";

export const Route = createFileRoute("/games/road-racer")({
  component: RoadRacer,
});

// =============================================================================
// Game Constants
// =============================================================================

const GAME_WIDTH = 300;
const GAME_HEIGHT_MIN = 400; // Minimum height
const GAME_HEIGHT_DEFAULT = 500; // Default/fallback height
const CAR_WIDTH = 40;
const CAR_HEIGHT = 60;
const OBSTACLE_WIDTH = 40;
const OBSTACLE_HEIGHT = 50;
const LANE_COUNT = 3;
const LANE_WIDTH = GAME_WIDTH / LANE_COUNT;
const COIN_SIZE = 24;

// Difficulty settings configuration
interface DifficultySettings {
  name: string;
  description: string;
  baseSpeed: number;
  maxSpeed: number;
  obstacleSpawnRate: number;
  coinSpawnRate: number;
  lives: number;
  scoreMultiplier: number;
  color: string;
  // Progressive difficulty: how much to increase per 10 seconds
  speedIncreasePerPhase: number; // Speed increase every 10 seconds
  coinRateIncreasePerPhase: number; // Coin spawn rate increase every 10 seconds
}

const DIFFICULTY_CONFIG: Record<Difficulty, DifficultySettings> = {
  easy: {
    name: "Easy",
    description: "Slower traffic, more lives",
    baseSpeed: 3,
    maxSpeed: 7,
    obstacleSpawnRate: 0.004,
    coinSpawnRate: 0.006,
    lives: 5,
    scoreMultiplier: 1,
    color: "from-emerald-400 to-emerald-600",
    speedIncreasePerPhase: 0.5, // +0.5 speed every 10s
    coinRateIncreasePerPhase: 0.003, // +0.3% coin rate every 10s
  },
  medium: {
    name: "Medium",
    description: "Balanced challenge",
    baseSpeed: 4,
    maxSpeed: 10,
    obstacleSpawnRate: 0.006,
    coinSpawnRate: 0.005,
    lives: 3,
    scoreMultiplier: 1.5,
    color: "from-amber-400 to-orange-500",
    speedIncreasePerPhase: 0.8, // +0.8 speed every 10s
    coinRateIncreasePerPhase: 0.004, // +0.4% coin rate every 10s
  },
  hard: {
    name: "Hard",
    description: "Fast traffic, fewer lives",
    baseSpeed: 5,
    maxSpeed: 14,
    obstacleSpawnRate: 0.008,
    coinSpawnRate: 0.004,
    lives: 2,
    scoreMultiplier: 2,
    color: "from-red-500 to-rose-600",
    speedIncreasePerPhase: 1.2, // +1.2 speed every 10s
    coinRateIncreasePerPhase: 0.005, // +0.5% coin rate every 10s
  },
};

// Difficulty options for the GameMenu component
const ROAD_RACER_DIFFICULTY_OPTIONS: DifficultyOption[] = [
  {
    value: "easy",
    label: "Easy",
    description: "5 lives, slower traffic",
    color: "from-emerald-400 to-green-500",
  },
  {
    value: "medium",
    label: "Medium",
    description: "3 lives, 1.5× score",
    color: "from-amber-400 to-orange-500",
  },
  {
    value: "hard",
    label: "Hard",
    description: "2 lives, 2× score",
    color: "from-red-400 to-rose-500",
  },
];

// Obstacle car colors (CSS classes)
const OBSTACLE_COLORS = [
  { body: "#ef4444", accent: "#dc2626" }, // Red
  { body: "#3b82f6", accent: "#2563eb" }, // Blue
  { body: "#22c55e", accent: "#16a34a" }, // Green
  { body: "#f59e0b", accent: "#d97706" }, // Amber
  { body: "#8b5cf6", accent: "#7c3aed" }, // Purple
  { body: "#ec4899", accent: "#db2777" }, // Pink
  { body: "#06b6d4", accent: "#0891b2" }, // Cyan
  { body: "#f97316", accent: "#ea580c" }, // Orange
];

// =============================================================================
// Game Logic
// =============================================================================

interface Obstacle {
  id: number;
  lane: number;
  y: number;
  colorIndex: number;
  type: "car" | "truck";
}

interface Coin {
  id: number;
  lane: number;
  y: number;
}

interface GameState {
  status: "menu" | "playing" | "paused" | "gameOver";
  difficulty: Difficulty;
  playerLane: number;
  obstacles: Obstacle[];
  coins: Coin[];
  score: number;
  distance: number;
  speed: number;
  lives: number;
  maxLives: number;
  highScore: number;
  lastCollisionTime: number;
  timeLeft: number; // 60 second time limit
  gameHeight: number; // Dynamic game area height
}

// Time limit for all games: 60 seconds
const TIME_LIMIT = 60;

function roadRacerLogic() {
  const $energy = energyLogic();
  const $profile = selectedProfileLogic();

  const state = signal<GameState>(
    {
      status: "menu",
      difficulty: "medium",
      playerLane: 1,
      obstacles: [],
      coins: [],
      score: 0,
      distance: 0,
      speed: 5,
      lives: 3,
      maxLives: 3,
      highScore: 0,
      lastCollisionTime: 0,
      timeLeft: TIME_LIMIT,
      gameHeight: GAME_HEIGHT_DEFAULT,
    },
    { name: "roadRacer.state" }
  );

  let nextObstacleId = 0;
  let nextCoinId = 0;
  let gameLoopId: number | null = null;
  let timerId: ReturnType<typeof setInterval> | null = null;
  let lastFrameTime = 0;

  // Road Racer costs 2 energy per game
  const ENERGY_COST = 2;

  function canPlay(): boolean {
    return $energy.energy() >= ENERGY_COST;
  }

  function setDifficulty(difficulty: Difficulty) {
    state.set(patch("difficulty", difficulty));
  }

  function setGameHeight(height: number) {
    state.set(patch("gameHeight", height));
  }

  async function startGame(): Promise<boolean> {
    try {
      console.log("Road Racer: Starting game...");
      console.log("Energy:", $energy.energy(), "Cost:", ENERGY_COST);

      const hasEnergy = await $energy.spend(ENERGY_COST);
      console.log("Energy spent result:", hasEnergy);

      if (!hasEnergy) {
        console.warn("Road Racer: No energy to start game");
        return false;
      }

      const difficulty = state().difficulty;
      const config = DIFFICULTY_CONFIG[difficulty];
      console.log("Starting with difficulty:", difficulty, config);

      state.set((s) => ({
        ...s,
        status: "playing",
        playerLane: 1,
        obstacles: [],
        coins: [],
        score: 100,
        distance: 0,
        speed: config.baseSpeed,
        lives: config.lives,
        maxLives: config.lives,
        lastCollisionTime: 0,
        timeLeft: TIME_LIMIT,
      }));

      nextObstacleId = 0;
      nextCoinId = 0;
      lastFrameTime = performance.now();

      // Start the 60-second timer
      if (timerId) clearInterval(timerId);
      timerId = setInterval(() => {
        const currentState = state();
        if (currentState.status !== "playing") {
          if (timerId) clearInterval(timerId);
          timerId = null;
          return;
        }

        if (currentState.timeLeft <= 1) {
          state.set(patch("timeLeft", 0));
          endGame();
        } else {
          state.set(patch("timeLeft", (t) => t - 1));
        }
      }, 1000);

      try {
        backgroundMusic.playRacingMusic();
      } catch (e) {
        console.warn("Could not play background music:", e);
      }

      console.log("Road Racer: Game started, calling gameLoop");
      gameLoop();
      return true;
    } catch (error) {
      console.error("Road Racer: Error starting game:", error);
      return false;
    }
  }

  function pauseGame() {
    state.set(patch("status", "paused"));
    backgroundMusic.stop();
    if (gameLoopId) {
      cancelAnimationFrame(gameLoopId);
      gameLoopId = null;
    }
    if (timerId) {
      clearInterval(timerId);
      timerId = null;
    }
  }

  function resumeGame() {
    state.set(patch("status", "playing"));
    lastFrameTime = performance.now();
    backgroundMusic.playRacingMusic();

    // Restart the timer
    if (timerId) clearInterval(timerId);
    timerId = setInterval(() => {
      const currentState = state();
      if (currentState.status !== "playing") {
        if (timerId) clearInterval(timerId);
        timerId = null;
        return;
      }

      if (currentState.timeLeft <= 1) {
        state.set(patch("timeLeft", 0));
        endGame();
      } else {
        state.set(patch("timeLeft", (t) => t - 1));
      }
    }, 1000);

    gameLoop();
  }

  async function endGame() {
    backgroundMusic.stop();
    if (gameLoopId) {
      cancelAnimationFrame(gameLoopId);
      gameLoopId = null;
    }
    if (timerId) {
      clearInterval(timerId);
      timerId = null;
    }

    const currentState = state();
    const config = DIFFICULTY_CONFIG[currentState.difficulty];
    const finalScore = Math.max(
      0,
      Math.floor(currentState.score * config.scoreMultiplier)
    );

    if (finalScore > currentState.highScore) {
      state.set(patch("highScore", finalScore));
    }

    const profile = $profile.profile();
    if (profile) {
      await gameProgressRepository.recordGameSession(
        profile.id,
        "road-racer",
        finalScore,
        1
      );
    }

    state.set(patch<GameState>({ status: "gameOver", score: finalScore }));
  }

  function moveLeft() {
    state.set(patch("playerLane", (lane) => Math.max(0, lane - 1)));
  }

  function moveRight() {
    state.set(
      patch("playerLane", (lane) => Math.min(LANE_COUNT - 1, lane + 1))
    );
  }

  function gameLoop() {
    const currentState = state();
    if (currentState.status !== "playing") return;

    const config = DIFFICULTY_CONFIG[currentState.difficulty];
    const now = performance.now();
    const deltaTime = (now - lastFrameTime) / 1000;
    lastFrameTime = now;

    state.set((s) => {
      let newObstacles = [...s.obstacles];
      let newCoins = [...s.coins];
      let newScore = s.score;
      let newLives = s.lives;
      let newDistance = s.distance + s.speed * deltaTime * 10;
      let lastCollision = s.lastCollisionTime;

      // Calculate time-based progressive difficulty
      // Phase increases every 10 seconds (0, 1, 2, 3, 4, 5 for 60s game)
      const timeElapsed = TIME_LIMIT - s.timeLeft;
      const phase = Math.floor(timeElapsed / 10);

      // Progressive speed: base + time-based increase, capped at maxSpeed
      const timeBasedSpeed =
        config.baseSpeed + phase * config.speedIncreasePerPhase;
      const newSpeed = Math.min(config.maxSpeed, timeBasedSpeed);

      // Progressive coin spawn rate: increases over time for more scoring opportunities
      const currentCoinRate =
        config.coinSpawnRate + phase * config.coinRateIncreasePerPhase;

      // Progressive obstacle spawn rate: slightly increases over time
      const currentObstacleRate = config.obstacleSpawnRate + phase * 0.001;

      // Move obstacles
      newObstacles = newObstacles
        .map((obs) => ({ ...obs, y: obs.y + s.speed * deltaTime * 60 }))
        .filter((obs) => obs.y < s.gameHeight + 100);

      // Move coins
      newCoins = newCoins
        .map((coin) => ({ ...coin, y: coin.y + s.speed * deltaTime * 60 }))
        .filter((coin) => coin.y < s.gameHeight + 100);

      // Spawn obstacles (with minimum gap of 150px between any obstacles)
      if (Math.random() < currentObstacleRate) {
        const lane = Math.floor(Math.random() * LANE_COUNT);
        const hasNearbyObstacle = newObstacles.some(
          (obs) => obs.y < 150 // Ensure minimum gap
        );
        if (!hasNearbyObstacle) {
          newObstacles.push({
            id: nextObstacleId++,
            lane,
            y: -OBSTACLE_HEIGHT,
            colorIndex: Math.floor(Math.random() * OBSTACLE_COLORS.length),
            type: Math.random() > 0.8 ? "truck" : "car",
          });
        }
      }

      // Spawn coins (don't spawn if there's already a coin nearby)
      // Increased spawn rate over time gives more scoring opportunities
      if (Math.random() < currentCoinRate) {
        const lane = Math.floor(Math.random() * LANE_COUNT);
        const hasNearbyObstacle = newObstacles.some(
          (obs) => obs.lane === lane && obs.y < 100
        );
        // Reduce nearby coin check distance in later phases to allow more coins
        const coinGapDistance = Math.max(100, 200 - phase * 20);
        const hasNearbyCoin = newCoins.some((c) => c.y < coinGapDistance);
        if (!hasNearbyObstacle && !hasNearbyCoin) {
          newCoins.push({
            id: nextCoinId++,
            lane,
            y: -COIN_SIZE,
          });
        }
      }

      // Collision detection
      const playerX = s.playerLane * LANE_WIDTH + (LANE_WIDTH - CAR_WIDTH) / 2;
      const playerY = s.gameHeight - CAR_HEIGHT - 20;

      for (const obs of newObstacles) {
        const obsX = obs.lane * LANE_WIDTH + (LANE_WIDTH - OBSTACLE_WIDTH) / 2;

        if (
          playerX < obsX + OBSTACLE_WIDTH &&
          playerX + CAR_WIDTH > obsX &&
          playerY < obs.y + OBSTACLE_HEIGHT &&
          playerY + CAR_HEIGHT > obs.y
        ) {
          if (now - lastCollision > 1000) {
            newScore = Math.max(0, newScore - 20);
            newLives--;
            lastCollision = now;
            newObstacles = newObstacles.filter((o) => o.id !== obs.id);
            playCollisionSound();
          }
        }
      }

      // Coin collection
      for (const coin of newCoins) {
        const coinX = coin.lane * LANE_WIDTH + (LANE_WIDTH - COIN_SIZE) / 2;

        if (
          playerX < coinX + COIN_SIZE &&
          playerX + CAR_WIDTH > coinX &&
          playerY < coin.y + COIN_SIZE &&
          playerY + CAR_HEIGHT > coin.y
        ) {
          newScore += 10;
          newCoins = newCoins.filter((c) => c.id !== coin.id);
          playCoinSound();
        }
      }

      newScore += Math.floor(deltaTime * 2);

      return {
        ...s,
        obstacles: newObstacles,
        coins: newCoins,
        score: newScore,
        distance: newDistance,
        speed: newSpeed,
        lives: newLives,
        lastCollisionTime: lastCollision,
      };
    });

    if (state().lives <= 0) {
      endGame();
      return;
    }

    gameLoopId = requestAnimationFrame(gameLoop);
  }

  function cleanup() {
    backgroundMusic.stop();
    if (gameLoopId) {
      cancelAnimationFrame(gameLoopId);
      gameLoopId = null;
    }
    if (timerId) {
      clearInterval(timerId);
      timerId = null;
    }
  }

  function backToMenu() {
    cleanup();
    state.set(patch("status", "menu"));
  }

  return {
    state,
    canPlay,
    energy: $energy.energy,
    profile: $profile.profile,
    setDifficulty,
    setGameHeight,
    startGame,
    pauseGame,
    resumeGame,
    endGame,
    moveLeft,
    moveRight,
    cleanup,
    backToMenu,
  };
}

// =============================================================================
// SVG Components
// =============================================================================

function PlayerCar({ isHit }: { isHit: boolean }) {
  return (
    <svg viewBox="0 0 40 60" className="w-full h-full drop-shadow-lg">
      {/* Car body */}
      <rect
        x="4"
        y="10"
        width="32"
        height="45"
        rx="8"
        fill="#10b981"
        className={isHit ? "animate-pulse" : ""}
      />
      {/* Car roof */}
      <rect x="8" y="20" width="24" height="20" rx="4" fill="#059669" />
      {/* Windshield */}
      <rect x="10" y="22" width="20" height="8" rx="2" fill="#67e8f9" />
      {/* Rear window */}
      <rect x="10" y="32" width="20" height="6" rx="2" fill="#67e8f9" />
      {/* Headlights */}
      <circle cx="10" cy="14" r="3" fill="#fef08a" />
      <circle cx="30" cy="14" r="3" fill="#fef08a" />
      {/* Wheels */}
      <rect x="2" y="15" width="6" height="12" rx="2" fill="#1f2937" />
      <rect x="32" y="15" width="6" height="12" rx="2" fill="#1f2937" />
      <rect x="2" y="38" width="6" height="12" rx="2" fill="#1f2937" />
      <rect x="32" y="38" width="6" height="12" rx="2" fill="#1f2937" />
      {/* Racing stripes */}
      <rect x="18" y="10" width="4" height="45" fill="#ecfdf5" opacity="0.6" />
    </svg>
  );
}

function ObstacleCar({
  color,
  type,
}: {
  color: { body: string; accent: string };
  type: "car" | "truck";
}) {
  // Cars face same direction as player (headlights at top - driving away)
  if (type === "truck") {
    return (
      <svg viewBox="0 0 40 60" className="w-full h-full drop-shadow-md">
        {/* Truck body */}
        <rect x="4" y="5" width="32" height="50" rx="4" fill={color.body} />
        {/* Truck cabin at TOP (facing forward) */}
        <rect x="6" y="6" width="28" height="14" rx="3" fill={color.accent} />
        {/* Windshield */}
        <rect x="8" y="8" width="24" height="8" rx="1" fill="#67e8f9" />
        {/* Headlights at top */}
        <circle cx="10" cy="6" r="2" fill="#fef08a" />
        <circle cx="30" cy="6" r="2" fill="#fef08a" />
        {/* Cargo area */}
        <rect x="6" y="22" width="28" height="30" rx="2" fill={color.accent} />
        {/* Taillights at bottom */}
        <rect x="8" y="52" width="6" height="3" rx="1" fill="#fca5a5" />
        <rect x="26" y="52" width="6" height="3" rx="1" fill="#fca5a5" />
        {/* Wheels */}
        <rect x="2" y="12" width="6" height="10" rx="2" fill="#1f2937" />
        <rect x="32" y="12" width="6" height="10" rx="2" fill="#1f2937" />
        <rect x="2" y="42" width="6" height="10" rx="2" fill="#1f2937" />
        <rect x="32" y="42" width="6" height="10" rx="2" fill="#1f2937" />
      </svg>
    );
  }

  // Regular car - facing forward (headlights at top)
  return (
    <svg viewBox="0 0 40 60" className="w-full h-full drop-shadow-md">
      {/* Car body */}
      <rect x="4" y="5" width="32" height="50" rx="8" fill={color.body} />
      {/* Car roof */}
      <rect x="8" y="18" width="24" height="22" rx="4" fill={color.accent} />
      {/* Windshield at top (facing forward) */}
      <rect x="10" y="20" width="20" height="10" rx="2" fill="#67e8f9" />
      {/* Rear window */}
      <rect x="10" y="32" width="20" height="6" rx="2" fill="#67e8f9" />
      {/* Headlights at top */}
      <circle cx="10" cy="9" r="3" fill="#fef08a" />
      <circle cx="30" cy="9" r="3" fill="#fef08a" />
      {/* Taillights at bottom */}
      <rect x="6" y="50" width="6" height="4" rx="1" fill="#fca5a5" />
      <rect x="28" y="50" width="6" height="4" rx="1" fill="#fca5a5" />
      {/* Wheels */}
      <rect x="2" y="12" width="6" height="12" rx="2" fill="#1f2937" />
      <rect x="32" y="12" width="6" height="12" rx="2" fill="#1f2937" />
      <rect x="2" y="40" width="6" height="12" rx="2" fill="#1f2937" />
      <rect x="32" y="40" width="6" height="12" rx="2" fill="#1f2937" />
    </svg>
  );
}

function CoinIcon({ size = 24 }: { size?: number }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      className="animate-spin-slow drop-shadow-lg"
    >
      <circle cx="12" cy="12" r="11" fill="#fbbf24" />
      <circle cx="12" cy="12" r="8" fill="#f59e0b" />
      <text
        x="12"
        y="16"
        textAnchor="middle"
        fontSize="10"
        fontWeight="bold"
        fill="#fef3c7"
      >
        $
      </text>
    </svg>
  );
}

function HeartIcon({ filled }: { filled: boolean }) {
  return (
    <svg viewBox="0 0 24 24" className="w-6 h-6">
      {/* White outline for better visibility on colored backgrounds */}
      <path
        d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"
        fill={filled ? "#fecaca" : "#374151"}
        stroke={filled ? "#ffffff" : "none"}
        strokeWidth={filled ? 1.5 : 0}
        className={filled ? "drop-shadow-lg" : "opacity-40"}
      />
    </svg>
  );
}

function StarIcon({ filled }: { filled: boolean }) {
  return (
    <svg viewBox="0 0 24 24" className="w-8 h-8">
      <path
        d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
        fill={filled ? "#fbbf24" : "#374151"}
        className={filled ? "drop-shadow-lg" : "opacity-30"}
      />
    </svg>
  );
}

function PauseIcon() {
  return (
    <svg viewBox="0 0 48 48" className="w-12 h-12">
      <circle cx="24" cy="24" r="22" fill="#374151" />
      <rect x="14" y="14" width="6" height="20" rx="2" fill="#f3f4f6" />
      <rect x="28" y="14" width="6" height="20" rx="2" fill="#f3f4f6" />
    </svg>
  );
}

function PlayIcon() {
  return (
    <svg viewBox="0 0 48 48" className="w-6 h-6">
      <path d="M16 10v28l22-14z" fill="currentColor" />
    </svg>
  );
}

function FinishFlagIcon() {
  return (
    <svg viewBox="0 0 64 64" className="w-16 h-16">
      <rect x="8" y="8" width="4" height="48" fill="#78716c" />
      <g>
        <rect x="12" y="8" width="40" height="28" fill="#fff" />
        {/* Checkered pattern */}
        {[0, 1, 2, 3, 4].map((row) =>
          [0, 1, 2, 3, 4].map((col) => (
            <rect
              key={`${row}-${col}`}
              x={12 + col * 8}
              y={8 + row * 5.6}
              width="8"
              height="5.6"
              fill={(row + col) % 2 === 0 ? "#1f2937" : "#fff"}
            />
          ))
        )}
      </g>
    </svg>
  );
}

function ArrowLeftIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-8 h-8" fill="currentColor">
      <path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z" />
    </svg>
  );
}

function ArrowRightIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-8 h-8" fill="currentColor">
      <path d="M8.59 16.59L10 18l6-6-6-6-1.41 1.41L13.17 12z" />
    </svg>
  );
}

// =============================================================================
// Helper Functions
// =============================================================================

function getStarRating(score: number): number {
  if (score >= 200) return 3;
  if (score >= 100) return 2;
  return 1;
}

// =============================================================================
// Main Component
// =============================================================================

function RoadRacer() {
  const $game = useScope(roadRacerLogic);
  const gameRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  // Dynamic game height based on available viewport space
  const [gameHeight, setGameHeightLocal] = useState(GAME_HEIGHT_DEFAULT);

  // Calculate available height for game area
  useEffect(() => {
    const calculateHeight = () => {
      // Get viewport height
      const viewportHeight = window.innerHeight;
      // Reserve space for header (~60px) + status bar (~80px) + mobile controls (~100px) + margins
      const headerAndStatusHeight = 160;
      const bottomReserve = window.innerWidth < 640 ? 120 : 40; // More space for mobile controls
      const availableHeight =
        viewportHeight - headerAndStatusHeight - bottomReserve;

      // Clamp between min and a reasonable max
      const newHeight = Math.max(
        GAME_HEIGHT_MIN,
        Math.min(availableHeight, 700)
      );
      setGameHeightLocal(newHeight);
      // Also update game logic state for collision detection
      $game.setGameHeight(newHeight);
    };

    calculateHeight();
    window.addEventListener("resize", calculateHeight);
    return () => window.removeEventListener("resize", calculateHeight);
  }, [$game]);

  // Handle back button with confirmation during gameplay
  const handleBack = async () => {
    const status = $game.state().status;
    if (status === "playing" || status === "paused") {
      const $modal = modalLogic();
      const confirmed = await $modal.confirm(
        "Are you sure you want to quit? Your progress will be lost!",
        "Leave Game?"
      );
      if (!confirmed) return;
      $game.cleanup();
    }
    navigate({ to: "/dashboard", viewTransition: true });
  };

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const status = $game.state().status;
      if (status !== "playing") return;

      if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A") {
        e.preventDefault();
        $game.moveLeft();
      } else if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") {
        e.preventDefault();
        $game.moveRight();
      } else if (e.key === "Escape" || e.key === "p" || e.key === "P") {
        e.preventDefault();
        $game.pauseGame();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [$game]);

  useEffect(() => {
    return () => $game.cleanup();
  }, [$game]);

  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      if ($game.state().status !== "playing") return;

      const touch = e.touches[0];
      const rect = gameRef.current?.getBoundingClientRect();
      if (!rect) return;

      const touchX = touch.clientX - rect.left;
      const midPoint = rect.width / 2;

      if (touchX < midPoint) {
        $game.moveLeft();
      } else {
        $game.moveRight();
      }
    },
    [$game]
  );

  return rx(() => {
    const gameState = $game.state();
    const energy = $game.energy();
    const isHit = Date.now() - gameState.lastCollisionTime < 1000;

    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-800 via-slate-900 to-slate-950 p-4 pb-2 safe-bottom flex flex-col">
        <div className="mx-auto max-w-lg w-full flex flex-col flex-1">
          {/* Header */}
          <header className="mb-4 flex items-center justify-between">
            <button
              onClick={handleBack}
              className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors"
            >
              <Icon name="back" size={20} />
              <span className="text-sm font-medium hidden sm:inline">Back</span>
            </button>
            <h1 className="font-display text-2xl font-bold text-white flex items-center gap-2">
              <span className="w-8 h-8">
                <svg viewBox="0 0 32 32" className="w-full h-full">
                  <rect
                    x="4"
                    y="8"
                    width="24"
                    height="16"
                    rx="4"
                    fill="#ef4444"
                  />
                  <rect
                    x="8"
                    y="10"
                    width="8"
                    height="6"
                    rx="1"
                    fill="#67e8f9"
                  />
                  <circle cx="8" cy="24" r="3" fill="#1f2937" />
                  <circle cx="24" cy="24" r="3" fill="#1f2937" />
                </svg>
              </span>
              Road Racer
            </h1>
            <div className="flex items-center gap-1 text-amber-400 font-bold">
              <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor">
                <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
              </svg>
              {energy}
            </div>
          </header>

          {/* Game Status Bar */}
          {gameState.status === "playing" &&
            (() => {
              // Calculate current phase for display
              const timeElapsed = TIME_LIMIT - gameState.timeLeft;
              const phase = Math.floor(timeElapsed / 10);
              const speedPercent = Math.min(
                100,
                Math.floor(
                  (gameState.speed /
                    DIFFICULTY_CONFIG[gameState.difficulty].maxSpeed) *
                    100
                )
              );

              return (
                <div className="mb-3 card bg-slate-800/90 backdrop-blur border border-slate-700 py-2 px-3">
                  <div className="flex items-stretch gap-3">
                    {/* Left: Stats (2 rows) */}
                    <div className="flex-1 flex flex-col justify-between gap-1.5">
                      {/* Row 1: Score, Lives */}
                      <div className="flex items-center justify-between">
                        {/* Score */}
                        <span className="font-bold text-amber-400 flex items-center gap-1">
                          <svg
                            viewBox="0 0 24 24"
                            className="w-5 h-5"
                            fill="currentColor"
                          >
                            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                          </svg>
                          <span className="text-xl tabular-nums">
                            {gameState.score}
                          </span>
                        </span>
                        {/* Lives */}
                        <div className="flex gap-0.5">
                          {Array.from({ length: gameState.maxLives }).map(
                            (_, i) => (
                              <HeartIcon key={i} filled={i < gameState.lives} />
                            )
                          )}
                        </div>
                      </div>
                      {/* Row 2: Timer, Speed */}
                      <div className="flex items-center justify-between text-sm">
                        {/* Timer */}
                        <span
                          className={`font-bold flex items-center gap-1.5 ${gameState.timeLeft <= 10 ? "text-red-400 animate-pulse" : "text-cyan-400"}`}
                        >
                          <svg
                            viewBox="0 0 24 24"
                            className="w-4 h-4"
                            fill="currentColor"
                          >
                            <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2zm4.2 14.2L11 13V7h1.5v5.2l4.5 2.7-.8 1.3z" />
                          </svg>
                          <span className="tabular-nums">
                            {gameState.timeLeft}s
                          </span>
                        </span>
                        {/* Speed indicator */}
                        <span
                          className={`font-bold flex items-center gap-1.5 ${phase >= 4 ? "text-red-400" : phase >= 2 ? "text-orange-400" : "text-emerald-400"}`}
                          title={`Speed: ${gameState.speed.toFixed(1)}`}
                        >
                          <svg
                            viewBox="0 0 24 24"
                            className="w-4 h-4"
                            fill="currentColor"
                          >
                            <path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm0 18a8 8 0 1 1 0-16 8 8 0 0 1 0 16zm-1-5h2v2h-2zm0-8h2v6h-2z" />
                          </svg>
                          <span className="tabular-nums">{speedPercent}%</span>
                        </span>
                      </div>
                    </div>

                    {/* Right: Pause button (spans both rows) */}
                    <button
                      onClick={() => $game.pauseGame()}
                      className="px-3 bg-slate-700 rounded-lg hover:bg-slate-600 transition-colors flex items-center justify-center"
                    >
                      <svg
                        viewBox="0 0 24 24"
                        className="w-6 h-6"
                        fill="currentColor"
                      >
                        <rect x="6" y="4" width="4" height="16" rx="1" />
                        <rect x="14" y="4" width="4" height="16" rx="1" />
                      </svg>
                    </button>
                  </div>
                </div>
              );
            })()}

          {/* Game Area - only show during gameplay, not on menu */}
          {gameState.status !== "menu" && (
            <div
              ref={gameRef}
              className="relative mx-auto overflow-hidden rounded-2xl shadow-2xl border-4 border-slate-600"
              style={{
                width: GAME_WIDTH,
                height: gameHeight,
                background: "linear-gradient(to bottom, #374151, #1f2937)",
              }}
              onTouchStart={handleTouchStart}
            >
              {/* Road markings */}
              <div className="absolute inset-0">
                {/* Grass/roadside on left */}
                <div
                  className="absolute left-0 top-0 bottom-0 w-3"
                  style={{
                    background:
                      "repeating-linear-gradient(to bottom, #22c55e 0px, #16a34a 30px, #22c55e 60px)",
                    animation:
                      gameState.status === "playing"
                        ? `roadsideMove ${(0.3 / gameState.speed) * 5}s linear infinite`
                        : "none",
                  }}
                />
                {/* Grass/roadside on right */}
                <div
                  className="absolute right-0 top-0 bottom-0 w-3"
                  style={{
                    background:
                      "repeating-linear-gradient(to bottom, #22c55e 0px, #16a34a 30px, #22c55e 60px)",
                    animation:
                      gameState.status === "playing"
                        ? `roadsideMove ${(0.3 / gameState.speed) * 5}s linear infinite`
                        : "none",
                  }}
                />
                {/* Road edge lines */}
                <div className="absolute left-3 top-0 bottom-0 w-1 bg-white opacity-80" />
                <div className="absolute right-3 top-0 bottom-0 w-1 bg-white opacity-80" />

                {/* Lane dividers - faster animation based on speed */}
                {[1, 2].map((i) => (
                  <div
                    key={i}
                    className="absolute top-0 bottom-0 w-1"
                    style={{
                      left: i * LANE_WIDTH - 2,
                      background:
                        "repeating-linear-gradient(to bottom, #fbbf24 0px, #fbbf24 30px, transparent 30px, transparent 60px)",
                      animation:
                        gameState.status === "playing"
                          ? `roadMove ${(0.2 / gameState.speed) * 5}s linear infinite`
                          : "none",
                    }}
                  />
                ))}
              </div>

              {/* Obstacles */}
              {gameState.obstacles.map((obs) => (
                <div
                  key={obs.id}
                  className="absolute transition-transform"
                  style={{
                    left:
                      obs.lane * LANE_WIDTH + (LANE_WIDTH - OBSTACLE_WIDTH) / 2,
                    top: obs.y,
                    width: OBSTACLE_WIDTH,
                    height: OBSTACLE_HEIGHT,
                  }}
                >
                  <ObstacleCar
                    color={OBSTACLE_COLORS[obs.colorIndex]}
                    type={obs.type}
                  />
                </div>
              ))}

              {/* Coins */}
              {gameState.coins.map((coin) => (
                <div
                  key={coin.id}
                  className="absolute"
                  style={{
                    left: coin.lane * LANE_WIDTH + (LANE_WIDTH - COIN_SIZE) / 2,
                    top: coin.y,
                    width: COIN_SIZE,
                    height: COIN_SIZE,
                  }}
                >
                  <CoinIcon size={COIN_SIZE} />
                </div>
              ))}

              {/* Player Car */}
              {gameState.status === "playing" && (
                <div
                  className="absolute transition-all duration-100"
                  style={{
                    left:
                      gameState.playerLane * LANE_WIDTH +
                      (LANE_WIDTH - CAR_WIDTH) / 2,
                    bottom: 20,
                    width: CAR_WIDTH,
                    height: CAR_HEIGHT,
                  }}
                >
                  <PlayerCar isHit={isHit} />
                </div>
              )}

              {/* Paused State */}
              {gameState.status === "paused" && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 text-white">
                  <PauseIcon />
                  <h2 className="font-display text-xl font-bold mb-4 mt-4">
                    Paused
                  </h2>
                  <div className="flex gap-3">
                    <button
                      onClick={() => $game.resumeGame()}
                      className="btn bg-emerald-500 text-white px-6 py-2 hover:bg-emerald-600"
                    >
                      <PlayIcon /> Resume
                    </button>
                    <button
                      onClick={() => $game.endGame()}
                      className="btn bg-red-500 text-white px-6 py-2 hover:bg-red-600"
                    >
                      End Game
                    </button>
                  </div>
                </div>
              )}

              {/* Game Over State */}
              {gameState.status === "gameOver" && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/85 text-white p-4">
                  <FinishFlagIcon />
                  <h2 className="font-display text-2xl font-bold mb-2 mt-2">
                    Game Over!
                  </h2>
                  <div className="text-center mb-4">
                    <p className="text-4xl font-bold text-amber-400">
                      {gameState.score}
                    </p>
                    <p className="text-sm opacity-70">points</p>
                    <div className="flex justify-center gap-1 mt-2">
                      {[1, 2, 3].map((star) => (
                        <StarIcon
                          key={star}
                          filled={star <= getStarRating(gameState.score)}
                        />
                      ))}
                    </div>
                  </div>
                  <p className="text-sm opacity-70 mb-4">
                    Distance: {Math.floor(gameState.distance)}m
                  </p>
                  <button
                    onClick={() => $game.backToMenu()}
                    className="btn bg-gradient-to-r from-emerald-500 to-teal-500 text-white px-8 py-3 font-bold hover:from-emerald-600 hover:to-teal-600"
                  >
                    Continue
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Touch Controls (visible on mobile) */}
          {gameState.status === "playing" && (
            <div className="mt-4 flex gap-4 justify-center sm:hidden">
              <button
                onTouchStart={() => $game.moveLeft()}
                className="w-20 h-20 rounded-full bg-slate-700/80 text-white flex items-center justify-center active:bg-slate-600 transition-colors border-2 border-slate-500"
              >
                <ArrowLeftIcon />
              </button>
              <button
                onTouchStart={() => $game.moveRight()}
                className="w-20 h-20 rounded-full bg-slate-700/80 text-white flex items-center justify-center active:bg-slate-600 transition-colors border-2 border-slate-500"
              >
                <ArrowRightIcon />
              </button>
            </div>
          )}

          {/* Game Menu - shown in menu state */}
          {gameState.status === "menu" && (
            <GameMenu
              title="Road Racer"
              description="Dodge traffic and collect coins! Use arrow keys or tap to move."
              icon="car"
              themeColor="from-emerald-500 to-teal-500"
              difficulty={gameState.difficulty}
              onDifficultyChange={$game.setDifficulty}
              difficultyOptions={ROAD_RACER_DIFFICULTY_OPTIONS}
              energy={energy}
              energyCost={2}
              onPlay={async () => {
                playClickSound();
                const started = await $game.startGame();
                if (!started) {
                  const $modal = modalLogic();
                  if ($game.energy() < 2) {
                    await $modal.warning(
                      "Not enough energy! Come back tomorrow to play again.",
                      "No Energy"
                    );
                  } else {
                    await $modal.error(
                      "Could not start game. Please try again."
                    );
                  }
                }
              }}
              howToPlay={[
                "Use arrow keys or tap sides to move",
                "Collect coins for +10 points",
                "Avoid cars! Collision = -20 points",
                "Lives depend on difficulty",
              ]}
            />
          )}
        </div>

        {/* CSS for animations */}
        <style>{`
          @keyframes roadMove {
            from { background-position: 0 0; }
            to { background-position: 0 60px; }
          }
          @keyframes roadsideMove {
            from { background-position: 0 0; }
            to { background-position: 0 60px; }
          }
          @keyframes spin-slow {
            from { transform: rotateY(0deg); }
            to { transform: rotateY(360deg); }
          }
          .animate-spin-slow {
            animation: spin-slow 2s linear infinite;
          }
        `}</style>
      </div>
    );
  });
}
