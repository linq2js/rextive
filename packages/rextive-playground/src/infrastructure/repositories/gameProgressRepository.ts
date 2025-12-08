// Infrastructure layer - Game progress repository
import { db } from "../database";
import type { GameProgress } from "@/domain/types";

export interface GameProgressRepository {
  getByKidAndGame(kidId: number, gameName: string): Promise<GameProgress | null>;
  getByKid(kidId: number): Promise<GameProgress[]>;
  upsert(progress: Omit<GameProgress, "id">): Promise<void>;
}

export const gameProgressRepository: GameProgressRepository = {
  async getByKidAndGame(kidId: number, gameName: string): Promise<GameProgress | null> {
    const progress = await db.gameProgress
      .where("[kidId+gameName]")
      .equals([kidId, gameName])
      .first();
    
    return progress ? (progress as GameProgress) : null;
  },

  async getByKid(kidId: number): Promise<GameProgress[]> {
    const stats = await db.gameProgress.where("kidId").equals(kidId).toArray();
    return stats as GameProgress[];
  },

  async upsert(progress: Omit<GameProgress, "id">): Promise<void> {
    const existing = await db.gameProgress
      .where("[kidId+gameName]")
      .equals([progress.kidId, progress.gameName])
      .first();

    if (existing?.id) {
      await db.gameProgress.update(existing.id, progress);
    } else {
      await db.gameProgress.add(progress);
    }
  },
};

