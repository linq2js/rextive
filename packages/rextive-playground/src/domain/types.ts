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
  score: number;
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

// Available games list
export const AVAILABLE_GAMES = [
  { id: "typing-adventure", name: "Typing Adventure", icon: "⌨️" },
  { id: "memory-match", name: "Memory Match", icon: "🧠" },
  { id: "road-racer", name: "Road Racer", icon: "🏎️" },
  { id: "math-quest", name: "Math Quest", icon: "➕" },
  { id: "word-builder", name: "Word Builder", icon: "📝" },
  { id: "puzzle-time", name: "Puzzle Time", icon: "🧩" },
  { id: "color-fun", name: "Color Fun", icon: "🎨" },
] as const;

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
