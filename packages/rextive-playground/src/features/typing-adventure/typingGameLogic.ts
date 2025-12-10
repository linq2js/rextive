import { signal } from "rextive";
import { patch } from "rextive/helpers";
import { energyLogic, selectedProfileLogic } from "@/logic";
import { gameProgressRepository } from "@/infrastructure/repositories";
import {
  playCorrectSound,
  playWrongSound,
  playWinSound,
  playGameOverSound,
  playStartSound,
} from "@/hooks/useSound";

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
  // 100 easy words (3-4 letters)
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
    "pen",
    "bed",
    "box",
    "fox",
    "cow",
    "pig",
    "hen",
    "egg",
    "ant",
    "bee",
    "owl",
    "ape",
    "elk",
    "eel",
    "fly",
    "bug",
    "jam",
    "ham",
    "pie",
    "ice",
    "oak",
    "elm",
    "ivy",
    "fir",
    "log",
    "mud",
    "wet",
    "dry",
    "hot",
    "old",
    "new",
    "sad",
    "mad",
    "bad",
    "joy",
    "toy",
    "boy",
    "day",
    "way",
    "bay",
    "ray",
    "key",
    "sea",
    "sky",
    "arm",
    "leg",
    "eye",
    "ear",
    "lip",
    "toe",
    "van",
    "bus",
    "car",
    "jet",
    "sub",
    "win",
    "hit",
    "sit",
    "fit",
    "bit",
    "cut",
    "hug",
    "dig",
    "jog",
    "mop",
    "rub",
    "wax",
    "mix",
    "fix",
    "six",
    "ten",
    "two",
    "add",
    "ask",
    "ate",
    "can",
    "did",
    "get",
    "got",
    "had",
  ],
  // 100 medium words (5-6 letters)
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
    "bread",
    "chair",
    "table",
    "glass",
    "plate",
    "spoon",
    "knife",
    "brush",
    "clock",
    "phone",
    "music",
    "movie",
    "story",
    "dream",
    "sleep",
    "awake",
    "light",
    "night",
    "sunny",
    "rainy",
    "windy",
    "storm",
    "ocean",
    "river",
    "stone",
    "grass",
    "flower",
    "tree",
    "leaf",
    "bird",
    "fish",
    "snake",
    "puppy",
    "kitty",
    "bunny",
    "frog",
    "duck",
    "goose",
    "sheep",
    "camel",
    "zebra",
    "panda",
    "koala",
    "whale",
    "shark",
    "crab",
    "snail",
    "jelly",
    "grape",
    "lemon",
    "peach",
    "mango",
    "berry",
    "melon",
    "juice",
    "bread",
    "cheese",
    "bacon",
    "pasta",
    "salad",
    "soup",
    "toast",
    "cream",
    "sugar",
    "honey",
    "spicy",
    "sweet",
    "salty",
    "fresh",
    "clean",
    "dirty",
    "empty",
    "round",
    "square",
    "triangle",
    "color",
    "paint",
    "paper",
    "pencil",
    "school",
    "class",
    "teacher",
    "student",
  ],
  // 100 hard words (7+ letters)
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
    "airplane",
    "backpack",
    "baseball",
    "bathroom",
    "bedroom",
    "blanket",
    "breakfast",
    "building",
    "calendar",
    "camping",
    "captain",
    "cartoon",
    "celebrate",
    "champion",
    "character",
    "children",
    "Christmas",
    "classroom",
    "climbing",
    "collection",
    "colorful",
    "community",
    "cooking",
    "costume",
    "counting",
    "creative",
    "crossing",
    "dancing",
    "daughter",
    "delicious",
    "different",
    "dinosaur",
    "discover",
    "dolphin",
    "drawing",
    "dreaming",
    "electric",
    "elevator",
    "emergency",
    "exciting",
    "exercise",
    "exploring",
    "family",
    "fantastic",
    "favorite",
    "festival",
    "firework",
    "flashlight",
    "floating",
    "football",
    "forward",
    "friendly",
    "gardening",
    "giraffe",
    "goldfish",
    "goodbye",
    "grandfather",
    "grandmother",
    "Halloween",
    "hamburger",
    "handsome",
    "happiness",
    "headphone",
    "healthy",
    "helpful",
    "hibernate",
    "homework",
    "hospital",
    "icecream",
    "important",
    "internet",
    "interview",
    "invention",
    "invisible",
    "jellyfish",
    "kangaroo",
    "keyboard",
    "kindness",
    "knowledge",
    "laughter",
    "learning",
    "lemonade",
    "library",
    "lightning",
    "listening",
    "magnetic",
    "marshmallow",
    "medicine",
    "midnight",
    "mountain",
    "mushroom",
    "neighbor",
    "notebook",
    "obstacle",
  ],
};

export const CORRECT_MESSAGES = [
  "Great job!",
  "Awesome!",
  "Perfect!",
  "Amazing!",
  "Super!",
];

export const WRONG_MESSAGES = ["Try again!", "Almost!", "Keep going!"];

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
  const $profile = selectedProfileLogic();

  const gameState = signal<GameState>("menu", { name: "typing.gameState" });
  const [difficulty, setDifficulty] = signal<Difficulty>("easy", {
    name: "typing.difficulty",
  }).tuple;
  const wordsToComplete = signal(
    { difficulty },
    ({ deps }) =>
      deps.difficulty === "easy" ? 15 : deps.difficulty === "medium" ? 12 : 10,
    { name: "typing.wordsToComplete" }
  );

  const currentWord = signal("", { name: "typing.currentWord" });
  const userInput = signal("", { name: "typing.userInput" });
  const message = signal("", { name: "typing.message" });
  const timeLeft = signal(60, { name: "typing.timeLeft" });

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
  // this effect-like signal will be disposed if the logic is disposed
  signal(
    { state: gameState },
    ({ deps, onCleanup, safe }) => {
      if (deps.state !== "playing") {
        return;
      }
      const interval = setInterval(() => {
        // Safe execution of tick to avoid wasted work if the signal is disposed
        safe(() => {
          timeLeft.set((t) => {
            if (t <= 1) {
              finishGame();
              return 0;
            }
            return t - 1;
          });
        });
      }, 1000);
      onCleanup(() => clearInterval(interval));
    },
    { lazy: true, name: "typing.timer" }
  );

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
    playStartSound();
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

        playCorrectSound();
        message.set(getRandomMessage(true));
        userInput.set("");

        if (stats().wordsCompleted + 1 >= wordsToComplete()) {
          finishGame();
        } else {
          currentWord.set(getRandomWord(difficulty()));
        }
      }
    } else {
      playWrongSound();
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
    message.set("Skipped!");
  }

  async function finishGame() {
    gameState.set("finished");

    // Play appropriate sound based on performance
    const s = stats();
    if (s.wordsCompleted >= wordsToComplete() || s.score >= 50) {
      playWinSound();
    } else {
      playGameOverSound();
    }

    // Save game progress
    const profile = $profile.profile();
    if (profile) {
      await gameProgressRepository.recordGameSession(
        profile.id,
        "typing-adventure",
        stats().score,
        1 // Can implement leveling later
      );
    }
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
    // Cleanup
  };
}
