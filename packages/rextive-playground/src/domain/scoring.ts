// =============================================================================
// SCORING RULES - Rextive Playground
// =============================================================================

// -----------------------------------------------------------------------------
// 1. GAME SCORING
// -----------------------------------------------------------------------------

/**
 * Base points per correct answer by difficulty
 */
export const BASE_POINTS = {
  easy: 5,
  medium: 10,
  hard: 20,
} as const;

/**
 * Streak bonus: Extra points for consecutive correct answers
 * Formula: floor(streak / 3) × STREAK_MULTIPLIER
 */
export const STREAK_MULTIPLIER = 2;

/**
 * Calculate points for a correct answer
 */
export function calculateAnswerPoints(
  difficulty: "easy" | "medium" | "hard",
  currentStreak: number
): number {
  const basePoints = BASE_POINTS[difficulty];
  const streakBonus = Math.floor(currentStreak / 3) * STREAK_MULTIPLIER;
  return basePoints + streakBonus;
}

/**
 * Accuracy bonus at end of game
 * Formula: accuracy >= 90% → +20%, accuracy >= 80% → +10%
 */
export function calculateAccuracyBonus(
  score: number,
  accuracy: number
): number {
  if (accuracy >= 95) return Math.round(score * 0.25); // +25%
  if (accuracy >= 90) return Math.round(score * 0.20); // +20%
  if (accuracy >= 80) return Math.round(score * 0.10); // +10%
  return 0;
}

/**
 * Time bonus for completing quickly (optional per game)
 * Only if time remaining > 0
 */
export function calculateTimeBonus(
  timeRemaining: number,
  maxTime: number
): number {
  const percentRemaining = timeRemaining / maxTime;
  if (percentRemaining >= 0.5) return 15; // 50%+ time left → +15
  if (percentRemaining >= 0.25) return 10; // 25%+ time left → +10
  return 0;
}

// -----------------------------------------------------------------------------
// 2. XP SYSTEM
// -----------------------------------------------------------------------------

/**
 * Convert game score to XP
 * Formula: score + accuracyBonus + dailyBonus
 */
export const XP_CONFIG = {
  /** XP earned = score × this multiplier */
  scoreToXpMultiplier: 1,
  
  /** Bonus XP for first game of the day */
  dailyFirstGameBonus: 50,
  
  /** Bonus XP per day of streak */
  streakDayBonus: 10,
  
  /** Max streak bonus */
  maxStreakBonus: 100,
} as const;

export function calculateGameXP(
  score: number,
  accuracy: number,
  options: {
    isFirstGameToday?: boolean;
    currentDayStreak?: number;
  } = {}
): { xp: number; breakdown: XPBreakdown } {
  const baseXP = Math.round(score * XP_CONFIG.scoreToXpMultiplier);
  const accuracyBonus = calculateAccuracyBonus(score, accuracy);
  const dailyBonus = options.isFirstGameToday ? XP_CONFIG.dailyFirstGameBonus : 0;
  const streakBonus = Math.min(
    (options.currentDayStreak ?? 0) * XP_CONFIG.streakDayBonus,
    XP_CONFIG.maxStreakBonus
  );

  return {
    xp: baseXP + accuracyBonus + dailyBonus + streakBonus,
    breakdown: {
      base: baseXP,
      accuracy: accuracyBonus,
      dailyFirst: dailyBonus,
      streak: streakBonus,
    },
  };
}

export interface XPBreakdown {
  base: number;
  accuracy: number;
  dailyFirst: number;
  streak: number;
}

// -----------------------------------------------------------------------------
// 3. LEVEL SYSTEM
// -----------------------------------------------------------------------------

/**
 * XP required to reach each level
 * Formula: level × 100 + (level - 1) × 50
 * Level 1: 0 XP
 * Level 2: 150 XP (100 + 50)
 * Level 3: 350 XP (150 + 200)
 * Level 4: 600 XP (350 + 250)
 * ...
 */
export const LEVEL_CONFIG = {
  /** Base XP required per level */
  baseXPPerLevel: 100,
  
  /** Additional XP scaling per level */
  scalingXPPerLevel: 50,
  
  /** Maximum level */
  maxLevel: 50,
} as const;

/**
 * Calculate XP needed to reach a specific level
 */
export function getXPForLevel(level: number): number {
  if (level <= 1) return 0;
  
  let totalXP = 0;
  for (let i = 2; i <= level; i++) {
    totalXP += LEVEL_CONFIG.baseXPPerLevel + (i - 1) * LEVEL_CONFIG.scalingXPPerLevel;
  }
  return totalXP;
}

/**
 * Calculate current level from total XP
 */
export function getLevelFromXP(totalXP: number): {
  level: number;
  currentLevelXP: number;
  nextLevelXP: number;
  progress: number;
} {
  let level = 1;
  
  while (level < LEVEL_CONFIG.maxLevel) {
    const nextLevelXP = getXPForLevel(level + 1);
    if (totalXP < nextLevelXP) {
      const currentLevelXP = getXPForLevel(level);
      const xpIntoLevel = totalXP - currentLevelXP;
      const xpNeeded = nextLevelXP - currentLevelXP;
      
      return {
        level,
        currentLevelXP: xpIntoLevel,
        nextLevelXP: xpNeeded,
        progress: xpNeeded > 0 ? xpIntoLevel / xpNeeded : 1,
      };
    }
    level++;
  }
  
  return {
    level: LEVEL_CONFIG.maxLevel,
    currentLevelXP: 0,
    nextLevelXP: 0,
    progress: 1,
  };
}

/**
 * Level thresholds for quick reference
 */
export const LEVEL_THRESHOLDS = Array.from({ length: 20 }, (_, i) => ({
  level: i + 1,
  xpRequired: getXPForLevel(i + 1),
}));

// -----------------------------------------------------------------------------
// 4. ACHIEVEMENTS
// -----------------------------------------------------------------------------

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: "games" | "streak" | "score" | "level" | "special";
  condition: AchievementCondition;
}

export type AchievementCondition =
  | { type: "gamesPlayed"; count: number }
  | { type: "totalScore"; score: number }
  | { type: "dayStreak"; days: number }
  | { type: "level"; level: number }
  | { type: "accuracy"; percent: number; minGames: number }
  | { type: "gameSpecific"; gameId: string; condition: string };

// Achievement icons are IconName strings from components/Icons.tsx
export const ACHIEVEMENTS: Achievement[] = [
  // Games Played
  {
    id: "first-steps",
    name: "First Steps",
    description: "Play your first game",
    icon: "baby",
    category: "games",
    condition: { type: "gamesPlayed", count: 1 },
  },
  {
    id: "getting-started",
    name: "Getting Started",
    description: "Play 10 games",
    icon: "controller",
    category: "games",
    condition: { type: "gamesPlayed", count: 10 },
  },
  {
    id: "regular-player",
    name: "Regular Player",
    description: "Play 50 games",
    icon: "controller",
    category: "games",
    condition: { type: "gamesPlayed", count: 50 },
  },
  {
    id: "game-master",
    name: "Game Master",
    description: "Play 100 games",
    icon: "trophy",
    category: "games",
    condition: { type: "gamesPlayed", count: 100 },
  },

  // Day Streaks
  {
    id: "on-fire",
    name: "On Fire",
    description: "3 day streak",
    icon: "fire",
    category: "streak",
    condition: { type: "dayStreak", days: 3 },
  },
  {
    id: "week-warrior",
    name: "Week Warrior",
    description: "7 day streak",
    icon: "swords",
    category: "streak",
    condition: { type: "dayStreak", days: 7 },
  },
  {
    id: "fortnight-fighter",
    name: "Fortnight Fighter",
    description: "14 day streak",
    icon: "target",
    category: "streak",
    condition: { type: "dayStreak", days: 14 },
  },
  {
    id: "monthly-champion",
    name: "Monthly Champion",
    description: "30 day streak",
    icon: "trophy",
    category: "streak",
    condition: { type: "dayStreak", days: 30 },
  },

  // Total Score
  {
    id: "century",
    name: "Century",
    description: "Earn 100 total points",
    icon: "check",
    category: "score",
    condition: { type: "totalScore", score: 100 },
  },
  {
    id: "high-scorer",
    name: "High Scorer",
    description: "Earn 1,000 total points",
    icon: "star",
    category: "score",
    condition: { type: "totalScore", score: 1000 },
  },
  {
    id: "point-collector",
    name: "Point Collector",
    description: "Earn 5,000 total points",
    icon: "star",
    category: "score",
    condition: { type: "totalScore", score: 5000 },
  },
  {
    id: "score-legend",
    name: "Score Legend",
    description: "Earn 10,000 total points",
    icon: "star",
    category: "score",
    condition: { type: "totalScore", score: 10000 },
  },

  // Levels
  {
    id: "rising-star",
    name: "Rising Star",
    description: "Reach level 5",
    icon: "star",
    category: "level",
    condition: { type: "level", level: 5 },
  },
  {
    id: "apprentice",
    name: "Apprentice",
    description: "Reach level 10",
    icon: "brain",
    category: "level",
    condition: { type: "level", level: 10 },
  },
  {
    id: "expert",
    name: "Expert",
    description: "Reach level 20",
    icon: "trophy",
    category: "level",
    condition: { type: "level", level: 20 },
  },
  {
    id: "master",
    name: "Master",
    description: "Reach level 30",
    icon: "trophy",
    category: "level",
    condition: { type: "level", level: 30 },
  },

  // Accuracy
  {
    id: "perfectionist",
    name: "Perfectionist",
    description: "95%+ accuracy in 10 games",
    icon: "target",
    category: "special",
    condition: { type: "accuracy", percent: 95, minGames: 10 },
  },

  // Game Specific - Typing Adventure
  {
    id: "speed-typer",
    name: "Speed Typer",
    description: "Type 20 words in one game",
    icon: "keyboard",
    category: "special",
    condition: { type: "gameSpecific", gameId: "typing-adventure", condition: "wordsInGame:20" },
  },
  {
    id: "typing-master",
    name: "Typing Master",
    description: "Complete hard difficulty with 90%+ accuracy",
    icon: "trophy",
    category: "special",
    condition: { type: "gameSpecific", gameId: "typing-adventure", condition: "hardWithAccuracy:90" },
  },
];

/**
 * Check if an achievement is unlocked
 */
export function checkAchievement(
  achievement: Achievement,
  stats: {
    gamesPlayed: number;
    totalScore: number;
    currentDayStreak: number;
    bestDayStreak: number;
    level: number;
    averageAccuracy: number;
    gamesWithHighAccuracy: number;
    gameSpecificStats: Record<string, unknown>;
  }
): boolean {
  const { condition } = achievement;

  switch (condition.type) {
    case "gamesPlayed":
      return stats.gamesPlayed >= condition.count;
    
    case "totalScore":
      return stats.totalScore >= condition.score;
    
    case "dayStreak":
      return stats.bestDayStreak >= condition.days;
    
    case "level":
      return stats.level >= condition.level;
    
    case "accuracy":
      return stats.gamesWithHighAccuracy >= condition.minGames;
    
    case "gameSpecific":
      // Game-specific achievements need custom logic per game
      const gameStats = stats.gameSpecificStats[condition.gameId];
      if (!gameStats) return false;
      // Parse condition string and check (simplified)
      return false; // Implement per-game logic
    
    default:
      return false;
  }
}

// -----------------------------------------------------------------------------
// 5. STAR RATING (End of Game)
// -----------------------------------------------------------------------------

/**
 * Calculate star rating (1-3 stars) based on performance
 */
export function calculateStarRating(
  wordsCompleted: number,
  targetWords: number,
  accuracy: number,
  bestStreak: number
): 1 | 2 | 3 {
  const completionRate = wordsCompleted / targetWords;
  
  // 3 stars: Complete all words, 95%+ accuracy, streak of 5+
  if (completionRate >= 1 && accuracy >= 95 && bestStreak >= 5) {
    return 3;
  }
  
  // 2 stars: Complete 80%+ words, 80%+ accuracy, streak of 3+
  if (completionRate >= 0.8 && accuracy >= 80 && bestStreak >= 3) {
    return 2;
  }
  
  // 1 star: Participated
  return 1;
}

// -----------------------------------------------------------------------------
// SUMMARY TABLE
// -----------------------------------------------------------------------------

/**
 * Quick Reference:
 * 
 * | Category | Rule | Value |
 * |----------|------|-------|
 * | Base Points (Easy) | Per correct answer | 5 pts |
 * | Base Points (Medium) | Per correct answer | 10 pts |
 * | Base Points (Hard) | Per correct answer | 20 pts |
 * | Streak Bonus | Per 3 consecutive | +2 pts |
 * | Accuracy Bonus (95%+) | End of game | +25% |
 * | Accuracy Bonus (90%+) | End of game | +20% |
 * | Accuracy Bonus (80%+) | End of game | +10% |
 * | First Game Daily | XP bonus | +50 XP |
 * | Day Streak | XP per day | +10 XP (max 100) |
 * | Level 2 | XP required | 150 XP |
 * | Level 5 | XP required | 750 XP |
 * | Level 10 | XP required | 2,750 XP |
 */

