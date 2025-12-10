/**
 * @file ProfileFormModal.tsx
 * @description Modal form for creating and editing kid profiles.
 *
 * Features:
 * - Name and age input fields
 * - Avatar selection grid
 * - Edit mode with delete functionality
 * - Responsive button layout (stacked on mobile)
 */
import { rx, useScope, inputValue, inputNumber } from "rextive/react";
import { focus } from "rextive/op";
import { profileFormLogic } from "@/logic/profileFormLogic";
import { AVATAR_OPTIONS, AVATAR_NAMES, type KidProfile } from "@/domain/types";
import { Avatar } from "@/components/Avatar";
import { Icon } from "@/components/Icons";

interface ProfileFormModalProps {
  /** Profile to edit (undefined for create mode) */
  profile?: KidProfile;
  /** Callback when modal should close */
  onClose: () => void;
}

export function ProfileFormModal({ profile, onClose }: ProfileFormModalProps) {
  // Initialize form logic with close callback and optional profile for edit mode
  const $form = useScope(profileFormLogic, [onClose, profile]);

  return (
    <div
      className="card w-full max-w-md max-h-[90vh] overflow-y-auto animate-pop"
      onClick={(e) => e.stopPropagation()}
    >
      {/* Header */}
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
        {/* Name Input */}
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

        {/* Age Input */}
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

        {/* Avatar Selection Grid */}
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
                    onClick={() =>
                      setAvatar(emoji as import("@/domain/types").AvatarEmoji)
                    }
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

          // Delete confirmation UI
          if (showDeleteConfirm && isEditing) {
            return (
              <div className="space-y-3">
                <div className="p-3 bg-amber-50 text-amber-800 rounded-xl text-sm flex items-start gap-2">
                  <Icon
                    name="warning"
                    size={18}
                    className="flex-shrink-0 mt-0.5"
                  />
                  <span>
                    Are you sure? This will delete all progress data for this
                    profile.
                  </span>
                </div>
                <div className="flex flex-col sm:flex-row gap-3">
                  <button
                    type="button"
                    onClick={() => $form.confirmDelete()}
                    disabled={loading}
                    className="btn bg-red-500 text-white hover:bg-red-600 flex-1 py-3 w-full sm:w-auto"
                  >
                    {loading ? "Deleting..." : "Yes, Delete"}
                  </button>
                  <button
                    type="button"
                    onClick={() => $form.cancelDelete()}
                    disabled={loading}
                    className="btn btn-outline flex-1 py-3 w-full sm:w-auto"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            );
          }

          // Normal action buttons
          return (
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                type="submit"
                disabled={loading}
                className="btn btn-primary flex-1 py-3 w-full sm:w-auto"
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
                className="btn btn-outline flex-1 py-3 w-full sm:w-auto"
              >
                Cancel
              </button>
              {isEditing && (
                <button
                  type="button"
                  onClick={() => $form.requestDelete()}
                  disabled={loading}
                  className="btn bg-red-100 text-red-600 hover:bg-red-200 py-3 w-full sm:w-auto sm:px-4"
                >
                  <Icon name="trash" size={18} />
                  <span className="sm:hidden ml-2">Delete</span>
                </button>
              )}
            </div>
          );
        })}
      </form>
    </div>
  );
}

