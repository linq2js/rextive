import { createFileRoute } from "@tanstack/react-router";
import { signal } from "rextive";
import { rx, useScope, inputValue, inputNumber } from "rextive/react";
import { focus } from "rextive/op";
import { kidProfilesLogic } from "@/logic";
import { profileFormLogic } from "@/logic/profileFormLogic";
import { parentKidManagementLogic } from "@/logic/parentKidManagementLogic";
import {
  CHINESE_ZODIAC_OPTIONS,
  WESTERN_ZODIAC_OPTIONS,
  AVATAR_COLORS,
  AVAILABLE_GAMES,
  type KidProfile,
} from "@/domain/types";

export const Route = createFileRoute("/mode/parent/")({
  component: KidsTab,
});

function kidsTabLogic() {
  const $profiles = kidProfilesLogic();
  const $mgmt = parentKidManagementLogic();

  const editingId = signal<number | null>(null, {
    name: "kids.editingId",
  });
  const isAdding = signal(false, { name: "kids.isAdding" });

  return {
    profiles: $profiles.profiles,
    isLoading: $profiles.isLoading,
    editingId,
    isAdding,
    // Management
    selectedKidId: $mgmt.selectedKidId,
    selectedKid: $mgmt.selectedKid,
    kidGameSettings: $mgmt.kidGameSettings,
    mgmtIsLoading: $mgmt.isLoading,
    actionMessage: $mgmt.actionMessage,
    selectKid: $mgmt.selectKid,
    refillEnergy: $mgmt.refillEnergy,
    refillAllEnergy: $mgmt.refillAllEnergy,
    resetKidStats: $mgmt.resetKidStats,
    resetGameStats: $mgmt.resetGameStats,
    toggleGameVisibility: $mgmt.toggleGameVisibility,
    setAllGamesVisibility: $mgmt.setAllGamesVisibility,
  };
}

function KidsTab() {
  const $tab = useScope(kidsTabLogic);

  return rx(() => {
    if ($tab.isLoading()) {
      return (
        <div className="flex items-center justify-center py-8">
          <div className="text-2xl animate-bounce">⏳</div>
        </div>
      );
    }

    const profiles = $tab.profiles();
    const editingId = $tab.editingId();
    const editingProfile = profiles.find((p) => p.id === editingId);
    const selectedKid = $tab.selectedKid();
    const message = $tab.actionMessage();

    return (
      <div className="space-y-6">
        {/* Action Message */}
        {message && (
          <div
            className={`p-3 rounded-xl text-center font-medium animate-pop ${
              message.type === "success"
                ? "bg-green-100 text-green-800"
                : "bg-red-100 text-red-800"
            }`}
          >
            {message.text}
          </div>
        )}

        {/* Quick Actions */}
        <div className="card">
          <h3 className="font-display text-lg font-semibold text-gray-800 mb-3">
            ⚡ Quick Actions
          </h3>
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={() => $tab.isAdding.set(true)}
              className="btn btn-primary flex-1 py-3"
            >
              ➕ Add Kid Profile
            </button>
            <button
              onClick={() => $tab.refillAllEnergy()}
              disabled={$tab.mgmtIsLoading() || profiles.length === 0}
              className="btn btn-outline flex-1 py-3"
            >
              ⚡ Refill All Energy
            </button>
          </div>
        </div>

        {/* Kid Selection */}
        <div className="card">
          <h3 className="font-display text-lg font-semibold text-gray-800 mb-3">
            👶 Select a Kid to Manage
          </h3>

          {profiles.length === 0 ? (
            <div className="text-center py-6">
              <div className="text-5xl mb-4">👶</div>
              <h4 className="font-display text-lg font-semibold text-gray-800">
                No Kids Yet
              </h4>
              <p className="mt-2 text-gray-600">
                Add your first kid profile to get started!
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {profiles.map((profile) => (
                <button
                  key={profile.id}
                  onClick={() => $tab.selectKid(profile.id)}
                  className={`p-3 rounded-xl text-center transition-all ${
                    selectedKid?.id === profile.id
                      ? "bg-primary-100 border-2 border-primary-500 scale-105"
                      : "bg-gray-50 border-2 border-transparent hover:bg-gray-100"
                  }`}
                >
                  <div
                    className={`mx-auto h-12 w-12 rounded-full flex items-center justify-center text-2xl ${
                      AVATAR_COLORS[profile.avatar]
                    }`}
                  >
                    {profile.avatar}
                  </div>
                  <div className="mt-2 font-medium text-gray-800 truncate">
                    {profile.name}
                  </div>
                  <div className="text-xs text-gray-500">{profile.age} yrs</div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Selected Kid Actions */}
        {selectedKid && (
          <KidActionsPanel
            $tab={$tab}
            onEditProfile={() => $tab.editingId.set(selectedKid.id)}
          />
        )}

        {/* Add Profile Modal */}
        {$tab.isAdding() && (
          <ProfileFormModal onClose={() => $tab.isAdding.set(false)} />
        )}

        {/* Edit Profile Modal */}
        {editingProfile && (
          <ProfileFormModal
            profile={editingProfile}
            onClose={() => $tab.editingId.set(null)}
          />
        )}
      </div>
    );
  });
}

// ============================================================================
// Kid Actions Panel
// ============================================================================

function KidActionsPanel({
  $tab,
  onEditProfile,
}: {
  $tab: ReturnType<typeof kidsTabLogic>;
  onEditProfile: () => void;
}) {
  return rx(() => {
    const kid = $tab.selectedKid();
    const gameSettings = $tab.kidGameSettings();
    const isLoading = $tab.mgmtIsLoading();

    if (!kid) return null;

    return (
      <div className="space-y-4">
        {/* Selected Kid Header */}
        <div className="card bg-primary-50">
          <div className="flex items-center gap-4">
            <div
              className={`h-14 w-14 rounded-full flex items-center justify-center text-3xl ${
                AVATAR_COLORS[kid.avatar]
              }`}
            >
              {kid.avatar}
            </div>
            <div className="flex-1">
              <h3 className="font-display text-xl font-bold text-gray-800">
                {kid.name}
              </h3>
              <p className="text-sm text-gray-600">{kid.age} years old</p>
            </div>
            <button
              onClick={onEditProfile}
              className="btn btn-outline px-4 py-2"
            >
              ✏️ Edit Profile
            </button>
          </div>
        </div>

        {/* Energy Actions */}
        <div className="card">
          <h4 className="font-display font-semibold text-gray-800 mb-3">
            ⚡ Energy
          </h4>
          <button
            onClick={() => $tab.refillEnergy(kid.id)}
            disabled={isLoading}
            className="btn btn-outline w-full py-2"
          >
            ⚡ Refill Energy to Max (10)
          </button>
        </div>

        {/* Stats Actions */}
        <div className="card">
          <h4 className="font-display font-semibold text-gray-800 mb-3">
            📊 Stats
          </h4>
          <button
            onClick={() => {
              if (
                confirm(
                  `Reset ALL stats for ${kid.name}? This cannot be undone.`
                )
              ) {
                $tab.resetKidStats(kid.id);
              }
            }}
            disabled={isLoading}
            className="btn btn-outline w-full py-2 text-red-600 border-red-200 hover:bg-red-50"
          >
            🗑️ Reset All Stats
          </button>

          <div className="mt-3 space-y-2">
            <p className="text-sm text-gray-500">Reset specific game:</p>
            <div className="grid grid-cols-2 gap-2">
              {AVAILABLE_GAMES.map((game) => (
                <button
                  key={game.id}
                  onClick={() => {
                    if (
                      confirm(`Reset ${game.name} stats for ${kid.name}?`)
                    ) {
                      $tab.resetGameStats(kid.id, game.id);
                    }
                  }}
                  disabled={isLoading}
                  className="btn btn-outline py-2 text-sm"
                >
                  {game.icon} {game.name}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Game Visibility */}
        <div className="card">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-display font-semibold text-gray-800">
              🎮 Game Visibility
            </h4>
            <div className="flex gap-2">
              <button
                onClick={() => $tab.setAllGamesVisibility(kid.id, true)}
                disabled={isLoading}
                className="text-xs px-2 py-1 rounded bg-green-100 text-green-700 hover:bg-green-200"
              >
                Show All
              </button>
              <button
                onClick={() => $tab.setAllGamesVisibility(kid.id, false)}
                disabled={isLoading}
                className="text-xs px-2 py-1 rounded bg-red-100 text-red-700 hover:bg-red-200"
              >
                Hide All
              </button>
            </div>
          </div>

          <div className="space-y-2">
            {AVAILABLE_GAMES.map((game) => {
              const setting = gameSettings.find((s) => s.gameId === game.id);
              const isVisible = setting?.visible ?? true;

              return (
                <div
                  key={game.id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{game.icon}</span>
                    <span className="font-medium text-gray-800">
                      {game.name}
                    </span>
                  </div>
                  <button
                    onClick={() =>
                      $tab.toggleGameVisibility(kid.id, game.id)
                    }
                    disabled={isLoading}
                    className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                      isVisible
                        ? "bg-green-100 text-green-700"
                        : "bg-gray-200 text-gray-500"
                    }`}
                  >
                    {isVisible ? "👁️ Visible" : "🙈 Hidden"}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="card w-full max-w-md max-h-[90vh] overflow-y-auto animate-pop">
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
                />
              </div>
            );
          })}

          {/* Avatar Selection */}
          {rx(() => {
            const currentAvatar = $form.state().avatar;
            return (
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Avatar - Chinese Zodiac
                </label>
                <div className="grid grid-cols-6 gap-2">
                  {CHINESE_ZODIAC_OPTIONS.map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() =>
                        $form.state.set((s) => ({ ...s, avatar: emoji }))
                      }
                      className={`h-12 w-12 rounded-xl text-2xl transition-all ${
                        currentAvatar === emoji
                          ? `${AVATAR_COLORS[emoji]} ring-2 ring-primary-500 scale-110`
                          : "bg-gray-100 hover:bg-gray-200"
                      }`}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>

                <label className="mb-2 mt-4 block text-sm font-medium text-gray-700">
                  Avatar - Western Zodiac
                </label>
                <div className="grid grid-cols-6 gap-2">
                  {WESTERN_ZODIAC_OPTIONS.map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() =>
                        $form.state.set((s) => ({ ...s, avatar: emoji }))
                      }
                      className={`h-12 w-12 rounded-xl text-2xl transition-all ${
                        currentAvatar === emoji
                          ? `${AVATAR_COLORS[emoji]} ring-2 ring-primary-500 scale-110`
                          : "bg-gray-100 hover:bg-gray-200"
                      }`}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>
            );
          })}

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="btn btn-outline flex-1 py-3"
            >
              Cancel
            </button>
            {rx(() => (
              <button
                type="submit"
                disabled={$form.state().loading}
                className="btn btn-primary flex-1 py-3"
              >
                {$form.state().loading
                  ? "Saving..."
                  : $form.isEditing
                  ? "Save Changes"
                  : "Add Profile"}
              </button>
            ))}
          </div>

          {/* Delete Button (only for editing) */}
          {$form.isEditing && (
            <>
              {rx(() => {
                const showConfirm = $form.state().showDeleteConfirm;

                if (showConfirm) {
                  return (
                    <div className="mt-4 p-4 bg-red-50 rounded-xl">
                      <p className="text-sm text-red-800 mb-3">
                        Are you sure you want to delete this profile? This
                        cannot be undone.
                      </p>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            $form.state.set((s) => ({
                              ...s,
                              showDeleteConfirm: false,
                            }))
                          }
                          className="btn btn-outline flex-1 py-2"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={() => $form.remove()}
                          disabled={$form.state().loading}
                          className="btn flex-1 py-2 bg-red-500 text-white hover:bg-red-600"
                        >
                          {$form.state().loading ? "Deleting..." : "Delete"}
                        </button>
                      </div>
                    </div>
                  );
                }

                return (
                  <button
                    type="button"
                    onClick={() =>
                      $form.state.set((s) => ({
                        ...s,
                        showDeleteConfirm: true,
                      }))
                    }
                    className="mt-4 w-full text-center text-sm text-red-500 hover:text-red-700"
                  >
                    🗑️ Delete Profile
                  </button>
                );
              })}
            </>
          )}
        </form>
      </div>
    </div>
  );
}
