/**
 * @file gameStats.logic.ts
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
 * // Access stats with Suspense (throws while loading)
 * const stats = wait($stats.stats());
 *
 * // Or use task.from for manual loading/error handling
 * const state = task.from($stats.stats());
 * if (state?.loading) return <Spinner />;
 * if (state?.error) return <Error />;
 * const stats = state?.value;
 *
 * // Refresh after recording a game
 * $stats.refresh();
 * ```
 */
import { signal } from "rextive";
import { selectedProfileLogic } from "./selectedProfile.logic";
import { gameProgressRepository } from "@/infrastructure/repositories";
import type { GameProgress } from "@/domain/types";

/**
 * Creates a logic instance for managing stats for a specific game.
 *
 * @param gameName - Unique game identifier (e.g., "typing-adventure", "memory-match")
 * @returns Logic object with stats signal and refresh action
 */
export function gameStatsLogic(gameName: string) {
  // ============================================================================
  // DEPENDENCIES
  // ============================================================================

  const $profile = selectedProfileLogic();

  // ============================================================================
  // STATE: GAME STATS
  // ============================================================================

  /**
   * Async computed signal that fetches stats for this game.
   * Re-fetches when selected profile changes.
   *
   * Returns null if no profile is selected or no stats exist yet.
   *
   * Usage:
   * - `wait($stats.stats())` - For Suspense-based loading
   * - `task.from($stats.stats())` - For manual loading/error state handling
   * - `$stats.refresh()` - Force re-fetch after recording a game
   */
  const stats = signal(
    { profile: $profile.profile },
    async ({ deps }): Promise<GameProgress | null> => {
      if (!deps.profile) return null;
      return gameProgressRepository.getByKidAndGame(deps.profile.id, gameName);
    },
    { name: `gameStats.${gameName}` }
  );

  // ============================================================================
  // EXPORTS
  // ============================================================================

  return {
    /** Async signal for game stats */
    stats,
    /** Force re-fetch stats (call after recording a game) */
    refresh: stats.refresh,
  };
}
