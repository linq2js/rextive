// Infrastructure layer - Parent management repository for kid actions
import { db } from "../database";
import { ENERGY_CONFIG, AVAILABLE_GAMES } from "@/domain/types";
import type { KidGameSettings, GameProgress } from "@/domain/types";

function getTodayDate(): string {
  return new Date().toISOString().split("T")[0];
}

export interface ParentManagementRepository {
  // Energy management
  refillEnergy(kidId: number): Promise<void>;
  refillAllEnergy(): Promise<void>;

  // Stats management
  resetKidStats(kidId: number): Promise<void>;
  resetGameStats(kidId: number, gameId: string): Promise<void>;
  getKidGameStats(kidId: number): Promise<GameProgress[]>;

  // Game visibility
  getGameSettings(kidId: number): Promise<KidGameSettings[]>;
  setGameVisibility(kidId: number, gameId: string, visible: boolean): Promise<void>;
  setAllGamesVisibility(kidId: number, visible: boolean): Promise<void>;
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
};

