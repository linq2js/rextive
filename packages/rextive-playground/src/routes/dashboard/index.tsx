import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { signal } from "rextive";
import { rx, useScope } from "rextive/react";
import {
  selectedProfileLogic,
  energyLogic,
  kidProfilesLogic,
  guards,
} from "@/logic";
import {
  AVAILABLE_GAMES,
  isGameUnlocked,
  getXpToNextUnlock,
} from "@/domain/types";
import { Suspense, useState } from "react";
import { Icon, type IconName } from "@/components/Icons";
import { gameProgressRepository } from "@/infrastructure/repositories";
import { playClickSound } from "@/hooks/useSound";
import { useTranslation } from "@/i18n";

export const Route = createFileRoute("/dashboard/")({
  // Require profile to access dashboard - redirects to "/" if no profile
  beforeLoad: guards.requireProfile(),
  component: Dashboard,
});

// Types for kid stats
interface KidStats {
  // Today's progress
  todayGames: number;
  todayScore: number;
  todayMinutes: number;
  // Overall
  totalGames: number;
  totalScore: number;
  // Level & XP
  level: number;
  xp: number;
  xpToNextLevel: number;
  // Streak
  currentStreak: number;
  bestStreak: number;
  // Achievements
  achievements: Achievement[];
}

interface Achievement {
  id: string;
  name: string;
  icon: IconName;
  unlocked: boolean;
  description: string;
}

interface Game {
  id: string;
  name: string;
  icon: IconName;
  description: string;
  color: string;
  textColor: string; // Text/icon color for contrast
  implemented: boolean; // Game code exists
  unlocked: boolean; // Player has enough XP
  xpRequired: number; // XP needed to unlock
  energyCost: number; // Energy required to play (0 = free)
}

function dashboardLogic() {
  const $selected = selectedProfileLogic();
  const $profiles = kidProfilesLogic();
  const $energy = energyLogic();

  // Stats - starts at zero, loaded from DB
  const stats = signal<KidStats>(
    {
      todayGames: 0,
      todayScore: 0,
      todayMinutes: 0,
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
        {
          id: "perfect-10",
          name: "Perfectionist",
          icon: "target",
          unlocked: false,
          description: "10 perfect scores",
        },
        {
          id: "speed-demon",
          name: "Speed Demon",
          icon: "lightning",
          unlocked: false,
          description: "Finish in record time",
        },
      ],
    },
    { name: "dashboard.stats" }
  );

  // Effect-like signal: auto-loads stats when profile changes
  // Benefits: auto-disposed when logic scope disposed, no manual subscription cleanup
  signal(
    { profile: $selected.profile },
    ({ deps, safe }) => {
      const profile = deps.profile;
      if (!profile) return;

      // Fetch and update stats
      gameProgressRepository.getByKid(profile.id).then((allProgress) => {
        // safe() prevents updates if signal is disposed
        safe(() => {
          // Aggregate cumulative stats from all game progress records
          const totalScore = allProgress.reduce(
            (sum, p) => sum + (p.totalScore ?? p.highScore ?? 0),
            0
          );
          const totalGames = allProgress.reduce(
            (sum, p) => sum + (p.timesPlayed ?? 1),
            0
          );
          const uniqueGames = allProgress.length;

          // Calculate level (1000 XP per level)
          const level = Math.floor(totalScore / 1000) + 1;
          const xp = totalScore % 1000;

          // Calculate unlocked games count
          const unlockedGamesCount = AVAILABLE_GAMES.filter((g) =>
            isGameUnlocked(g.id, totalScore)
          ).length;

          // Update achievements based on progress
          const achievements = stats().achievements.map((a) => {
            let unlocked = a.unlocked;
            if (a.id === "first-game" && totalGames > 0) unlocked = true;
            if (a.id === "unlock-2" && unlockedGamesCount >= 2) unlocked = true;
            if (
              a.id === "unlock-all" &&
              unlockedGamesCount >= AVAILABLE_GAMES.length
            )
              unlocked = true;
            if (a.id === "score-1000" && totalScore >= 1000) unlocked = true;
            if (a.id === "level-5" && level >= 5) unlocked = true;
            if (a.id === "all-games" && uniqueGames >= 3) unlocked = true;
            return { ...a, unlocked };
          });

          // Update stats signal
          stats.set((prev) => ({
            ...prev,
            totalGames,
            totalScore,
            level,
            xp,
            xpToNextLevel: 1000,
            achievements,
            // Mock today stats (would need daily session tracking)
            todayGames: Math.min(totalGames, 5),
            todayScore: Math.min(totalScore, 500),
            todayMinutes: Math.min(Math.floor(totalGames * 3), 30),
          }));

          // Update games list based on new XP total
          games.set(buildGamesList(totalScore));
        });
      });
    },
    { lazy: false, name: "dashboard.statsUpdateEffect" }
  );

  // Game metadata (static info)
  // Colors match actual game screen backgrounds for visual consistency
  // energyCost: 0 = free, 2 = premium games
  const GAME_META: Record<
    string,
    {
      icon: IconName;
      description: string;
      color: string;
      textColor: string;
      energyCost: number;
    }
  > = {
    "typing-adventure": {
      icon: "keyboard",
      description: "Practice typing!",
      // Matches: from-blue-400 via-purple-400 to-pink-400
      color: "bg-gradient-to-br from-blue-200 via-purple-200 to-pink-200",
      textColor: "text-purple-700",
      energyCost: 1, // Starter game (unlocked from start)
    },
    "memory-match": {
      icon: "brain",
      description: "Train your memory!",
      // Matches: from-purple-500 via-pink-500 to-rose-500
      color: "bg-gradient-to-br from-purple-200 via-pink-200 to-rose-200",
      textColor: "text-purple-700",
      energyCost: 2, // Unlockable game
    },
    "road-racer": {
      icon: "car",
      description: "Race to win!",
      // Matches: from-slate-800 via-slate-900 to-slate-950 (dark theme)
      color: "bg-gradient-to-br from-slate-300 via-slate-200 to-slate-300",
      textColor: "text-slate-700",
      energyCost: 2, // Unlockable game
    },
    "math-quest": {
      icon: "math",
      description: "Fun with numbers!",
      color: "bg-gradient-to-br from-blue-200 via-cyan-200 to-teal-200",
      textColor: "text-blue-700",
      energyCost: 1, // Starter game (unlocked from start)
    },
    "word-builder": {
      icon: "pencil",
      description: "Build cool words!",
      color: "bg-gradient-to-br from-green-200 via-emerald-200 to-teal-200",
      textColor: "text-green-700",
      energyCost: 1, // Default
    },
    "puzzle-time": {
      icon: "puzzle",
      description: "Solve puzzles!",
      color: "bg-gradient-to-br from-amber-200 via-orange-200 to-yellow-200",
      textColor: "text-amber-700",
      energyCost: 1, // Default
    },
    "color-fun": {
      icon: "palette",
      description: "Learn colors!",
      color: "bg-gradient-to-br from-pink-200 via-rose-200 to-red-200",
      textColor: "text-pink-700",
      energyCost: 1, // Default
    },
  };

  // Build games list based on current XP/totalScore
  // Sort order: 1) Starter games (unlocked by default), 2) Unlocked by XP, 3) Locked
  function buildGamesList(totalXp: number): Game[] {
    const games = AVAILABLE_GAMES.map((gameConfig) => {
      const meta = GAME_META[gameConfig.id] || {
        icon: "controller" as IconName,
        description: "Play now!",
        color: "bg-gray-100",
        textColor: "text-gray-700",
        energyCost: 1, // Default cost
      };
      return {
        id: gameConfig.id,
        name: gameConfig.name,
        icon: meta.icon,
        description: meta.description,
        color: meta.color,
        textColor: meta.textColor,
        implemented: gameConfig.implemented,
        unlocked: isGameUnlocked(gameConfig.id, totalXp),
        xpRequired: gameConfig.xpRequired,
        energyCost: meta.energyCost,
      };
    });

    // Sort: 1) Starter (xpRequired=0), 2) Unlocked by XP, 3) Locked
    return games.sort((a, b) => {
      const aIsStarter = a.xpRequired === 0;
      const bIsStarter = b.xpRequired === 0;

      // Starter games first
      if (aIsStarter && !bIsStarter) return -1;
      if (!aIsStarter && bIsStarter) return 1;

      // Then unlocked games
      if (a.unlocked && !b.unlocked) return -1;
      if (!a.unlocked && b.unlocked) return 1;

      // Within same category, sort by xpRequired
      return a.xpRequired - b.xpRequired;
    });
  }

  const games = signal<Game[]>(buildGamesList(0), { name: "dashboard.games" });

  // Get XP to next game unlock
  function getXpToUnlock(): number {
    return getXpToNextUnlock(stats().totalScore);
  }

  return {
    profile: $selected.profile,
    profilesTask: $profiles.profilesTask,
    stats,
    games,
    energy: $energy.energy,
    energyTask: $energy.energyTask,
    maxEnergy: $energy.maxEnergy,
    getXpToUnlock,
    switchProfile: $selected.clear,
  };
}

function LoadingSpinner() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-pattern-kid">
      <div className="text-4xl animate-bounce text-primary-500">
        <Icon name="controller" size={64} />
      </div>
    </div>
  );
}

function Dashboard() {
  const navigate = useNavigate();
  const $dash = useScope(dashboardLogic);
  const { t } = useTranslation();

  return (
    <Suspense fallback={<LoadingSpinner />}>
      {rx(() => {
        const profile = $dash.profile();
        if (!profile) return null;

        const stats = $dash.stats();
        const games = $dash.games();
        const energy = $dash.energy();
        const xpPercent = Math.round((stats.xp / stats.xpToNextLevel) * 100);
        const xpToUnlock = $dash.getXpToUnlock();
        const nextLockedGame = games.find((g) => !g.unlocked);
        const unlockedCount = games.filter((g) => g.unlocked).length;

        return (
          <div className="min-h-screen bg-pattern-kid pb-8 safe-bottom">
            {/* Header */}
            <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-gray-200">
              <div className="mx-auto max-w-3xl px-4">
                <div className="flex h-12 items-center justify-between">
                  {/* Back / Switch Profile */}
                  <button
                    onClick={() => {
                      $dash.switchProfile();
                      navigate({ to: "/", viewTransition: true });
                    }}
                    className="flex items-center gap-1 text-gray-600 hover:text-gray-900 transition-colors"
                  >
                    <Icon name="back" size={20} />
                    <span className="text-sm font-medium">
                      {t("dashboard.switch")}
                    </span>
                  </button>

                  {/* Energy & Stats */}
                  <div className="flex items-center gap-3">
                    {/* Energy Display */}
                    <div className="flex items-center gap-1">
                      <Icon
                        name="lightning"
                        size={18}
                        fill="currentColor"
                        className="text-amber-500"
                      />
                      <span className="font-bold text-amber-600">{energy}</span>
                      <span className="text-gray-400 text-xs">
                        /{$dash.maxEnergy}
                      </span>
                    </div>
                    {/* Stats Page Link */}
                    <Link
                      to="/stats"
                      viewTransition
                      className="h-8 w-8 rounded-full bg-purple-100 flex items-center justify-center text-purple-600 hover:bg-purple-200 transition-colors"
                    >
                      <Icon name="trophy" size={18} />
                    </Link>
                  </div>
                </div>
              </div>
            </header>

            <div className="mx-auto max-w-3xl p-4 space-y-6">
              {/* Welcome & Progress Banner */}
              <div className="card bg-gradient-to-r from-primary-500 via-purple-500 to-pink-500 text-white">
                <h1 className="font-display text-2xl font-bold flex items-center gap-2">
                  {t("dashboard.welcomeBack", { name: profile.name })}{" "}
                  <Icon name="star" size={24} className="text-amber-300" />
                </h1>
                <p className="mt-1 text-white/80">
                  {t("dashboard.dayStreak", { count: stats.currentStreak })}
                </p>

                {/* Level Progress */}
                <div className="mt-4">
                  <div className="flex items-center justify-between text-sm">
                    <span>
                      {t("dashboard.level")} {stats.level}
                    </span>
                    <span>
                      {t("dashboard.level")} {stats.level + 1}
                    </span>
                  </div>
                  <div className="mt-1 h-3 rounded-full bg-white/30 overflow-hidden">
                    <div
                      className="h-full bg-white rounded-full transition-all duration-500"
                      style={{ width: `${xpPercent}%` }}
                    />
                  </div>
                  <div className="mt-1 text-center text-sm text-white/80">
                    {t("dashboard.xpToNextLevel", {
                      xp: stats.xpToNextLevel - stats.xp,
                    })}
                  </div>
                </div>

                {/* Divider */}
                <div className="my-4 border-t border-white/20" />

                {/* Next Game Unlock or All Unlocked */}
                {nextLockedGame ? (
                  <div className="flex items-center gap-3">
                    <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-white/20 flex items-center justify-center">
                      <Icon name="lock" size={20} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="font-display font-semibold text-sm">
                          {t("dashboard.next", { name: nextLockedGame.name })}
                        </span>
                        <span className="text-xs text-white/80">
                          {unlockedCount}/{games.length}
                        </span>
                      </div>
                      <div className="mt-1 h-2 rounded-full bg-white/30 overflow-hidden">
                        <div
                          className="h-full bg-white rounded-full transition-all duration-500"
                          style={{
                            width: `${Math.min(100, (stats.totalScore / nextLockedGame.xpRequired) * 100)}%`,
                          }}
                        />
                      </div>
                      <div className="mt-0.5 text-xs text-white/80">
                        {xpToUnlock > 0
                          ? t("dashboard.xpToUnlock", {
                              xp: xpToUnlock.toLocaleString(),
                            })
                          : t("dashboard.unlocked")}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-3">
                    <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-white/20 flex items-center justify-center">
                      <Icon name="trophy" size={20} />
                    </div>
                    <div className="flex-1">
                      <div className="font-display font-semibold text-sm">
                        {t("dashboard.allGamesUnlocked")}
                      </div>
                      <div className="text-xs text-white/80">
                        {t("dashboard.unlockedAllGames", {
                          count: games.length,
                        })}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Today's Progress */}
              <section>
                <h2 className="mb-3 font-display text-lg font-semibold text-gray-700 flex items-center gap-2">
                  <span className="text-primary-500">
                    <Icon name="controller" size={24} />
                  </span>
                  {t("dashboard.todaysProgress")}
                </h2>
                <div className="grid grid-cols-3 gap-3">
                  <ProgressCard
                    icon="controller"
                    value={stats.todayGames}
                    label={t("dashboard.games")}
                    target={5}
                  />
                  <ProgressCard
                    icon="star"
                    value={stats.todayScore}
                    label={t("dashboard.score")}
                    target={1000}
                  />
                  <ProgressCard
                    icon="clock"
                    value={stats.todayMinutes}
                    label={t("dashboard.minutes")}
                    target={30}
                  />
                </div>
              </section>

              {/* Games */}
              <section>
                <h2 className="mb-3 font-display text-lg font-semibold text-gray-700 flex items-center gap-2">
                  <span className="text-primary-500">
                    <Icon name="controller" size={24} />
                  </span>
                  {t("dashboard.games")}
                </h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  {games.map((game) => (
                    <GameCard
                      key={game.id}
                      game={game}
                      energy={energy}
                      totalXp={stats.totalScore}
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

function ProgressCard({
  icon,
  value,
  label,
  target,
}: {
  icon: IconName;
  value: number;
  label: string;
  target: number;
}) {
  const { t } = useTranslation();
  const percent = Math.min(100, Math.round((value / target) * 100));
  const isComplete = value >= target;

  return (
    <Link
      to="/stats"
      viewTransition
      className="card p-3 text-center transition-transform hover:scale-105 active:scale-95"
    >
      <span className="text-2xl text-primary-600 inline-block">
        <Icon name={icon} size={32} />
      </span>
      <div className="mt-1 text-2xl font-bold text-gray-800">{value}</div>
      <div className="text-xs text-gray-500">{label}</div>
      <div className="mt-2 h-2 rounded-full bg-gray-100 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${
            isComplete ? "bg-green-500" : "bg-primary-500"
          }`}
          style={{ width: `${percent}%` }}
        />
      </div>
      <div className="mt-1 text-xs text-gray-400 flex items-center justify-center gap-1">
        {isComplete ? (
          <>
            <Icon name="check" size={12} /> {t("dashboard.complete")}
          </>
        ) : (
          `${value}/${target}`
        )}
      </div>
    </Link>
  );
}

function GameCard({
  game,
  energy,
  totalXp,
}: {
  game: Game;
  energy: number;
  totalXp: number;
}) {
  const { t } = useTranslation();
  // Available game (unlocked + implemented + has energy)
  const navigate = useNavigate();
  const [isLaunching, setIsLaunching] = useState(false);

  // Check if user has enough energy for this game (free games always playable)
  const hasEnoughEnergy = game.energyCost === 0 || energy >= game.energyCost;

  // Locked game (not enough XP)
  if (!game.unlocked) {
    const xpNeeded = game.xpRequired - totalXp;
    return (
      <div
        className={`card relative flex flex-col items-center p-4 ${game.color} opacity-60`}
      >
        <div className="absolute -top-2 -right-2 rounded-full bg-gray-500 px-2 py-0.5 text-xs font-bold text-white flex items-center gap-1">
          <Icon name="lock" size={10} /> {t("dashboard.locked")}
        </div>
        <span className={`text-4xl ${game.textColor} opacity-50`}>
          <Icon name={game.icon} size={48} />
        </span>
        <h3
          className={`mt-2 font-display font-semibold ${game.textColor} opacity-70`}
        >
          {game.name}
        </h3>
        <p className="text-xs text-gray-500 text-center">
          {t("dashboard.xpToUnlock", { xp: xpNeeded.toLocaleString() })}
        </p>
        <div className="mt-2 w-full h-1.5 rounded-full bg-white/50 overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-purple-400 to-pink-400 transition-all duration-500"
            style={{
              width: `${Math.min(100, (totalXp / game.xpRequired) * 100)}%`,
            }}
          />
        </div>
      </div>
    );
  }

  // Coming soon game (unlocked but not implemented yet)
  if (!game.implemented) {
    return (
      <div
        className={`card relative flex flex-col items-center p-4 ${game.color} opacity-80`}
      >
        <div className="absolute -top-2 -right-2 rounded-full bg-purple-500 px-2 py-0.5 text-xs font-bold text-white">
          {t("dashboard.soon")}
        </div>
        <span className={`text-4xl ${game.textColor} opacity-50`}>
          <Icon name={game.icon} size={48} />
        </span>
        <h3
          className={`mt-2 font-display font-semibold ${game.textColor} opacity-70`}
        >
          {game.name}
        </h3>
        <p className="text-xs text-gray-500 text-center">
          {t("dashboard.comingSoon")}
        </p>
        <div className="mt-2 text-xs font-medium text-green-600 flex items-center gap-1">
          <Icon name="check" size={12} /> {t("dashboard.unlocked")}
        </div>
      </div>
    );
  }

  // No energy - disabled state (only for non-free games)
  if (!hasEnoughEnergy) {
    return (
      <div
        className={`card relative flex flex-col items-center p-4 ${game.color} opacity-50`}
      >
        <div className="absolute -top-2 -right-2 rounded-full bg-amber-500 px-2 py-0.5 text-xs font-bold text-white flex items-center gap-1">
          <Icon name="lightning" size={10} fill="currentColor" />{" "}
          {game.energyCost}
        </div>
        <span className={`text-4xl ${game.textColor} opacity-50`}>
          <Icon name={game.icon} size={48} />
        </span>
        <h3
          className={`mt-2 font-display font-semibold ${game.textColor} opacity-70`}
        >
          {game.name}
        </h3>
        <p className="text-xs text-gray-500 text-center">
          {t("dashboard.needEnergy", { cost: game.energyCost })}
        </p>
      </div>
    );
  }

  const handleGameLaunch = () => {
    if (isLaunching) return;

    // Play click sound and start animation
    playClickSound();
    setIsLaunching(true);

    // Navigate after animation completes with view transition
    setTimeout(() => {
      navigate({ to: `/games/${game.id}`, viewTransition: true });
    }, 400);
  };

  return (
    <button
      onClick={handleGameLaunch}
      disabled={isLaunching}
      className={`card relative flex flex-col items-center p-4 ${game.color} transition-all duration-300 
        ${
          isLaunching
            ? "scale-110 shadow-2xl ring-4 ring-amber-400 ring-opacity-75"
            : "hover:scale-105 active:scale-95"
        }`}
    >
      {/* Launch animation overlay */}
      {isLaunching && (
        <div className="absolute inset-0 rounded-2xl bg-white/30 animate-pulse" />
      )}

      {/* Energy cost badge */}
      <div className="absolute -top-2 -right-2 rounded-full px-2 py-0.5 text-xs font-bold flex items-center gap-1 bg-amber-400 text-amber-900">
        <Icon name="lightning" size={10} fill="currentColor" />{" "}
        {game.energyCost}
      </div>
      <span
        className={`text-4xl ${game.textColor} ${isLaunching ? "animate-bounce" : ""}`}
      >
        <Icon name={game.icon} size={48} />
      </span>
      <h3 className={`mt-2 font-display font-semibold ${game.textColor}`}>
        {game.name}
      </h3>
      <p className="text-xs text-gray-600 text-center">{game.description}</p>
      <div
        className={`mt-2 text-xs font-medium ${game.textColor} flex items-center gap-1`}
      >
        {isLaunching ? t("dashboard.loading") : t("dashboard.playNow")}{" "}
        <Icon name="controller" size={12} />
      </div>
    </button>
  );
}
