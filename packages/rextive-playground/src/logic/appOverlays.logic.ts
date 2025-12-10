/**
 * @file appOverlaysLogic.ts
 * @description App-level logic for managing overlay modals (profile form, confirm delete, etc.).
 *
 * This is a global singleton that manages which overlay is currently displayed.
 * Overlays are full-screen modal dialogs like profile forms and confirmation dialogs.
 *
 * Using a global logic ensures overlays persist across route changes and
 * prevents disposal bugs that can occur with component-level state.
 *
 * @example
 * ```ts
 * const $overlays = appOverlaysLogic();
 *
 * // Open profile form for new profile
 * $overlays.open({ type: "profileForm" });
 *
 * // Open profile form to edit existing profile
 * $overlays.open({ type: "profileForm", editProfile: existingProfile });
 *
 * // Open delete confirmation
 * $overlays.open({ type: "confirmDelete", profileId, profileName });
 *
 * // Close any overlay
 * $overlays.close();
 * ```
 */
import { logic, signal } from "rextive";
import type { KidProfile } from "@/domain/types";

/**
 * Union type representing all possible overlay states.
 *
 * - "none": No overlay is shown
 * - "profileForm": Profile create/edit form
 * - "confirmDelete": Delete confirmation dialog
 */
export type OverlayType =
  | { type: "none" }
  | { type: "profileForm"; editProfile?: KidProfile }
  | { type: "confirmDelete"; profileId: number; profileName: string };

export const appOverlaysLogic = logic("appOverlaysLogic", () => {
  // ============================================================================
  // STATE
  // Using tuple pattern: [readSignal, setterFunction]
  // ============================================================================

  /**
   * Tuple destructuring:
   * - active: Read-only signal for current overlay state
   * - open: Setter function to open an overlay
   */
  const [active, open] = signal<OverlayType>(
    { type: "none" },
    { name: "appOverlays.active" }
  ).tuple;

  // ============================================================================
  // ACTIONS
  // ============================================================================

  /**
   * Closes any active overlay by setting state to "none".
   */
  function close() {
    open({ type: "none" });
  }

  // ============================================================================
  // EXPORTS
  // ============================================================================

  return {
    /** Current overlay state (for UI rendering) */
    active,
    /** Open an overlay - pass OverlayType config */
    open,
    /** Close any overlay */
    close,
  };
});
