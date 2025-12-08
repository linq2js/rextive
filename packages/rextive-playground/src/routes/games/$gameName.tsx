import { createFileRoute, Link } from "@tanstack/react-router";
import { rx, useScope } from "rextive/react";
import { gameStatsLogic, selectedProfileLogic } from "@/logic";
import { AVATAR_COLORS } from "@/domain/types";

export const Route = createFileRoute("/games/$gameName")({
  component: GamePage,
});

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
    const stats = $stats.stats();
    const isLoading = $stats.isLoading();

    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-400 via-purple-400 to-pink-400 p-4 safe-bottom">
        <div className="mx-auto max-w-2xl">
          {/* Header */}
          <header className="mb-6 flex items-center justify-between">
            <Link
              to="/"
              className="flex items-center gap-2 text-white/80 hover:text-white transition-colors"
            >
              <span>←</span>
              <span className="text-sm font-medium hidden sm:inline">Back</span>
            </Link>
            <h1 className="font-display text-2xl font-bold text-white drop-shadow-lg">
              🎮 {displayName}
            </h1>
            <div className="w-12" />
          </header>

          {/* Current Kid Card */}
          {profile && (
            <div className="card mb-6">
              <div className="flex items-center gap-4">
                <div
                  className={`w-14 h-14 rounded-full flex items-center justify-center text-3xl ${AVATAR_COLORS[profile.avatar]}`}
                >
                  {profile.avatar}
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
                📊 Your Stats
              </h3>
              {isLoading ? (
                <div className="text-center py-4">
                  <div className="text-2xl animate-spin">⏳</div>
                  <p className="text-gray-500 mt-2">Loading stats...</p>
                </div>
              ) : stats ? (
                <div className="grid grid-cols-2 gap-4">
                  <StatItem label="High Score" value={stats.score} icon="🏆" />
                  <StatItem label="Level" value={stats.level} icon="⭐" />
                  <StatItem
                    label="Last Played"
                    value={formatLastPlayed(stats.lastPlayed)}
                    icon="📅"
                  />
                  <StatItem
                    label="Games Played"
                    value={stats.level > 0 ? "Active" : "—"}
                    icon="🎮"
                  />
                </div>
              ) : (
                <div className="text-center py-4">
                  <div className="text-4xl mb-2">🌟</div>
                  <p className="text-gray-600">
                    No stats yet! Play your first game to start tracking.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Game Content */}
          <div className="card text-center">
            <div className="text-6xl">🚧</div>
            <h2 className="mt-4 font-display text-xl font-semibold">
              Coming Soon!
            </h2>
            <p className="mt-2 text-gray-600">
              The <strong>{displayName}</strong> game is being developed.
              <br />
              Check back soon for exciting gameplay!
            </p>

            <Link to="/" className="btn btn-kid mt-6 inline-block">
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
  icon,
}: {
  label: string;
  value: string | number;
  icon: string;
}) {
  return (
    <div className="p-3 bg-gray-50 rounded-xl">
      <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
        <span>{icon}</span>
        <span>{label}</span>
      </div>
      <div className="font-display font-bold text-gray-800 text-lg">
        {value}
      </div>
    </div>
  );
}

function formatLastPlayed(date: Date): string {
  const now = new Date();
  const lastPlayed = new Date(date);
  const diffDays = Math.floor(
    (now.getTime() - lastPlayed.getTime()) / (1000 * 60 * 60 * 24)
  );

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
  return lastPlayed.toLocaleDateString();
}
