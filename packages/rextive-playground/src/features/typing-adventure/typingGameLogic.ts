import { signal } from "rextive";
import { patch } from "rextive/helpers";
import { energyLogic } from "@/logic";

// Types
export type Difficulty = "easy" | "medium" | "hard";
export type GameState = "menu" | "playing" | "paused" | "finished";

export interface GameStats {
  score: number;
  wordsCompleted: number;
  accuracy: number;
  streak: number;
  bestStreak: number;
  totalKeystrokes: number;
  correctKeystrokes: number;
}

// Constants
export const WORD_LISTS = {
  easy: [
    "cat",
    "dog",
    "sun",
    "hat",
    "cup",
    "red",
    "big",
    "run",
    "fun",
    "hop",
    "top",
    "pot",
    "bat",
    "rat",
    "map",
    "cap",
    "tap",
    "nap",
    "zip",
    "tip",
  ],
  medium: [
    "apple",
    "happy",
    "house",
    "mouse",
    "water",
    "green",
    "plant",
    "cloud",
    "smile",
    "dance",
    "horse",
    "tiger",
    "pizza",
    "candy",
    "beach",
    "train",
  ],
  hard: [
    "rainbow",
    "butterfly",
    "elephant",
    "sunshine",
    "computer",
    "dinosaur",
    "chocolate",
    "adventure",
    "playground",
    "wonderful",
    "fantastic",
    "birthday",
  ],
};

export const CORRECT_MESSAGES = [
  "Great job! 🎉",
  "Awesome! ⭐",
  "Perfect! 💯",
  "Amazing! 🚀",
  "Super! 🌟",
];

export const WRONG_MESSAGES = ["Try again! 💪", "Almost! 🤔", "Keep going! 🎯"];

// Helpers
export function getRandomWord(difficulty: Difficulty): string {
  const words = WORD_LISTS[difficulty];
  return words[Math.floor(Math.random() * words.length)];
}

export function getRandomMessage(correct: boolean): string {
  const messages = correct ? CORRECT_MESSAGES : WRONG_MESSAGES;
  return messages[Math.floor(Math.random() * messages.length)];
}

// Logic
export function typingGameLogic() {
  const $energy = energyLogic();

  const gameState = signal<GameState>("menu", { name: "typing.gameState" });
  const difficulty = signal<Difficulty>("easy", { name: "typing.difficulty" });
  const currentWord = signal("", { name: "typing.currentWord" });
  const userInput = signal("", { name: "typing.userInput" });
  const message = signal("", { name: "typing.message" });
  const timeLeft = signal(60, { name: "typing.timeLeft" });
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

  // Timer side effect - managed in logic
  let timerCleanup: (() => void) | null = null;
  gameState.on(() => {
    timerCleanup?.();
    timerCleanup = null;

    if (gameState() === "playing") {
      const interval = setInterval(() => tick(), 1000);
      timerCleanup = () => clearInterval(interval);
    }
  });

  function setDifficulty(d: Difficulty) {
    difficulty.set(d);
    wordsToComplete.set(d === "easy" ? 15 : d === "medium" ? 12 : 10);
  }

  async function startGame(): Promise<boolean> {
    const hasEnergy = await $energy.spend(1);
    if (!hasEnergy) return false;

    stats.set({
      score: 0,
      wordsCompleted: 0,
      accuracy: 100,
      streak: 0,
      bestStreak: 0,
      totalKeystrokes: 0,
      correctKeystrokes: 0,
    });

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
      const newInput = input + key.toLowerCase();
      userInput.set(newInput);

      stats.set((s) => ({
        ...s,
        correctKeystrokes: s.correctKeystrokes + 1,
        accuracy: Math.round(
          ((s.correctKeystrokes + 1) / (s.totalKeystrokes + 1)) * 100
        ),
      }));

      if (newInput.length === current.length) {
        const basePoints =
          difficulty() === "hard" ? 20 : difficulty() === "medium" ? 10 : 5;
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

        if (stats().wordsCompleted + 1 >= wordsToComplete()) {
          finishGame();
        } else {
          currentWord.set(getRandomWord(difficulty()));
        }
      }
    } else {
      stats.set(
        patch({
          streak: 0,
          accuracy: Math.round(
            (stats().correctKeystrokes / (stats().totalKeystrokes + 1)) * 100
          ),
        })
      );
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

  // ============================================================
  // Component Effects Pattern
  // ============================================================
  //
  // Component effects allow logic to communicate with component-level
  // concerns (refs, hooks, local state) while maintaining proper
  // cleanup on unmount.
  //
  // Why "Component Effect"?
  // - "Effect" = side effect with automatic cleanup (like useEffect)
  // - "Component" = callback can access refs, hooks, DOM, local state
  //
  // Usage in component:
  //   const inputRef = useRef<HTMLInputElement>(null);
  //   const $game = useTypingGame(); // or typingGameLogic()
  //
  //   // Bind component effect with callback
  //   useScope($game.onStateChange, [
  //     (state) => {
  //       if (state === "playing") {
  //         inputRef.current?.focus();  // Access refs, hooks, etc.
  //       }
  //     }
  //   ]);
  //
  // Benefits:
  // - Callback is stable when passed through useScope
  // - Auto-cleanup when component unmounts
  // - Logic stays pure, component handles DOM/UI concerns
  // - Clear separation: logic emits events, component reacts
  // ============================================================

  /**
   * Component effect for game state changes.
   * @param listener - Callback receiving state (stable via useScope)
   * @returns Disposable for cleanup on unmount
   */
  function onStateChange(listener: (state: GameState) => void) {
    // Notify immediately with current state
    listener(gameState());
    // Subscribe to future changes
    return { dispose: gameState.on(() => listener(gameState())) };
  }

  /**
   * Component effect for word changes.
   * Useful for: animations, sounds when word changes.
   */
  function onWordChange(listener: (word: string) => void) {
    listener(currentWord());
    return { dispose: currentWord.on(() => listener(currentWord())) };
  }

  /**
   * Component effect for feedback messages.
   * Useful for: shake animations, visual feedback.
   */
  function onMessage(listener: (message: string, isCorrect: boolean) => void) {
    return {
      dispose: message.on(() => {
        const msg = message();
        if (msg) {
          listener(msg, CORRECT_MESSAGES.includes(msg));
        }
      }),
    };
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
    // Actions
    setDifficulty,
    startGame,
    handleKeyPress,
    handleBackspace,
    skipWord,
    pauseGame,
    resumeGame,
    backToMenu,
    // Component Effects (for DOM, refs, hooks concerns)
    onStateChange,
    onWordChange,
    onMessage,
  };
}
