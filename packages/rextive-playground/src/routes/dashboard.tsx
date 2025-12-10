import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { signal } from "rextive";
import { rx, useScope } from "rextive/react";
import { selectedProfileLogic, energyLogic, kidProfilesLogic } from "@/logic";
import { AVATAR_NAMES, AVAILABLE_GAMES, isGameUnlocked, getXpToNextUnlock } from "@/domain/types";
import { useEffect } from "react";
import { Avatar } from "@/components/Avatar";
import { Icon, type IconName } from "@/components/Icons";
import { gameProgressRepository } from "@/infrastructure/repositories";

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
  implemented: boolean;  // Game code exists
  unlocked: boolean;     // Player has enough XP
  xpRequired: number;    // XP needed to unlock
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
        { id: "first-game", name: "First Steps", icon: "baby", unlocked: false, description: "Play your first game" },
        { id: "unlock-2", name: "Game Collector", icon: "lock", unlocked: false, description: "Unlock 2 games" },
        { id: "unlock-all", name: "Master Unlocker", icon: "key", unlocked: false, description: "Unlock all games" },
        { id: "streak-3", name: "On Fire", icon: "fire", unlocked: false, description: "3 day streak" },
        { id: "streak-7", name: "Week Warrior", icon: "swords", unlocked: false, description: "7 day streak" },
        { id: "score-1000", name: "High Scorer", icon: "trophy", unlocked: false, description: "Score 1000 points" },
        { id: "level-5", name: "Rising Star", icon: "star", unlocked: false, description: "Reach level 5" },
        { id: "all-games", name: "Explorer", icon: "map", unlocked: false, description: "Try all games" },
        { id: "perfect-10", name: "Perfectionist", icon: "target", unlocked: false, description: "10 perfect scores" },
        { id: "speed-demon", name: "Speed Demon", icon: "lightning", unlocked: false, description: "Finish in record time" },
      ],
    },
    { name: "dashboard.stats" }
  );

  // Refresh stats from database
  async function refreshStats(kidId: number) {
    const allProgress = await gameProgressRepository.getByKid(kidId);
    
    // Aggregate cumulative stats from all game progress records
    const totalScore = allProgress.reduce((sum, p) => sum + (p.totalScore ?? p.highScore ?? 0), 0);
    const totalGames = allProgress.reduce((sum, p) => sum + (p.timesPlayed ?? 1), 0);
    const uniqueGames = allProgress.length;
    
    // Calculate level (1000 XP per level)
    const level = Math.floor(totalScore / 1000) + 1;
    const xp = totalScore % 1000;
    
    // Check achievements
    // Calculate number of unlocked games based on XP
    const unlockedGamesCount = AVAILABLE_GAMES.filter(g => isGameUnlocked(g.id, totalScore)).length;
    
    const achievements = stats().achievements.map(a => {
      let unlocked = a.unlocked;
      if (a.id === "first-game" && totalGames > 0) unlocked = true;
      if (a.id === "unlock-2" && unlockedGamesCount >= 2) unlocked = true;
      if (a.id === "unlock-all" && unlockedGamesCount >= AVAILABLE_GAMES.length) unlocked = true;
      if (a.id === "score-1000" && totalScore >= 1000) unlocked = true;
      if (a.id === "level-5" && level >= 5) unlocked = true;
      if (a.id === "all-games" && uniqueGames >= 3) unlocked = true;
      return { ...a, unlocked };
    });

    stats.set(prev => ({
      ...prev,
      totalGames,
      totalScore,
      level,
      xp,
      xpToNextLevel: 1000,
      achievements,
      // Mock today stats for now (would need daily session tracking)
      todayGames: Math.min(totalGames, 5),
      todayScore: Math.min(totalScore, 500),
      todayMinutes: Math.min(Math.floor(totalGames * 3), 30),
    }));

    // Update games list based on new XP total
    games.set(buildGamesList(totalScore));
  }

  // Reload when profile changes
  $selected.profile.on(() => {
    const p = $selected.profile();
    if (p) refreshStats(p.id);
  });
  
  // Initial load
  if ($selected.profile()) {
    refreshStats($selected.profile()!.id);
  }

  // Game metadata (static info)
  const GAME_META: Record<string, { icon: IconName; description: string; color: string }> = {
    "typing-adventure": { icon: "keyboard", description: "Practice typing!", color: "bg-indigo-100" },
    "memory-match": { icon: "brain", description: "Train your memory!", color: "bg-purple-100" },
    "road-racer": { icon: "car", description: "Race to win!", color: "bg-red-100" },
    "math-quest": { icon: "math", description: "Fun with numbers!", color: "bg-blue-100" },
    "word-builder": { icon: "pencil", description: "Build cool words!", color: "bg-green-100" },
    "puzzle-time": { icon: "puzzle", description: "Solve puzzles!", color: "bg-orange-100" },
    "color-fun": { icon: "palette", description: "Learn colors!", color: "bg-pink-100" },
  };

  // Build games list based on current XP/totalScore
  function buildGamesList(totalXp: number): Game[] {
    return AVAILABLE_GAMES.map(gameConfig => {
      const meta = GAME_META[gameConfig.id] || { 
        icon: "controller" as IconName, 
        description: "Play now!", 
        color: "bg-gray-100" 
      };
      return {
        id: gameConfig.id,
        name: gameConfig.name,
        icon: meta.icon,
        description: meta.description,
        color: meta.color,
        implemented: gameConfig.implemented,
        unlocked: isGameUnlocked(gameConfig.id, totalXp),
        xpRequired: gameConfig.xpRequired,
      };
    });
  }

  const games = signal<Game[]>(buildGamesList(0), { name: "dashboard.games" });


  // Get XP to next game unlock
  function getXpToUnlock(): number {
    return getXpToNextUnlock(stats().totalScore);
  }

  return {
    profile: $selected.profile,
    isLoading: $profiles.isLoading,
    stats,
    games,
    energy: $energy.energy,
    maxEnergy: $energy.maxEnergy,
    getTimeUntilRefill: $energy.getTimeUntilRefill,
    getXpToUnlock,
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
          <div className="text-4xl animate-bounce text-primary-500">
            <Icon name="controller" size={64} />
          </div>
        </div>
      );
    }

    const profile = $dash.profile();
    if (!profile) return null;

    const stats = $dash.stats();
    const games = $dash.games();
    const energy = $dash.energy();
    const avatarName = AVATAR_NAMES[profile.avatar] || "";
    const xpPercent = Math.round((stats.xp / stats.xpToNextLevel) * 100);
    const timeUntilRefill = $dash.getTimeUntilRefill();
    const xpToUnlock = $dash.getXpToUnlock();
    const nextLockedGame = games.find(g => !g.unlocked);
    const unlockedCount = games.filter(g => g.unlocked).length;

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
                <Icon name="arrow-left" size={20} />
                <span className="text-sm font-medium hidden sm:inline">Switch</span>
              </button>

              <div className="flex items-center gap-2">
                <div className="h-9 w-9">
                  <Avatar avatar={profile.avatar} className="w-full h-full" />
                </div>
                <div className="text-left">
                  <div className="font-display font-bold text-gray-800 leading-tight">
                    {profile.name}
                  </div>
                  <div className="text-xs text-gray-500">
                    Level {stats.level} • {avatarName}
                  </div>
                </div>
              </div>

              {/* Energy & Streak */}
              <div className="flex items-center gap-3">
                {/* Energy Display */}
                <div className="flex items-center gap-1">
                  <span className="text-lg text-amber-500">
                    <Icon name="lightning" size={20} fill="currentColor" />
                  </span>
                  <span className="font-bold text-amber-600">{energy}</span>
                  <span className="text-gray-400 text-xs">/{$dash.maxEnergy}</span>
                </div>
                {/* Streak */}
                <div className="h-8 w-8 rounded-full bg-amber-100 flex items-center justify-center text-sm font-bold text-amber-600">
                  <div className="flex items-center gap-0.5">
                    <Icon name="fire" size={16} fill="currentColor" />
                    {stats.currentStreak}
                  </div>
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
                <span className="text-3xl text-white/90">
                  <Icon name="lightning" size={32} fill="currentColor" />
                </span>
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
            <h1 className="font-display text-2xl font-bold flex items-center gap-2">
              Welcome back, {profile.name}! <Icon name="star" size={24} className="text-amber-300" />
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

          {/* Next Game Unlock */}
          {nextLockedGame && (
            <section className="card bg-gradient-to-r from-purple-500 to-pink-500 text-white">
              <div className="flex items-center gap-3">
                <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center">
                  <Icon name="lock" size={24} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="font-display font-semibold">Next Unlock: {nextLockedGame.name}</span>
                    <span className="text-sm text-white/80">{unlockedCount}/{games.length}</span>
                  </div>
                  <div className="mt-1 h-2 rounded-full bg-white/30 overflow-hidden">
                    <div
                      className="h-full bg-white rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(100, (stats.totalScore / nextLockedGame.xpRequired) * 100)}%` }}
                    />
                  </div>
                  <div className="mt-1 text-sm text-white/80">
                    {xpToUnlock > 0 ? `${xpToUnlock.toLocaleString()} XP to unlock` : 'Unlocked!'}
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* All games unlocked */}
          {!nextLockedGame && (
            <section className="card bg-gradient-to-r from-green-500 to-emerald-500 text-white">
              <div className="flex items-center gap-3">
                <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center">
                  <Icon name="trophy" size={24} />
                </div>
                <div className="flex-1">
                  <div className="font-display font-semibold">All Games Unlocked!</div>
                  <div className="text-sm text-white/80">
                    You've unlocked all {games.length} games! Keep playing to earn more achievements.
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* Today's Progress */}
          <section>
            <h2 className="mb-3 font-display text-lg font-semibold text-gray-700 flex items-center gap-2">
              <span className="text-primary-500">
                <Icon name="controller" size={24} />
              </span>
              Today's Progress
            </h2>
            <div className="grid grid-cols-3 gap-3">
              <ProgressCard icon="controller" value={stats.todayGames} label="Games" target={5} />
              <ProgressCard icon="star" value={stats.todayScore} label="Score" target={1000} />
              <ProgressCard icon="clock" value={stats.todayMinutes} label="Minutes" target={30} />
            </div>
          </section>

          {/* Quick Stats */}
          <section>
            <h2 className="mb-3 font-display text-lg font-semibold text-gray-700 flex items-center gap-2">
              <span className="text-amber-500">
                <Icon name="trophy" size={24} />
              </span>
              Your Stats
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <StatCard icon="controller" value={stats.totalGames} label="Total Games" />
              <StatCard icon="star" value={stats.totalScore.toLocaleString()} label="Total Score" />
              <StatCard icon="fire" value={stats.currentStreak} label="Current Streak" suffix=" days" />
              <StatCard icon="trophy" value={stats.bestStreak} label="Best Streak" suffix=" days" />
            </div>
          </section>

          {/* Achievements */}
          <section>
            <h2 className="mb-3 font-display text-lg font-semibold text-gray-700 flex items-center gap-2">
              <span className="text-amber-500">
                <Icon name="trophy" size={24} />
              </span>
              Achievements
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
              <span className="text-primary-500">
                <Icon name="controller" size={24} />
              </span>
              Games
              <span className="text-sm font-normal text-gray-500 flex items-center gap-1">
                (<Icon name="lightning" size={14} className="text-amber-500" fill="currentColor" /> 1 per game)
              </span>
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {games.map((game) => (
                <GameCard key={game.id} game={game} hasEnergy={energy > 0} totalXp={stats.totalScore} />
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
  icon: IconName;
  value: number;
  label: string;
  target: number;
}) {
  const percent = Math.min(100, Math.round((value / target) * 100));
  const isComplete = value >= target;

  return (
    <div className="card p-3 text-center">
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
            <Icon name="check" size={12} /> Complete!
          </>
        ) : (
          `${value}/${target}`
        )}
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
    <div className="card flex flex-col items-center p-3 text-center">
      <span className="text-2xl text-primary-600">
        <Icon name={icon} size={32} />
      </span>
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
      <span className={achievement.unlocked ? "text-amber-600" : "grayscale opacity-50"}>
        <Icon name={achievement.icon} size={16} />
      </span>
      <span className="hidden sm:inline">{achievement.name}</span>
      
      {/* Tooltip */}
      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-10">
        <div className="bg-gray-900 text-white text-xs rounded-lg px-3 py-2 whitespace-nowrap shadow-xl">
          <div className="font-semibold flex items-center gap-1">
            <Icon name={achievement.icon} size={12} />
            {achievement.name}
          </div>
          <div className="text-gray-300">{achievement.description}</div>
          {!achievement.unlocked && (
            <div className="text-amber-400 mt-1 flex items-center gap-1">
              <Icon name="lock" size={10} /> Locked
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function GameCard({ game, hasEnergy, totalXp }: { game: Game; hasEnergy: boolean; totalXp: number }) {
  // Locked game (not enough XP)
  if (!game.unlocked) {
    const xpNeeded = game.xpRequired - totalXp;
    return (
      <div className={`card relative flex flex-col items-center p-4 ${game.color} opacity-60`}>
        <div className="absolute -top-2 -right-2 rounded-full bg-gray-500 px-2 py-0.5 text-xs font-bold text-white flex items-center gap-1">
          <Icon name="lock" size={10} /> Locked
        </div>
        <span className="text-4xl text-gray-400">
          <Icon name={game.icon} size={48} />
        </span>
        <h3 className="mt-2 font-display font-semibold text-gray-600">{game.name}</h3>
        <p className="text-xs text-gray-500 text-center">
          {xpNeeded.toLocaleString()} XP to unlock
        </p>
        <div className="mt-2 w-full h-1.5 rounded-full bg-gray-200 overflow-hidden">
          <div 
            className="h-full bg-gradient-to-r from-purple-400 to-pink-400 transition-all duration-500"
            style={{ width: `${Math.min(100, (totalXp / game.xpRequired) * 100)}%` }}
          />
        </div>
      </div>
    );
  }

  // Coming soon game (unlocked but not implemented yet)
  if (!game.implemented) {
    return (
      <div className={`card relative flex flex-col items-center p-4 ${game.color} opacity-70`}>
        <div className="absolute -top-2 -right-2 rounded-full bg-purple-400 px-2 py-0.5 text-xs font-bold text-white">
          Soon
        </div>
        <span className="text-4xl text-gray-400">
          <Icon name={game.icon} size={48} />
        </span>
        <h3 className="mt-2 font-display font-semibold text-gray-600">{game.name}</h3>
        <p className="text-xs text-gray-500 text-center">Coming soon!</p>
        <div className="mt-2 text-xs font-medium text-purple-500 flex items-center gap-1">
          <Icon name="check" size={12} /> Unlocked!
        </div>
      </div>
    );
  }

  // No energy - disabled state
  if (!hasEnergy) {
    return (
      <div className={`card relative flex flex-col items-center p-4 ${game.color} opacity-50`}>
        <div className="absolute -top-2 -right-2 rounded-full bg-amber-500 px-2 py-0.5 text-xs font-bold text-white flex items-center gap-1">
          <Icon name="lightning" size={10} fill="currentColor" /> 0
        </div>
        <span className="text-4xl text-gray-400">
          <Icon name={game.icon} size={48} />
        </span>
        <h3 className="mt-2 font-display font-semibold text-gray-600">{game.name}</h3>
        <p className="text-xs text-gray-500 text-center">No energy left!</p>
      </div>
    );
  }

  // Available game (unlocked + implemented + has energy)
  return (
    <Link
      to={`/games/${game.id}`}
      className={`card relative flex flex-col items-center p-4 ${game.color} transition-transform hover:scale-105 active:scale-95`}
    >
      <div className="absolute -top-2 -right-2 rounded-full bg-amber-400 px-2 py-0.5 text-xs font-bold text-amber-900 flex items-center gap-1">
        <Icon name="lightning" size={10} fill="currentColor" /> 1
      </div>
      <span className="text-4xl text-primary-600">
        <Icon name={game.icon} size={48} />
      </span>
      <h3 className="mt-2 font-display font-semibold text-gray-800">{game.name}</h3>
      <p className="text-xs text-gray-600 text-center">{game.description}</p>
      <div className="mt-2 text-xs font-medium text-primary-600 flex items-center gap-1">
        Play Now <Icon name="controller" size={12} />
      </div>
    </Link>
  );
}

