/**
 * @file selectedProfileLogic.ts
 * @description Global logic for tracking the currently selected kid profile.
 *
 * This singleton logic manages which kid profile is currently active in the app.
 * The selection persists across browser sessions using localStorage.
 *
 * @dependencies
 * - kidProfilesLogic: Used to lookup profile details from the profiles list
 *
 * @example
 * ```ts
 * const $selected = selectedProfileLogic();
 *
 * // Get current profile (or null if none selected)
 * const profile = $selected.profile();
 *
 * // Select a profile by ID
 * $selected.select(profileId);
 *
 * // Clear selection (e.g., on logout)
 * $selected.clear();
 * ```
 */
import { logic, signal } from "rextive";
import { kidProfilesLogic } from "./kidProfilesLogic";
import type { KidProfile } from "@/domain/types";

/** localStorage key for persisting selected profile ID */
const STORAGE_KEY = "selected_profile_id";

export const selectedProfileLogic = logic("selectedProfileLogic", () => {
  // ============================================================================
  // DEPENDENCIES
  // ============================================================================

  const $profiles = kidProfilesLogic();

  // ============================================================================
  // STATE: SELECTED PROFILE ID
  // ============================================================================

  /**
   * Restore from localStorage on initialization.
   * This allows the selection to persist across browser sessions.
   */
  const storedId = localStorage.getItem(STORAGE_KEY);

  /**
   * Mutable signal holding the currently selected profile ID.
   * null means no profile is selected.
   */
  const selectedId = signal<number | null>(storedId ? Number(storedId) : null, {
    name: "selectedProfile.id",
  });

  // ============================================================================
  // COMPUTED: CURRENT PROFILE
  // ============================================================================

  /**
   * Derived signal that looks up the full profile object from the ID.
   * Uses profilesTask for stale-while-revalidate pattern.
   *
   * Returns null if:
   * - No profile is selected (selectedId is null)
   * - Selected profile not found in profiles list
   */
  const profile = signal(
    { selectedId, profiles: $profiles.profilesTask },
    ({ deps }): KidProfile | null => {
      if (deps.selectedId === null) return null;
      // Find profile matching the selected ID
      return deps.profiles.value.find((p) => p.id === deps.selectedId) ?? null;
    },
    { name: "selectedProfile.profile" }
  );

  // ============================================================================
  // ACTIONS
  // ============================================================================

  /**
   * Selects a kid profile by ID.
   * Persists the selection to localStorage.
   *
   * @param id - Profile ID to select
   */
  function select(id: number) {
    selectedId.set(id);
    localStorage.setItem(STORAGE_KEY, String(id));
  }

  /**
   * Clears the current selection.
   * Removes from localStorage.
   */
  function clear() {
    selectedId.set(null);
    localStorage.removeItem(STORAGE_KEY);
  }

  // ============================================================================
  // EXPORTS
  // ============================================================================

  return {
    /** Selected profile ID (null if none) */
    selectedId,
    /** Full profile object (null if none selected or not found) */
    profile,
    /** Select a profile by ID */
    select,
    /** Clear selection */
    clear,
  };
});
