/**
 * @file ConfirmDeleteModal.tsx
 * @description Confirmation modal for deleting a kid profile.
 *
 * Displays a warning message and requires explicit confirmation
 * before permanently deleting a profile and all its data.
 */
import { kidProfilesLogic } from "@/logic";

interface ConfirmDeleteModalProps {
  /** ID of the profile to delete */
  profileId: number;
  /** Name of the profile (for display in message) */
  profileName: string;
  /** Callback when modal should close */
  onClose: () => void;
}

export function ConfirmDeleteModal({
  profileId,
  profileName,
  onClose,
}: ConfirmDeleteModalProps) {
  const $profiles = kidProfilesLogic();

  /**
   * Handles the delete action.
   * Removes the profile and closes the modal on success.
   */
  async function handleDelete() {
    await $profiles.remove(profileId);
    onClose();
  }

  return (
    <div
      className="card w-full max-w-sm animate-pop"
      onClick={(e) => e.stopPropagation()}
    >
      {/* Header */}
      <h2 className="font-display text-xl font-bold text-gray-800">
        Delete Profile?
      </h2>

      {/* Warning Message */}
      <p className="mt-3 text-gray-600">
        Are you sure you want to delete <strong>{profileName}</strong>'s
        profile? This will delete all their progress and cannot be undone.
      </p>

      {/* Action Buttons */}
      <div className="mt-6 flex flex-col sm:flex-row gap-3">
        <button
          onClick={handleDelete}
          className="btn bg-red-500 text-white hover:bg-red-600 flex-1 py-3 w-full sm:w-auto"
        >
          Delete
        </button>
        <button
          onClick={onClose}
          className="btn btn-outline flex-1 py-3 w-full sm:w-auto"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

