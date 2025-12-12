import { useNavigate } from "@tanstack/react-router";
import { rx } from "rextive/react";
import { energyLogic } from "@/logic";
import { useTypingGame } from "../provider";
import { StatItem } from "./StatItem";
import { Icon } from "@/components/Icons";
import { useTranslation } from "@/i18n";

export function FinishedScreen() {
  const $game = useTypingGame();
  const $energy = energyLogic();
  const navigate = useNavigate();
  const { t } = useTranslation();

  return rx(() => {
    const stats = $game.stats();
    const difficulty = $game.difficulty();
    const energy = $energy.energy();

    // Calculate star rating
    const stars =
      stats.accuracy >= 95 && stats.bestStreak >= 5
        ? 3
        : stats.accuracy >= 80 && stats.bestStreak >= 3
          ? 2
          : 1;

    // Calculate XP earned
    const baseXP = stats.score;
    const accuracyBonus = Math.round(stats.accuracy * 0.5);
    const totalXP = baseXP + accuracyBonus;

    return (
      <div className="space-y-6">
        <div className="card text-center py-8">
          <div className="text-amber-400 mb-4 flex justify-center">
            <Icon name="trophy" size={64} />
          </div>
          <h2 className="font-display text-2xl font-bold text-gray-800">
            {t("typingAdventure.greatJob")}
          </h2>

          {/* Stars */}
          <div className="mt-4 flex justify-center gap-2">
            {[1, 2, 3].map((i) => (
              <span
                key={i}
                className={`${i <= stars ? "animate-bounce text-amber-400" : "text-gray-300"}`}
                style={{ animationDelay: `${i * 0.1}s` }}
              >
                <Icon name="star" size={40} />
              </span>
            ))}
          </div>

          {/* Score */}
          <div className="mt-6 text-4xl font-bold text-primary-600">
            {stats.score} pts
          </div>

          {/* Stats Grid */}
          <div className="mt-6 grid grid-cols-2 gap-4 text-left">
            <StatItem label={t("typingAdventure.wordsTyped")} value={stats.wordsCompleted} />
            <StatItem label={t("typingAdventure.accuracy")} value={`${stats.accuracy}%`} />
            <StatItem label={t("typingAdventure.bestStreak")} value={stats.bestStreak} iconName="fire" />
            <StatItem
              label={t("games.chooseDifficulty")}
              value={t(`typingAdventure.difficulty.${difficulty}`)}
            />
          </div>

          {/* XP Earned */}
          <div className="mt-6 p-4 bg-amber-50 rounded-xl">
            <div className="text-sm text-amber-700">{t("typingAdventure.xpEarned")}</div>
            <div className="text-2xl font-bold text-amber-600">
              +{totalXP} XP
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-3">
          <button
            onClick={() => $game.startGame()}
            disabled={energy === 0}
            className={`py-4 rounded-2xl font-display text-lg font-bold transition-all ${
              energy > 0
                ? "bg-gradient-to-r from-green-400 to-emerald-500 text-white hover:scale-105 active:scale-95 shadow-lg"
                : "bg-gray-300 text-gray-500 cursor-not-allowed"
            }`}
          >
            {energy > 0 ? <>{t("typingAdventure.playAgain")} <Icon name="lightning" size={20} className="inline" />1</> : <>{t("typingAdventure.noEnergyLeft")}</>}
          </button>
          <button
            onClick={() => navigate({ to: "/dashboard" })}
            className="btn btn-outline py-3"
          >
            {t("typingAdventure.backToDashboard")}
          </button>
        </div>
      </div>
    );
  });
}

