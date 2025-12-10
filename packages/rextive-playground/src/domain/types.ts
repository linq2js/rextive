// Domain entities - pure business types, no framework dependencies

export interface KidProfile {
  id: number;
  name: string;
  avatar: AvatarEmoji;
  age: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface ParentSettings {
  id: number;
  passwordHash: string;
  createdAt: Date;
}

export interface GameProgress {
  id: number;
  kidId: number;
  gameName: string;
  // Best score for this game
  highScore: number;
  // Cumulative stats
  totalScore: number;
  timesPlayed: number;
  // Level progress
  level: number;
  lastPlayed: Date;
}

// Energy (Satima) system
export interface KidEnergy {
  id: number;
  kidId: number;
  current: number;
  lastRefillDate: string; // YYYY-MM-DD format
}

export const ENERGY_CONFIG = {
  maxEnergy: 10,
  refillHour: 9, // 9 AM
  costPerGame: 1,
} as const;

// Kid game settings (visibility per kid)
export interface KidGameSettings {
  id: number;
  kidId: number;
  gameId: string;
  visible: boolean;
}

// Game unlock configuration
// xpRequired: 0 = always unlocked, >0 = requires that much total XP to unlock
export interface GameConfig {
  id: string;
  name: string;
  icon: string;
  xpRequired: number;
  implemented: boolean; // Whether the game is actually playable
}

// Available games list with unlock requirements
// Order matters - games unlock progressively
// Icons are IconName strings from components/Icons.tsx
export const AVAILABLE_GAMES: GameConfig[] = [
  { id: "typing-adventure", name: "Typing Adventure", icon: "keyboard", xpRequired: 0, implemented: true },   // Always unlocked (first game)
  { id: "memory-match", name: "Memory Match", icon: "brain", xpRequired: 500, implemented: true },            // Unlock at 500 XP
  { id: "road-racer", name: "Road Racer", icon: "car", xpRequired: 1500, implemented: true },                 // Unlock at 1500 XP
  { id: "math-quest", name: "Math Quest", icon: "math", xpRequired: 3000, implemented: false },               // Unlock at 3000 XP
  { id: "word-builder", name: "Word Builder", icon: "pencil", xpRequired: 5000, implemented: false },         // Unlock at 5000 XP
  { id: "puzzle-time", name: "Puzzle Time", icon: "puzzle", xpRequired: 8000, implemented: false },           // Unlock at 8000 XP
  { id: "color-fun", name: "Color Fun", icon: "palette", xpRequired: 12000, implemented: false },             // Unlock at 12000 XP
];

// Helper to check if game is unlocked
export function isGameUnlocked(gameId: string, totalXp: number): boolean {
  const game = AVAILABLE_GAMES.find(g => g.id === gameId);
  if (!game) return false;
  return totalXp >= game.xpRequired;
}

// Helper to get next locked game
export function getNextLockedGame(totalXp: number): GameConfig | null {
  return AVAILABLE_GAMES.find(g => g.xpRequired > totalXp) || null;
}

// Helper to get XP needed for next unlock
export function getXpToNextUnlock(totalXp: number): number {
  const nextGame = getNextLockedGame(totalXp);
  if (!nextGame) return 0;
  return nextGame.xpRequired - totalXp;
}

// Chinese 12 Zodiacs
export type ChineseZodiac =
  | "🐀" // Rat
  | "🐂" // Ox
  | "🐅" // Tiger
  | "🐇" // Rabbit
  | "🐉" // Dragon
  | "🐍" // Snake
  | "🐎" // Horse
  | "🐐" // Goat
  | "🐒" // Monkey
  | "🐓" // Rooster
  | "🐕" // Dog
  | "🐖"; // Pig

// Western 12 Zodiacs
export type WesternZodiac =
  | "♈" // Aries
  | "♉" // Taurus
  | "♊" // Gemini
  | "♋" // Cancer
  | "♌" // Leo
  | "♍" // Virgo
  | "♎" // Libra
  | "♏" // Scorpio
  | "♐" // Sagittarius
  | "♑" // Capricorn
  | "♒" // Aquarius
  | "♓"; // Pisces

export type AvatarEmoji = ChineseZodiac | WesternZodiac;

// Chinese Zodiacs
export const CHINESE_ZODIAC_OPTIONS: ChineseZodiac[] = [
  "🐀", // Rat
  "🐂", // Ox
  "🐅", // Tiger
  "🐇", // Rabbit
  "🐉", // Dragon
  "🐍", // Snake
  "🐎", // Horse
  "🐐", // Goat
  "🐒", // Monkey
  "🐓", // Rooster
  "🐕", // Dog
  "🐖", // Pig
];

// Western Zodiacs
export const WESTERN_ZODIAC_OPTIONS: WesternZodiac[] = [
  "♈", // Aries
  "♉", // Taurus
  "♊", // Gemini
  "♋", // Cancer
  "♌", // Leo
  "♍", // Virgo
  "♎", // Libra
  "♏", // Scorpio
  "♐", // Sagittarius
  "♑", // Capricorn
  "♒", // Aquarius
  "♓", // Pisces
];

// Basic Animals (cute faces)
export const BASIC_ANIMALS = [
  "🦁", "🐼", "🐨", "🦊", "🐸", // Unique
  "🐰", "🐯", "🐷", "🐵", "🐶", // Overlap with Chinese
] as const;

export type BasicAnimal = typeof BASIC_ANIMALS[number];

export const AVATAR_OPTIONS: string[] = [
  ...new Set([
    ...BASIC_ANIMALS,
    ...CHINESE_ZODIAC_OPTIONS,
    ...WESTERN_ZODIAC_OPTIONS,
  ])
];

export const AVATAR_COLORS: Record<string, string> = {
  // Basic Animals (Unique)
  "🦁": "bg-yellow-300", // Lion
  "🐼": "bg-stone-100", // Panda
  "🐨": "bg-stone-300", // Koala
  "🦊": "bg-orange-400", // Fox
  "🐸": "bg-green-400", // Frog

  // Chinese Zodiacs
  "🐀": "bg-gray-300", // Rat
  "🐂": "bg-amber-300", // Ox
  "🐅": "bg-orange-300", // Tiger
  "🐇": "bg-pink-200", // Rabbit
  "🐉": "bg-emerald-300", // Dragon
  "🐍": "bg-green-300", // Snake
  "🐎": "bg-amber-200", // Horse
  "🐐": "bg-stone-200", // Goat
  "🐒": "bg-amber-400", // Monkey
  "🐓": "bg-red-200", // Rooster
  "🐕": "bg-yellow-200", // Dog
  "🐖": "bg-pink-300", // Pig

  // Western Zodiacs
  "♈": "bg-red-300", // Aries (Fire)
  "♉": "bg-emerald-300", // Taurus (Earth)
  "♊": "bg-yellow-200", // Gemini (Air)
  "♋": "bg-blue-200", // Cancer (Water)
  "♌": "bg-orange-300", // Leo (Fire)
  "♍": "bg-green-200", // Virgo (Earth)
  "♎": "bg-sky-200", // Libra (Air)
  "♏": "bg-indigo-300", // Scorpio (Water)
  "♐": "bg-rose-300", // Sagittarius (Fire)
  "♑": "bg-stone-300", // Capricorn (Earth)
  "♒": "bg-cyan-200", // Aquarius (Air)
  "♓": "bg-violet-200", // Pisces (Water)
};

// Avatar names for display
export const AVATAR_NAMES: Record<string, string> = {
  // Basic Animals
  "🦁": "Lion",
  "🐼": "Panda",
  "🐨": "Koala",
  "🦊": "Fox",
  "🐸": "Frog",

  // Chinese Zodiacs
  "🐀": "Rat",
  "🐂": "Ox",
  "🐅": "Tiger",
  "🐇": "Rabbit",
  "🐉": "Dragon",
  "🐍": "Snake",
  "🐎": "Horse",
  "🐐": "Goat",
  "🐒": "Monkey",
  "🐓": "Rooster",
  "🐕": "Dog",
  "🐖": "Pig",

  // Western Zodiacs
  "♈": "Aries",
  "♉": "Taurus",
  "♊": "Gemini",
  "♋": "Cancer",
  "♌": "Leo",
  "♍": "Virgo",
  "♎": "Libra",
  "♏": "Scorpio",
  "♐": "Sagittarius",
  "♑": "Capricorn",
  "♒": "Aquarius",
  "♓": "Pisces",
};

// DTOs for creating/updating
export type CreateKidProfile = Pick<KidProfile, "name" | "avatar" | "age">;
export type UpdateKidProfile = Partial<CreateKidProfile>;
