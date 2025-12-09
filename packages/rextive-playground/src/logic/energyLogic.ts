// Global logic for energy (Satima) management
import { logic, signal } from "rextive";
import { energyRepository } from "@/infrastructure/repositories";
import { ENERGY_CONFIG } from "@/domain/types";
import { selectedProfileLogic } from "./selectedProfileLogic";

export const energyLogic = logic("energyLogic", () => {
  const $selected = selectedProfileLogic();

  const energy = signal<number>(ENERGY_CONFIG.maxEnergy, {
    name: "energy.current",
  });
  const isLoading = signal(true, { name: "energy.isLoading" });

  // Function to load energy for a kid
  async function loadEnergy(kidId: number | null) {
    if (kidId === null) {
      energy.set(ENERGY_CONFIG.maxEnergy);
      isLoading.set(false);
      return;
    }

    isLoading.set(true);
    try {
      const record = await energyRepository.getEnergy(kidId);
      energy.set(record?.current ?? ENERGY_CONFIG.maxEnergy);
    } finally {
      isLoading.set(false);
    }
  }

  // Load energy immediately if there's already a selected kid (restored from localStorage)
  const initialKidId = $selected.selectedId();
  if (initialKidId !== null) {
    loadEnergy(initialKidId);
  } else {
    isLoading.set(false);
  }

  // Also load energy when profile changes
  $selected.selectedId.on(() => {
    loadEnergy($selected.selectedId());
  });

  async function spend(amount: number = ENERGY_CONFIG.costPerGame): Promise<boolean> {
    const kidId = $selected.selectedId();
    if (kidId === null) {
      console.warn("Energy spend failed: No kid profile selected");
      return false;
    }

    if (energy() < amount) {
      console.warn("Energy spend failed: Not enough energy", energy(), "<", amount);
      return false;
    }

    const success = await energyRepository.spendEnergy(kidId, amount);
    if (success) {
      energy.set((prev) => prev - amount);
    }
    return success;
  }

  async function refresh(): Promise<void> {
    const kidId = $selected.selectedId();
    if (kidId === null) return;

    const record = await energyRepository.getEnergy(kidId);
    energy.set(record?.current ?? ENERGY_CONFIG.maxEnergy);
  }

  // Calculate time until next refill
  function getTimeUntilRefill(): { hours: number; minutes: number } | null {
    const now = new Date();
    const currentHour = now.getHours();

    if (currentHour >= ENERGY_CONFIG.refillHour) {
      // Refill is tomorrow at 9 AM
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(ENERGY_CONFIG.refillHour, 0, 0, 0);
      const diff = tomorrow.getTime() - now.getTime();
      return {
        hours: Math.floor(diff / (1000 * 60 * 60)),
        minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
      };
    } else {
      // Refill is today at 9 AM
      const today = new Date(now);
      today.setHours(ENERGY_CONFIG.refillHour, 0, 0, 0);
      const diff = today.getTime() - now.getTime();
      return {
        hours: Math.floor(diff / (1000 * 60 * 60)),
        minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
      };
    }
  }

  return {
    energy,
    isLoading,
    maxEnergy: ENERGY_CONFIG.maxEnergy,
    costPerGame: ENERGY_CONFIG.costPerGame,
    spend,
    refresh,
    getTimeUntilRefill,
  };
});

