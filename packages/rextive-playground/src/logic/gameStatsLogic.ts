/**
 * @file gameStatsLogic.ts
 * @description Local logic factory for fetching game-specific stats.
 *
 * This is a LOCAL logic factory (not a singleton) - each game page creates its own instance.
 * It fetches and manages game progress stats for the currently selected kid profile.
 *
 * @param gameName - The unique identifier for the game (e.g., "typing-adventure")
 *
 * @example
 * ```ts
 * // In a game component
 * const $stats = useScope(() => gameStatsLogic("typing-adventure"));
 *
 * // Access stats (async)
 * const stats = wait($stats.stats());
 *
 * // Or use task for loading state
 * const { value, loading } = $stats.statsTask();
 *
 * // Refresh after recording a game
 * $stats.refresh();
 * ```
 */
import { signal, task } from "rextive";
import { selectedProfileLogic } from "./selectedProfileLogic";
import { gameProgressRepository } from "@/infrastructure/repositories";
import type { GameProgress } from "@/domain/types";

/**
 * Creates a logic instance for managing stats for a specific game.
 *
 * @param gameName - Unique game identifier (e.g., "typing-adventure", "memory-match")
 * @returns Logic object with stats signals and refresh action
 */
export function gameStatsLogic(gameName: string) {
  // ============================================================================
  // DEPENDENCIES
  // ============================================================================

  const $profile = selectedProfileLogic();

  // ============================================================================
  // REFRESH TRIGGER
  // Used to manually refresh stats after recording a game session
  // ============================================================================

  const [onRefresh, refresh] = signal<void>().tuple;

  // ============================================================================
  // STATE: GAME STATS
  // ============================================================================

  /**
   * Async computed signal that fetches stats for this game.
   * Re-fetches when:
   * - Selected profile changes
   * - Manual refresh is triggered
   *
   * Returns null if no profile is selected or no stats exist yet.
   */
  const stats = signal(
    { profile: $profile.profile, onRefresh },
    async ({ deps }): Promise<GameProgress | null> => {
      void deps.onRefresh; // Access to establish dependency
      if (!deps.profile) return null;
      return gameProgressRepository.getByKidAndGame(deps.profile.id, gameName);
    },
    { name: `gameStats.${gameName}` }
  );

  /**
   * Task-wrapped version for stale-while-revalidate pattern.
   * Provides sync access to last known stats while loading.
   */
  const statsTask = stats.pipe(task<GameProgress | null>(null));

  // ============================================================================
  // EXPORTS
  // ============================================================================

  return {
    /** Async signal for game stats */
    stats,
    /** Task-wrapped stats for sync access */
    statsTask,
    /** Trigger to refresh stats (call after recording a game) */
    refresh,
  };
}
