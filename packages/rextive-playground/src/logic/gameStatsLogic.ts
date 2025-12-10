// Logic for game stats per kid
import { signal, task } from "rextive";
import { selectedProfileLogic } from "./selectedProfileLogic";
import { gameProgressRepository } from "@/infrastructure/repositories";
import type { GameProgress } from "@/domain/types";

export function gameStatsLogic(gameName: string) {
  const $profile = selectedProfileLogic();

  // Trigger for refresh
  const [onRefresh, refresh] = signal<void>().tuple;

  // Stats - fetches based on selected profile and refresh trigger
  const stats = signal(
    { profile: $profile.profile, onRefresh },
    async ({ deps }): Promise<GameProgress | null> => {
      void deps.onRefresh; // Access to establish dependency
      if (!deps.profile) return null;
      return gameProgressRepository.getByKidAndGame(deps.profile.id, gameName);
    },
    { name: `gameStats.${gameName}` }
  );

  // Task-wrapped for stale-while-revalidate access
  const statsTask = stats.pipe(task<GameProgress | null>(null));

  return {
    stats,
    statsTask,
    refresh,
  };
}
