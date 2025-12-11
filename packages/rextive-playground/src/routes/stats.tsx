import { createFileRoute, Link } from "@tanstack/react-router";
import { signal } from "rextive";
import { rx, useScope } from "rextive/react";
import { selectedProfileLogic } from "@/logic";
import { AVATAR_NAMES, AVAILABLE_GAMES, isGameUnlocked } from "@/domain/types";
import { useEffect, Suspense } from "react";
import { Avatar } from "@/components/Avatar";
import { Icon, type IconName } from "@/components/Icons";
import { gameProgressRepository } from "@/infrastructure/repositories";

export const Route = createFileRoute("/stats")({
  component: StatsPage,
});

// Types
interface KidStats {
  totalGames: number;
  totalScore: number;
  level: number;
  xp: number;
  xpToNextLevel: number;
  currentStreak: number;
  bestStreak: number;
  achievements: Achievement[];
}

interface Achievement {
  id: string;
  name: string;
  icon: IconName;
  unlocked: boolean;
  description: string;
}

function statsPageLogic() {
  const $selected = selectedProfileLogic();

  const stats = signal<KidStats>(
    {
      totalGames: 0,
      totalScore: 0,
      level: 1,
      xp: 0,
      xpToNextLevel: 100,
      currentStreak: 0,
      bestStreak: 0,
      achievements: [
        {
          id: "first-game",
          name: "First Steps",
          icon: "baby",
          unlocked: false,
          description: "Play your first game",
        },
        {
          id: "unlock-2",
          name: "Game Collector",
          icon: "lock",
          unlocked: false,
          description: "Unlock 2 games",
        },
        {
          id: "unlock-all",
          name: "Master Unlocker",
          icon: "key",
          unlocked: false,
          description: "Unlock all games",
        },
        {
          id: "streak-3",
          name: "On Fire",
          icon: "fire",
          unlocked: false,
          description: "3 day streak",
        },
        {
          id: "streak-7",
          name: "Week Warrior",
          icon: "swords",
          unlocked: false,
          description: "7 day streak",
        },
        {
          id: "score-1000",
          name: "High Scorer",
          icon: "trophy",
          unlocked: false,
          description: "Score 1000 points",
        },
        {
          id: "level-5",
          name: "Rising Star",
          icon: "star",
          unlocked: false,
          description: "Reach level 5",
        },
        {
          id: "all-games",
          name: "Explorer",
          icon: "map",
          unlocked: false,
          description: "Try all games",
        },
      ],
    },
    { name: "statsPage.stats" }
  );

  async function loadStats() {
    const profile = $selected.profile();
    if (!profile) return;

    const allProgress = await gameProgressRepository.getByKid(profile.id);
    const totalGames = allProgress.reduce(
      (sum: number, p) => sum + p.timesPlayed,
      0
    );
    const totalScore = allProgress.reduce(
      (sum: number, p) => sum + p.totalScore,
      0
    );
    // Streaks not stored in DB yet, use 0 as default
    const currentStreak = 0;
    const bestStreak = 0;
    const level = Math.floor(totalScore / 1000) + 1;
    const xp = totalScore % 1000;

    // Calculate unlocked games
    const unlockedGamesCount = AVAILABLE_GAMES.filter((g) =>
      isGameUnlocked(g.id, totalScore)
    ).length;
    const gamesPlayedSet = new Set(allProgress.map((p) => p.gameName));

    const achievements = stats().achievements.map((a) => {
      let unlocked = a.unlocked;
      if (a.id === "first-game" && totalGames > 0) unlocked = true;
      if (a.id === "unlock-2" && unlockedGamesCount >= 2) unlocked = true;
      if (a.id === "unlock-all" && unlockedGamesCount >= AVAILABLE_GAMES.length)
        unlocked = true;
      if (a.id === "streak-3" && bestStreak >= 3) unlocked = true;
      if (a.id === "streak-7" && bestStreak >= 7) unlocked = true;
      if (a.id === "score-1000" && totalScore >= 1000) unlocked = true;
      if (a.id === "level-5" && level >= 5) unlocked = true;
      if (a.id === "all-games" && gamesPlayedSet.size >= AVAILABLE_GAMES.length)
        unlocked = true;
      return { ...a, unlocked };
    });

    stats.set({
      totalGames,
      totalScore,
      level,
      xp,
      xpToNextLevel: 1000,
      currentStreak,
      bestStreak,
      achievements,
    });
  }

  loadStats();

  return {
    profile: $selected.profile,
    stats,
  };
}

function StatsPage() {
  const $page = useScope(statsPageLogic);

  return (
    <Suspense fallback={<LoadingSpinner />}>
      {rx(() => {
        const profile = $page.profile();
        if (!profile) return null;

        const stats = $page.stats();
        const avatarName = AVATAR_NAMES[profile.avatar] || "";
        const unlockedCount = stats.achievements.filter(
          (a) => a.unlocked
        ).length;

        return (
          <div className="min-h-screen bg-pattern-kid pb-8 safe-bottom">
            {/* Header */}
            <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-gray-200">
              <div className="mx-auto max-w-3xl px-4">
                <div className="flex h-14 items-center justify-between">
                  <Link
                    to="/dashboard"
                    viewTransition
                    className="flex items-center gap-1 text-gray-600 hover:text-gray-900 transition-colors"
                  >
                    <Icon name="back" size={20} />
                    <span className="text-sm font-medium">Back</span>
                  </Link>
                  <h1 className="font-display font-bold text-gray-800">
                    Stats & Achievements
                  </h1>
                  <div className="w-16" /> {/* Spacer for centering */}
                </div>
              </div>
            </header>

            <div className="mx-auto max-w-3xl p-4 space-y-6">
              {/* Profile Summary */}
              <div className="card bg-gradient-to-r from-primary-500 to-purple-500 text-white">
                <div className="flex items-center gap-4">
                  <div className="h-16 w-16">
                    <Avatar avatar={profile.avatar} className="w-full h-full" />
                  </div>
                  <div>
                    <h2 className="font-display text-xl font-bold">
                      {profile.name}
                    </h2>
                    <p className="text-white/80">
                      Level {stats.level} • {avatarName}
                    </p>
                  </div>
                </div>
              </div>

              {/* Quick Stats */}
              <section>
                <h2 className="mb-3 font-display text-lg font-semibold text-gray-700 flex items-center gap-2">
                  <span className="text-amber-500">
                    <Icon name="chart" size={24} />
                  </span>
                  Your Stats
                </h2>
                <div className="grid grid-cols-2 gap-3">
                  <StatCard
                    icon="controller"
                    value={stats.totalGames}
                    label="Total Games"
                  />
                  <StatCard
                    icon="star"
                    value={stats.totalScore.toLocaleString()}
                    label="Total Score"
                  />
                  <StatCard
                    icon="fire"
                    value={stats.currentStreak}
                    label="Current Streak"
                    suffix=" days"
                  />
                  <StatCard
                    icon="trophy"
                    value={stats.bestStreak}
                    label="Best Streak"
                    suffix=" days"
                  />
                </div>
              </section>

              {/* Level Progress */}
              <section className="card">
                <h3 className="font-display font-semibold text-gray-700 mb-3">
                  Level Progress
                </h3>
                <div className="flex items-center justify-between text-sm text-gray-600 mb-1">
                  <span>Level {stats.level}</span>
                  <span>Level {stats.level + 1}</span>
                </div>
                <div className="h-4 rounded-full bg-gray-100 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-primary-500 to-purple-500 rounded-full transition-all duration-500"
                    style={{
                      width: `${Math.round((stats.xp / stats.xpToNextLevel) * 100)}%`,
                    }}
                  />
                </div>
                <p className="text-center text-sm text-gray-500 mt-2">
                  {stats.xpToNextLevel - stats.xp} XP to next level
                </p>
              </section>

              {/* Achievements */}
              <section>
                <h2 className="mb-3 font-display text-lg font-semibold text-gray-700 flex items-center gap-2">
                  <span className="text-amber-500">
                    <Icon name="trophy" size={24} />
                  </span>
                  Achievements
                  <span className="text-sm font-normal text-gray-500">
                    ({unlockedCount}/{stats.achievements.length})
                  </span>
                </h2>
                <div className="grid grid-cols-2 gap-3">
                  {stats.achievements.map((achievement) => (
                    <AchievementCard
                      key={achievement.id}
                      achievement={achievement}
                    />
                  ))}
                </div>
              </section>
            </div>
          </div>
        );
      })}
    </Suspense>
  );
}

function LoadingSpinner() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-pattern-kid">
      <div className="animate-spin text-primary-500">
        <Icon name="refresh" size={48} />
      </div>
    </div>
  );
}

function StatCard({
  icon,
  value,
  label,
  suffix = "",
}: {
  icon: IconName;
  value: string | number;
  label: string;
  suffix?: string;
}) {
  return (
    <div className="card flex flex-col items-center p-4 text-center">
      <span className="text-primary-600">
        <Icon name={icon} size={36} />
      </span>
      <span className="mt-2 text-2xl font-bold text-gray-800">
        {value}
        {suffix}
      </span>
      <span className="text-sm text-gray-500">{label}</span>
    </div>
  );
}

function AchievementCard({ achievement }: { achievement: Achievement }) {
  return (
    <div
      className={`card flex flex-col items-center p-3 text-center transition-all min-h-[100px] ${
        achievement.unlocked
          ? "bg-gradient-to-br from-amber-50 to-orange-50 border-amber-200"
          : "bg-gray-50 opacity-60"
      }`}
    >
      <div
        className={`flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center ${
          achievement.unlocked
            ? "bg-amber-100 text-amber-600"
            : "bg-gray-200 text-gray-400"
        }`}
      >
        <Icon name={achievement.icon} size={22} />
      </div>
      <div className="mt-2 flex-1">
        <div className="font-display font-semibold text-gray-800 text-sm leading-tight">
          {achievement.name}
        </div>
        <div className="text-xs text-gray-500 mt-0.5 line-clamp-2">
          {achievement.description}
        </div>
      </div>
      {achievement.unlocked && (
        <div className="mt-1 text-green-500">
          <Icon name="check" size={16} />
        </div>
      )}
    </div>
  );
}
