import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { signal } from "rextive";
import { rx, useScope } from "rextive/react";
import { selectedProfileLogic, energyLogic } from "@/logic";
import { AVATAR_COLORS, ZODIAC_NAMES } from "@/domain/types";
import { useEffect } from "react";

export const Route = createFileRoute("/dashboard")({
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
  icon: string;
  unlocked: boolean;
  description: string;
}

interface Game {
  id: string;
  name: string;
  icon: string;
  description: string;
  color: string;
  available: boolean;
}

function dashboardLogic() {
  const $selected = selectedProfileLogic();
  const $energy = energyLogic();

  // Mock stats - in real app, fetch from DB
  const stats = signal<KidStats>(
    {
      todayGames: 3,
      todayScore: 450,
      todayMinutes: 25,
      totalGames: 47,
      totalScore: 8250,
      level: 5,
      xp: 350,
      xpToNextLevel: 500,
      currentStreak: 7,
      bestStreak: 12,
      achievements: [
        { id: "first-game", name: "First Steps", icon: "👶", unlocked: true, description: "Play your first game" },
        { id: "streak-3", name: "On Fire", icon: "🔥", unlocked: true, description: "3 day streak" },
        { id: "streak-7", name: "Week Warrior", icon: "⚔️", unlocked: true, description: "7 day streak" },
        { id: "score-1000", name: "High Scorer", icon: "🏆", unlocked: true, description: "Score 1000 points" },
        { id: "level-5", name: "Rising Star", icon: "⭐", unlocked: true, description: "Reach level 5" },
        { id: "all-games", name: "Explorer", icon: "🗺️", unlocked: false, description: "Try all games" },
        { id: "perfect-10", name: "Perfectionist", icon: "💯", unlocked: false, description: "10 perfect scores" },
        { id: "speed-demon", name: "Speed Demon", icon: "⚡", unlocked: false, description: "Finish in record time" },
      ],
    },
    { name: "dashboard.stats" }
  );

  const games = signal<Game[]>(
    [
      { id: "typing-adventure", name: "Typing Adventure", icon: "⌨️", description: "Practice typing!", color: "bg-indigo-100", available: true },
      { id: "memory-match", name: "Memory Match", icon: "🧠", description: "Train your memory!", color: "bg-purple-100", available: true },
      { id: "road-racer", name: "Road Racer", icon: "🏎️", description: "Race to win!", color: "bg-red-100", available: true },
      { id: "math-quest", name: "Math Quest", icon: "➕", description: "Fun with numbers!", color: "bg-blue-100", available: false },
      { id: "word-builder", name: "Word Builder", icon: "📝", description: "Build cool words!", color: "bg-green-100", available: false },
      { id: "puzzle-time", name: "Puzzle Time", icon: "🧩", description: "Solve puzzles!", color: "bg-orange-100", available: false },
      { id: "color-fun", name: "Color Fun", icon: "🎨", description: "Learn colors!", color: "bg-pink-100", available: false },
    ],
    { name: "dashboard.games" }
  );

  return {
    profile: $selected.profile,
    isLoading: $selected.isLoading,
    stats,
    games,
    energy: $energy.energy,
    maxEnergy: $energy.maxEnergy,
    getTimeUntilRefill: $energy.getTimeUntilRefill,
    switchProfile: $selected.clear,
  };
}

function Dashboard() {
  const navigate = useNavigate();
  const $dash = useScope(dashboardLogic);

  // Redirect to home if no profile selected
  useEffect(() => {
    const unsub = $dash.profile.on(() => {
      if (!$dash.isLoading() && !$dash.profile()) {
        navigate({ to: "/" });
      }
    });
    return unsub;
  }, [$dash, navigate]);

  return rx(() => {
    if ($dash.isLoading()) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-pattern-kid">
          <div className="text-4xl animate-bounce">🎮</div>
        </div>
      );
    }

    const profile = $dash.profile();
    if (!profile) return null;

    const stats = $dash.stats();
    const games = $dash.games();
    const energy = $dash.energy();
    const zodiacName = ZODIAC_NAMES[profile.avatar] || "";
    const xpPercent = Math.round((stats.xp / stats.xpToNextLevel) * 100);
    const timeUntilRefill = $dash.getTimeUntilRefill();

    return (
      <div className="min-h-screen bg-pattern-kid pb-8 safe-bottom">
        {/* Header */}
        <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-gray-200">
          <div className="mx-auto max-w-3xl px-4">
            <div className="flex h-14 items-center justify-between">
              <button
                onClick={() => {
                  $dash.switchProfile();
                  navigate({ to: "/" });
                }}
                className="flex items-center gap-1 text-gray-600 hover:text-gray-900 transition-colors"
              >
                <span>←</span>
                <span className="text-sm font-medium hidden sm:inline">Switch</span>
              </button>

              <div className="flex items-center gap-2">
                <div
                  className={`h-9 w-9 rounded-full flex items-center justify-center text-xl ${AVATAR_COLORS[profile.avatar]}`}
                >
                  {profile.avatar}
                </div>
                <div className="text-left">
                  <div className="font-display font-bold text-gray-800 leading-tight">
                    {profile.name}
                  </div>
                  <div className="text-xs text-gray-500">
                    Level {stats.level} • {zodiacName}
                  </div>
                </div>
              </div>

              {/* Energy & Streak */}
              <div className="flex items-center gap-3">
                {/* Energy Display */}
                <div className="flex items-center gap-1">
                  <span className="text-lg">⚡</span>
                  <span className="font-bold text-amber-600">{energy}</span>
                  <span className="text-gray-400 text-xs">/{$dash.maxEnergy}</span>
                </div>
                {/* Streak */}
                <div className="h-8 w-8 rounded-full bg-amber-100 flex items-center justify-center text-sm font-bold">
                  🔥{stats.currentStreak}
                </div>
              </div>
            </div>
          </div>
        </header>

        <div className="mx-auto max-w-3xl p-4 space-y-6">
          {/* Energy Bar (Satima) */}
          <div className="card bg-gradient-to-r from-amber-400 to-orange-500 text-white">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-3xl">⚡</span>
                <div>
                  <h2 className="font-display text-lg font-bold">Satima (Energy)</h2>
                  <p className="text-sm text-white/80">
                    {energy > 0
                      ? `${energy} games left today!`
                      : "Come back tomorrow for more!"}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <div className="text-3xl font-bold">{energy}/{$dash.maxEnergy}</div>
                {energy < $dash.maxEnergy && timeUntilRefill && (
                  <div className="text-xs text-white/70">
                    Refills in {timeUntilRefill.hours}h {timeUntilRefill.minutes}m
                  </div>
                )}
              </div>
            </div>
            
            {/* Energy Dots */}
            <div className="mt-4 flex justify-center gap-2">
              {Array.from({ length: $dash.maxEnergy }).map((_, i) => (
                <div
                  key={i}
                  className={`h-4 w-4 rounded-full transition-all duration-300 ${
                    i < energy
                      ? "bg-white shadow-lg shadow-white/50"
                      : "bg-white/30"
                  }`}
                />
              ))}
            </div>
          </div>

          {/* Welcome Banner */}
          <div className="card bg-gradient-to-r from-primary-500 to-purple-500 text-white">
            <h1 className="font-display text-2xl font-bold">
              Welcome back, {profile.name}! 🎉
            </h1>
            <p className="mt-1 text-white/80">
              You're on a {stats.currentStreak} day streak! Keep it up!
            </p>
            
            {/* Level Progress */}
            <div className="mt-4">
              <div className="flex items-center justify-between text-sm">
                <span>Level {stats.level}</span>
                <span>Level {stats.level + 1}</span>
              </div>
              <div className="mt-1 h-3 rounded-full bg-white/30 overflow-hidden">
                <div
                  className="h-full bg-white rounded-full transition-all duration-500"
                  style={{ width: `${xpPercent}%` }}
                />
              </div>
              <div className="mt-1 text-center text-sm text-white/80">
                {stats.xpToNextLevel - stats.xp} XP to next level
              </div>
            </div>
          </div>

          {/* Today's Progress */}
          <section>
            <h2 className="mb-3 font-display text-lg font-semibold text-gray-700 flex items-center gap-2">
              📊 Today's Progress
            </h2>
            <div className="grid grid-cols-3 gap-3">
              <ProgressCard icon="🎮" value={stats.todayGames} label="Games" target={5} />
              <ProgressCard icon="⭐" value={stats.todayScore} label="Score" target={1000} />
              <ProgressCard icon="⏱️" value={stats.todayMinutes} label="Minutes" target={30} />
            </div>
          </section>

          {/* Quick Stats */}
          <section>
            <h2 className="mb-3 font-display text-lg font-semibold text-gray-700 flex items-center gap-2">
              🏅 Your Stats
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <StatCard icon="🎮" value={stats.totalGames} label="Total Games" />
              <StatCard icon="⭐" value={stats.totalScore.toLocaleString()} label="Total Score" />
              <StatCard icon="🔥" value={stats.currentStreak} label="Current Streak" suffix=" days" />
              <StatCard icon="🏆" value={stats.bestStreak} label="Best Streak" suffix=" days" />
            </div>
          </section>

          {/* Achievements */}
          <section>
            <h2 className="mb-3 font-display text-lg font-semibold text-gray-700 flex items-center gap-2">
              🏆 Achievements
              <span className="text-sm font-normal text-gray-500">
                ({stats.achievements.filter(a => a.unlocked).length}/{stats.achievements.length})
              </span>
            </h2>
            <div className="flex flex-wrap gap-2">
              {stats.achievements.map((achievement) => (
                <AchievementBadge key={achievement.id} achievement={achievement} />
              ))}
            </div>
          </section>

          {/* Games */}
          <section>
            <h2 className="mb-3 font-display text-lg font-semibold text-gray-700 flex items-center gap-2">
              🕹️ Games
              <span className="text-sm font-normal text-gray-500">
                (⚡1 per game)
              </span>
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {games.map((game) => (
                <GameCard key={game.id} game={game} hasEnergy={energy > 0} />
              ))}
            </div>
          </section>
        </div>
      </div>
    );
  });
}

function ProgressCard({
  icon,
  value,
  label,
  target,
}: {
  icon: string;
  value: number;
  label: string;
  target: number;
}) {
  const percent = Math.min(100, Math.round((value / target) * 100));
  const isComplete = value >= target;

  return (
    <div className="card p-3 text-center">
      <span className="text-2xl">{icon}</span>
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
      <div className="mt-1 text-xs text-gray-400">
        {isComplete ? "✓ Complete!" : `${value}/${target}`}
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
  icon: string;
  value: string | number;
  label: string;
  suffix?: string;
}) {
  return (
    <div className="card flex flex-col items-center p-3 text-center">
      <span className="text-2xl">{icon}</span>
      <span className="mt-1 text-xl font-bold text-gray-800">
        {value}{suffix}
      </span>
      <span className="text-xs text-gray-500">{label}</span>
    </div>
  );
}

function AchievementBadge({ achievement }: { achievement: Achievement }) {
  return (
    <div
      className={`group relative flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-medium transition-all ${
        achievement.unlocked
          ? "bg-amber-100 text-amber-800"
          : "bg-gray-100 text-gray-400 opacity-60"
      }`}
      title={achievement.description}
    >
      <span className={achievement.unlocked ? "" : "grayscale"}>{achievement.icon}</span>
      <span className="hidden sm:inline">{achievement.name}</span>
      
      {/* Tooltip */}
      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-10">
        <div className="bg-gray-900 text-white text-xs rounded-lg px-3 py-2 whitespace-nowrap">
          <div className="font-semibold">{achievement.name}</div>
          <div className="text-gray-300">{achievement.description}</div>
          {!achievement.unlocked && (
            <div className="text-amber-400 mt-1">🔒 Locked</div>
          )}
        </div>
      </div>
    </div>
  );
}

function GameCard({ game, hasEnergy }: { game: Game; hasEnergy: boolean }) {
  // Coming soon game
  if (!game.available) {
    return (
      <div className={`card relative flex flex-col items-center p-4 ${game.color} opacity-60`}>
        <div className="absolute -top-2 -right-2 rounded-full bg-gray-400 px-2 py-0.5 text-xs font-bold text-white">
          Soon
        </div>
        <span className="text-4xl grayscale">{game.icon}</span>
        <h3 className="mt-2 font-display font-semibold text-gray-600">{game.name}</h3>
        <p className="text-xs text-gray-500 text-center">{game.description}</p>
      </div>
    );
  }

  // No energy - disabled state
  if (!hasEnergy) {
    return (
      <div className={`card relative flex flex-col items-center p-4 ${game.color} opacity-50`}>
        <div className="absolute -top-2 -right-2 rounded-full bg-amber-500 px-2 py-0.5 text-xs font-bold text-white flex items-center gap-1">
          ⚡ 0
        </div>
        <span className="text-4xl grayscale">{game.icon}</span>
        <h3 className="mt-2 font-display font-semibold text-gray-600">{game.name}</h3>
        <p className="text-xs text-gray-500 text-center">No energy left!</p>
      </div>
    );
  }

  // Available game
  return (
    <Link
      to={`/games/${game.id}`}
      className={`card relative flex flex-col items-center p-4 ${game.color} transition-transform hover:scale-105 active:scale-95`}
    >
      <div className="absolute -top-2 -right-2 rounded-full bg-amber-400 px-2 py-0.5 text-xs font-bold text-amber-900 flex items-center gap-1">
        ⚡1
      </div>
      <span className="text-4xl">{game.icon}</span>
      <h3 className="mt-2 font-display font-semibold text-gray-800">{game.name}</h3>
      <p className="text-xs text-gray-600 text-center">{game.description}</p>
      <div className="mt-2 text-xs font-medium text-primary-600">Play Now →</div>
    </Link>
  );
}

