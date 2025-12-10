/**
 * @file energyLogic.ts
 * @description Global logic for energy (Satima) management system.
 * 
 * Energy is the in-app currency that limits how many games a kid can play per day.
 * Each game costs 1 energy point. Energy refills daily at a configured time.
 * 
 * @dependencies
 * - selectedProfileLogic: To get the current kid profile
 * - energyRepository: For database operations
 * 
 * @example
 * ```ts
 * const $energy = energyLogic();
 * 
 * // Check current energy
 * const currentEnergy = $energy.energy();
 * 
 * // Spend energy to play a game
 * const success = await $energy.spend();
 * if (!success) {
 *   alert("Not enough energy!");
 * }
 * 
 * // Get time until next refill
 * const { hours, minutes } = $energy.getTimeUntilRefill();
 * ```
 */
import { logic, signal, task } from "rextive";
import { energyRepository } from "@/infrastructure/repositories";
import { ENERGY_CONFIG, type KidEnergy } from "@/domain/types";
import { selectedProfileLogic } from "./selectedProfile.logic";

export const energyLogic = logic("energyLogic", () => {
  // ============================================================================
  // DEPENDENCIES
  // ============================================================================

  const $selected = selectedProfileLogic();

  // ============================================================================
  // REFRESH TRIGGER
  // ============================================================================

  /** Tuple pattern for manual refresh trigger */
  const [onRefresh, refresh] = signal<void>().tuple;

  // ============================================================================
  // STATE: ENERGY RECORD
  // ============================================================================

  /**
   * Async computed signal that fetches energy data for the selected profile.
   * Re-fetches when:
   * - Selected profile changes (selectedId dependency)
   * - Manual refresh is triggered (onRefresh dependency)
   */
  const energyRecord = signal(
    { selectedId: $selected.selectedId, onRefresh },
    async ({ deps }): Promise<KidEnergy | null> => {
      void deps.onRefresh; // Access to establish dependency
      if (deps.selectedId === null) return null;
      return energyRepository.getEnergy(deps.selectedId);
    },
    { name: "energy.record" }
  );

  /**
   * Task-wrapped version for stale-while-revalidate pattern.
   * Provides sync access to energy data while fetching.
   */
  const energyTask = energyRecord.pipe(task<KidEnergy | null>(null));

  /**
   * Sync computed signal that extracts just the current energy value.
   * Falls back to maxEnergy if no record exists (new profiles start full).
   */
  const energy = signal(
    { energyTask },
    ({ deps }) => deps.energyTask.value?.current ?? ENERGY_CONFIG.maxEnergy,
    { name: "energy.current" }
  );

  // ============================================================================
  // ACTION: SPEND ENERGY
  // ============================================================================

  /** Tracks the state of the spend action */
  const spendState = signal<Promise<boolean>>();

  /**
   * Attempts to spend energy for playing a game.
   * 
   * @param amount - Amount of energy to spend (defaults to costPerGame)
   * @returns Promise resolving to true if successful, false if insufficient energy
   */
  async function spend(amount: number = ENERGY_CONFIG.costPerGame): Promise<boolean> {
    const kidId = $selected.selectedId();
    
    // Guard: Must have a selected profile
    if (kidId === null) {
      console.warn("Energy spend failed: No kid profile selected");
      return false;
    }

    // Guard: Must have enough energy
    if (energy() < amount) {
      console.warn("Energy spend failed: Not enough energy", energy(), "<", amount);
      return false;
    }

    const promise = (async () => {
    const success = await energyRepository.spendEnergy(kidId, amount);
    if (success) {
        refresh(); // Update energy display after spending
    }
    return success;
    })();

    spendState.set(promise);
    return promise;
  }

  // ============================================================================
  // UTILITY: TIME UNTIL REFILL
  // ============================================================================

  /**
   * Calculates the time remaining until the next energy refill.
   * Energy refills daily at the configured refill hour (e.g., 9 AM).
   * 
   * @returns Object with hours and minutes until refill, or null if error
   */
  function getTimeUntilRefill(): { hours: number; minutes: number } | null {
    const now = new Date();
    const currentHour = now.getHours();

    if (currentHour >= ENERGY_CONFIG.refillHour) {
      // Refill already happened today, calculate time until tomorrow's refill
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(ENERGY_CONFIG.refillHour, 0, 0, 0);
      const diff = tomorrow.getTime() - now.getTime();
      return {
        hours: Math.floor(diff / (1000 * 60 * 60)),
        minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
      };
    } else {
      // Refill is later today
      const today = new Date(now);
      today.setHours(ENERGY_CONFIG.refillHour, 0, 0, 0);
      const diff = today.getTime() - now.getTime();
      return {
        hours: Math.floor(diff / (1000 * 60 * 60)),
        minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
      };
    }
  }

  // ============================================================================
  // EXPORTS
  // ============================================================================

  return {
    /** Current energy value (sync) */
    energy,
    /** Energy task for loading state access */
    energyTask,
    /** Maximum energy capacity */
    maxEnergy: ENERGY_CONFIG.maxEnergy,
    /** Energy cost per game */
    costPerGame: ENERGY_CONFIG.costPerGame,
    /** Spend energy action with state tracking */
    spend: Object.assign(spend, { state: spendState }),
    /** Calculate time until next refill */
    getTimeUntilRefill,
  };
});
