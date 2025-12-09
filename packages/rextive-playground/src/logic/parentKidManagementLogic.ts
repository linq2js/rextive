// Local logic for parent kid management (energy, stats, game visibility)
import { signal } from "rextive";
import { parentManagementRepository } from "@/infrastructure/repositories";
import { AVAILABLE_GAMES, type KidGameSettings, type GameProgress } from "@/domain/types";
import { kidProfilesLogic } from "./kidProfilesLogic";

export function parentKidManagementLogic() {
  const $profiles = kidProfilesLogic();

  const selectedKidId = signal<number | null>(null, {
    name: "parentKidMgmt.selectedKidId",
  });

  const kidGameSettings = signal<KidGameSettings[]>([], {
    name: "parentKidMgmt.gameSettings",
  });

  const kidGameStats = signal<GameProgress[]>([], {
    name: "parentKidMgmt.gameStats",
  });

  const isLoading = signal(false, { name: "parentKidMgmt.isLoading" });
  const actionMessage = signal<{ type: "success" | "error"; text: string } | null>(
    null,
    { name: "parentKidMgmt.message" }
  );

  // Get selected kid profile
  const selectedKid = signal(
    { selectedKidId, profiles: $profiles.profiles },
    ({ deps }) => {
      if (deps.selectedKidId === null) return null;
      return deps.profiles.find((p) => p.id === deps.selectedKidId) ?? null;
    },
    { name: "parentKidMgmt.selectedKid" }
  );

  // Select a kid
  async function selectKid(kidId: number | null) {
    selectedKidId.set(kidId);
    if (kidId === null) {
      kidGameSettings.set([]);
      kidGameStats.set([]);
      return;
    }

    isLoading.set(true);
    try {
      const [settings, stats] = await Promise.all([
        parentManagementRepository.getGameSettings(kidId),
        parentManagementRepository.getKidGameStats(kidId),
      ]);
      kidGameSettings.set(settings);
      kidGameStats.set(stats);
    } finally {
      isLoading.set(false);
    }
  }

  // Show message helper
  let messageTimeout: ReturnType<typeof setTimeout> | null = null;

  function showMessage(type: "success" | "error", text: string) {
    // Clear any existing timeout
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
  async function refillEnergy(kidId: number) {
    isLoading.set(true);
    try {
      await parentManagementRepository.refillEnergy(kidId);
      showMessage("success", "Energy refilled! ⚡");
    } catch {
      showMessage("error", "Failed to refill energy");
    } finally {
      isLoading.set(false);
    }
  }

  async function refillAllEnergy() {
    isLoading.set(true);
    try {
      await parentManagementRepository.refillAllEnergy();
      showMessage("success", "All kids' energy refilled! ⚡");
    } catch {
      showMessage("error", "Failed to refill energy");
    } finally {
      isLoading.set(false);
    }
  }

  // Stats actions
  async function resetKidStats(kidId: number) {
    isLoading.set(true);
    try {
      await parentManagementRepository.resetKidStats(kidId);
      kidGameStats.set([]);
      showMessage("success", "All stats reset! 📊");
    } catch {
      showMessage("error", "Failed to reset stats");
    } finally {
      isLoading.set(false);
    }
  }

  async function resetGameStats(kidId: number, gameId: string) {
    isLoading.set(true);
    try {
      await parentManagementRepository.resetGameStats(kidId, gameId);
      // Refresh stats
      const stats = await parentManagementRepository.getKidGameStats(kidId);
      kidGameStats.set(stats);
      showMessage("success", "Game stats reset! 🎮");
    } catch {
      showMessage("error", "Failed to reset game stats");
    } finally {
      isLoading.set(false);
    }
  }

  // Game visibility actions
  async function toggleGameVisibility(kidId: number, gameId: string) {
    const currentSettings = kidGameSettings();
    const setting = currentSettings.find((s) => s.gameId === gameId);
    const newVisible = !setting?.visible;

    isLoading.set(true);
    try {
      await parentManagementRepository.setGameVisibility(kidId, gameId, newVisible);

      // Update local state
      kidGameSettings.set(
        currentSettings.map((s) =>
          s.gameId === gameId ? { ...s, visible: newVisible } : s
        )
      );

      showMessage(
        "success",
        newVisible ? "Game enabled! 👁️" : "Game hidden! 🙈"
      );
    } catch {
      showMessage("error", "Failed to update game visibility");
    } finally {
      isLoading.set(false);
    }
  }

  async function setAllGamesVisibility(kidId: number, visible: boolean) {
    isLoading.set(true);
    try {
      await parentManagementRepository.setAllGamesVisibility(kidId, visible);

      // Update local state
      kidGameSettings.set(
        kidGameSettings().map((s) => ({ ...s, visible }))
      );

      showMessage(
        "success",
        visible ? "All games enabled! 👁️" : "All games hidden! 🙈"
      );
    } catch {
      showMessage("error", "Failed to update game visibility");
    } finally {
      isLoading.set(false);
    }
  }

  return {
    // State
    selectedKidId,
    selectedKid,
    kidGameSettings,
    kidGameStats,
    isLoading,
    actionMessage,
    profiles: $profiles.profiles,
    profilesLoading: $profiles.isLoading,
    availableGames: AVAILABLE_GAMES,
    // Actions
    selectKid,
    refillEnergy,
    refillAllEnergy,
    resetKidStats,
    resetGameStats,
    toggleGameVisibility,
    setAllGamesVisibility,
  };
}

