// Global logic for energy (Satima) management
import { logic, signal, task } from "rextive";
import { energyRepository } from "@/infrastructure/repositories";
import { ENERGY_CONFIG, type KidEnergy } from "@/domain/types";
import { selectedProfileLogic } from "./selectedProfileLogic";

export const energyLogic = logic("energyLogic", () => {
  const $selected = selectedProfileLogic();

  // Trigger for refresh
  const [onRefresh, refresh] = signal<void>().tuple;

  // Energy record - fetches based on selected profile and refresh trigger
  const energyRecord = signal(
    { selectedId: $selected.selectedId, onRefresh },
    async ({ deps }): Promise<KidEnergy | null> => {
      void deps.onRefresh; // Access to establish dependency
      if (deps.selectedId === null) return null;
      return energyRepository.getEnergy(deps.selectedId);
    },
    { name: "energy.record" }
  );

  // Task-wrapped for stale-while-revalidate access
  const energyTask = energyRecord.pipe(task<KidEnergy | null>(null));

  // Derived: current energy value (sync computed from task)
  const energy = signal(
    { energyTask },
    ({ deps }) => deps.energyTask.value?.current ?? ENERGY_CONFIG.maxEnergy,
    { name: "energy.current" }
  );

  // Action state for spend
  const spendState = signal<Promise<boolean>>();
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

    const promise = (async () => {
      const success = await energyRepository.spendEnergy(kidId, amount);
      if (success) {
        refresh();
      }
      return success;
    })();

    spendState.set(promise);
    return promise;
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
    energyTask,
    maxEnergy: ENERGY_CONFIG.maxEnergy,
    costPerGame: ENERGY_CONFIG.costPerGame,
    spend: Object.assign(spend, { state: spendState }),
    getTimeUntilRefill,
  };
});
