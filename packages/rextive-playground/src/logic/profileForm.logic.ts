/**
 * @file profileFormLogic.ts
 * @description Local logic for the profile form (add/edit kid profile).
 *
 * This is a LOCAL logic factory - each form instance gets its own state.
 * Handles form state, validation, submission, and deletion.
 *
 * Uses focus.lens multi-lens for typed getter/setter access to form fields.
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
 * // Update form fields with typed setters
 * $form.setName("Emma");
 * $form.setAge(8);
 *
 * // Submit the form
 * await $form.submit();
 * ```
 */
import { signal } from "rextive";
import { focus } from "rextive/op";
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
export function profileFormLogic(
  onClose: () => void,
  editProfile?: KidProfile
) {
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

  // Create typed accessors for all form fields using multi-lens
  const fields = focus.lens(state, {
    name: "name",
    avatar: "avatar",
    age: "age",
    loading: "loading",
    error: "error",
    showDeleteConfirm: "showDeleteConfirm",
  });

  // ============================================================================
  // ACTIONS
  // ============================================================================

  /**
   * Validates and submits the form.
   * Creates new profile or updates existing based on editProfile.
   */
  async function submit() {
    const name = fields.getName();
    const avatar = fields.getAvatar();
    const age = fields.getAge();

    // Validation: Name is required
    if (!name.trim()) {
      fields.setError("Name is required");
      return;
    }

    // Set loading state and clear any previous error
    fields.setLoading(true);
    fields.setError("");

    try {
      if (editProfile) {
        // Edit mode: Update existing profile
        await $profiles.update(editProfile.id, {
          name: name.trim(),
          avatar,
          age,
        });
      } else {
        // Create mode: Create new profile
        await $profiles.create({ name: name.trim(), avatar, age });
      }
      // Success: Close the form
      onClose();
    } catch (e) {
      // Show error message
      fields.setError(e instanceof Error ? e.message : "An error occurred");
    } finally {
      fields.setLoading(false);
    }
  }

  /**
   * Deletes the profile (only available in edit mode).
   * Should only be called after user confirms deletion.
   */
  async function remove() {
    if (!editProfile) return;

    fields.setLoading(true);
    fields.setError("");

    try {
      await $profiles.remove(editProfile.id);
      onClose();
    } catch (e) {
      fields.setError(
        e instanceof Error ? e.message : "Failed to delete profile"
      );
    } finally {
      fields.setLoading(false);
    }
  }

  /**
   * Shows the delete confirmation UI.
   */
  function requestDelete() {
    fields.setShowDeleteConfirm(true);
  }

  /**
   * Hides the delete confirmation UI without deleting.
   */
  function cancelDelete() {
    fields.setShowDeleteConfirm(false);
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
    /** Form state signal (for full state access) */
    state,
    /** Get/set name */
    getName: fields.getName,
    setName: fields.setName,
    /** Get/set avatar */
    getAvatar: fields.getAvatar,
    setAvatar: fields.setAvatar,
    /** Get/set age */
    getAge: fields.getAge,
    setAge: fields.setAge,
    /** Get/set error */
    getError: fields.getError,
    /** Get/set loading */
    getLoading: fields.getLoading,
    /** Get/set showDeleteConfirm */
    getShowDeleteConfirm: fields.getShowDeleteConfirm,
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
