/**
 * @file profileFormLogic.ts
 * @description Local logic for the profile form (add/edit kid profile).
 * 
 * This is a LOCAL logic factory - each form instance gets its own state.
 * Handles form state, validation, submission, and deletion.
 * 
 * @param onClose - Callback to close the form (called on success)
 * @param editProfile - Optional profile to edit (if undefined, creates new)
 * 
 * @example
 * ```ts
 * // Create mode
 * const $form = useScope(() => profileFormLogic(closeForm));
 * 
 * // Edit mode
 * const $form = useScope(() => profileFormLogic(closeForm, existingProfile));
 * 
 * // Update form state
 * $form.state.set(patch({ name: "Emma" }));
 * 
 * // Submit the form
 * await $form.submit();
 * ```
 */
import { signal } from "rextive";
import { patch } from "rextive/helpers";
import { kidProfilesLogic } from "./kidProfiles.logic";
import type { KidProfile, AvatarEmoji } from "@/domain/types";

/**
 * Form state interface.
 */
export interface ProfileFormState {
  /** Kid's name */
  name: string;
  /** Selected avatar emoji */
  avatar: AvatarEmoji;
  /** Kid's age */
  age: number;
  /** Whether form is submitting */
  loading: boolean;
  /** Error message (empty if no error) */
  error: string;
  /** Whether delete confirmation is shown */
  showDeleteConfirm: boolean;
}

/**
 * Creates a logic instance for the profile form.
 * 
 * @param onClose - Callback invoked when form should close (after success)
 * @param editProfile - Profile to edit (undefined for create mode)
 * @returns Form logic object
 */
export function profileFormLogic(onClose: () => void, editProfile?: KidProfile) {
  // ============================================================================
  // DEPENDENCIES
  // ============================================================================

  const $profiles = kidProfilesLogic();

  // ============================================================================
  // STATE
  // ============================================================================

  /**
   * Form state signal.
   * Initialized from editProfile if in edit mode, defaults otherwise.
   */
  const state = signal<ProfileFormState>(
    {
      name: editProfile?.name || "",
      avatar: editProfile?.avatar || "🐉",
      age: editProfile?.age || 5,
      loading: false,
      error: "",
      showDeleteConfirm: false,
    },
    { name: "profileForm.state" }
  );

  // ============================================================================
  // ACTIONS
  // ============================================================================

  /**
   * Validates and submits the form.
   * Creates new profile or updates existing based on editProfile.
   */
  async function submit() {
    const { name, avatar, age } = state();
    
    // Validation: Name is required
    if (!name.trim()) {
      state.set(patch("error", "Name is required"));
      return;
    }

    // Set loading state and clear any previous error
    state.set(patch({ loading: true, error: "" }));

    try {
      if (editProfile) {
        // Edit mode: Update existing profile
        await $profiles.update(editProfile.id, { name: name.trim(), avatar, age });
      } else {
        // Create mode: Create new profile
        await $profiles.create({ name: name.trim(), avatar, age });
      }
      // Success: Close the form
      onClose();
    } catch (e) {
      // Show error message
      state.set(patch("error", e instanceof Error ? e.message : "An error occurred"));
    } finally {
      state.set(patch("loading", false));
    }
  }

  /**
   * Deletes the profile (only available in edit mode).
   * Should only be called after user confirms deletion.
   */
  async function remove() {
    if (!editProfile) return;

    state.set(patch({ loading: true, error: "" }));

    try {
      await $profiles.remove(editProfile.id);
      onClose();
    } catch (e) {
      state.set(patch("error", e instanceof Error ? e.message : "Failed to delete profile"));
    } finally {
      state.set(patch("loading", false));
    }
  }

  /**
   * Shows the delete confirmation UI.
   */
  function requestDelete() {
    state.set(patch("showDeleteConfirm", true));
  }

  /**
   * Hides the delete confirmation UI without deleting.
   */
  function cancelDelete() {
    state.set(patch("showDeleteConfirm", false));
  }

  /**
   * Confirms and executes the deletion.
   */
  async function confirmDelete() {
    await remove();
  }

  // ============================================================================
  // EXPORTS
  // ============================================================================

  return {
    /** Form state signal */
    state,
    /** Submit the form (create or update) */
    submit,
    /** Delete the profile */
    remove,
    /** Show delete confirmation */
    requestDelete,
    /** Cancel delete confirmation */
    cancelDelete,
    /** Confirm and delete */
    confirmDelete,
    /** Whether form is in edit mode */
    isEditing: !!editProfile,
  };
}
