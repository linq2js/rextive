import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { signal } from "rextive";
import { patch } from "rextive/helpers";
import { rx, useScope } from "rextive/react";
import { energyLogic, selectedProfileLogic } from "@/logic";
import { useEffect, useRef } from "react";

export const Route = createFileRoute("/games/typing-adventure")({
  component: TypingAdventure,
});

// Word lists by difficulty
const WORD_LISTS = {
  easy: [
    "cat", "dog", "sun", "hat", "cup", "red", "big", "run", "fun", "hop",
    "top", "pot", "bat", "rat", "map", "cap", "tap", "nap", "zip", "tip",
  ],
  medium: [
    "apple", "happy", "house", "mouse", "water", "green", "plant", "cloud",
    "smile", "dance", "horse", "tiger", "pizza", "candy", "beach", "train",
  ],
  hard: [
    "rainbow", "butterfly", "elephant", "sunshine", "computer", "dinosaur",
    "chocolate", "adventure", "playground", "wonderful", "fantastic", "birthday",
  ],
};

// Encouraging messages
const CORRECT_MESSAGES = ["Great job! 🎉", "Awesome! ⭐", "Perfect! 💯", "Amazing! 🚀", "Super! 🌟"];
const WRONG_MESSAGES = ["Try again! 💪", "Almost! 🤔", "Keep going! 🎯"];

type Difficulty = "easy" | "medium" | "hard";
type GameState = "menu" | "playing" | "paused" | "finished";

interface GameStats {
  score: number;
  wordsCompleted: number;
  accuracy: number;
  streak: number;
  bestStreak: number;
  totalKeystrokes: number;
  correctKeystrokes: number;
}

function getRandomWord(difficulty: Difficulty): string {
  const words = WORD_LISTS[difficulty];
  return words[Math.floor(Math.random() * words.length)];
}

function getRandomMessage(correct: boolean): string {
  const messages = correct ? CORRECT_MESSAGES : WRONG_MESSAGES;
  return messages[Math.floor(Math.random() * messages.length)];
}

function typingGameLogic() {
  const $energy = energyLogic();
  const $profile = selectedProfileLogic();

  const gameState = signal<GameState>("menu", { name: "typing.gameState" });
  const difficulty = signal<Difficulty>("easy", { name: "typing.difficulty" });
  const currentWord = signal("", { name: "typing.currentWord" });
  const userInput = signal("", { name: "typing.userInput" });
  const message = signal("", { name: "typing.message" });
  const timeLeft = signal(60, { name: "typing.timeLeft" }); // 60 seconds per round
  const wordsToComplete = signal(10, { name: "typing.wordsToComplete" });

  const stats = signal<GameStats>(
    {
      score: 0,
      wordsCompleted: 0,
      accuracy: 100,
      streak: 0,
      bestStreak: 0,
      totalKeystrokes: 0,
      correctKeystrokes: 0,
    },
    { name: "typing.stats" }
  );

  function setDifficulty(d: Difficulty) {
    difficulty.set(d);
    // Adjust words to complete based on difficulty
    wordsToComplete.set(d === "easy" ? 15 : d === "medium" ? 12 : 10);
  }

  async function startGame(): Promise<boolean> {
    // Check and spend energy
    const hasEnergy = await $energy.spend(1);
    if (!hasEnergy) return false;

    // Reset stats
    stats.set({
      score: 0,
      wordsCompleted: 0,
      accuracy: 100,
      streak: 0,
      bestStreak: 0,
      totalKeystrokes: 0,
      correctKeystrokes: 0,
    });

    // Start game
    timeLeft.set(60);
    userInput.set("");
    message.set("");
    currentWord.set(getRandomWord(difficulty()));
    gameState.set("playing");
    return true;
  }

  function handleKeyPress(key: string) {
    if (gameState() !== "playing") return;

    const current = currentWord();
    const input = userInput();
    const expectedChar = current[input.length];

    stats.set(patch("totalKeystrokes", (t) => t + 1));

    if (key.toLowerCase() === expectedChar?.toLowerCase()) {
      // Correct keystroke
      const newInput = input + key.toLowerCase();
      userInput.set(newInput);

      stats.set((s) => ({
        ...s,
        correctKeystrokes: s.correctKeystrokes + 1,
        accuracy: Math.round(((s.correctKeystrokes + 1) / (s.totalKeystrokes + 1)) * 100),
      }));

      // Word completed!
      if (newInput.length === current.length) {
        // Base points per difficulty: Easy=5, Medium=10, Hard=20
        const basePoints = difficulty() === "hard" ? 20 : difficulty() === "medium" ? 10 : 5;
        const streakBonus = Math.floor(stats().streak / 3) * 2;
        const points = basePoints + streakBonus;

        stats.set((s) => ({
          ...s,
          score: s.score + points,
          wordsCompleted: s.wordsCompleted + 1,
          streak: s.streak + 1,
          bestStreak: Math.max(s.bestStreak, s.streak + 1),
        }));

        message.set(getRandomMessage(true));
        userInput.set("");

        // Check if game finished
        if (stats().wordsCompleted + 1 >= wordsToComplete()) {
          finishGame();
        } else {
          currentWord.set(getRandomWord(difficulty()));
        }
      }
    } else {
      // Wrong keystroke - reset streak
      stats.set(patch<GameStats>({ streak: 0, accuracy: Math.round((stats().correctKeystrokes / (stats().totalKeystrokes + 1)) * 100) }));
      message.set(getRandomMessage(false));
    }
  }

  function handleBackspace() {
    if (gameState() !== "playing") return;
    userInput.set((prev) => prev.slice(0, -1));
  }

  function skipWord() {
    if (gameState() !== "playing") return;
    stats.set(patch("streak", 0));
    userInput.set("");
    currentWord.set(getRandomWord(difficulty()));
    message.set("Skipped! 👋");
  }

  function tick() {
    if (gameState() !== "playing") return;
    timeLeft.set((t) => {
      if (t <= 1) {
        finishGame();
        return 0;
      }
      return t - 1;
    });
  }

  function finishGame() {
    gameState.set("finished");
  }

  function pauseGame() {
    if (gameState() === "playing") {
      gameState.set("paused");
    }
  }

  function resumeGame() {
    if (gameState() === "paused") {
      gameState.set("playing");
    }
  }

  function backToMenu() {
    gameState.set("menu");
  }

  return {
    // State
    gameState,
    difficulty,
    currentWord,
    userInput,
    message,
    timeLeft,
    wordsToComplete,
    stats,
    energy: $energy.energy,
    profile: $profile.profile,
    // Actions
    setDifficulty,
    startGame,
    handleKeyPress,
    handleBackspace,
    skipWord,
    tick,
    pauseGame,
    resumeGame,
    backToMenu,
  };
}

function TypingAdventure() {
  const $game = useScope(typingGameLogic);
  const inputRef = useRef<HTMLInputElement>(null);

  // Timer effect
  useEffect(() => {
    const unsub = $game.gameState.on(() => {
      if ($game.gameState() === "playing") {
        const interval = setInterval(() => $game.tick(), 1000);
        return () => clearInterval(interval);
      }
    });
    return unsub;
  }, [$game]);

  // Auto-focus input when playing
  useEffect(() => {
    const unsub = $game.gameState.on(() => {
      if ($game.gameState() === "playing") {
        inputRef.current?.focus();
      }
    });
    return unsub;
  }, [$game]);

  return rx(() => {
    const state = $game.gameState();
    const profile = $game.profile();

    if (!profile) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-400 to-purple-500 p-4">
          <div className="card text-center">
            <div className="text-5xl mb-4">🎮</div>
            <h2 className="font-display text-xl font-bold text-gray-800">
              Please select a profile first
            </h2>
            <Link to="/" className="btn btn-primary mt-4">
              Go Home
            </Link>
          </div>
        </div>
      );
    }

    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-400 via-purple-400 to-pink-400 p-4 safe-bottom">
        {/* Header */}
        <header className="mb-4">
          <div className="mx-auto max-w-2xl flex items-center justify-between">
            <Link
              to="/dashboard"
              className="flex items-center gap-2 text-white/80 hover:text-white transition-colors"
            >
              <span>←</span>
              <span className="text-sm font-medium hidden sm:inline">Back</span>
            </Link>
            <h1 className="font-display text-2xl font-bold text-white drop-shadow-lg">
              ⌨️ Typing Adventure
            </h1>
            <div className="flex items-center gap-2 text-white">
              <span>⚡</span>
              <span className="font-bold">{$game.energy()}</span>
            </div>
          </div>
        </header>

        <div className="mx-auto max-w-2xl">
          {state === "menu" && <MenuScreen $game={$game} />}
          {state === "playing" && <PlayingScreen $game={$game} inputRef={inputRef} />}
          {state === "paused" && <PausedScreen $game={$game} />}
          {state === "finished" && <FinishedScreen $game={$game} />}
        </div>
      </div>
    );
  });
}

function MenuScreen({ $game }: { $game: ReturnType<typeof typingGameLogic> }) {
  return rx(() => {
    const difficulty = $game.difficulty();
    const energy = $game.energy();
    const hasEnergy = energy > 0;

    return (
      <div className="space-y-6">
        {/* Game Info Card */}
        <div className="card text-center">
          <div className="text-6xl mb-4">⌨️</div>
          <h2 className="font-display text-2xl font-bold text-gray-800">
            Typing Adventure
          </h2>
          <p className="mt-2 text-gray-600">
            Practice typing words as fast as you can!
          </p>
        </div>

        {/* Difficulty Selection */}
        <div className="card">
          <h3 className="font-display text-lg font-semibold text-gray-700 mb-3">
            Choose Difficulty
          </h3>
          <div className="grid grid-cols-3 gap-3">
            <DifficultyButton
              icon="🐣"
              label="Easy"
              description="5 pts/word"
              selected={difficulty === "easy"}
              onClick={() => $game.setDifficulty("easy")}
            />
            <DifficultyButton
              icon="🐥"
              label="Medium"
              description="10 pts/word"
              selected={difficulty === "medium"}
              onClick={() => $game.setDifficulty("medium")}
            />
            <DifficultyButton
              icon="🦅"
              label="Hard"
              description="20 pts/word"
              selected={difficulty === "hard"}
              onClick={() => $game.setDifficulty("hard")}
            />
          </div>
        </div>

        {/* How to Play */}
        <div className="card bg-blue-50">
          <h3 className="font-display text-lg font-semibold text-blue-800 mb-2">
            📖 How to Play
          </h3>
          <ul className="text-sm text-blue-700 space-y-1">
            <li>• Type the words that appear on screen</li>
            <li>• Complete words to earn points</li>
            <li>• Build streaks for bonus points!</li>
            <li>• Press Space or Enter to skip a word</li>
          </ul>
        </div>

        {/* Start Button */}
        <button
          onClick={() => $game.startGame()}
          disabled={!hasEnergy}
          className={`w-full py-4 rounded-2xl font-display text-xl font-bold transition-all ${
            hasEnergy
              ? "bg-gradient-to-r from-green-400 to-emerald-500 text-white hover:scale-105 active:scale-95 shadow-lg"
              : "bg-gray-300 text-gray-500 cursor-not-allowed"
          }`}
        >
          {hasEnergy ? (
            <>Start Game ⚡1</>
          ) : (
            <>No Energy - Come Back Tomorrow!</>
          )}
        </button>
      </div>
    );
  });
}

function DifficultyButton({
  icon,
  label,
  description,
  selected,
  onClick,
}: {
  icon: string;
  label: string;
  description: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`p-3 rounded-xl text-center transition-all ${
        selected
          ? "bg-primary-100 border-2 border-primary-500 scale-105"
          : "bg-gray-50 border-2 border-transparent hover:bg-gray-100"
      }`}
    >
      <div className="text-2xl">{icon}</div>
      <div className="font-display font-semibold text-gray-800">{label}</div>
      <div className="text-xs text-gray-500">{description}</div>
    </button>
  );
}

function PlayingScreen({
  $game,
  inputRef,
}: {
  $game: ReturnType<typeof typingGameLogic>;
  inputRef: React.RefObject<HTMLInputElement | null>;
}) {
  return rx(() => {
    const currentWord = $game.currentWord();
    const userInput = $game.userInput();
    const message = $game.message();
    const stats = $game.stats();
    const timeLeft = $game.timeLeft();
    const wordsToComplete = $game.wordsToComplete();

    return (
      <div className="space-y-4">
        {/* Stats Bar */}
        <div className="card bg-white/90 backdrop-blur">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-4">
              <div>
                <span className="text-gray-500">Score:</span>
                <span className="ml-1 font-bold text-primary-600">{stats.score}</span>
              </div>
              <div>
                <span className="text-gray-500">Words:</span>
                <span className="ml-1 font-bold">{stats.wordsCompleted}/{wordsToComplete}</span>
              </div>
              <div>
                <span className="text-gray-500">Streak:</span>
                <span className="ml-1 font-bold text-amber-600">🔥{stats.streak}</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className={`text-2xl font-bold ${timeLeft <= 10 ? "text-red-500 animate-pulse" : "text-gray-800"}`}>
                ⏱️ {timeLeft}s
              </span>
              <button
                onClick={() => $game.pauseGame()}
                className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors"
              >
                ⏸️
              </button>
            </div>
          </div>
          
          {/* Progress Bar */}
          <div className="mt-3 h-2 rounded-full bg-gray-200 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-green-400 to-emerald-500 transition-all duration-300"
              style={{ width: `${(stats.wordsCompleted / wordsToComplete) * 100}%` }}
            />
          </div>
        </div>

        {/* Main Game Area */}
        <div className="card bg-white text-center py-8">
          {/* Message */}
          <div className="h-8 mb-4">
            {message && (
              <span className="text-lg font-semibold text-primary-600 animate-bounce inline-block">
                {message}
              </span>
            )}
          </div>

          {/* Current Word Display */}
          <div className="mb-6">
            <div className="flex justify-center gap-1 text-4xl sm:text-5xl font-mono font-bold">
              {currentWord.split("").map((char, i) => {
                const typed = userInput[i];
                const isCorrect = typed?.toLowerCase() === char.toLowerCase();
                const isCurrent = i === userInput.length;

                return (
                  <span
                    key={i}
                    className={`inline-block w-12 h-14 sm:w-14 sm:h-16 rounded-lg flex items-center justify-center transition-all ${
                      typed
                        ? isCorrect
                          ? "bg-green-100 text-green-600"
                          : "bg-red-100 text-red-600"
                        : isCurrent
                        ? "bg-primary-100 text-primary-600 ring-2 ring-primary-400 animate-pulse"
                        : "bg-gray-100 text-gray-400"
                    }`}
                  >
                    {char.toUpperCase()}
                  </span>
                );
              })}
            </div>
          </div>

          {/* Hidden Input */}
          <input
            ref={inputRef}
            type="text"
            value={userInput}
            onChange={() => {}}
            onKeyDown={(e) => {
              if (e.key === "Backspace") {
                $game.handleBackspace();
              } else if (e.key === " " || e.key === "Enter") {
                e.preventDefault();
                $game.skipWord();
              } else if (e.key.length === 1 && /[a-zA-Z]/.test(e.key)) {
                $game.handleKeyPress(e.key);
              }
            }}
            className="opacity-0 absolute -z-10"
            autoFocus
          />

          {/* Keyboard Hint */}
          <p className="text-gray-500 text-sm">
            Type the word above! Press <kbd className="px-2 py-1 bg-gray-100 rounded">Space</kbd> to skip
          </p>

          {/* Tap to Focus (Mobile) */}
          <button
            onClick={() => inputRef.current?.focus()}
            className="mt-4 px-6 py-2 bg-primary-100 text-primary-700 rounded-full text-sm font-medium sm:hidden"
          >
            Tap to type ⌨️
          </button>
        </div>

        {/* Accuracy */}
        <div className="card bg-white/80 backdrop-blur">
          <div className="flex items-center justify-between">
            <span className="text-gray-600">Accuracy</span>
            <span className={`font-bold ${stats.accuracy >= 90 ? "text-green-600" : stats.accuracy >= 70 ? "text-amber-600" : "text-red-600"}`}>
              {stats.accuracy}%
            </span>
          </div>
          <div className="mt-2 h-2 rounded-full bg-gray-200 overflow-hidden">
            <div
              className={`h-full transition-all duration-300 ${
                stats.accuracy >= 90 ? "bg-green-500" : stats.accuracy >= 70 ? "bg-amber-500" : "bg-red-500"
              }`}
              style={{ width: `${stats.accuracy}%` }}
            />
          </div>
        </div>
      </div>
    );
  });
}

function PausedScreen({ $game }: { $game: ReturnType<typeof typingGameLogic> }) {
  return (
    <div className="card text-center py-8">
      <div className="text-6xl mb-4">⏸️</div>
      <h2 className="font-display text-2xl font-bold text-gray-800">
        Game Paused
      </h2>
      <p className="mt-2 text-gray-600">Take a break!</p>
      <div className="mt-6 flex flex-col gap-3">
        <button
          onClick={() => $game.resumeGame()}
          className="btn btn-primary py-3"
        >
          Resume Game ▶️
        </button>
        <button
          onClick={() => $game.backToMenu()}
          className="btn btn-outline py-3"
        >
          Quit to Menu
        </button>
      </div>
    </div>
  );
}

function FinishedScreen({ $game }: { $game: ReturnType<typeof typingGameLogic> }) {
  const navigate = useNavigate();

  return rx(() => {
    const stats = $game.stats();
    const difficulty = $game.difficulty();

    // Calculate star rating
    const stars =
      stats.accuracy >= 95 && stats.bestStreak >= 5
        ? 3
        : stats.accuracy >= 80 && stats.bestStreak >= 3
        ? 2
        : 1;

    // Calculate XP earned
    const baseXP = stats.score;
    const accuracyBonus = Math.round(stats.accuracy * 0.5);
    const totalXP = baseXP + accuracyBonus;

    return (
      <div className="space-y-6">
        <div className="card text-center py-8">
          <div className="text-6xl mb-4">🎉</div>
          <h2 className="font-display text-2xl font-bold text-gray-800">
            Great Job!
          </h2>

          {/* Stars */}
          <div className="mt-4 flex justify-center gap-2">
            {[1, 2, 3].map((i) => (
              <span
                key={i}
                className={`text-4xl ${i <= stars ? "animate-bounce" : "grayscale opacity-30"}`}
                style={{ animationDelay: `${i * 0.1}s` }}
              >
                ⭐
              </span>
            ))}
          </div>

          {/* Score */}
          <div className="mt-6 text-4xl font-bold text-primary-600">
            {stats.score} pts
          </div>

          {/* Stats Grid */}
          <div className="mt-6 grid grid-cols-2 gap-4 text-left">
            <StatItem label="Words Typed" value={stats.wordsCompleted} />
            <StatItem label="Accuracy" value={`${stats.accuracy}%`} />
            <StatItem label="Best Streak" value={`🔥 ${stats.bestStreak}`} />
            <StatItem label="Difficulty" value={difficulty.charAt(0).toUpperCase() + difficulty.slice(1)} />
          </div>

          {/* XP Earned */}
          <div className="mt-6 p-4 bg-amber-50 rounded-xl">
            <div className="text-sm text-amber-700">XP Earned</div>
            <div className="text-2xl font-bold text-amber-600">+{totalXP} XP</div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-3">
          <button
            onClick={() => $game.startGame()}
            disabled={$game.energy() === 0}
            className={`py-4 rounded-2xl font-display text-lg font-bold transition-all ${
              $game.energy() > 0
                ? "bg-gradient-to-r from-green-400 to-emerald-500 text-white hover:scale-105 active:scale-95 shadow-lg"
                : "bg-gray-300 text-gray-500 cursor-not-allowed"
            }`}
          >
            {$game.energy() > 0 ? <>Play Again ⚡1</> : <>No Energy Left</>}
          </button>
          <button
            onClick={() => navigate({ to: "/dashboard" })}
            className="btn btn-outline py-3"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  });
}

function StatItem({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="p-3 bg-gray-50 rounded-lg">
      <div className="text-xs text-gray-500">{label}</div>
      <div className="font-bold text-gray-800">{value}</div>
    </div>
  );
}

