/**
 * @file parentKidManagementLogic.ts
 * @description Local logic for parent kid management panel.
 * 
 * This is a LOCAL logic (not global singleton) - each component instance gets its own.
 * Used in the parent dashboard for managing individual kids' energy, stats, and game visibility.
 * 
 * Features:
 * - Select a kid to manage
 * - Refill energy (single kid or all)
 * - Reset game stats (all or specific game)
 * - Grant max XP to unlock all games
 * - Toggle game visibility (show/hide games from kid)
 * 
 * @dependencies
 * - kidProfilesLogic: For accessing profiles list
 * - parentManagementRepository: For database operations
 * 
 * @example
 * ```ts
 * const $mgmt = useScope(parentKidManagementLogic);
 * 
 * // Select a kid to manage
 * $mgmt.selectKid(kidId);
 * 
 * // Refill that kid's energy
 * await $mgmt.refillEnergy(kidId);
 * 
 * // Hide a game from the kid
 * await $mgmt.toggleGameVisibility(kidId, "typing-adventure");
 * ```
 */
import { signal, task } from "rextive";
import { parentManagementRepository } from "@/infrastructure/repositories";
import { AVAILABLE_GAMES, type KidGameSettings, type GameProgress } from "@/domain/types";
import { kidProfilesLogic } from "./kidProfiles.logic";

export function parentKidManagementLogic() {
  // ============================================================================
  // DEPENDENCIES
  // ============================================================================

  const $profiles = kidProfilesLogic();

  // ============================================================================
  // STATE: SELECTED KID
  // Uses lazy loading pattern - data loads when kid is selected
  // ============================================================================

  /** Tuple pattern: [trigger signal, trigger function] */
  const [onSelectKid, selectKid] = signal<number | null>().tuple;

  /**
   * Computed signal that holds the selected kid's ID.
   * Defaults to null until a kid is selected via selectKid().
   */
  const selectedKidId = signal(
    { onSelectKid },
    ({ deps }) => deps.onSelectKid ?? null,
    { name: "parentKidMgmt.selectedKidId" }
  );

  /**
   * Computed signal that looks up the full profile for the selected kid.
   * Uses profilesTask for stale-while-revalidate pattern.
   */
  const selectedKid = signal(
    { selectedKidId, profiles: $profiles.profilesTask },
    ({ deps }) => {
      if (deps.selectedKidId === null) return null;
      return deps.profiles.value.find((p) => p.id === deps.selectedKidId) ?? null;
    },
    { name: "parentKidMgmt.selectedKid" }
  );

  // ============================================================================
  // STATE: KID DATA (SETTINGS & STATS)
  // These load when a kid is selected
  // ============================================================================

  /** Refresh trigger for kid-specific data */
  const [onRefreshKidData, refreshKidData] = signal<void>().tuple;

  /**
   * Async signal that fetches game visibility settings for the selected kid.
   * Re-fetches when kid changes or refresh is triggered.
   */
  const gameSettings = signal(
    { selectedKidId, onRefreshKidData },
    async ({ deps }): Promise<KidGameSettings[]> => {
      void deps.onRefreshKidData; // Access to establish dependency
      if (deps.selectedKidId === null) return [];
      return parentManagementRepository.getGameSettings(deps.selectedKidId);
    },
    { name: "parentKidMgmt.gameSettings" }
  );
  const gameSettingsTask = gameSettings.pipe(task<KidGameSettings[]>([]));

  /**
   * Async signal that fetches game progress stats for the selected kid.
   */
  const gameStats = signal(
    { selectedKidId, onRefreshKidData },
    async ({ deps }): Promise<GameProgress[]> => {
      void deps.onRefreshKidData; // Access to establish dependency
      if (deps.selectedKidId === null) return [];
      return parentManagementRepository.getKidGameStats(deps.selectedKidId);
    },
    { name: "parentKidMgmt.gameStats" }
  );
  const gameStatsTask = gameStats.pipe(task<GameProgress[]>([]));

  // ============================================================================
  // ACTION FEEDBACK: MESSAGE SYSTEM
  // Shows success/error messages that auto-dismiss after 3 seconds
  // ============================================================================

  /** Current action message (success or error) */
  const actionMessage = signal<{ type: "success" | "error"; text: string } | null>(
    null,
    { name: "parentKidMgmt.message" }
  );

  /** Timeout handle for auto-dismissing messages */
  let messageTimeout: ReturnType<typeof setTimeout> | null = null;

  /**
   * Shows a feedback message that auto-dismisses after 3 seconds.
   * 
   * @param type - "success" or "error"
   * @param text - Message text to display
   */
  function showMessage(type: "success" | "error", text: string) {
    // Clear any existing timeout
    if (messageTimeout) clearTimeout(messageTimeout);

    actionMessage.set({ type, text });
    
    messageTimeout = setTimeout(() => {
      try {
        actionMessage.set(null);
      } catch {
        // Signal may be disposed if user navigated away, ignore the error
      }
    }, 3000);
  }

  // ============================================================================
  // ENERGY ACTIONS
  // ============================================================================

  const refillEnergyState = signal<Promise<void>>();

  /**
   * Refills energy to max for a specific kid.
   * 
   * @param kidId - ID of the kid to refill energy for
   */
  async function refillEnergy(kidId: number) {
    const promise = (async () => {
      await parentManagementRepository.refillEnergy(kidId);
      showMessage("success", "Energy refilled!");
    })();
    refillEnergyState.set(promise);
    return promise.catch(() => showMessage("error", "Failed to refill energy"));
  }

  const refillAllEnergyState = signal<Promise<void>>();

  /**
   * Refills energy to max for ALL kids.
   */
  async function refillAllEnergy() {
    const promise = (async () => {
      await parentManagementRepository.refillAllEnergy();
      showMessage("success", "All kids' energy refilled!");
    })();
    refillAllEnergyState.set(promise);
    return promise.catch(() => showMessage("error", "Failed to refill energy"));
  }

  // ============================================================================
  // STATS ACTIONS
  // ============================================================================

  const resetKidStatsState = signal<Promise<void>>();

  /**
   * Resets ALL game stats for a kid (high scores, progress, etc.).
   * This is a destructive action - should confirm with user first.
   * 
   * @param kidId - ID of the kid to reset stats for
   */
  async function resetKidStats(kidId: number) {
    const promise = (async () => {
      await parentManagementRepository.resetKidStats(kidId);
      refreshKidData(); // Update displayed stats
      showMessage("success", "All stats reset!");
    })();
    resetKidStatsState.set(promise);
    return promise.catch(() => showMessage("error", "Failed to reset stats"));
  }

  const resetGameStatsState = signal<Promise<void>>();

  /**
   * Resets stats for a specific game only.
   * 
   * @param kidId - ID of the kid
   * @param gameId - ID of the game to reset
   */
  async function resetGameStats(kidId: number, gameId: string) {
    const promise = (async () => {
      await parentManagementRepository.resetGameStats(kidId, gameId);
      refreshKidData(); // Update displayed stats
      showMessage("success", "Game stats reset!");
    })();
    resetGameStatsState.set(promise);
    return promise.catch(() => showMessage("error", "Failed to reset game stats"));
  }

  const setMaxXpState = signal<Promise<void>>();

  /**
   * Grants maximum XP to unlock all games instantly.
   * Useful for testing or if parent wants kid to access all games.
   * 
   * @param kidId - ID of the kid to grant XP to
   */
  async function setMaxXp(kidId: number) {
    const promise = (async () => {
      await parentManagementRepository.setMaxXp(kidId);
      refreshKidData(); // Update displayed stats
      showMessage("success", "Max XP granted! All games unlocked!");
    })();
    setMaxXpState.set(promise);
    return promise.catch(() => showMessage("error", "Failed to set max XP"));
  }

  // ============================================================================
  // GAME VISIBILITY ACTIONS
  // Parents can show/hide specific games from their kids
  // ============================================================================

  const toggleGameVisibilityState = signal<Promise<void>>();

  /**
   * Toggles visibility for a specific game.
   * If currently visible, hides it. If hidden, shows it.
   * 
   * @param kidId - ID of the kid
   * @param gameId - ID of the game to toggle
   */
  async function toggleGameVisibility(kidId: number, gameId: string) {
    // Look up current visibility state
    const currentSettings = gameSettingsTask().value;
    const setting = currentSettings.find((s) => s.gameId === gameId);
    const newVisible = !setting?.visible; // Toggle the current state

    const promise = (async () => {
      await parentManagementRepository.setGameVisibility(kidId, gameId, newVisible);
      refreshKidData(); // Update displayed settings
      showMessage("success", newVisible ? "Game enabled!" : "Game hidden!");
    })();
    toggleGameVisibilityState.set(promise);
    return promise.catch(() => showMessage("error", "Failed to update game visibility"));
  }

  const setAllGamesVisibilityState = signal<Promise<void>>();

  /**
   * Sets visibility for ALL games at once.
   * 
   * @param kidId - ID of the kid
   * @param visible - true to show all games, false to hide all
   */
  async function setAllGamesVisibility(kidId: number, visible: boolean) {
    const promise = (async () => {
      await parentManagementRepository.setAllGamesVisibility(kidId, visible);
      refreshKidData(); // Update displayed settings
      showMessage("success", visible ? "All games enabled!" : "All games hidden!");
    })();
    setAllGamesVisibilityState.set(promise);
    return promise.catch(() => showMessage("error", "Failed to update game visibility"));
  }

  // ============================================================================
  // TESTING UTILITIES
  // These functions are for testing/demo purposes only.
  // Remove this section when deploying to production.
  // ============================================================================

  const generateSampleStatsState = signal<Promise<void>>();

  /**
   * [TESTING] Generates sample/mock stats for a specific kid.
   * Creates realistic-looking game progress data for testing the UI.
   * 
   * @param kidId - ID of the kid to generate stats for
   */
  async function generateSampleStats(kidId: number) {
    const promise = (async () => {
      await parentManagementRepository.generateSampleStats(kidId);
      refreshKidData(); // Update displayed stats
      showMessage("success", "Sample stats generated!");
    })();
    generateSampleStatsState.set(promise);
    return promise.catch(() => showMessage("error", "Failed to generate stats"));
  }

  const generateAllSampleStatsState = signal<Promise<void>>();

  /**
   * [TESTING] Generates sample stats for ALL kids.
   */
  async function generateAllSampleStats() {
    const promise = (async () => {
      await parentManagementRepository.generateSampleStatsForAll();
      refreshKidData(); // Update displayed stats
      showMessage("success", "Sample stats generated for all kids!");
    })();
    generateAllSampleStatsState.set(promise);
    return promise.catch(() => showMessage("error", "Failed to generate stats"));
  }

  // ============================================================================
  // EXPORTS
  // ============================================================================

  return {
    // State
    selectedKidId,
    selectedKid,
    gameSettings,
    gameSettingsTask,
    gameStats,
    gameStatsTask,
    actionMessage,
    availableGames: AVAILABLE_GAMES,
    
    // Actions with state tracking
    selectKid,
    refillEnergy: Object.assign(refillEnergy, { state: refillEnergyState }),
    refillAllEnergy: Object.assign(refillAllEnergy, { state: refillAllEnergyState }),
    resetKidStats: Object.assign(resetKidStats, { state: resetKidStatsState }),
    resetGameStats: Object.assign(resetGameStats, { state: resetGameStatsState }),
    setMaxXp: Object.assign(setMaxXp, { state: setMaxXpState }),
    toggleGameVisibility: Object.assign(toggleGameVisibility, { state: toggleGameVisibilityState }),
    setAllGamesVisibility: Object.assign(setAllGamesVisibility, { state: setAllGamesVisibilityState }),

    // ============================================================================
    // TESTING UTILITIES - Remove in production
    // ============================================================================
    generateSampleStats: Object.assign(generateSampleStats, { state: generateSampleStatsState }),
    generateAllSampleStats: Object.assign(generateAllSampleStats, { state: generateAllSampleStatsState }),
  };
}
