// Logic for game stats per kid
import { signal } from "rextive";
import { selectedProfileLogic } from "./selectedProfileLogic";
import { gameProgressRepository } from "@/infrastructure/repositories";
import type { GameProgress } from "@/domain/types";

export function gameStatsLogic(gameName: string) {
  const $profile = selectedProfileLogic();

  const stats = signal<GameProgress | null>(null, { name: `gameStats.${gameName}` });
  const isLoading = signal(true, { name: `gameStats.${gameName}.isLoading` });

  // Load stats when profile changes
  async function refresh() {
    const profile = $profile.profile();
    if (!profile) {
      stats.set(null);
      isLoading.set(false);
      return;
    }

    isLoading.set(true);
    const data = await gameProgressRepository.getByKidAndGame(profile.id, gameName);
    stats.set(data);
    isLoading.set(false);
  }

  // Subscribe to profile changes
  $profile.profile.on(() => {
    refresh();
  });

  // Initial load
  refresh();

  return {
    stats,
    isLoading,
    profile: $profile.profile,
    refresh,
  };
}

