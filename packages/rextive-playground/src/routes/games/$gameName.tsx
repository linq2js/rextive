import { createFileRoute, Link } from "@tanstack/react-router";
import { task } from "rextive";
import { rx, useScope } from "rextive/react";
import { gameStatsLogic, selectedProfileLogic } from "@/logic";
import { Avatar } from "@/components/Avatar";
import { Icon } from "@/components/Icons";
import { formatLastPlayed } from "@/utils";

export const Route = createFileRoute("/games/$gameName")({
  component: GamePage,
});

function LoadingSpinner() {
  return (
    <div className="text-center py-4">
      <div className="text-2xl text-gray-400 animate-spin">
        <Icon name="refresh" size={32} />
      </div>
      <p className="text-gray-500 mt-2">Loading stats...</p>
    </div>
  );
}

function GamePage() {
  const { gameName } = Route.useParams();

  // Format game name for display
  const displayName = gameName
    .split("-")
    .map((word: string) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");

  const $stats = useScope(() => gameStatsLogic(gameName), [gameName]);
  const $profile = selectedProfileLogic();

  return rx(() => {
    const profile = $profile.profile();
    // Use task.from for loading/error/value state handling
    const { value: stats, loading: isLoading, error } = task.from($stats.stats);

    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-400 via-purple-400 to-pink-400 p-4 safe-bottom">
        <div className="mx-auto max-w-2xl">
          {/* Header */}
          <header className="mb-6 flex items-center justify-between">
            <Link
              to="/"
              viewTransition
              className="flex items-center gap-2 text-white/80 hover:text-white transition-colors"
            >
              <Icon name="back" size={20} />
              <span className="text-sm font-medium hidden sm:inline">Back</span>
            </Link>
            <h1 className="font-display text-2xl font-bold text-white drop-shadow-lg flex items-center gap-2">
              <Icon name="controller" size={28} /> {displayName}
            </h1>
            <div className="w-12" />
          </header>

          {/* Current Kid Card */}
          {profile && (
            <div className="card mb-6">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14">
                  <Avatar avatar={profile.avatar} className="w-full h-full" />
                </div>
                <div className="flex-1">
                  <div className="font-display text-lg font-bold text-gray-800">
                    {profile.name}
                  </div>
                  <div className="text-sm text-gray-500">
                    {profile.age} years old
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Stats Card */}
          {profile && (
            <div className="card mb-6">
              <h3 className="font-display text-lg font-semibold text-gray-700 mb-4 flex items-center gap-2">
                <Icon name="chart" size={20} className="text-blue-500" /> Your
                Stats
              </h3>
              {/* Loading state */}
              {isLoading && !stats ? (
                <LoadingSpinner />
              ) : /* Error state - show message with retry option */
              error ? (
                <div className="text-center py-4">
                  <div className="text-red-400 mb-2">
                    <Icon name="warning" size={40} />
                  </div>
                  <p className="text-gray-600 mb-3">
                    Failed to load stats. Please try again.
                  </p>
                  <button
                    onClick={() => $stats.refresh()}
                    className="btn btn-outline text-sm py-2 px-4"
                  >
                    <Icon name="refresh" size={16} className="mr-1" />
                    Retry
                  </button>
                </div>
              ) : /* Success state with stats */
              stats ? (
                <div className="grid grid-cols-2 gap-4">
                  <StatItem
                    label="High Score"
                    value={stats.highScore ?? 0}
                    iconName="trophy"
                  />
                  <StatItem label="Level" value={stats.level} iconName="star" />
                  <StatItem
                    label="Last Played"
                    value={formatLastPlayed(stats.lastPlayed)}
                    iconName="clock"
                  />
                  <StatItem
                    label="Games Played"
                    value={stats.level > 0 ? "Active" : "—"}
                    iconName="controller"
                  />
                </div>
              ) : (
                /* Empty state - no stats yet */
                <div className="text-center py-4">
                  <div className="text-4xl mb-2 text-amber-400">
                    <Icon name="star" size={48} />
                  </div>
                  <p className="text-gray-600">
                    No stats yet! Play your first game to start tracking.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Game Content */}
          <div className="card text-center">
            <div className="text-amber-500">
              <Icon name="warning" size={64} />
            </div>
            <h2 className="mt-4 font-display text-xl font-semibold">
              Coming Soon!
            </h2>
            <p className="mt-2 text-gray-600">
              The <strong>{displayName}</strong> game is being developed.
              <br />
              Check back soon for exciting gameplay!
            </p>

            <Link
              to="/"
              viewTransition
              className="btn btn-kid mt-6 inline-block"
            >
              Back to Home
            </Link>
          </div>
        </div>
      </div>
    );
  });
}

function StatItem({
  label,
  value,
  iconName,
}: {
  label: string;
  value: string | number;
  iconName: import("@/components/Icons").IconName;
}) {
  return (
    <div className="p-3 bg-gray-50 rounded-xl">
      <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
        <Icon name={iconName} size={14} />
        <span>{label}</span>
      </div>
      <div className="font-display font-bold text-gray-800 text-lg">
        {value}
      </div>
    </div>
  );
}
