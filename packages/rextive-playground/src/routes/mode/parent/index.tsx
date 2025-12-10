import { createFileRoute } from "@tanstack/react-router";
import { rx, useScope } from "rextive/react";
import { kidProfilesLogic, appOverlaysLogic, modalLogic } from "@/logic";
import { parentKidManagementLogic } from "@/logic/parentKidManagementLogic";
import { AVAILABLE_GAMES } from "@/domain/types";
import { Avatar } from "@/components/Avatar";

export const Route = createFileRoute("/mode/parent/")({
  component: KidsTab,
});

function kidsTabLogic() {
  const $profiles = kidProfilesLogic();
  const $mgmt = parentKidManagementLogic();

  return {
    profiles: $profiles.profiles,
    isLoading: $profiles.isLoading,
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
    setMaxXp: $mgmt.setMaxXp,
    toggleGameVisibility: $mgmt.toggleGameVisibility,
    setAllGamesVisibility: $mgmt.setAllGamesVisibility,
  };
}

function KidsTab() {
  const $tab = useScope(kidsTabLogic);
  const $overlays = appOverlaysLogic();

  return rx(() => {
    if ($tab.isLoading()) {
      return (
        <div className="flex items-center justify-center py-8">
          <div className="text-2xl animate-bounce">⏳</div>
        </div>
      );
    }

    const profiles = $tab.profiles();
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
              onClick={() => $overlays.openProfileForm()}
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
                  <div className="mx-auto h-12 w-12 mb-2">
                    <Avatar avatar={profile.avatar} className="w-full h-full" />
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
            onEditProfile={() => $overlays.openProfileForm(selectedKid)}
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
            <div className="h-14 w-14">
              <Avatar avatar={kid.avatar} className="w-full h-full" />
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

        {/* XP & Unlocks */}
        <div className="card">
          <h4 className="font-display font-semibold text-gray-800 mb-3">
            ⭐ XP & Unlocks
          </h4>
          <button
            onClick={async () => {
              const $modal = modalLogic();
              const confirmed = await $modal.confirm(
                `Grant max XP to ${kid.name}? This will unlock all games!`,
                "Grant Max XP"
              );
              if (confirmed) {
                $tab.setMaxXp(kid.id);
              }
            }}
            disabled={isLoading}
            className="btn btn-outline w-full py-2 text-purple-600 border-purple-200 hover:bg-purple-50"
          >
            🎁 Grant Max XP (Unlock All Games)
          </button>
          <p className="mt-2 text-xs text-gray-500 text-center">
            Grants 15,000 XP - unlocks all games instantly
          </p>
        </div>

        {/* Stats Actions */}
        <div className="card">
          <h4 className="font-display font-semibold text-gray-800 mb-3">
            📊 Stats
          </h4>
          <button
            onClick={async () => {
              const $modal = modalLogic();
              const confirmed = await $modal.confirmDanger(
                `Reset ALL stats for ${kid.name}? This cannot be undone.`,
                "Reset All Stats"
              );
              if (confirmed) {
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
                  onClick={async () => {
                    const $modal = modalLogic();
                    const confirmed = await $modal.confirm(
                      `Reset ${game.name} stats for ${kid.name}?`,
                      "Reset Game Stats"
                    );
                    if (confirmed) {
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
                    onClick={() => $tab.toggleGameVisibility(kid.id, game.id)}
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
