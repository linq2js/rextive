// Infrastructure layer - Game progress repository
import { db } from "../database";
import type { GameProgress } from "@/domain/types";

export interface GameProgressRepository {
  getByKidAndGame(
    kidId: number,
    gameName: string
  ): Promise<GameProgress | null>;
  getByKid(kidId: number): Promise<GameProgress[]>;
  /** Record a game session - accumulates stats instead of replacing */
  recordGameSession(
    kidId: number,
    gameName: string,
    score: number,
    level?: number
  ): Promise<void>;
  /** @deprecated Use recordGameSession instead */
  upsert(progress: Omit<GameProgress, "id">): Promise<void>;
}

export const gameProgressRepository: GameProgressRepository = {
  async getByKidAndGame(
    kidId: number,
    gameName: string
  ): Promise<GameProgress | null> {
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

  async recordGameSession(
    kidId: number,
    gameName: string,
    score: number,
    level: number = 1
  ): Promise<void> {
    const existing = await db.gameProgress
      .where("[kidId+gameName]")
      .equals([kidId, gameName])
      .first();

    if (existing?.id) {
      // Accumulate stats (handle old records that may have 'score' instead of 'highScore')
      const existingRecord = existing as any;
      const oldHighScore =
        existingRecord.highScore ?? existingRecord.score ?? 0;
      const oldTotalScore =
        existingRecord.totalScore ?? existingRecord.score ?? 0;

      await db.gameProgress.update(existing.id, {
        highScore: Math.max(oldHighScore, score),
        totalScore: oldTotalScore + score,
        timesPlayed: (existingRecord.timesPlayed ?? 1) + 1,
        level: Math.max(existing.level ?? 1, level),
        lastPlayed: new Date(),
      });
    } else {
      // First time playing this game
      await db.gameProgress.add({
        kidId,
        gameName,
        highScore: score,
        totalScore: score,
        timesPlayed: 1,
        level,
        lastPlayed: new Date(),
      });
    }
  },

  // Legacy method - kept for backwards compatibility
  async upsert(progress: Omit<GameProgress, "id">): Promise<void> {
    // Delegate to new method
    await this.recordGameSession(
      progress.kidId,
      progress.gameName,
      progress.highScore ?? (progress as any).score ?? 0,
      progress.level
    );
  },
};
