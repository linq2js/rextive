/**
 * @file kidProfilesLogic.ts
 * @description Global logic for managing kid profiles (CRUD operations).
 * 
 * This is a singleton logic that manages the list of kid profiles stored in IndexedDB.
 * It provides reactive state for the profiles list and async actions for CRUD operations.
 * 
 * @pattern Uses the refresh trigger pattern for async data that needs manual invalidation.
 * @pattern Uses the action state pattern for tracking async operation status.
 * 
 * @example
 * ```ts
 * const $profiles = kidProfilesLogic();
 * 
 * // Read profiles (async, use with wait() or task.from())
 * const profiles = wait($profiles.profiles());
 * 
 * // Create a new profile
 * const id = await $profiles.create({ name: "Emma", avatar: "🐱", age: 7 });
 * 
 * // Update a profile
 * await $profiles.update(id, { name: "Emma Rose" });
 * 
 * // Delete a profile
 * await $profiles.remove(id);
 * ```
 */
import { logic, signal, task } from "rextive";
import { kidProfileRepository } from "@/infrastructure/repositories";
import type { KidProfile, CreateKidProfile, UpdateKidProfile } from "@/domain/types";

export const kidProfilesLogic = logic("kidProfilesLogic", () => {
  // ============================================================================
  // REFRESH TRIGGER
  // Used to manually trigger profile list refresh after CRUD operations
  // ============================================================================

  const [onRefresh, refresh] = signal<void>().tuple;

  // ============================================================================
  // STATE: PROFILES LIST
  // ============================================================================

  /**
   * Async computed signal that fetches all profiles from the database.
   * Re-fetches when onRefresh is triggered.
   * 
   * Access to deps.onRefresh establishes the reactive dependency,
   * even though we don't use its value (it's void).
   */
  const profiles = signal({ onRefresh }, async ({ deps }) => {
    void deps.onRefresh; // Access to establish dependency
    return kidProfileRepository.getAll();
  }, { name: "kidProfiles.list" });

  /**
   * Task-wrapped version of profiles for stale-while-revalidate pattern.
   * Provides sync access to last known value while loading new data.
   * Default value is empty array.
   */
  const profilesTask = profiles.pipe(task<KidProfile[]>([]));

  // ============================================================================
  // ACTION: CREATE PROFILE
  // ============================================================================

  /** Tracks the state of the create action (loading/error) */
  const createState = signal<Promise<number>>();

  /**
   * Creates a new kid profile.
   * Automatically refreshes the profiles list on success.
   * 
   * @param profile - Profile data (name, avatar, age)
   * @returns Promise resolving to the new profile's ID
   */
  async function create(profile: CreateKidProfile): Promise<number> {
    const promise = (async () => {
    const id = await kidProfileRepository.create(profile);
      refresh(); // Trigger refresh to update profiles list
    return id;
    })();
    createState.set(promise);
    return promise;
  }

  // ============================================================================
  // ACTION: UPDATE PROFILE
  // ============================================================================

  /** Tracks the state of the update action */
  const updateState = signal<Promise<void>>();

  /**
   * Updates an existing kid profile.
   * Automatically refreshes the profiles list on success.
   * 
   * @param id - Profile ID to update
   * @param profile - Partial profile data to update
   */
  async function update(id: number, profile: UpdateKidProfile): Promise<void> {
    const promise = (async () => {
    await kidProfileRepository.update(id, profile);
      refresh(); // Trigger refresh to update profiles list
    })();
    updateState.set(promise);
    return promise;
  }

  // ============================================================================
  // ACTION: REMOVE PROFILE
  // ============================================================================

  /** Tracks the state of the remove action */
  const removeState = signal<Promise<void>>();

  /**
   * Deletes a kid profile from the database.
   * Automatically refreshes the profiles list on success.
   * 
   * @param id - Profile ID to delete
   */
  async function remove(id: number): Promise<void> {
    const promise = (async () => {
    await kidProfileRepository.delete(id);
      refresh(); // Trigger refresh to update profiles list
    })();
    removeState.set(promise);
    return promise;
  }

  // ============================================================================
  // EXPORTS
  // Actions are wrapped with Object.assign to attach state signals
  // ============================================================================

  return {
    // State
    profiles,
    profilesTask,
    
    // Manual refresh trigger
    refresh,
    
    // Actions with attached state for tracking
    create: Object.assign(create, { state: createState }),
    update: Object.assign(update, { state: updateState }),
    remove: Object.assign(remove, { state: removeState }),
  };
});
