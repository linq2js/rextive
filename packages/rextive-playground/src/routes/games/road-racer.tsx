import { createFileRoute, Link } from "@tanstack/react-router";
import { signal } from "rextive";
import { rx, useScope } from "rextive/react";
import { energyLogic, selectedProfileLogic } from "@/logic";
import { gameProgressRepository } from "@/infrastructure/repositories";
import { useEffect, useRef, useCallback } from "react";

export const Route = createFileRoute("/games/road-racer")({
  component: RoadRacer,
});

// =============================================================================
// Game Constants
// =============================================================================

const GAME_WIDTH = 300;
const GAME_HEIGHT = 500;
const CAR_WIDTH = 40;
const CAR_HEIGHT = 60;
const OBSTACLE_WIDTH = 40;
const OBSTACLE_HEIGHT = 50;
const LANE_COUNT = 3;
const LANE_WIDTH = GAME_WIDTH / LANE_COUNT;

// Obstacle types with emojis
const OBSTACLE_TYPES = ["🚗", "🚕", "🚙", "🚌", "🚐", "🏍️", "🛵", "🚚"];

// Collectible coins
const COIN_EMOJI = "⭐";
const COIN_SIZE = 30;

// =============================================================================
// Game Logic
// =============================================================================

interface Obstacle {
  id: number;
  lane: number; // 0, 1, 2
  y: number;
  emoji: string;
}

interface Coin {
  id: number;
  lane: number;
  y: number;
}

interface GameState {
  status: "idle" | "playing" | "paused" | "gameOver";
  playerLane: number; // 0, 1, 2
  obstacles: Obstacle[];
  coins: Coin[];
  score: number;
  distance: number;
  speed: number;
  lives: number;
  highScore: number;
  lastCollisionTime: number;
}

function roadRacerLogic() {
  const $energy = energyLogic();
  const $profile = selectedProfileLogic();

  const state = signal<GameState>(
    {
      status: "idle",
      playerLane: 1, // Start in middle lane
      obstacles: [],
      coins: [],
      score: 0,
      distance: 0,
      speed: 5,
      lives: 3,
      highScore: 0,
      lastCollisionTime: 0,
    },
    { name: "roadRacer.state" }
  );

  let nextObstacleId = 0;
  let nextCoinId = 0;
  let gameLoopId: number | null = null;
  let lastFrameTime = 0;

  // Check if player can play
  function canPlay(): boolean {
    return $energy.energy() >= $energy.costPerGame;
  }

  async function startGame(): Promise<boolean> {
    // Check and spend energy
    const hasEnergy = await $energy.spend($energy.costPerGame);
    if (!hasEnergy) return false;

    state.set((s) => ({
      ...s,
      status: "playing",
      playerLane: 1,
      obstacles: [],
      coins: [],
      score: 100, // Start with 100 points
      distance: 0,
      speed: 5,
      lives: 3,
      lastCollisionTime: 0,
    }));

    nextObstacleId = 0;
    nextCoinId = 0;
    lastFrameTime = performance.now();
    gameLoop();
    return true;
  }

  function pauseGame() {
    state.set((s) => ({ ...s, status: "paused" }));
    if (gameLoopId) {
      cancelAnimationFrame(gameLoopId);
      gameLoopId = null;
    }
  }

  function resumeGame() {
    state.set((s) => ({ ...s, status: "playing" }));
    lastFrameTime = performance.now();
    gameLoop();
  }

  async function endGame() {
    if (gameLoopId) {
      cancelAnimationFrame(gameLoopId);
      gameLoopId = null;
    }

    const currentState = state();
    const finalScore = Math.max(0, currentState.score);

    // Update high score
    if (finalScore > currentState.highScore) {
      state.set((s) => ({ ...s, highScore: finalScore }));
    }

    // Save progress
    const profile = $profile.profile();
    if (profile) {
      await gameProgressRepository.upsert({
        kidId: profile.id,
        gameName: "road-racer",
        score: finalScore,
        level: 1,
        lastPlayed: new Date(),
      });
    }

    state.set((s) => ({ ...s, status: "gameOver", score: finalScore }));
  }

  function moveLeft() {
    state.set((s) => ({
      ...s,
      playerLane: Math.max(0, s.playerLane - 1),
    }));
  }

  function moveRight() {
    state.set((s) => ({
      ...s,
      playerLane: Math.min(LANE_COUNT - 1, s.playerLane + 1),
    }));
  }

  function gameLoop() {
    const currentState = state();
    if (currentState.status !== "playing") return;

    const now = performance.now();
    const deltaTime = (now - lastFrameTime) / 1000; // Convert to seconds
    lastFrameTime = now;

    // Update game state
    state.set((s) => {
      let newObstacles = [...s.obstacles];
      let newCoins = [...s.coins];
      let newScore = s.score;
      let newLives = s.lives;
      let newDistance = s.distance + s.speed * deltaTime * 10;
      let newSpeed = Math.min(15, 5 + Math.floor(newDistance / 500)); // Increase speed over distance
      let lastCollision = s.lastCollisionTime;

      // Move obstacles down
      newObstacles = newObstacles
        .map((obs) => ({ ...obs, y: obs.y + s.speed * deltaTime * 60 }))
        .filter((obs) => obs.y < GAME_HEIGHT + 100);

      // Move coins down
      newCoins = newCoins
        .map((coin) => ({ ...coin, y: coin.y + s.speed * deltaTime * 60 }))
        .filter((coin) => coin.y < GAME_HEIGHT + 100);

      // Spawn new obstacles
      if (Math.random() < 0.02 * s.speed) {
        const lane = Math.floor(Math.random() * LANE_COUNT);
        // Don't spawn if there's already an obstacle nearby in the same lane
        const hasNearbyObstacle = newObstacles.some(
          (obs) => obs.lane === lane && obs.y < 100
        );
        if (!hasNearbyObstacle) {
          newObstacles.push({
            id: nextObstacleId++,
            lane,
            y: -OBSTACLE_HEIGHT,
            emoji: OBSTACLE_TYPES[Math.floor(Math.random() * OBSTACLE_TYPES.length)],
          });
        }
      }

      // Spawn coins occasionally
      if (Math.random() < 0.01) {
        const lane = Math.floor(Math.random() * LANE_COUNT);
        const hasNearbyItem = [...newObstacles, ...newCoins].some(
          (item) => item.lane === lane && item.y < 150
        );
        if (!hasNearbyItem) {
          newCoins.push({
            id: nextCoinId++,
            lane,
            y: -COIN_SIZE,
          });
        }
      }

      // Check collision with obstacles
      const playerX = s.playerLane * LANE_WIDTH + (LANE_WIDTH - CAR_WIDTH) / 2;
      const playerY = GAME_HEIGHT - CAR_HEIGHT - 20;

      for (const obs of newObstacles) {
        const obsX = obs.lane * LANE_WIDTH + (LANE_WIDTH - OBSTACLE_WIDTH) / 2;

        // Simple box collision
        if (
          playerX < obsX + OBSTACLE_WIDTH &&
          playerX + CAR_WIDTH > obsX &&
          playerY < obs.y + OBSTACLE_HEIGHT &&
          playerY + CAR_HEIGHT > obs.y
        ) {
          // Only count collision if enough time has passed (invincibility frames)
          if (now - lastCollision > 1000) {
            newScore = Math.max(0, newScore - 20);
            newLives--;
            lastCollision = now;

            // Remove the obstacle that was hit
            newObstacles = newObstacles.filter((o) => o.id !== obs.id);
          }
        }
      }

      // Check coin collection
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
        }
      }

      // Add distance points
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

    // Check game over
    if (state().lives <= 0) {
      endGame();
      return;
    }

    gameLoopId = requestAnimationFrame(gameLoop);
  }

  function cleanup() {
    if (gameLoopId) {
      cancelAnimationFrame(gameLoopId);
      gameLoopId = null;
    }
  }

  return {
    state,
    canPlay,
    energy: $energy.energy,
    profile: $profile.profile,
    startGame,
    pauseGame,
    resumeGame,
    endGame,
    moveLeft,
    moveRight,
    cleanup,
  };
}

// =============================================================================
// Star Rating Helper
// =============================================================================

function getStarRating(score: number): string {
  if (score >= 200) return "⭐⭐⭐";
  if (score >= 100) return "⭐⭐";
  return "⭐";
}

// =============================================================================
// Main Component
// =============================================================================

function RoadRacer() {
  const $game = useScope(roadRacerLogic);
  const gameRef = useRef<HTMLDivElement>(null);

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

  // Cleanup on unmount
  useEffect(() => {
    return () => $game.cleanup();
  }, [$game]);

  // Touch controls
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
    const profile = $game.profile();
    const gameState = $game.state();
    const playerCanPlay = $game.canPlay();
    const energy = $game.energy();

    return (
      <div className="min-h-screen bg-gradient-to-b from-sky-400 via-sky-500 to-emerald-500 p-4 safe-bottom">
        <div className="mx-auto max-w-lg">
          {/* Header */}
          <header className="mb-4 flex items-center justify-between">
            <Link
              to="/"
              className="flex items-center gap-2 text-white/80 hover:text-white transition-colors"
            >
              <span>←</span>
              <span className="text-sm font-medium hidden sm:inline">Back</span>
            </Link>
            <h1 className="font-display text-2xl font-bold text-white drop-shadow-lg">
              🏎️ Road Racer
            </h1>
            <div className="text-white/80 text-sm">
              ⚡ {energy}
            </div>
          </header>

          {/* No Profile Warning */}
          {!profile && (
            <div className="card text-center mb-4">
              <div className="text-5xl mb-4">👶</div>
              <h2 className="font-display text-xl font-bold text-gray-800">
                Select a Profile First
              </h2>
              <p className="mt-2 text-gray-600">
                Go back home and select a kid profile to play!
              </p>
              <Link to="/" className="btn btn-primary mt-4 inline-block">
                Go Home
              </Link>
            </div>
          )}

          {/* Game Status Bar */}
          {profile && gameState.status === "playing" && (
            <div className="mb-4 card bg-white/90 backdrop-blur">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-4">
                  <span className="font-bold text-gray-800">
                    🏆 {gameState.score}
                  </span>
                  <span className="text-gray-600">
                    📏 {Math.floor(gameState.distance)}m
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-red-500">
                    {"❤️".repeat(gameState.lives)}
                    {"🖤".repeat(3 - gameState.lives)}
                  </span>
                  <button
                    onClick={() => $game.pauseGame()}
                    className="px-2 py-1 bg-gray-200 rounded text-xs hover:bg-gray-300"
                  >
                    ⏸️
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Game Area */}
          {profile && (
            <div
              ref={gameRef}
              className="relative mx-auto overflow-hidden rounded-2xl shadow-2xl"
              style={{
                width: GAME_WIDTH,
                height: GAME_HEIGHT,
                background: "linear-gradient(to bottom, #374151, #1f2937)",
              }}
              onTouchStart={handleTouchStart}
            >
              {/* Road markings */}
              <div className="absolute inset-0">
                {/* Lane dividers */}
                {[1, 2].map((i) => (
                  <div
                    key={i}
                    className="absolute top-0 bottom-0 w-1"
                    style={{
                      left: i * LANE_WIDTH - 2,
                      background:
                        "repeating-linear-gradient(to bottom, #fbbf24 0px, #fbbf24 20px, transparent 20px, transparent 40px)",
                      animation: gameState.status === "playing" ? "roadMove 0.5s linear infinite" : "none",
                    }}
                  />
                ))}
              </div>

              {/* Obstacles */}
              {gameState.obstacles.map((obs) => (
                <div
                  key={obs.id}
                  className="absolute text-3xl transition-transform"
                  style={{
                    left: obs.lane * LANE_WIDTH + (LANE_WIDTH - OBSTACLE_WIDTH) / 2,
                    top: obs.y,
                    width: OBSTACLE_WIDTH,
                    height: OBSTACLE_HEIGHT,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    transform: "rotate(180deg)", // Face toward player
                  }}
                >
                  {obs.emoji}
                </div>
              ))}

              {/* Coins */}
              {gameState.coins.map((coin) => (
                <div
                  key={coin.id}
                  className="absolute text-2xl animate-pulse"
                  style={{
                    left: coin.lane * LANE_WIDTH + (LANE_WIDTH - COIN_SIZE) / 2,
                    top: coin.y,
                    width: COIN_SIZE,
                    height: COIN_SIZE,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {COIN_EMOJI}
                </div>
              ))}

              {/* Player Car */}
              {gameState.status === "playing" && (
                <div
                  className="absolute text-4xl transition-all duration-100"
                  style={{
                    left:
                      gameState.playerLane * LANE_WIDTH +
                      (LANE_WIDTH - CAR_WIDTH) / 2,
                    bottom: 20,
                    width: CAR_WIDTH,
                    height: CAR_HEIGHT,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    filter:
                      Date.now() - gameState.lastCollisionTime < 1000
                        ? "drop-shadow(0 0 10px red)"
                        : "drop-shadow(0 0 5px white)",
                  }}
                >
                  🚙
                </div>
              )}

              {/* Idle State */}
              {gameState.status === "idle" && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/50 text-white p-4">
                  <div className="text-6xl mb-4">🏎️</div>
                  <h2 className="font-display text-2xl font-bold mb-2">
                    Road Racer
                  </h2>
                  <p className="text-sm text-center mb-4 opacity-80">
                    Dodge traffic and collect stars!
                    <br />
                    Use ← → arrow keys or tap left/right
                  </p>
                  {playerCanPlay ? (
                    <button
                      onClick={() => $game.startGame()}
                      className="btn btn-primary px-8 py-3 text-lg"
                    >
                      🚀 Start Game
                    </button>
                  ) : (
                    <div className="text-center">
                      <p className="text-yellow-300 mb-2">⚡ No energy left!</p>
                      <p className="text-sm opacity-70">Come back tomorrow</p>
                    </div>
                  )}
                  {gameState.highScore > 0 && (
                    <p className="mt-4 text-sm opacity-70">
                      🏆 Best: {gameState.highScore}
                    </p>
                  )}
                </div>
              )}

              {/* Paused State */}
              {gameState.status === "paused" && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/70 text-white">
                  <div className="text-4xl mb-4">⏸️</div>
                  <h2 className="font-display text-xl font-bold mb-4">Paused</h2>
                  <div className="flex gap-3">
                    <button
                      onClick={() => $game.resumeGame()}
                      className="btn btn-primary px-6 py-2"
                    >
                      ▶️ Resume
                    </button>
                    <button
                      onClick={() => $game.endGame()}
                      className="btn bg-red-500 text-white px-6 py-2"
                    >
                      🏁 End
                    </button>
                  </div>
                </div>
              )}

              {/* Game Over State */}
              {gameState.status === "gameOver" && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 text-white p-4">
                  <div className="text-5xl mb-4">🏁</div>
                  <h2 className="font-display text-2xl font-bold mb-2">
                    Game Over!
                  </h2>
                  <div className="text-center mb-4">
                    <p className="text-3xl font-bold text-yellow-400">
                      {gameState.score}
                    </p>
                    <p className="text-sm opacity-70">points</p>
                    <div className="text-2xl mt-2">
                      {getStarRating(gameState.score)}
                    </div>
                  </div>
                  <p className="text-sm opacity-70 mb-4">
                    Distance: {Math.floor(gameState.distance)}m
                  </p>
                  {playerCanPlay ? (
                    <button
                      onClick={() => $game.startGame()}
                      className="btn btn-primary px-8 py-3"
                    >
                      🔄 Play Again
                    </button>
                  ) : (
                    <div className="text-center">
                      <p className="text-yellow-300 mb-2">⚡ No energy left!</p>
                      <Link to="/" className="btn btn-outline text-white mt-2">
                        Go Home
                      </Link>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Touch Controls (visible on mobile) */}
          {profile && gameState.status === "playing" && (
            <div className="mt-4 flex gap-4 justify-center sm:hidden">
              <button
                onTouchStart={() => $game.moveLeft()}
                className="w-20 h-20 rounded-full bg-white/20 text-white text-3xl active:bg-white/40 transition-colors"
              >
                ⬅️
              </button>
              <button
                onTouchStart={() => $game.moveRight()}
                className="w-20 h-20 rounded-full bg-white/20 text-white text-3xl active:bg-white/40 transition-colors"
              >
                ➡️
              </button>
            </div>
          )}

          {/* Instructions */}
          {profile && gameState.status === "idle" && (
            <div className="mt-4 card bg-white/90 backdrop-blur">
              <h3 className="font-display font-semibold text-gray-800 mb-2">
                🎮 How to Play
              </h3>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>⌨️ Use ← → arrow keys to move</li>
                <li>📱 On mobile, tap left/right side of screen</li>
                <li>⭐ Collect stars for +10 points</li>
                <li>💥 Avoid cars! Collision = -20 points</li>
                <li>❤️ You have 3 lives</li>
                <li>🏃 Speed increases as you go!</li>
              </ul>
            </div>
          )}
        </div>

        {/* CSS for road animation */}
        <style>{`
          @keyframes roadMove {
            from { background-position: 0 0; }
            to { background-position: 0 40px; }
          }
        `}</style>
      </div>
    );
  });
}
