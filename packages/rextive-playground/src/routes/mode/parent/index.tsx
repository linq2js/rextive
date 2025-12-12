import { createFileRoute } from "@tanstack/react-router";
import { Suspense, useRef } from "react";
import { rx, useScope } from "rextive/react";
import { kidProfilesLogic, appOverlaysLogic, modalLogic } from "@/logic";
import { parentKidManagementLogic } from "@/logic/parentKidManagement.logic";
import { AVAILABLE_GAMES } from "@/domain/types";
import { Avatar } from "@/components/Avatar";
import { Icon } from "@/components/Icons";
import { useTranslation } from "@/i18n";

export const Route = createFileRoute("/mode/parent/")({
  component: KidsTab,
});

function kidsTabLogic() {
  const $profiles = kidProfilesLogic();
  const $mgmt = parentKidManagementLogic();

  return {
    profiles: $profiles.profiles,
    profilesTask: $profiles.profilesTask,
    // Management
    selectedKidId: $mgmt.selectedKidId,
    selectedKid: $mgmt.selectedKid,
    gameSettings: $mgmt.gameSettings,
    gameSettingsTask: $mgmt.gameSettingsTask,
    actionMessage: $mgmt.actionMessage,
    selectKid: $mgmt.selectKid,
    refillEnergy: $mgmt.refillEnergy,
    refillAllEnergy: $mgmt.refillAllEnergy,
    resetKidStats: $mgmt.resetKidStats,
    resetGameStats: $mgmt.resetGameStats,
    setMaxXp: $mgmt.setMaxXp,
    toggleGameVisibility: $mgmt.toggleGameVisibility,
    setAllGamesVisibility: $mgmt.setAllGamesVisibility,
    // Testing utilities
    generateSampleStats: $mgmt.generateSampleStats,
    generateAllSampleStats: $mgmt.generateAllSampleStats,
  };
}

function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center py-8">
      <div className="text-2xl animate-bounce text-gray-400">
        <Icon name="refresh" size={32} />
      </div>
    </div>
  );
}

function KidsTab() {
  const $tab = useScope(kidsTabLogic);
  const $overlays = appOverlaysLogic();
  const kidActionsPanelRef = useRef<HTMLDivElement>(null);
  const { t } = useTranslation();

  const handleSelectKid = (kidId: number) => {
    $tab.selectKid(kidId);
    // Scroll to the actions panel after selection
    setTimeout(() => {
      kidActionsPanelRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }, 100);
  };

  return (
    <Suspense fallback={<LoadingSpinner />}>
      {rx(() => {
        // Use profilesTask for stale-while-revalidate pattern
        const profilesState = $tab.profilesTask();
        const profiles = profilesState.value;
        const isLoading = profilesState.loading && profiles.length === 0;

        if (isLoading) {
          return <LoadingSpinner />;
        }

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
              <h3 className="font-display text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2">
                <Icon name="lightning" size={20} className="text-amber-500" />{" "}
                {t("parent.quickActions")}
              </h3>
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={() => $overlays.open({ type: "profileForm" })}
                  className="btn btn-primary flex-1 py-3"
                >
                  <Icon name="plus" size={18} /> {t("parent.addKidProfile")}
                </button>
                <button
                  onClick={() => $tab.refillAllEnergy()}
                  disabled={profiles.length === 0}
                  className="btn btn-outline flex-1 py-3"
                >
                  <Icon name="lightning" size={18} /> {t("parent.refillAllEnergy")}
                </button>
              </div>
            </div>

            {/* ============================================================================
            TESTING SECTION - Global Actions
            This section is for testing/demo purposes only.
            Only displayed in development mode.
            ============================================================================ */}
            {import.meta.env.DEV && (
              <div className="card border-2 border-dashed border-orange-300 bg-orange-50">
                <h3 className="font-display text-lg font-semibold text-orange-700 mb-3 flex items-center gap-2">
                  <Icon name="warning" size={20} className="text-orange-500" />{" "}
                  {t("parent.testingTools")}
                </h3>
                <p className="text-xs text-orange-600 mb-3">
                  {t("parent.devOnlyWarning")}
                </p>
                <button
                  onClick={() => $tab.generateAllSampleStats()}
                  disabled={profiles.length === 0}
                  className="btn btn-outline w-full py-3 text-orange-600 border-orange-300 hover:bg-orange-100"
                >
                  <Icon name="chart" size={18} /> {t("parent.generateSampleStatsForAll")}
                </button>
              </div>
            )}
            {/* END TESTING SECTION */}

            {/* Kid Selection */}
            <div className="card">
              <h3 className="font-display text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2">
                <Icon name="baby" size={20} className="text-pink-500" /> {t("parent.selectKidToManage")}
              </h3>

              {profiles.length === 0 ? (
                <div className="text-center py-6">
                  <div className="text-primary-500 mb-4">
                    <Icon name="baby" size={64} />
                  </div>
                  <h4 className="font-display text-lg font-semibold text-gray-800">
                    {t("parent.noKidsYet")}
                  </h4>
                  <p className="mt-2 text-gray-600">
                    {t("parent.addFirstKidDescription")}
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {profiles.map((profile) => (
                    <button
                      key={profile.id}
                      onClick={() => handleSelectKid(profile.id)}
                      className={`p-3 rounded-xl text-center transition-all ${
                        selectedKid?.id === profile.id
                          ? "bg-primary-100 border-2 border-primary-500 scale-105"
                          : "bg-gray-50 border-2 border-transparent hover:bg-gray-100"
                      }`}
                    >
                      <div className="mx-auto h-12 w-12 mb-2">
                        <Avatar
                          avatar={profile.avatar}
                          className="w-full h-full"
                        />
                      </div>
                      <div className="mt-2 font-medium text-gray-800 truncate">
                        {profile.name}
                      </div>
                      <div className="text-xs text-gray-500">
                        {profile.age} {t("parent.yearsOld")}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Selected Kid Actions */}
            {selectedKid && (
              <div ref={kidActionsPanelRef}>
                <KidActionsPanel
                  $tab={$tab}
                  onEditProfile={() =>
                    $overlays.open({
                      type: "profileForm",
                      editProfile: selectedKid,
                    })
                  }
                />
              </div>
            )}
          </div>
        );
      })}
    </Suspense>
  );
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
  const { t } = useTranslation();

  return rx(() => {
    const kid = $tab.selectedKid();
    // Use gameSettingsTask for stale-while-revalidate
    const settingsState = $tab.gameSettingsTask();
    const gameSettings = settingsState.value;
    const isLoading = settingsState.loading;

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
              <p className="text-sm text-gray-600">{kid.age} {t("parent.yearsOld")}</p>
            </div>
            <button
              onClick={onEditProfile}
              className="btn btn-outline px-4 py-2"
            >
              <Icon name="pencil" size={16} /> {t("parent.editProfile")}
            </button>
          </div>
        </div>

        {/* Energy Actions */}
        <div className="card">
          <h4 className="font-display font-semibold text-gray-800 mb-3 flex items-center gap-2">
            <Icon name="lightning" size={18} className="text-amber-500" />{" "}
            {t("parent.energy")}
          </h4>
          <button
            onClick={() => $tab.refillEnergy(kid.id)}
            disabled={isLoading}
            className="btn btn-outline w-full py-2"
          >
            <Icon name="lightning" size={16} /> {t("parent.refillEnergyToMax")}
          </button>
        </div>

        {/* XP & Unlocks */}
        <div className="card">
          <h4 className="font-display font-semibold text-gray-800 mb-3 flex items-center gap-2">
            <Icon name="star" size={18} className="text-purple-500" /> {t("parent.xpAndUnlocks")}
          </h4>
          <button
            onClick={async () => {
              const $modal = modalLogic();
              const confirmed = await $modal.confirm(
                t("parent.grantMaxXpConfirm", { name: kid.name }),
                t("parent.grantMaxXp")
              );
              if (confirmed) {
                $tab.setMaxXp(kid.id);
              }
            }}
            disabled={isLoading}
            className="btn btn-outline w-full py-2 text-purple-600 border-purple-200 hover:bg-purple-50"
          >
            <Icon name="gift" size={16} /> {t("parent.grantMaxXpButton")}
          </button>
          <p className="mt-2 text-xs text-gray-500 text-center">
            {t("parent.grantMaxXpDescription")}
          </p>
        </div>

        {/* Stats Actions */}
        <div className="card">
          <h4 className="font-display font-semibold text-gray-800 mb-3 flex items-center gap-2">
            <Icon name="chart" size={18} className="text-blue-500" /> {t("parent.stats")}
          </h4>
          <button
            onClick={async () => {
              const $modal = modalLogic();
              const confirmed = await $modal.confirmDanger(
                t("parent.resetAllStatsConfirm", { name: kid.name }),
                t("parent.resetAllStats")
              );
              if (confirmed) {
                $tab.resetKidStats(kid.id);
              }
            }}
            disabled={isLoading}
            className="btn btn-outline w-full py-2 text-red-600 border-red-200 hover:bg-red-50"
          >
            <Icon name="trash" size={16} /> {t("parent.resetAllStats")}
          </button>

          <div className="mt-3 space-y-2">
            <p className="text-sm text-gray-500">{t("parent.resetSpecificGame")}</p>
            <div className="grid grid-cols-2 gap-2">
              {AVAILABLE_GAMES.map((game) => (
                <button
                  key={game.id}
                  onClick={async () => {
                    const $modal = modalLogic();
                    const confirmed = await $modal.confirm(
                      t("parent.resetGameStatsConfirm", { gameName: game.name, name: kid.name }),
                      t("parent.resetGameStats")
                    );
                    if (confirmed) {
                      $tab.resetGameStats(kid.id, game.id);
                    }
                  }}
                  disabled={isLoading}
                  className="btn btn-outline py-2 text-sm truncate"
                >
                  <Icon
                    name={game.icon as import("@/components/Icons").IconName}
                    size={16}
                    className="flex-shrink-0"
                  />
                  <span className="truncate">{game.name}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Game Visibility */}
        <div className="card">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-display font-semibold text-gray-800 flex items-center gap-2">
              <Icon name="controller" size={18} className="text-indigo-500" />{" "}
              {t("parent.gameVisibility")}
            </h4>
            <div className="flex gap-2">
              <button
                onClick={() => $tab.setAllGamesVisibility(kid.id, true)}
                disabled={isLoading}
                className="text-xs px-2 py-1 rounded bg-green-100 text-green-700 hover:bg-green-200 flex items-center gap-1"
              >
                <Icon name="eye" size={12} /> {t("parent.showAll")}
              </button>
              <button
                onClick={() => $tab.setAllGamesVisibility(kid.id, false)}
                disabled={isLoading}
                className="text-xs px-2 py-1 rounded bg-red-100 text-red-700 hover:bg-red-200 flex items-center gap-1"
              >
                <Icon name="eye-off" size={12} /> {t("parent.hideAll")}
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
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <span className="flex-shrink-0 text-primary-500">
                      <Icon
                        name={
                          game.icon as import("@/components/Icons").IconName
                        }
                        size={24}
                      />
                    </span>
                    <span className="font-medium text-gray-800 truncate">
                      {game.name}
                    </span>
                  </div>
                  <button
                    onClick={() => $tab.toggleGameVisibility(kid.id, game.id)}
                    disabled={isLoading}
                    className={`px-3 py-1 rounded-full text-sm font-medium transition-colors flex items-center gap-1 ${
                      isVisible
                        ? "bg-green-100 text-green-700"
                        : "bg-gray-200 text-gray-500"
                    }`}
                  >
                    {isVisible ? (
                      <>
                        <Icon name="eye" size={14} /> {t("parent.visible")}
                      </>
                    ) : (
                      <>
                        <Icon name="eye-off" size={14} /> {t("parent.hidden")}
                      </>
                    )}
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* ============================================================================
            TESTING SECTION
            This section is for testing/demo purposes only.
            Only displayed in development mode.
            ============================================================================ */}
        {import.meta.env.DEV && (
          <div className="card border-2 border-dashed border-orange-300 bg-orange-50">
            <h4 className="font-display font-semibold text-orange-700 mb-3 flex items-center gap-2">
              <Icon name="warning" size={18} className="text-orange-500" />{" "}
              {t("parent.testingTools")}
            </h4>
            <p className="text-xs text-orange-600 mb-3">
              {t("parent.devOnlyWarning")}
            </p>
            <button
              onClick={() => $tab.generateSampleStats(kid.id)}
              disabled={isLoading}
              className="btn btn-outline w-full py-2 text-orange-600 border-orange-300 hover:bg-orange-100"
            >
              <Icon name="chart" size={16} /> {t("parent.generateSampleStats")}
            </button>
            <p className="mt-2 text-xs text-orange-500 text-center">
              {t("parent.generateSampleStatsDescription")}
            </p>
          </div>
        )}
        {/* END TESTING SECTION */}
      </div>
    );
  });
}
