// Local logic for parent kid management (energy, stats, game visibility)
import { signal, task } from "rextive";
import { parentManagementRepository } from "@/infrastructure/repositories";
import { AVAILABLE_GAMES, type KidGameSettings, type GameProgress } from "@/domain/types";
import { kidProfilesLogic } from "./kidProfilesLogic";

export function parentKidManagementLogic() {
  const $profiles = kidProfilesLogic();

  // Selected kid - lazy loading pattern (action triggered)
  const [onSelectKid, selectKid] = signal<number | null>().tuple;

  const selectedKidId = signal(
    { onSelectKid },
    ({ deps }) => deps.onSelectKid ?? null,
    { name: "parentKidMgmt.selectedKidId" }
  );

  // Get selected kid profile from profiles (sync computed using profilesTask)
  const selectedKid = signal(
    { selectedKidId, profiles: $profiles.profilesTask },
    ({ deps }) => {
      if (deps.selectedKidId === null) return null;
      return deps.profiles.value.find((p) => p.id === deps.selectedKidId) ?? null;
    },
    { name: "parentKidMgmt.selectedKid" }
  );

  // Trigger for refreshing kid data
  const [onRefreshKidData, refreshKidData] = signal<void>().tuple;

  // Game settings - loads when kid is selected
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

  // Game stats - loads when kid is selected
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

  // Action message for feedback
  const actionMessage = signal<{ type: "success" | "error"; text: string } | null>(
    null,
    { name: "parentKidMgmt.message" }
  );

  // Show message helper
  let messageTimeout: ReturnType<typeof setTimeout> | null = null;

  function showMessage(type: "success" | "error", text: string) {
    if (messageTimeout) clearTimeout(messageTimeout);
    actionMessage.set({ type, text });
    messageTimeout = setTimeout(() => {
      try {
        actionMessage.set(null);
      } catch {
        // Signal may be disposed if user navigated away, ignore
      }
    }, 3000);
  }

  // Energy actions
  const refillEnergyState = signal<Promise<void>>();
  async function refillEnergy(kidId: number) {
    const promise = (async () => {
      await parentManagementRepository.refillEnergy(kidId);
      showMessage("success", "Energy refilled!");
    })();
    refillEnergyState.set(promise);
    return promise.catch(() => showMessage("error", "Failed to refill energy"));
  }

  const refillAllEnergyState = signal<Promise<void>>();
  async function refillAllEnergy() {
    const promise = (async () => {
      await parentManagementRepository.refillAllEnergy();
      showMessage("success", "All kids' energy refilled!");
    })();
    refillAllEnergyState.set(promise);
    return promise.catch(() => showMessage("error", "Failed to refill energy"));
  }

  // Stats actions
  const resetKidStatsState = signal<Promise<void>>();
  async function resetKidStats(kidId: number) {
    const promise = (async () => {
      await parentManagementRepository.resetKidStats(kidId);
      refreshKidData();
      showMessage("success", "All stats reset!");
    })();
    resetKidStatsState.set(promise);
    return promise.catch(() => showMessage("error", "Failed to reset stats"));
  }

  const resetGameStatsState = signal<Promise<void>>();
  async function resetGameStats(kidId: number, gameId: string) {
    const promise = (async () => {
      await parentManagementRepository.resetGameStats(kidId, gameId);
      refreshKidData();
      showMessage("success", "Game stats reset!");
    })();
    resetGameStatsState.set(promise);
    return promise.catch(() => showMessage("error", "Failed to reset game stats"));
  }

  // Set max XP to unlock all games
  const setMaxXpState = signal<Promise<void>>();
  async function setMaxXp(kidId: number) {
    const promise = (async () => {
      await parentManagementRepository.setMaxXp(kidId);
      refreshKidData();
      showMessage("success", "Max XP granted! All games unlocked!");
    })();
    setMaxXpState.set(promise);
    return promise.catch(() => showMessage("error", "Failed to set max XP"));
  }

  // Game visibility actions
  const toggleGameVisibilityState = signal<Promise<void>>();
  async function toggleGameVisibility(kidId: number, gameId: string) {
    const currentSettings = gameSettingsTask().value;
    const setting = currentSettings.find((s) => s.gameId === gameId);
    const newVisible = !setting?.visible;

    const promise = (async () => {
      await parentManagementRepository.setGameVisibility(kidId, gameId, newVisible);
      refreshKidData();
      showMessage("success", newVisible ? "Game enabled!" : "Game hidden!");
    })();
    toggleGameVisibilityState.set(promise);
    return promise.catch(() => showMessage("error", "Failed to update game visibility"));
  }

  const setAllGamesVisibilityState = signal<Promise<void>>();
  async function setAllGamesVisibility(kidId: number, visible: boolean) {
    const promise = (async () => {
      await parentManagementRepository.setAllGamesVisibility(kidId, visible);
      refreshKidData();
      showMessage("success", visible ? "All games enabled!" : "All games hidden!");
    })();
    setAllGamesVisibilityState.set(promise);
    return promise.catch(() => showMessage("error", "Failed to update game visibility"));
  }

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
    // Actions
    selectKid,
    refillEnergy: Object.assign(refillEnergy, { state: refillEnergyState }),
    refillAllEnergy: Object.assign(refillAllEnergy, { state: refillAllEnergyState }),
    resetKidStats: Object.assign(resetKidStats, { state: resetKidStatsState }),
    resetGameStats: Object.assign(resetGameStats, { state: resetGameStatsState }),
    setMaxXp: Object.assign(setMaxXp, { state: setMaxXpState }),
    toggleGameVisibility: Object.assign(toggleGameVisibility, { state: toggleGameVisibilityState }),
    setAllGamesVisibility: Object.assign(setAllGamesVisibility, { state: setAllGamesVisibilityState }),
  };
}
