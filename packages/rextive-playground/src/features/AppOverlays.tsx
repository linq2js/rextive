// App-level overlay components (modals, popups)
// These persist across route changes to prevent disposal bugs
import { rx, useScope, inputValue, inputNumber } from "rextive/react";
import { focus } from "rextive/op";
import { appOverlaysLogic } from "@/logic/appOverlaysLogic";
import { profileFormLogic } from "@/logic/profileFormLogic";
import {
  AVATAR_OPTIONS,
  AVATAR_NAMES,
  type KidProfile,
} from "@/domain/types";
import { kidProfilesLogic } from "@/logic";
import { Avatar } from "@/components/Avatar";
import { Icon } from "@/components/Icons";

export function AppOverlays() {
  const $overlays = appOverlaysLogic();

  return rx(() => {
    const overlay = $overlays.activeOverlay();

    if (overlay.type === "none") return null;

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
        {overlay.type === "profileForm" && (
          <ProfileFormModal
            profile={overlay.editProfile}
            onClose={() => $overlays.closeOverlay()}
          />
        )}

        {overlay.type === "confirmDelete" && (
          <ConfirmDeleteModal
            profileId={overlay.profileId}
            profileName={overlay.profileName}
            onClose={() => $overlays.closeOverlay()}
          />
        )}
      </div>
    );
  });
}

// ============================================================================
// Profile Form Modal
// ============================================================================

function ProfileFormModal({
  profile,
  onClose,
}: {
  profile?: KidProfile;
  onClose: () => void;
}) {
  const $form = useScope(profileFormLogic, [onClose, profile]);

  return (
    <div
      className="card w-full max-w-md max-h-[90vh] overflow-y-auto animate-pop"
      onClick={(e) => e.stopPropagation()}
    >
      <h2 className="font-display text-xl font-bold text-gray-800">
        {$form.isEditing ? "Edit Profile" : "Add Kid Profile"}
      </h2>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          $form.submit();
        }}
        className="mt-4 space-y-4"
      >
        {/* Name */}
        {rx(() => {
          const [get, set] = focus.lens($form.state, "name").map(inputValue);
          return (
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Name
              </label>
              <input
                type="text"
                value={get()}
                onChange={set}
                className="input"
                placeholder="Kid's name"
                required
              />
            </div>
          );
        })}

        {/* Age */}
        {rx(() => {
          const [get, set] = focus.lens($form.state, "age").map(inputNumber);
          return (
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Age
              </label>
              <input
                type="number"
                min={1}
                max={18}
                value={get()}
                onChange={set}
                className="input"
                required
              />
            </div>
          );
        })}

        {/* Avatar Selection */}
        {rx(() => {
          const [getAvatar, setAvatar] = focus.lens($form.state, "avatar");
          return (
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Choose Avatar
              </label>
              <div className="grid grid-cols-5 gap-2 max-h-60 overflow-y-auto p-1 custom-scrollbar">
                {AVATAR_OPTIONS.map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => setAvatar(emoji as import("@/domain/types").AvatarEmoji)}
                    className={`p-1 rounded-xl transition-all ${
                      getAvatar() === emoji
                        ? "bg-purple-100 ring-2 ring-purple-500 scale-110 shadow-md z-10"
                        : "bg-gray-50 hover:bg-gray-100"
                    }`}
                    title={AVATAR_NAMES[emoji] || emoji}
                  >
                    <div className="w-10 h-10 mx-auto">
                      <Avatar avatar={emoji} className="w-full h-full" />
                    </div>
                  </button>
                ))}
              </div>
            </div>
          );
        })}

        {/* Error Message */}
        {rx(() => {
          const error = $form.state().error;
          return error ? (
            <div className="p-3 bg-red-50 text-red-700 rounded-xl text-sm">
              {error}
            </div>
          ) : null;
        })}

        {/* Action Buttons */}
        {rx(() => {
          const loading = $form.state().loading;
          const isEditing = $form.isEditing;
          const showDeleteConfirm = $form.state().showDeleteConfirm;

          if (showDeleteConfirm && isEditing) {
            return (
              <div className="space-y-3">
                <div className="p-3 bg-amber-50 text-amber-800 rounded-xl text-sm flex items-start gap-2">
                  <Icon name="warning" size={18} className="flex-shrink-0 mt-0.5" />
                  <span>Are you sure? This will delete all progress data for this profile.</span>
                </div>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => $form.confirmDelete()}
                    disabled={loading}
                    className="btn-danger flex-1"
                  >
                    {loading ? "Deleting..." : "Yes, Delete"}
                  </button>
                  <button
                    type="button"
                    onClick={() => $form.cancelDelete()}
                    disabled={loading}
                    className="btn-outline flex-1"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            );
          }

          return (
            <div className="flex gap-3">
              <button
                type="submit"
                disabled={loading}
                className="btn btn-primary flex-1 py-3"
              >
                {loading
                  ? "Saving..."
                  : isEditing
                  ? "Save Changes"
                  : "Add Profile"}
              </button>
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="btn btn-outline flex-1 py-3"
              >
                Cancel
              </button>
              {isEditing && (
                <button
                  type="button"
                  onClick={() => $form.requestDelete()}
                  disabled={loading}
                  className="btn bg-red-100 text-red-600 hover:bg-red-200 px-4"
                >
                  <Icon name="trash" size={18} />
                </button>
              )}
            </div>
          );
        })}
      </form>
    </div>
  );
}

// ============================================================================
// Confirm Delete Modal
// ============================================================================

function ConfirmDeleteModal({
  profileId,
  profileName,
  onClose,
}: {
  profileId: number;
  profileName: string;
  onClose: () => void;
}) {
  const $profiles = kidProfilesLogic();

  async function handleDelete() {
    await $profiles.remove(profileId);
    onClose();
  }

  return (
    <div
      className="card w-full max-w-sm animate-pop"
      onClick={(e) => e.stopPropagation()}
    >
      <h2 className="font-display text-xl font-bold text-gray-800">
        Delete Profile?
      </h2>
      <p className="mt-3 text-gray-600">
        Are you sure you want to delete <strong>{profileName}</strong>'s
        profile? This will delete all their progress and cannot be undone.
      </p>
      <div className="mt-6 flex gap-3">
        <button
          onClick={handleDelete}
          className="btn bg-red-500 text-white hover:bg-red-600 flex-1"
        >
          Delete
        </button>
        <button onClick={onClose} className="btn btn-outline flex-1">
          Cancel
        </button>
      </div>
    </div>
  );
}

