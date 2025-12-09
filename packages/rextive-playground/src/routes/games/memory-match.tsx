import { createFileRoute, Link } from "@tanstack/react-router";
import { signal } from "rextive";
import { rx, useScope } from "rextive/react";
import { energyLogic, selectedProfileLogic } from "@/logic";
import { useEffect } from "react";
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

export const Route = createFileRoute("/games/memory-match")({
  component: MemoryMatch,
});

// =============================================================================
// SVG Card Icons
// =============================================================================

function CatIcon() {
  return (
    <svg viewBox="0 0 64 64" className="w-full h-full">
      <circle cx="32" cy="36" r="20" fill="#f59e0b" />
      <polygon points="16,20 22,36 10,30" fill="#f59e0b" />
      <polygon points="48,20 42,36 54,30" fill="#f59e0b" />
      <circle cx="24" cy="32" r="4" fill="#1f2937" />
      <circle cx="40" cy="32" r="4" fill="#1f2937" />
      <ellipse cx="32" cy="42" rx="4" ry="3" fill="#f472b6" />
      <path d="M28 46 Q32 50 36 46" stroke="#1f2937" strokeWidth="2" fill="none" />
      <line x1="16" y1="38" x2="8" y2="36" stroke="#1f2937" strokeWidth="1.5" />
      <line x1="16" y1="42" x2="8" y2="44" stroke="#1f2937" strokeWidth="1.5" />
      <line x1="48" y1="38" x2="56" y2="36" stroke="#1f2937" strokeWidth="1.5" />
      <line x1="48" y1="42" x2="56" y2="44" stroke="#1f2937" strokeWidth="1.5" />
    </svg>
  );
}

function DogIcon() {
  return (
    <svg viewBox="0 0 64 64" className="w-full h-full">
      <ellipse cx="32" cy="38" rx="18" ry="16" fill="#92400e" />
      <ellipse cx="14" cy="28" rx="8" ry="12" fill="#78350f" />
      <ellipse cx="50" cy="28" rx="8" ry="12" fill="#78350f" />
      <circle cx="24" cy="34" r="4" fill="#1f2937" />
      <circle cx="40" cy="34" r="4" fill="#1f2937" />
      <ellipse cx="32" cy="44" rx="6" ry="4" fill="#1f2937" />
      <ellipse cx="32" cy="50" rx="4" ry="2" fill="#f472b6" />
    </svg>
  );
}

function RabbitIcon() {
  return (
    <svg viewBox="0 0 64 64" className="w-full h-full">
      <ellipse cx="32" cy="42" rx="16" ry="14" fill="#fecaca" />
      <ellipse cx="22" cy="16" rx="6" ry="18" fill="#fecaca" />
      <ellipse cx="42" cy="16" rx="6" ry="18" fill="#fecaca" />
      <ellipse cx="22" cy="16" rx="3" ry="12" fill="#fda4af" />
      <ellipse cx="42" cy="16" rx="3" ry="12" fill="#fda4af" />
      <circle cx="26" cy="38" r="3" fill="#1f2937" />
      <circle cx="38" cy="38" r="3" fill="#1f2937" />
      <ellipse cx="32" cy="46" rx="3" ry="2" fill="#f472b6" />
      <line x1="20" y1="44" x2="10" y2="42" stroke="#1f2937" strokeWidth="1.5" />
      <line x1="44" y1="44" x2="54" y2="42" stroke="#1f2937" strokeWidth="1.5" />
    </svg>
  );
}

function BearIcon() {
  return (
    <svg viewBox="0 0 64 64" className="w-full h-full">
      <circle cx="32" cy="36" r="20" fill="#78350f" />
      <circle cx="14" cy="20" r="8" fill="#78350f" />
      <circle cx="50" cy="20" r="8" fill="#78350f" />
      <circle cx="14" cy="20" r="4" fill="#92400e" />
      <circle cx="50" cy="20" r="4" fill="#92400e" />
      <circle cx="24" cy="32" r="4" fill="#1f2937" />
      <circle cx="40" cy="32" r="4" fill="#1f2937" />
      <ellipse cx="32" cy="42" rx="8" ry="6" fill="#d97706" />
      <ellipse cx="32" cy="44" rx="4" ry="3" fill="#1f2937" />
    </svg>
  );
}

function AppleIcon() {
  return (
    <svg viewBox="0 0 64 64" className="w-full h-full">
      <ellipse cx="32" cy="38" rx="18" ry="20" fill="#ef4444" />
      <ellipse cx="26" cy="30" rx="4" ry="6" fill="#fca5a5" opacity="0.5" />
      <path d="M32 18 Q36 10 40 14" stroke="#78350f" strokeWidth="3" fill="none" />
      <ellipse cx="40" cy="14" rx="6" ry="4" fill="#22c55e" />
    </svg>
  );
}

function BananaIcon() {
  return (
    <svg viewBox="0 0 64 64" className="w-full h-full">
      <path d="M20 50 Q10 30 30 12 Q40 20 50 35 Q45 45 30 50 Z" fill="#fbbf24" />
      <path d="M30 12 Q35 8 40 10" stroke="#78350f" strokeWidth="3" fill="none" />
      <path d="M25 45 Q20 35 35 20" stroke="#f59e0b" strokeWidth="2" fill="none" opacity="0.5" />
    </svg>
  );
}

function SunIcon() {
  return (
    <svg viewBox="0 0 64 64" className="w-full h-full">
      <circle cx="32" cy="32" r="14" fill="#fbbf24" />
      {[0, 45, 90, 135, 180, 225, 270, 315].map((angle, i) => (
        <line
          key={i}
          x1={32 + 18 * Math.cos((angle * Math.PI) / 180)}
          y1={32 + 18 * Math.sin((angle * Math.PI) / 180)}
          x2={32 + 26 * Math.cos((angle * Math.PI) / 180)}
          y2={32 + 26 * Math.sin((angle * Math.PI) / 180)}
          stroke="#fbbf24"
          strokeWidth="4"
          strokeLinecap="round"
        />
      ))}
      <circle cx="28" cy="28" r="2" fill="#f59e0b" />
      <circle cx="36" cy="28" r="2" fill="#f59e0b" />
      <path d="M26 36 Q32 40 38 36" stroke="#f59e0b" strokeWidth="2" fill="none" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg viewBox="0 0 64 64" className="w-full h-full">
      <path
        d="M40 12 A20 20 0 1 0 40 52 A15 15 0 1 1 40 12"
        fill="#fef08a"
      />
      <circle cx="28" cy="28" r="2" fill="#fcd34d" />
      <circle cx="22" cy="40" r="3" fill="#fcd34d" />
      <circle cx="36" cy="36" r="1.5" fill="#fcd34d" />
    </svg>
  );
}

function StarIconCard() {
  return (
    <svg viewBox="0 0 64 64" className="w-full h-full">
      <path
        d="M32 8 L38 26 L56 26 L42 38 L48 56 L32 46 L16 56 L22 38 L8 26 L26 26 Z"
        fill="#fbbf24"
      />
      <path
        d="M32 14 L36 26 L32 24 L28 26 Z"
        fill="#fef08a"
        opacity="0.6"
      />
    </svg>
  );
}

function RainbowIcon() {
  return (
    <svg viewBox="0 0 64 64" className="w-full h-full">
      <path d="M8 48 A24 24 0 0 1 56 48" fill="none" stroke="#ef4444" strokeWidth="4" />
      <path d="M12 48 A20 20 0 0 1 52 48" fill="none" stroke="#f97316" strokeWidth="4" />
      <path d="M16 48 A16 16 0 0 1 48 48" fill="none" stroke="#fbbf24" strokeWidth="4" />
      <path d="M20 48 A12 12 0 0 1 44 48" fill="none" stroke="#22c55e" strokeWidth="4" />
      <path d="M24 48 A8 8 0 0 1 40 48" fill="none" stroke="#3b82f6" strokeWidth="4" />
      <path d="M28 48 A4 4 0 0 1 36 48" fill="none" stroke="#8b5cf6" strokeWidth="4" />
    </svg>
  );
}

function CarIcon() {
  return (
    <svg viewBox="0 0 64 64" className="w-full h-full">
      <rect x="8" y="28" width="48" height="20" rx="4" fill="#ef4444" />
      <rect x="16" y="18" width="32" height="16" rx="4" fill="#dc2626" />
      <rect x="20" y="20" width="10" height="10" rx="2" fill="#67e8f9" />
      <rect x="34" y="20" width="10" height="10" rx="2" fill="#67e8f9" />
      <circle cx="18" cy="48" r="6" fill="#1f2937" />
      <circle cx="46" cy="48" r="6" fill="#1f2937" />
      <circle cx="18" cy="48" r="3" fill="#6b7280" />
      <circle cx="46" cy="48" r="3" fill="#6b7280" />
    </svg>
  );
}

function RocketIcon() {
  return (
    <svg viewBox="0 0 64 64" className="w-full h-full">
      <path d="M32 6 Q44 20 44 40 L32 50 L20 40 Q20 20 32 6" fill="#e5e7eb" />
      <path d="M32 6 Q38 20 38 35 L32 42 L26 35 Q26 20 32 6" fill="#f3f4f6" />
      <circle cx="32" cy="28" r="6" fill="#3b82f6" />
      <path d="M20 40 L14 50 L20 45" fill="#ef4444" />
      <path d="M44 40 L50 50 L44 45" fill="#ef4444" />
      <path d="M26 50 L32 60 L38 50" fill="#f97316" />
      <path d="M28 50 L32 56 L36 50" fill="#fbbf24" />
    </svg>
  );
}

function HeartIconCard() {
  return (
    <svg viewBox="0 0 64 64" className="w-full h-full">
      <path
        d="M32 56 C16 42 8 32 8 22 C8 14 14 8 22 8 C26 8 30 10 32 14 C34 10 38 8 42 8 C50 8 56 14 56 22 C56 32 48 42 32 56"
        fill="#ef4444"
      />
      <path
        d="M22 14 C18 14 14 18 14 22 C14 26 16 30 22 36"
        fill="#fca5a5"
        opacity="0.5"
      />
    </svg>
  );
}

function GiftIcon() {
  return (
    <svg viewBox="0 0 64 64" className="w-full h-full">
      <rect x="10" y="26" width="44" height="30" rx="2" fill="#8b5cf6" />
      <rect x="10" y="20" width="44" height="10" rx="2" fill="#a78bfa" />
      <rect x="28" y="20" width="8" height="36" fill="#fbbf24" />
      <rect x="10" y="22" width="44" height="6" fill="#fbbf24" />
      <path d="M32 20 Q24 10 20 14 Q16 18 24 20" fill="#ef4444" stroke="#dc2626" strokeWidth="1" />
      <path d="M32 20 Q40 10 44 14 Q48 18 40 20" fill="#ef4444" stroke="#dc2626" strokeWidth="1" />
    </svg>
  );
}

function BalloonIcon() {
  return (
    <svg viewBox="0 0 64 64" className="w-full h-full">
      <ellipse cx="32" cy="24" rx="16" ry="20" fill="#ef4444" />
      <ellipse cx="26" cy="18" rx="4" ry="6" fill="#fca5a5" opacity="0.5" />
      <path d="M32 44 L30 48 L34 48 Z" fill="#dc2626" />
      <path d="M32 48 Q28 52 32 56 Q36 52 32 48" stroke="#1f2937" strokeWidth="1.5" fill="none" />
    </svg>
  );
}

function CrownIcon() {
  return (
    <svg viewBox="0 0 64 64" className="w-full h-full">
      <path d="M8 48 L8 24 L20 36 L32 16 L44 36 L56 24 L56 48 Z" fill="#fbbf24" />
      <rect x="8" y="44" width="48" height="8" fill="#f59e0b" />
      <circle cx="20" cy="48" r="3" fill="#ef4444" />
      <circle cx="32" cy="48" r="3" fill="#3b82f6" />
      <circle cx="44" cy="48" r="3" fill="#22c55e" />
      <circle cx="8" cy="24" r="3" fill="#fbbf24" />
      <circle cx="32" cy="16" r="3" fill="#fbbf24" />
      <circle cx="56" cy="24" r="3" fill="#fbbf24" />
    </svg>
  );
}

function FlowerIcon() {
  return (
    <svg viewBox="0 0 64 64" className="w-full h-full">
      {[0, 60, 120, 180, 240, 300].map((angle, i) => (
        <ellipse
          key={i}
          cx={32 + 12 * Math.cos((angle * Math.PI) / 180)}
          cy={32 + 12 * Math.sin((angle * Math.PI) / 180)}
          rx="10"
          ry="10"
          fill="#f472b6"
          transform={`rotate(${angle}, ${32 + 12 * Math.cos((angle * Math.PI) / 180)}, ${32 + 12 * Math.sin((angle * Math.PI) / 180)})`}
        />
      ))}
      <circle cx="32" cy="32" r="8" fill="#fbbf24" />
      <line x1="32" y1="42" x2="32" y2="58" stroke="#22c55e" strokeWidth="4" />
    </svg>
  );
}

function TreeIcon() {
  return (
    <svg viewBox="0 0 64 64" className="w-full h-full">
      <rect x="28" y="44" width="8" height="16" fill="#78350f" />
      <polygon points="32,8 52,44 12,44" fill="#22c55e" />
      <polygon points="32,16 46,38 18,38" fill="#16a34a" />
    </svg>
  );
}

// Card icon map
const CARD_ICONS: Record<string, React.FC> = {
  cat: CatIcon,
  dog: DogIcon,
  rabbit: RabbitIcon,
  bear: BearIcon,
  apple: AppleIcon,
  banana: BananaIcon,
  sun: SunIcon,
  moon: MoonIcon,
  star: StarIconCard,
  rainbow: RainbowIcon,
  car: CarIcon,
  rocket: RocketIcon,
  heart: HeartIconCard,
  gift: GiftIcon,
  balloon: BalloonIcon,
  crown: CrownIcon,
  flower: FlowerIcon,
  tree: TreeIcon,
};

// =============================================================================
// Card Data
// =============================================================================

interface CardItem {
  id: string;
  name: string;
  category: string;
}

const CARD_CATEGORIES: Record<string, CardItem[]> = {
  animals: [
    { id: "cat", name: "Cat", category: "animals" },
    { id: "dog", name: "Dog", category: "animals" },
    { id: "rabbit", name: "Rabbit", category: "animals" },
    { id: "bear", name: "Bear", category: "animals" },
  ],
  nature: [
    { id: "sun", name: "Sun", category: "nature" },
    { id: "moon", name: "Moon", category: "nature" },
    { id: "star", name: "Star", category: "nature" },
    { id: "rainbow", name: "Rainbow", category: "nature" },
    { id: "flower", name: "Flower", category: "nature" },
    { id: "tree", name: "Tree", category: "nature" },
  ],
  food: [
    { id: "apple", name: "Apple", category: "food" },
    { id: "banana", name: "Banana", category: "food" },
  ],
  transport: [
    { id: "car", name: "Car", category: "transport" },
    { id: "rocket", name: "Rocket", category: "transport" },
  ],
  objects: [
    { id: "heart", name: "Heart", category: "objects" },
    { id: "gift", name: "Gift", category: "objects" },
    { id: "balloon", name: "Balloon", category: "objects" },
    { id: "crown", name: "Crown", category: "objects" },
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
    <svg viewBox="0 0 64 64" className="w-20 h-20">
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

function ArrowLeftIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-6 h-6" fill="currentColor">
      <path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z" />
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
  easy: { pairs: 6, cols: 4, rows: 3, timeLimit: 120 },
  medium: { pairs: 8, cols: 4, rows: 4, timeLimit: 90 },
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
    const hasEnergy = await $energy.spend(1);
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
    backgroundMusic.stop();
    gameState.set("finished");
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
    tick,
    backToMenu,
  };
}

// =============================================================================
// Components
// =============================================================================

function MemoryMatch() {
  const $game = useScope(memoryMatchLogic);

  useEffect(() => {
    const unsub = $game.gameState.on(() => {
      if ($game.gameState() === "playing") {
        const interval = setInterval(() => $game.tick(), 1000);
        return () => clearInterval(interval);
      }
    });
    return unsub;
  }, [$game]);

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
            <Link to="/" className="btn bg-purple-500 text-white mt-4 hover:bg-purple-600">
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
            <Link
              to="/dashboard"
              className="flex items-center gap-2 text-white/80 hover:text-white transition-colors"
            >
              <ArrowLeftIcon />
              <span className="text-sm font-medium hidden sm:inline">Back</span>
            </Link>
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

function MenuScreen({ $game }: { $game: ReturnType<typeof memoryMatchLogic> }) {
  return rx(() => {
    const difficulty = $game.difficulty();
    const category = $game.category();
    const energy = $game.energy();
    const hasEnergy = energy > 0;

    return (
      <div className="space-y-6">
        {/* Game Info */}
        <div className="card text-center bg-white/95">
          <BrainIcon />
          <h2 className="font-display text-2xl font-bold text-gray-800 mt-2">
            Memory Match
          </h2>
          <p className="mt-2 text-gray-600">
            Find matching pairs before time runs out!
          </p>
        </div>

        {/* Category Selection */}
        <div className="card bg-white/95">
          <h3 className="font-display text-lg font-semibold text-gray-700 mb-3">
            Choose Theme
          </h3>
          <div className="grid grid-cols-3 gap-3">
            {(Object.entries(CATEGORY_INFO) as [Category, { name: string; color: string }][]).map(
              ([key, info]) => (
                <button
                  key={key}
                  onClick={() => $game.setCategory(key)}
                  className={`p-3 rounded-xl text-center transition-all ${
                    category === key
                      ? `bg-gradient-to-br ${info.color} text-white scale-105 shadow-lg`
                      : "bg-gray-100 hover:bg-gray-200"
                  }`}
                >
                  <div className="font-medium">{info.name}</div>
                </button>
              )
            )}
          </div>
        </div>

        {/* Difficulty Selection */}
        <div className="card bg-white/95">
          <h3 className="font-display text-lg font-semibold text-gray-700 mb-3">
            Choose Difficulty
          </h3>
          <div className="grid grid-cols-3 gap-3">
            <DifficultyButton
              label="Easy"
              description="6 pairs • 2 min"
              selected={difficulty === "easy"}
              onClick={() => $game.setDifficulty("easy")}
              color="from-emerald-400 to-green-500"
            />
            <DifficultyButton
              label="Medium"
              description="8 pairs • 90s"
              selected={difficulty === "medium"}
              onClick={() => $game.setDifficulty("medium")}
              color="from-amber-400 to-orange-500"
            />
            <DifficultyButton
              label="Hard"
              description="10 pairs • 60s"
              selected={difficulty === "hard"}
              onClick={() => $game.setDifficulty("hard")}
              color="from-red-400 to-rose-500"
            />
          </div>
        </div>

        {/* How to Play */}
        <div className="card bg-purple-100/80">
          <h3 className="font-display text-lg font-semibold text-purple-800 mb-2">
            How to Play
          </h3>
          <ul className="text-sm text-purple-700 space-y-1">
            <li>• Tap cards to flip them</li>
            <li>• Find matching pairs</li>
            <li>• Match all pairs before time runs out!</li>
            <li>• Consecutive matches = bonus points!</li>
          </ul>
        </div>

        {/* Start Button */}
        <button
          onClick={async () => {
            const started = await $game.startGame();
            if (!started) {
              alert("No energy left! Come back tomorrow to play again.");
            }
          }}
          disabled={!hasEnergy}
          className={`w-full py-4 rounded-2xl font-display text-xl font-bold transition-all ${
            hasEnergy
              ? "bg-gradient-to-r from-green-400 to-emerald-500 text-white hover:scale-105 active:scale-95 shadow-lg"
              : "bg-gray-300 text-gray-500 cursor-not-allowed"
          }`}
        >
          {hasEnergy ? (
            <span className="flex items-center justify-center gap-2">
              Start Game <EnergyIcon /> 1
            </span>
          ) : (
            "No Energy - Come Back Tomorrow!"
          )}
        </button>
      </div>
    );
  });
}

function DifficultyButton({
  label,
  description,
  selected,
  onClick,
  color,
}: {
  label: string;
  description: string;
  selected: boolean;
  onClick: () => void;
  color: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`p-3 rounded-xl text-center transition-all ${
        selected
          ? `bg-gradient-to-br ${color} text-white scale-105 shadow-lg`
          : "bg-gray-100 hover:bg-gray-200"
      }`}
    >
      <div className="font-display font-semibold">{label}</div>
      <div className={`text-xs ${selected ? "text-white/80" : "text-gray-500"}`}>
        {description}
      </div>
    </button>
  );
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
  const IconComponent = CARD_ICONS[card.item.id];

  return (
    <button
      onClick={onClick}
      disabled={card.isMatched}
      className={`aspect-square rounded-xl transition-all duration-300 transform ${
        card.isMatched
          ? "opacity-50 scale-95 cursor-default"
          : isRevealed
          ? "bg-white shadow-lg scale-100"
          : "bg-gradient-to-br from-purple-500 to-pink-500 hover:scale-105 active:scale-95 shadow-md"
      }`}
      style={{
        transformStyle: "preserve-3d",
      }}
    >
      {isRevealed ? (
        <div className="flex flex-col items-center justify-center h-full p-2">
          <div className="w-12 h-12 sm:w-16 sm:h-16">
            {IconComponent ? <IconComponent /> : null}
          </div>
          <span className="text-xs font-medium text-gray-700 mt-1 truncate w-full text-center">
            {card.item.name}
          </span>
        </div>
      ) : (
        <div className="flex items-center justify-center h-full">
          <svg viewBox="0 0 24 24" className="w-8 h-8 sm:w-10 sm:h-10 text-white/60">
            <circle cx="12" cy="12" r="10" fill="currentColor" opacity="0.3" />
            <text x="12" y="16" textAnchor="middle" fontSize="12" fill="white" fontWeight="bold">?</text>
          </svg>
        </div>
      )}
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
                alert("No energy left! Come back tomorrow to play again.");
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
          <Link to="/dashboard" className="btn bg-gray-200 text-gray-700 py-3 text-center hover:bg-gray-300">
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
