// Infrastructure layer - Parent management repository for kid actions
import { db } from "../database";
import { ENERGY_CONFIG, AVAILABLE_GAMES } from "@/domain/types";
import type { KidGameSettings, GameProgress } from "@/domain/types";

function getTodayDate(): string {
  return new Date().toISOString().split("T")[0];
}

// Max XP value that unlocks all games (highest unlock is 12000 + buffer)
export const MAX_XP_VALUE = 15000;

export interface ParentManagementRepository {
  // Energy management
  refillEnergy(kidId: number): Promise<void>;
  refillAllEnergy(): Promise<void>;

  // Stats management
  resetKidStats(kidId: number): Promise<void>;
  resetGameStats(kidId: number, gameId: string): Promise<void>;
  getKidGameStats(kidId: number): Promise<GameProgress[]>;
  
  // XP management
  setMaxXp(kidId: number): Promise<void>;

  // Game visibility
  getGameSettings(kidId: number): Promise<KidGameSettings[]>;
  setGameVisibility(kidId: number, gameId: string, visible: boolean): Promise<void>;
  setAllGamesVisibility(kidId: number, visible: boolean): Promise<void>;

  // ============================================================================
  // TESTING UTILITIES
  // These functions are for testing/demo purposes only.
  // Remove this section when deploying to production.
  // ============================================================================
  generateSampleStats(kidId: number): Promise<void>;
  generateSampleStatsForAll(): Promise<void>;
}

export const parentManagementRepository: ParentManagementRepository = {
  // Energy management
  async refillEnergy(kidId: number): Promise<void> {
    const today = getTodayDate();
    const existing = await db.kidEnergy.where("kidId").equals(kidId).first();

    if (existing?.id) {
      await db.kidEnergy.update(existing.id, {
        current: ENERGY_CONFIG.maxEnergy,
        lastRefillDate: today,
      });
    } else {
      await db.kidEnergy.add({
        kidId,
        current: ENERGY_CONFIG.maxEnergy,
        lastRefillDate: today,
      });
    }
  },

  async refillAllEnergy(): Promise<void> {
    const today = getTodayDate();
    const kids = await db.kidProfiles.toArray();

    for (const kid of kids) {
      if (!kid.id) continue;
      const existing = await db.kidEnergy.where("kidId").equals(kid.id).first();

      if (existing?.id) {
        await db.kidEnergy.update(existing.id, {
          current: ENERGY_CONFIG.maxEnergy,
          lastRefillDate: today,
        });
      } else {
        await db.kidEnergy.add({
          kidId: kid.id,
          current: ENERGY_CONFIG.maxEnergy,
          lastRefillDate: today,
        });
      }
    }
  },

  // Stats management
  async resetKidStats(kidId: number): Promise<void> {
    await db.gameProgress.where("kidId").equals(kidId).delete();
  },

  async resetGameStats(kidId: number, gameId: string): Promise<void> {
    await db.gameProgress
      .where("[kidId+gameName]")
      .equals([kidId, gameId])
      .delete();
  },

  async getKidGameStats(kidId: number): Promise<GameProgress[]> {
    const stats = await db.gameProgress.where("kidId").equals(kidId).toArray();
    return stats as GameProgress[];
  },

  // XP management - set kid's total XP to max (unlocks all games)
  async setMaxXp(kidId: number): Promise<void> {
    // Create or update a "bonus" game progress entry to grant max XP
    const bonusGameId = "__parent_bonus__";
    const existing = await db.gameProgress
      .where("[kidId+gameName]")
      .equals([kidId, bonusGameId])
      .first();

    if (existing?.id) {
      await db.gameProgress.update(existing.id, {
        totalScore: MAX_XP_VALUE,
        highScore: MAX_XP_VALUE,
        lastPlayed: new Date(),
      });
    } else {
      await db.gameProgress.add({
        kidId,
        gameName: bonusGameId,
        highScore: MAX_XP_VALUE,
        totalScore: MAX_XP_VALUE,
        timesPlayed: 1,
        level: 1,
        lastPlayed: new Date(),
      });
    }
  },

  // Game visibility
  async getGameSettings(kidId: number): Promise<KidGameSettings[]> {
    const settings = await db.kidGameSettings
      .where("kidId")
      .equals(kidId)
      .toArray();

    // If no settings exist, return defaults (all visible)
    if (settings.length === 0) {
      return AVAILABLE_GAMES.map((game) => ({
        id: 0, // Will be assigned on save
        kidId,
        gameId: game.id,
        visible: true,
      }));
    }

    // Ensure all games have settings (for newly added games)
    const existingGameIds = new Set(settings.map((s) => s.gameId));
    const allSettings: KidGameSettings[] = [...(settings as KidGameSettings[])];

    for (const game of AVAILABLE_GAMES) {
      if (!existingGameIds.has(game.id)) {
        allSettings.push({
          id: 0,
          kidId,
          gameId: game.id,
          visible: true,
        });
      }
    }

    return allSettings;
  },

  async setGameVisibility(
    kidId: number,
    gameId: string,
    visible: boolean
  ): Promise<void> {
    const existing = await db.kidGameSettings
      .where("[kidId+gameId]")
      .equals([kidId, gameId])
      .first();

    if (existing?.id) {
      await db.kidGameSettings.update(existing.id, { visible });
    } else {
      await db.kidGameSettings.add({ kidId, gameId, visible });
    }
  },

  async setAllGamesVisibility(kidId: number, visible: boolean): Promise<void> {
    for (const game of AVAILABLE_GAMES) {
      await this.setGameVisibility(kidId, game.id, visible);
    }
  },

  // ============================================================================
  // TESTING UTILITIES
  // These functions are for testing/demo purposes only.
  // Remove this section when deploying to production.
  // ============================================================================

  /**
   * Generates sample/mock stats for a specific kid.
   * Creates realistic-looking game progress data for all available games.
   * Useful for testing the UI without playing actual games.
   * 
   * @param kidId - ID of the kid to generate stats for
   */
  async generateSampleStats(kidId: number): Promise<void> {
    // Generate random stats for each game
    for (const game of AVAILABLE_GAMES) {
      // Random values to make stats look realistic
      const timesPlayed = Math.floor(Math.random() * 50) + 5; // 5-55 plays
      const highScore = Math.floor(Math.random() * 500) + 100; // 100-600
      const totalScore = highScore * Math.floor(Math.random() * 3 + 1); // 1-3x high score
      const level = Math.floor(Math.random() * 10) + 1; // 1-10

      // Random last played date within last 14 days
      const daysAgo = Math.floor(Math.random() * 14);
      const lastPlayed = new Date();
      lastPlayed.setDate(lastPlayed.getDate() - daysAgo);

      // Check if record exists
      const existing = await db.gameProgress
        .where("[kidId+gameName]")
        .equals([kidId, game.id])
        .first();

      if (existing?.id) {
        // Update existing
        await db.gameProgress.update(existing.id, {
          highScore,
          totalScore,
          timesPlayed,
          level,
          lastPlayed,
        });
      } else {
        // Create new
        await db.gameProgress.add({
          kidId,
          gameName: game.id,
          highScore,
          totalScore,
          timesPlayed,
          level,
          lastPlayed,
        });
      }
    }
  },

  /**
   * Generates sample stats for ALL kids.
   * Useful for quickly populating the entire app with test data.
   */
  async generateSampleStatsForAll(): Promise<void> {
    const kids = await db.kidProfiles.toArray();
    for (const kid of kids) {
      if (kid.id) {
        await this.generateSampleStats(kid.id);
      }
    }
  },
};

