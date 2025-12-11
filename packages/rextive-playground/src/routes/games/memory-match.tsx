import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { signal } from "rextive";
import { rx, useScope } from "rextive/react";
import { energyLogic, selectedProfileLogic, modalLogic } from "@/logic";
import { gameProgressRepository } from "@/infrastructure/repositories";
import { useEffect } from "react";
import { gameTickLogic } from "@/utils";
import {
  calculateAnswerPoints,
  calculateStarRating,
} from "@/domain/scoring";
import {
  playFlipSound,
  playMatchSound,
  playMismatchSound,
  playWinSound,
  backgroundMusic,
} from "@/hooks/useSound";
import { GameIcon, type GameIconName } from "@/components/GameIcons";
import { Icon } from "@/components/Icons";
import {
  GameMenu,
  ThemeSelector,
  ThemeIcons,
  type DifficultyOption,
  type ThemeOption,
} from "@/components/GameMenu";

export const Route = createFileRoute("/games/memory-match")({
  component: MemoryMatch,
});

// =============================================================================
// Card Data (using shared GameIcons)
// =============================================================================

interface CardItem {
  id: GameIconName;
  name: string;
  category: string;
}

const CARD_CATEGORIES: Record<string, CardItem[]> = {
  animals: [
    { id: "cat", name: "Cat", category: "animals" },
    { id: "dog", name: "Dog", category: "animals" },
    { id: "rabbit", name: "Rabbit", category: "animals" },
    { id: "bear", name: "Bear", category: "animals" },
    { id: "mouse", name: "Mouse", category: "animals" },
    { id: "elephant", name: "Elephant", category: "animals" },
    { id: "lion", name: "Lion", category: "animals" },
    { id: "tiger", name: "Tiger", category: "animals" },
    { id: "monkey", name: "Monkey", category: "animals" },
    { id: "penguin", name: "Penguin", category: "animals" },
    { id: "owl", name: "Owl", category: "animals" },
    { id: "fish", name: "Fish", category: "animals" },
    { id: "turtle", name: "Turtle", category: "animals" },
    { id: "frog", name: "Frog", category: "animals" },
    { id: "bird", name: "Bird", category: "animals" },
    { id: "butterfly", name: "Butterfly", category: "animals" },
    { id: "bee", name: "Bee", category: "animals" },
    { id: "duck", name: "Duck", category: "animals" },
  ],
  nature: [
    { id: "sun", name: "Sun", category: "nature" },
    { id: "moon", name: "Moon", category: "nature" },
    { id: "star", name: "Star", category: "nature" },
    { id: "rainbow", name: "Rainbow", category: "nature" },
    { id: "flower", name: "Flower", category: "nature" },
    { id: "tree", name: "Tree", category: "nature" },
    { id: "leaf", name: "Leaf", category: "nature" },
    { id: "cloud", name: "Cloud", category: "nature" },
    { id: "water", name: "Water", category: "nature" },
    { id: "fire", name: "Fire", category: "nature" },
    { id: "snowflake", name: "Snowflake", category: "nature" },
    { id: "mountain", name: "Mountain", category: "nature" },
  ],
  food: [
    { id: "apple", name: "Apple", category: "food" },
    { id: "banana", name: "Banana", category: "food" },
    { id: "pizza", name: "Pizza", category: "food" },
    { id: "cake", name: "Cake", category: "food" },
    { id: "candy", name: "Candy", category: "food" },
    { id: "ice-cream", name: "Ice Cream", category: "food" },
    { id: "cookie", name: "Cookie", category: "food" },
    { id: "carrot", name: "Carrot", category: "food" },
    { id: "grape", name: "Grape", category: "food" },
    { id: "orange", name: "Orange", category: "food" },
    { id: "strawberry", name: "Strawberry", category: "food" },
    { id: "watermelon", name: "Watermelon", category: "food" },
  ],
  transport: [
    { id: "car", name: "Car", category: "transport" },
    { id: "rocket", name: "Rocket", category: "transport" },
    { id: "train", name: "Train", category: "transport" },
    { id: "plane", name: "Plane", category: "transport" },
    { id: "boat", name: "Boat", category: "transport" },
  ],
  objects: [
    { id: "heart", name: "Heart", category: "objects" },
    { id: "gift", name: "Gift", category: "objects" },
    { id: "balloon", name: "Balloon", category: "objects" },
    { id: "crown", name: "Crown", category: "objects" },
    { id: "hat", name: "Hat", category: "objects" },
    { id: "cup", name: "Cup", category: "objects" },
    { id: "house", name: "House", category: "objects" },
    { id: "ball", name: "Ball", category: "objects" },
    { id: "key", name: "Key", category: "objects" },
    { id: "bell", name: "Bell", category: "objects" },
    { id: "clock", name: "Clock", category: "objects" },
    { id: "book", name: "Book", category: "objects" },
    { id: "umbrella", name: "Umbrella", category: "objects" },
  ],
  fun: [
    { id: "smile", name: "Smile", category: "fun" },
    { id: "robot", name: "Robot", category: "fun" },
    { id: "teddy", name: "Teddy", category: "fun" },
    { id: "kite", name: "Kite", category: "fun" },
    { id: "dice", name: "Dice", category: "fun" },
    { id: "puzzle", name: "Puzzle", category: "fun" },
    { id: "guitar", name: "Guitar", category: "fun" },
    { id: "drum", name: "Drum", category: "fun" },
  ],
};

// Combine all items for random selection
const ALL_ITEMS = Object.values(CARD_CATEGORIES).flat();

const CATEGORY_INFO: Record<string, { name: string; color: string }> = {
  animals: { name: "Animals", color: "from-amber-400 to-orange-500" },
  nature: { name: "Nature", color: "from-emerald-400 to-green-500" },
  food: { name: "Food", color: "from-red-400 to-rose-500" },
  transport: { name: "Transport", color: "from-blue-400 to-indigo-500" },
  objects: { name: "Objects", color: "from-purple-400 to-violet-500" },
  fun: { name: "Fun", color: "from-cyan-400 to-teal-500" },
  mixed: { name: "Mixed", color: "from-pink-400 to-fuchsia-500" },
};

// =============================================================================
// Shared SVG Components
// =============================================================================

function TrophyIcon({ className = "w-16 h-16" }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={className}>
      <path
        d="M38 8H34V6C34 4.9 33.1 4 32 4H16C14.9 4 14 4.9 14 6V8H10C7.79 8 6 9.79 6 12V14C6 18.42 9.58 22 14 22C14.36 22 14.71 21.97 15.06 21.92C16.59 25.15 19.5 27.52 23 28.28V34H18C16.9 34 16 34.9 16 36V42C16 43.1 16.9 44 18 44H30C31.1 44 32 43.1 32 42V36C32 34.9 31.1 34 30 34H25V28.28C28.5 27.52 31.41 25.15 32.94 21.92C33.29 21.97 33.64 22 34 22C38.42 22 42 18.42 42 14V12C42 9.79 40.21 8 38 8Z"
        fill="#fbbf24"
      />
      <path
        d="M14 18C11.79 18 10 16.21 10 14V12H14V18ZM34 12H38V14C38 16.21 36.21 18 34 18V12Z"
        fill="#f59e0b"
      />
    </svg>
  );
}

function StarRatingIcon({ filled }: { filled: boolean }) {
  return (
    <svg viewBox="0 0 24 24" className="w-10 h-10">
      <path
        d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
        fill={filled ? "#fbbf24" : "#374151"}
        className={filled ? "drop-shadow-lg" : "opacity-30"}
      />
    </svg>
  );
}

function BrainIcon() {
  return (
    <svg viewBox="0 0 64 64" className="w-full h-full">
      <ellipse cx="24" cy="32" rx="16" ry="20" fill="#f472b6" />
      <ellipse cx="40" cy="32" rx="16" ry="20" fill="#ec4899" />
      <path d="M24 16 Q32 12 40 16" stroke="#db2777" strokeWidth="2" fill="none" />
      <path d="M20 24 Q32 20 44 24" stroke="#db2777" strokeWidth="2" fill="none" />
      <path d="M18 32 Q32 28 46 32" stroke="#db2777" strokeWidth="2" fill="none" />
      <path d="M20 40 Q32 36 44 40" stroke="#db2777" strokeWidth="2" fill="none" />
      <path d="M24 48 Q32 44 40 48" stroke="#db2777" strokeWidth="2" fill="none" />
    </svg>
  );
}

function TimerIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-6 h-6" fill="currentColor">
      <path d="M15 1H9v2h6V1zm-4 13h2V8h-2v6zm8.03-6.61l1.42-1.42c-.43-.51-.9-.99-1.41-1.41l-1.42 1.42C16.07 4.74 14.12 4 12 4c-4.97 0-9 4.03-9 9s4.03 9 9 9 9-4.03 9-9c0-2.12-.74-4.07-1.97-5.61zM12 20c-3.87 0-7-3.13-7-7s3.13-7 7-7 7 3.13 7 7-3.13 7-7 7z" />
    </svg>
  );
}

function FireIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-5 h-5" fill="#f59e0b">
      <path d="M13.5.67s.74 2.65.74 4.8c0 2.06-1.35 3.73-3.41 3.73-2.07 0-3.63-1.67-3.63-3.73l.03-.36C5.21 7.51 4 10.62 4 14c0 4.42 3.58 8 8 8s8-3.58 8-8C20 8.61 17.41 3.8 13.5.67zM11.71 19c-1.78 0-3.22-1.4-3.22-3.14 0-1.62 1.05-2.76 2.81-3.12 1.77-.36 3.6-1.21 4.62-2.58.39 1.29.59 2.65.59 4.04 0 2.65-2.15 4.8-4.8 4.8z" />
    </svg>
  );
}

function EnergyIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor">
      <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
    </svg>
  );
}

// =============================================================================
// Game Types & Config
// =============================================================================

type Difficulty = "easy" | "medium" | "hard";
type GameState = "menu" | "playing" | "finished";
type Category = keyof typeof CARD_CATEGORIES | "mixed";

interface GameCard {
  uid: number;
  item: CardItem;
  isFlipped: boolean;
  isMatched: boolean;
}

const DIFFICULTY_CONFIG = {
  easy: { pairs: 6, cols: 4, rows: 3, timeLimit: 60 },
  medium: { pairs: 8, cols: 4, rows: 4, timeLimit: 60 },
  hard: { pairs: 10, cols: 5, rows: 4, timeLimit: 60 },
};

// =============================================================================
// Game Logic
// =============================================================================

function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

function memoryMatchLogic() {
  const $energy = energyLogic();
  const $profile = selectedProfileLogic();

  const gameState = signal<GameState>("menu", { name: "memory.gameState" });
  const difficulty = signal<Difficulty>("easy", { name: "memory.difficulty" });
  const category = signal<Category>("mixed", { name: "memory.category" });
  const cards = signal<GameCard[]>([], { name: "memory.cards" });
  const flippedIndices = signal<number[]>([], { name: "memory.flipped" });
  const isChecking = signal(false, { name: "memory.isChecking" });
  const timeLeft = signal(120, { name: "memory.timeLeft" });
  const moves = signal(0, { name: "memory.moves" });
  const matches = signal(0, { name: "memory.matches" });
  const score = signal(0, { name: "memory.score" });
  const streak = signal(0, { name: "memory.streak" });
  const bestStreak = signal(0, { name: "memory.bestStreak" });

  function generateCards(): GameCard[] {
    const config = DIFFICULTY_CONFIG[difficulty()];
    const cat = category();
    
    // Get items based on category
    let availableItems: CardItem[];
    if (cat === "mixed") {
      availableItems = ALL_ITEMS;
    } else {
      availableItems = CARD_CATEGORIES[cat] || ALL_ITEMS;
    }
    
    // Select random items for pairs
    const selectedItems = shuffleArray(availableItems).slice(0, config.pairs);
    
    // Create pairs
    const cardPairs: GameCard[] = [];
    let uid = 0;
    
    for (const item of selectedItems) {
      cardPairs.push({ uid: uid++, item, isFlipped: false, isMatched: false });
      cardPairs.push({ uid: uid++, item, isFlipped: false, isMatched: false });
    }
    
    return shuffleArray(cardPairs);
  }

  async function startGame(): Promise<boolean> {
    // Memory Match costs 2 energy per game
    const hasEnergy = await $energy.spend(2);
    if (!hasEnergy) return false;

    const config = DIFFICULTY_CONFIG[difficulty()];
    
    cards.set(generateCards());
    flippedIndices.set([]);
    isChecking.set(false);
    timeLeft.set(config.timeLimit);
    moves.set(0);
    matches.set(0);
    score.set(0);
    streak.set(0);
    bestStreak.set(0);
    gameState.set("playing");
    backgroundMusic.playMemoryMusic();
    
    return true;
  }

  function flipCard(index: number) {
    if (isChecking()) return;
    
    const currentCards = cards();
    const card = currentCards[index];
    
    if (card.isMatched || card.isFlipped) return;
    
    const currentFlipped = flippedIndices();
    if (currentFlipped.length >= 2) return;
    
    playFlipSound();
    
    cards.set(
      currentCards.map((c, i) =>
        i === index ? { ...c, isFlipped: true } : c
      )
    );
    
    const newFlipped = [...currentFlipped, index];
    flippedIndices.set(newFlipped);
    
    if (newFlipped.length === 2) {
      checkMatch(newFlipped[0], newFlipped[1]);
    }
  }

  function checkMatch(index1: number, index2: number) {
    isChecking.set(true);
    moves.set((m) => m + 1);
    
    const currentCards = cards();
    const card1 = currentCards[index1];
    const card2 = currentCards[index2];
    
    const isMatch = card1.item.id === card2.item.id;
    
    setTimeout(() => {
      if (isMatch) {
        playMatchSound();
        cards.set(
          currentCards.map((c, i) =>
            i === index1 || i === index2 ? { ...c, isMatched: true } : c
          )
        );
        
        const newStreak = streak() + 1;
        streak.set(newStreak);
        bestStreak.set(Math.max(bestStreak(), newStreak));
        
        const points = calculateAnswerPoints(difficulty(), newStreak - 1);
        score.set((s) => s + points);
        
        const newMatches = matches() + 1;
        matches.set(newMatches);
        
        const config = DIFFICULTY_CONFIG[difficulty()];
        if (newMatches >= config.pairs) {
          playWinSound();
          finishGame();
        }
      } else {
        playMismatchSound();
        cards.set(
          currentCards.map((c, i) =>
            i === index1 || i === index2 ? { ...c, isFlipped: false } : c
          )
        );
        streak.set(0);
      }
      
      flippedIndices.set([]);
      isChecking.set(false);
    }, 800);
  }

  // Game tick effect - auto-managed timer that cleans up when logic disposes
  gameTickLogic(gameState, () => {
    timeLeft.set((t) => {
      if (t <= 1) {
        finishGame();
        return 0;
      }
      return t - 1;
    });
  }, { name: "memory" });

  async function finishGame() {
    backgroundMusic.stop();
    gameState.set("finished");

    // Save progress
    const profile = $profile.profile();
    if (profile) {
      // Record this game session - accumulates stats
      await gameProgressRepository.recordGameSession(
        profile.id,
        "memory-match",
        score(),
        1 // Can implement leveling later
      );
    }
  }

  function backToMenu() {
    backgroundMusic.stop();
    gameState.set("menu");
  }

  return {
    gameState,
    difficulty,
    category,
    cards,
    isChecking,
    timeLeft,
    moves,
    matches,
    score,
    streak,
    bestStreak,
    energy: $energy.energy,
    profile: $profile.profile,
    setDifficulty: (d: Difficulty) => difficulty.set(d),
    setCategory: (c: Category) => category.set(c),
    startGame,
    flipCard,
    backToMenu,
  };
}

// =============================================================================
// Components
// =============================================================================

function MemoryMatch() {
  const $game = useScope(memoryMatchLogic);
  const navigate = useNavigate();

  // Handle back button with confirmation during gameplay
  const handleBack = async () => {
    if ($game.gameState() === "playing") {
      const $modal = modalLogic();
      const confirmed = await $modal.confirm(
        "Are you sure you want to quit? Your progress will be lost!",
        "Leave Game?"
      );
      if (!confirmed) return;
      $game.backToMenu();
    }
    navigate({ to: "/dashboard", viewTransition: true });
  };

  // Timer is now handled by gameTickLogic inside memoryMatchLogic
  // No useEffect needed for tick!

  // Cleanup on unmount
  useEffect(() => {
    return () => backgroundMusic.stop();
  }, []);

  return rx(() => {
    const state = $game.gameState();
    const profile = $game.profile();

    if (!profile) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-purple-500 to-pink-600 p-4">
          <div className="card text-center bg-white/95">
            <BrainIcon />
            <h2 className="font-display text-xl font-bold text-gray-800 mt-4">
              Please select a profile first
            </h2>
            <Link to="/" viewTransition className="btn bg-purple-500 text-white mt-4 hover:bg-purple-600">
              Go Home
            </Link>
          </div>
        </div>
      );
    }

    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-500 via-pink-500 to-rose-500 p-4 pb-12 safe-bottom">
        {/* Header */}
        <header className="mb-4">
          <div className="mx-auto max-w-3xl flex items-center justify-between">
            <button
              onClick={handleBack}
              className="flex items-center gap-2 text-white/80 hover:text-white transition-colors"
            >
              <Icon name="back" size={20} />
              <span className="text-sm font-medium hidden sm:inline">Back</span>
            </button>
            <h1 className="font-display text-2xl font-bold text-white drop-shadow-lg flex items-center gap-2">
              <span className="w-8 h-8"><BrainIcon /></span>
              Memory Match
            </h1>
            <div className="flex items-center gap-1 text-amber-300 font-bold">
              <EnergyIcon />
              <span>{$game.energy()}</span>
            </div>
          </div>
        </header>

        <div className="mx-auto max-w-3xl">
          {state === "menu" && <MenuScreen $game={$game} />}
          {state === "playing" && <PlayingScreen $game={$game} />}
          {state === "finished" && <FinishedScreen $game={$game} />}
        </div>
      </div>
    );
  });
}

// Memory Match specific difficulty options
const MEMORY_DIFFICULTY_OPTIONS: DifficultyOption[] = [
  {
    value: "easy",
    label: "Easy",
    description: "6 pairs • 2 min",
    color: "from-emerald-400 to-green-500",
  },
  {
    value: "medium",
    label: "Medium",
    description: "8 pairs • 90s",
    color: "from-amber-400 to-orange-500",
  },
  {
    value: "hard",
    label: "Hard",
    description: "10 pairs • 60s",
    color: "from-red-400 to-rose-500",
  },
];

// Convert CATEGORY_INFO to ThemeOption format with icons
const THEME_OPTIONS: ThemeOption[] = Object.entries(CATEGORY_INFO).map(
  ([key, info]) => ({
    value: key,
    label: info.name,
    color: info.color,
    icon: ThemeIcons[key as keyof typeof ThemeIcons],
  })
);

const HOW_TO_PLAY = [
  "Tap cards to flip them",
  "Find matching pairs",
  "Match all pairs before time runs out!",
  "Consecutive matches = bonus points!",
];

function MenuScreen({ $game }: { $game: ReturnType<typeof memoryMatchLogic> }) {
  return rx(() => {
    const difficulty = $game.difficulty();
    const category = $game.category();
    const energy = $game.energy();

    return (
      <GameMenu
        title="Memory Match"
        description="Find matching pairs before time runs out!"
        icon="brain"
        themeColor="from-purple-500 to-pink-500"
        difficulty={difficulty}
        onDifficultyChange={(d) => $game.setDifficulty(d)}
        difficultyOptions={MEMORY_DIFFICULTY_OPTIONS}
        energy={energy}
        energyCost={2}
        onPlay={async () => {
            const started = await $game.startGame();
            if (!started) {
              const $modal = modalLogic();
            await $modal.warning(
              "No energy left! Come back tomorrow to play again.",
              "No Energy"
            );
            }
          }}
        howToPlay={HOW_TO_PLAY}
        howToPlayColor="bg-purple-100/80"
      >
        {/* Theme Selection - Memory Match specific */}
        <ThemeSelector
          themes={THEME_OPTIONS}
          selected={category}
          onChange={(c) => $game.setCategory(c as Category)}
        />
      </GameMenu>
    );
  });
}

function PlayingScreen({ $game }: { $game: ReturnType<typeof memoryMatchLogic> }) {
  return rx(() => {
    const cards = $game.cards();
    const difficulty = $game.difficulty();
    const timeLeft = $game.timeLeft();
    const moves = $game.moves();
    const matches = $game.matches();
    const score = $game.score();
    const streak = $game.streak();
    const config = DIFFICULTY_CONFIG[difficulty];

    return (
      <div className="space-y-4">
        {/* Stats Bar */}
        <div className="card bg-white/95 backdrop-blur">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-4">
              <div>
                <span className="text-gray-500">Score:</span>
                <span className="ml-1 font-bold text-purple-600">{score}</span>
              </div>
              <div>
                <span className="text-gray-500">Pairs:</span>
                <span className="ml-1 font-bold">{matches}/{config.pairs}</span>
              </div>
              <div>
                <span className="text-gray-500">Moves:</span>
                <span className="ml-1 font-bold">{moves}</span>
              </div>
              {streak > 0 && (
                <div className="text-amber-600 font-bold flex items-center gap-1">
                  <FireIcon /> {streak}
                </div>
              )}
            </div>
            <div className={`text-2xl font-bold flex items-center gap-1 ${timeLeft <= 10 ? "text-red-500 animate-pulse" : "text-gray-800"}`}>
              <TimerIcon /> {timeLeft}s
            </div>
          </div>

          {/* Progress Bar */}
          <div className="mt-3 h-2 rounded-full bg-gray-200 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-purple-400 to-pink-500 transition-all duration-300"
              style={{ width: `${(matches / config.pairs) * 100}%` }}
            />
          </div>
        </div>

        {/* Game Board */}
        <div
          className="grid gap-2 sm:gap-3"
          style={{
            gridTemplateColumns: `repeat(${config.cols}, minmax(0, 1fr))`,
          }}
        >
          {cards.map((card, index) => (
            <GameCardComponent
              key={card.uid}
              card={card}
              onClick={() => $game.flipCard(index)}
            />
          ))}
        </div>
      </div>
    );
  });
}

function GameCardComponent({
  card,
  onClick,
}: {
  card: GameCard;
  onClick: () => void;
}) {
  const isRevealed = card.isFlipped || card.isMatched;

  return (
    <button
      onClick={onClick}
      disabled={card.isMatched}
      className="aspect-square perspective-500"
      style={{ perspective: "500px" }}
    >
      <div
        className={`relative w-full h-full transition-transform duration-500 ease-in-out ${
          card.isMatched ? "cursor-default" : "cursor-pointer"
      }`}
      style={{
        transformStyle: "preserve-3d",
          transform: isRevealed ? "rotateY(180deg)" : "rotateY(0deg)",
        }}
      >
        {/* Card Back (Question Mark) */}
        <div
          className={`absolute inset-0 rounded-xl flex items-center justify-center shadow-md ${
            card.isMatched
              ? "bg-gradient-to-br from-purple-300 to-pink-300"
              : "bg-gradient-to-br from-purple-500 to-pink-500 hover:scale-105 active:scale-95"
          } transition-transform`}
          style={{ backfaceVisibility: "hidden" }}
        >
          <svg viewBox="0 0 24 24" className="w-8 h-8 sm:w-10 sm:h-10 text-white/60">
            <circle cx="12" cy="12" r="10" fill="currentColor" opacity="0.3" />
            <text x="12" y="16" textAnchor="middle" fontSize="12" fill="white" fontWeight="bold">?</text>
          </svg>
        </div>

        {/* Card Front (Revealed Content) */}
        <div
          className={`absolute inset-0 rounded-xl flex flex-col items-center justify-center p-1 shadow-lg ${
            card.isMatched
              ? "bg-green-100 border-2 border-green-400"
              : "bg-white"
          }`}
          style={{
            backfaceVisibility: "hidden",
            transform: "rotateY(180deg)",
          }}
        >
          <div className="w-3/4 aspect-square max-w-20">
            <GameIcon name={card.item.id} size="100%" />
          </div>
          <span className={`text-[10px] sm:text-xs font-medium mt-0.5 truncate w-full text-center ${
            card.isMatched ? "text-green-700" : "text-gray-700"
          }`}>
            {card.item.name}
          </span>
          {card.isMatched && (
            <div className="absolute top-1 right-1">
              <svg viewBox="0 0 24 24" className="w-4 h-4 text-green-500">
                <path fill="currentColor" d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
          </svg>
        </div>
      )}
        </div>
      </div>
    </button>
  );
}

function FinishedScreen({ $game }: { $game: ReturnType<typeof memoryMatchLogic> }) {
  return rx(() => {
    const score = $game.score();
    const matches = $game.matches();
    const moves = $game.moves();
    const bestStreak = $game.bestStreak();
    const difficulty = $game.difficulty();
    const timeLeft = $game.timeLeft();
    const config = DIFFICULTY_CONFIG[difficulty];

    const won = matches >= config.pairs;
    const accuracy = moves > 0 ? Math.round((matches / moves) * 100) : 0;
    
    const stars = calculateStarRating(
      matches,
      config.pairs,
      accuracy,
      bestStreak
    );

    const baseXP = score;
    const timeBonus = won ? Math.round(timeLeft * 0.5) : 0;
    const totalXP = baseXP + timeBonus;

    return (
      <div className="space-y-6">
        <div className="card text-center py-8 bg-white/95">
          {won ? <TrophyIcon className="w-20 h-20 mx-auto" /> : <TimerIcon />}
          <h2 className="font-display text-2xl font-bold text-gray-800 mt-4">
            {won ? "You Win!" : "Time's Up!"}
          </h2>

          {/* Stars */}
          {won && (
            <div className="mt-4 flex justify-center gap-2">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className={i <= stars ? "animate-bounce" : ""}
                  style={{ animationDelay: `${i * 0.1}s` }}
                >
                  <StarRatingIcon filled={i <= stars} />
                </div>
              ))}
            </div>
          )}

          {/* Score */}
          <div className="mt-6 text-4xl font-bold text-purple-600">
            {score} pts
          </div>

          {/* Stats Grid */}
          <div className="mt-6 grid grid-cols-2 gap-4 text-left">
            <StatItem label="Pairs Found" value={`${matches}/${config.pairs}`} />
            <StatItem label="Moves" value={moves} />
            <StatItem label="Best Streak" value={bestStreak} icon={<FireIcon />} />
            <StatItem label="Accuracy" value={`${accuracy}%`} />
          </div>

          {/* XP Earned */}
          <div className="mt-6 p-4 bg-amber-50 rounded-xl">
            <div className="text-sm text-amber-700">XP Earned</div>
            <div className="text-2xl font-bold text-amber-600">+{totalXP} XP</div>
            {timeBonus > 0 && (
              <div className="text-xs text-amber-600">
                (includes +{timeBonus} time bonus)
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-3">
          <button
            onClick={async () => {
              const started = await $game.startGame();
              if (!started) {
                const $modal = modalLogic();
                await $modal.warning("No energy left! Come back tomorrow to play again.", "No Energy");
              }
            }}
            disabled={$game.energy() === 0}
            className={`py-4 rounded-2xl font-display text-lg font-bold transition-all ${
              $game.energy() > 0
                ? "bg-gradient-to-r from-green-400 to-emerald-500 text-white hover:scale-105 active:scale-95 shadow-lg"
                : "bg-gray-300 text-gray-500 cursor-not-allowed"
            }`}
          >
            {$game.energy() > 0 ? (
              <span className="flex items-center justify-center gap-2">
                Play Again <EnergyIcon /> 1
              </span>
            ) : (
              "No Energy Left"
            )}
          </button>
          <Link to="/dashboard" viewTransition className="btn bg-gray-200 text-gray-700 py-3 text-center hover:bg-gray-300">
            Back to Dashboard
          </Link>
        </div>
      </div>
    );
  });
}

function StatItem({ 
  label, 
  value, 
  icon 
}: { 
  label: string; 
  value: string | number;
  icon?: React.ReactNode;
}) {
  return (
    <div className="p-3 bg-gray-50 rounded-lg">
      <div className="text-xs text-gray-500">{label}</div>
      <div className="font-bold text-gray-800 flex items-center gap-1">
        {icon}
        {value}
      </div>
    </div>
  );
}
