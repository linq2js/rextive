import { createFileRoute, Link } from "@tanstack/react-router";
import { signal } from "rextive";
import { rx, useScope } from "rextive/react";
import { selectedProfileLogic } from "@/logic";
import { AVATAR_NAMES, AVAILABLE_GAMES, isGameUnlocked } from "@/domain/types";
import { Suspense } from "react";
import { Avatar } from "@/components/Avatar";
import { Icon, type IconName } from "@/components/Icons";
import { gameProgressRepository } from "@/infrastructure/repositories";
import { useTranslation } from "@/i18n";

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
  progress?: {
    current: number;
    target: number;
    label: string;
  };
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
      let progress: { current: number; target: number; label: string } | undefined;

      if (a.id === "first-game") {
        unlocked = totalGames > 0;
        if (!unlocked) {
          progress = { current: totalGames, target: 1, label: "games" };
        }
      } else if (a.id === "unlock-2") {
        unlocked = unlockedGamesCount >= 2;
        if (!unlocked) {
          progress = { current: unlockedGamesCount, target: 2, label: "games" };
        }
      } else if (a.id === "unlock-all") {
        unlocked = unlockedGamesCount >= AVAILABLE_GAMES.length;
        if (!unlocked) {
          progress = {
            current: unlockedGamesCount,
            target: AVAILABLE_GAMES.length,
            label: "games",
          };
        }
      } else if (a.id === "streak-3") {
        unlocked = bestStreak >= 3;
        if (!unlocked) {
          progress = { current: bestStreak, target: 3, label: "days" };
        }
      } else if (a.id === "streak-7") {
        unlocked = bestStreak >= 7;
        if (!unlocked) {
          progress = { current: bestStreak, target: 7, label: "days" };
        }
      } else if (a.id === "score-1000") {
        unlocked = totalScore >= 1000;
        if (!unlocked) {
          progress = { current: totalScore, target: 1000, label: "points" };
        }
      } else if (a.id === "level-5") {
        unlocked = level >= 5;
        if (!unlocked) {
          progress = { current: level, target: 5, label: "level" };
        }
      } else if (a.id === "all-games") {
        unlocked = gamesPlayedSet.size >= AVAILABLE_GAMES.length;
        if (!unlocked) {
          progress = {
            current: gamesPlayedSet.size,
            target: AVAILABLE_GAMES.length,
            label: "games",
          };
        }
      }

      return { ...a, unlocked, progress };
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
  const { t } = useTranslation();

  // Helper to translate achievement names/descriptions
  const translateAchievement = (achievement: Achievement) => {
    const keyMap: Record<string, { name: string; desc: string }> = {
      "first-game": { name: "achievements.firstSteps", desc: "achievements.firstStepsDesc" },
      "unlock-2": { name: "achievements.gameCollector", desc: "achievements.gameCollectorDesc" },
      "unlock-all": { name: "achievements.masterUnlocker", desc: "achievements.masterUnlockerDesc" },
      "streak-3": { name: "achievements.onFire", desc: "achievements.onFireDesc" },
      "streak-7": { name: "achievements.weekWarrior", desc: "achievements.weekWarriorDesc" },
      "score-1000": { name: "achievements.highScorer", desc: "achievements.highScorerDesc" },
      "level-5": { name: "achievements.risingStar", desc: "achievements.risingStarDesc" },
      "all-games": { name: "achievements.explorer", desc: "achievements.explorerDesc" },
    };
    const keys = keyMap[achievement.id];
    if (!keys) return achievement;
    return {
      ...achievement,
      name: t(keys.name),
      description: t(keys.desc),
    };
  };

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
                    <span className="text-sm font-medium">{t("common.back")}</span>
                  </Link>
                  <h1 className="font-display font-bold text-gray-800">
                    {t("stats.title")}
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
                      {t("stats.level", { level: stats.level })} • {avatarName}
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
                  {t("stats.yourStats")}
                </h2>
                <div className="grid grid-cols-2 gap-3">
                  <StatCard
                    icon="controller"
                    value={stats.totalGames}
                    label={t("stats.totalGames")}
                  />
                  <StatCard
                    icon="star"
                    value={stats.totalScore.toLocaleString()}
                    label={t("stats.totalScore")}
                  />
                  <StatCard
                    icon="fire"
                    value={stats.currentStreak}
                    label={t("stats.currentStreak")}
                    suffix={` ${t("stats.days")}`}
                  />
                  <StatCard
                    icon="trophy"
                    value={stats.bestStreak}
                    label={t("stats.bestStreak")}
                    suffix={` ${t("stats.days")}`}
                  />
                </div>
              </section>

              {/* Level Progress */}
              <section className="card">
                <h3 className="font-display font-semibold text-gray-700 mb-3">
                  {t("stats.levelProgress")}
                </h3>
                <div className="flex items-center justify-between text-sm text-gray-600 mb-1">
                  <span>{t("stats.level", { level: stats.level })}</span>
                  <span>{t("stats.level", { level: stats.level + 1 })}</span>
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
                  {t("stats.xpToNextLevel", { xp: stats.xpToNextLevel - stats.xp })}
                </p>
              </section>

              {/* Achievements */}
              <section>
                <h2 className="mb-3 font-display text-lg font-semibold text-gray-700 flex items-center gap-2">
                  <span className="text-amber-500">
                    <Icon name="trophy" size={24} />
                  </span>
                  {t("stats.achievements")}
                  <span className="text-sm font-normal text-gray-500">
                    ({unlockedCount}/{stats.achievements.length})
                  </span>
                </h2>
                <div className="grid grid-cols-2 gap-3">
                  {stats.achievements.map((achievement) => (
                    <AchievementCard
                      key={achievement.id}
                      achievement={translateAchievement(achievement)}
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
      className={`card flex flex-col items-center p-3 text-center transition-all min-h-[120px] ${
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
      <div className="mt-2 flex-1 w-full">
        <div className="font-display font-semibold text-gray-800 text-sm leading-tight">
          {achievement.name}
        </div>
        <div className="text-xs text-gray-500 mt-0.5 line-clamp-2">
          {achievement.description}
        </div>
        {!achievement.unlocked && achievement.progress && (
          <div className="mt-2 space-y-1">
            <div className="text-xs font-medium text-gray-700">
              {achievement.progress.current} / {achievement.progress.target}{" "}
              {achievement.progress.label}
            </div>
            <div className="h-1.5 rounded-full bg-gray-200 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-primary-500 to-purple-500 rounded-full transition-all duration-300"
                style={{
                  width: `${Math.min(
                    (achievement.progress.current / achievement.progress.target) * 100,
                    100
                  )}%`,
                }}
              />
            </div>
          </div>
        )}
      </div>
      {achievement.unlocked && (
        <div className="mt-1 text-green-500">
          <Icon name="check" size={16} />
        </div>
      )}
    </div>
  );
}
