import type { GameIconName } from "@/components/GameIcons";

export interface GameItem {
  id: string;
  word: string;
  icon: GameIconName;
  category: "animals" | "food" | "nature" | "transport" | "objects" | "body";
  difficulty: "easy" | "medium" | "hard";
}

export const GAME_ITEMS: GameItem[] = [
  // --- Animals (30) ---
  { id: "cat", word: "cat", icon: "cat", category: "animals", difficulty: "easy" },
  { id: "dog", word: "dog", icon: "dog", category: "animals", difficulty: "easy" },
  { id: "pig", word: "pig", icon: "pig", category: "animals", difficulty: "easy" },
  { id: "cow", word: "cow", icon: "cow", category: "animals", difficulty: "easy" },
  { id: "bee", word: "bee", icon: "bee", category: "animals", difficulty: "easy" },
  { id: "bear", word: "bear", icon: "bear", category: "animals", difficulty: "easy" },
  { id: "lion", word: "lion", icon: "lion", category: "animals", difficulty: "easy" },
  { id: "duck", word: "duck", icon: "duck", category: "animals", difficulty: "easy" },
  { id: "fish", word: "fish", icon: "fish", category: "animals", difficulty: "easy" },
  { id: "bird", word: "bird", icon: "bird", category: "animals", difficulty: "easy" },
  { id: "frog", word: "frog", icon: "frog", category: "animals", difficulty: "easy" },
  
  { id: "tiger", word: "tiger", icon: "tiger", category: "animals", difficulty: "medium" },
  { id: "zebra", word: "zebra", icon: "zebra", category: "animals", difficulty: "medium" },
  { id: "sheep", word: "sheep", icon: "sheep", category: "animals", difficulty: "medium" },
  { id: "mouse", word: "mouse", icon: "mouse", category: "animals", difficulty: "medium" },
  { id: "snake", word: "snake", icon: "snake", category: "animals", difficulty: "medium" },
  { id: "whale", word: "whale", icon: "whale", category: "animals", difficulty: "medium" },
  { id: "monkey", word: "monkey", icon: "monkey", category: "animals", difficulty: "medium" },
  { id: "rabbit", word: "rabbit", icon: "rabbit", category: "animals", difficulty: "medium" },
  { id: "spider", word: "spider", icon: "spider", category: "animals", difficulty: "medium" },
  { id: "turtle", word: "turtle", icon: "turtle", category: "animals", difficulty: "medium" },

  { id: "giraffe", word: "giraffe", icon: "giraffe", category: "animals", difficulty: "hard" },
  { id: "dolphin", word: "dolphin", icon: "dolphin", category: "animals", difficulty: "hard" },
  { id: "penguin", word: "penguin", icon: "penguin", category: "animals", difficulty: "hard" },
  { id: "chicken", word: "chicken", icon: "chicken", category: "animals", difficulty: "hard" },
  { id: "ladybug", word: "ladybug", icon: "ladybug", category: "animals", difficulty: "hard" },
  { id: "elephant", word: "elephant", icon: "elephant", category: "animals", difficulty: "hard" },
  { id: "butterfly", word: "butterfly", icon: "butterfly", category: "animals", difficulty: "hard" },

  // --- Food (20) ---
  { id: "egg", word: "egg", icon: "egg", category: "food", difficulty: "easy" },
  { id: "cake", word: "cake", icon: "cake", category: "food", difficulty: "easy" },
  { id: "corn", word: "corn", icon: "corn", category: "food", difficulty: "easy" },
  { id: "milk", word: "milk", icon: "milk", category: "food", difficulty: "easy" },
  { id: "soda", word: "soda", icon: "soda", category: "food", difficulty: "easy" },
  
  { id: "apple", word: "apple", icon: "apple", category: "food", difficulty: "medium" },
  { id: "bread", word: "bread", icon: "bread", category: "food", difficulty: "medium" },
  { id: "pizza", word: "pizza", icon: "pizza", category: "food", difficulty: "medium" },
  { id: "grape", word: "grape", icon: "grape", category: "food", difficulty: "medium" },
  { id: "fries", word: "fries", icon: "fries", category: "food", difficulty: "medium" },
  { id: "donut", word: "donut", icon: "donut", category: "food", difficulty: "medium" },
  { id: "banana", word: "banana", icon: "banana", category: "food", difficulty: "medium" },
  { id: "orange", word: "orange", icon: "orange", category: "food", difficulty: "medium" },
  { id: "cheese", word: "cheese", icon: "cheese", category: "food", difficulty: "medium" },
  { id: "burger", word: "burger", icon: "burger", category: "food", difficulty: "medium" },
  { id: "carrot", word: "carrot", icon: "carrot", category: "food", difficulty: "medium" },
  { id: "cookie", word: "cookie", icon: "cookie", category: "food", difficulty: "medium" },

  { id: "icecream", word: "ice cream", icon: "ice-cream", category: "food", difficulty: "hard" },
  { id: "strawberry", word: "strawberry", icon: "strawberry", category: "food", difficulty: "hard" },
  { id: "watermelon", word: "watermelon", icon: "watermelon", category: "food", difficulty: "hard" },

  // --- Nature (15) ---
  { id: "sun", word: "sun", icon: "sun", category: "nature", difficulty: "easy" },
  { id: "moon", word: "moon", icon: "moon", category: "nature", difficulty: "easy" },
  { id: "star", word: "star", icon: "star", category: "nature", difficulty: "easy" },
  { id: "tree", word: "tree", icon: "tree", category: "nature", difficulty: "easy" },
  { id: "leaf", word: "leaf", icon: "leaf", category: "nature", difficulty: "easy" },
  { id: "rain", word: "rain", icon: "rain", category: "nature", difficulty: "easy" },
  { id: "snow", word: "snow", icon: "snow", category: "nature", difficulty: "easy" },
  { id: "fire", word: "fire", icon: "fire", category: "nature", difficulty: "easy" },

  { id: "cloud", word: "cloud", icon: "cloud", category: "nature", difficulty: "medium" },
  { id: "river", word: "river", icon: "river", category: "nature", difficulty: "medium" },
  { id: "ocean", word: "ocean", icon: "ocean", category: "nature", difficulty: "medium" },
  { id: "flower", word: "flower", icon: "flower", category: "nature", difficulty: "medium" },

  { id: "rainbow", word: "rainbow", icon: "rainbow", category: "nature", difficulty: "hard" },
  { id: "mountain", word: "mountain", icon: "mountain", category: "nature", difficulty: "hard" },

  // --- Transport (10) ---
  { id: "car", word: "car", icon: "car", category: "transport", difficulty: "easy" },
  { id: "bus", word: "bus", icon: "bus", category: "transport", difficulty: "easy" },
  
  { id: "bike", word: "bike", icon: "bike", category: "transport", difficulty: "medium" },
  { id: "boat", word: "boat", icon: "boat", category: "transport", difficulty: "medium" },
  { id: "ship", word: "ship", icon: "ship", category: "transport", difficulty: "medium" },
  { id: "train", word: "train", icon: "train", category: "transport", difficulty: "medium" },
  { id: "plane", word: "plane", icon: "plane", category: "transport", difficulty: "medium" },
  { id: "truck", word: "truck", icon: "truck", category: "transport", difficulty: "medium" },

  { id: "rocket", word: "rocket", icon: "rocket", category: "transport", difficulty: "hard" },
  { id: "helicopter", word: "helicopter", icon: "helicopter", category: "transport", difficulty: "hard" },

  // --- Objects (18) ---
  { id: "hat", word: "hat", icon: "hat", category: "objects", difficulty: "easy" },
  { id: "cup", word: "cup", icon: "cup", category: "objects", difficulty: "easy" },
  { id: "bed", word: "bed", icon: "bed", category: "objects", difficulty: "easy" },
  { id: "key", word: "key", icon: "key", category: "objects", difficulty: "easy" },
  { id: "ball", word: "ball", icon: "ball", category: "objects", difficulty: "easy" },
  { id: "book", word: "book", icon: "book", category: "objects", difficulty: "easy" },
  { id: "shoe", word: "shoe", icon: "shoe", category: "objects", difficulty: "easy" },
  { id: "gift", word: "gift", icon: "gift", category: "objects", difficulty: "easy" },
  
  { id: "lock", word: "lock", icon: "lock", category: "objects", difficulty: "medium" },
  { id: "chair", word: "chair", icon: "chair", category: "objects", difficulty: "medium" },
  { id: "table", word: "table", icon: "table", category: "objects", difficulty: "medium" },
  { id: "phone", word: "phone", icon: "phone", category: "objects", difficulty: "medium" },
  { id: "watch", word: "watch", icon: "watch", category: "objects", difficulty: "medium" },
  { id: "shirt", word: "shirt", icon: "shirt", category: "objects", difficulty: "medium" },
  { id: "pants", word: "pants", icon: "pants", category: "objects", difficulty: "medium" },
  { id: "heart", word: "heart", icon: "heart", category: "objects", difficulty: "medium" },
  { id: "music", word: "music", icon: "music", category: "objects", difficulty: "medium" },
  { id: "house", word: "house", icon: "house", category: "objects", difficulty: "medium" },
  { id: "crown", word: "crown", icon: "crown", category: "objects", difficulty: "medium" },
  { id: "camera", word: "camera", icon: "camera", category: "objects", difficulty: "hard" },
  { id: "pencil", word: "pencil", icon: "pencil", category: "objects", difficulty: "hard" },
  { id: "balloon", word: "balloon", icon: "balloon", category: "objects", difficulty: "hard" },
  { id: "glasses", word: "glasses", icon: "glasses", category: "objects", difficulty: "hard" },

  // --- Body (7) ---
  { id: "eye", word: "eye", icon: "eye", category: "body", difficulty: "easy" },
  { id: "ear", word: "ear", icon: "ear", category: "body", difficulty: "easy" },
  
  { id: "nose", word: "nose", icon: "nose", category: "body", difficulty: "medium" },
  { id: "hand", word: "hand", icon: "hand", category: "body", difficulty: "medium" },
  { id: "foot", word: "foot", icon: "foot", category: "body", difficulty: "medium" },
  { id: "baby", word: "baby", icon: "baby", category: "body", difficulty: "medium" },
  { id: "mouth", word: "mouth", icon: "mouth", category: "body", difficulty: "medium" },
];

export function getWordsByDifficulty(difficulty: "easy" | "medium" | "hard"): GameItem[] {
  return GAME_ITEMS.filter((item) => item.difficulty === difficulty);
}

export function getWordsByCategory(category: string): GameItem[] {
  if (category === "mixed") return GAME_ITEMS;
  return GAME_ITEMS.filter((item) => item.category === category);
}

