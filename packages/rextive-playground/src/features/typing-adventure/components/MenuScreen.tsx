/**
 * Typing Adventure Menu Screen
 * Uses the shared GameMenu component with game-specific configuration.
 */
import { rx } from "rextive/react";
import { energyLogic } from "@/logic";
import { useTypingGame } from "../provider";
import { GameMenu, type DifficultyOption } from "@/components/GameMenu";
import { useTranslation } from "@/i18n";

export function MenuScreen() {
  const $game = useTypingGame();
  const $energy = energyLogic();
  const { t } = useTranslation();

  return rx(() => {
    const difficulty = $game.difficulty();
    const energy = $energy.energy();

    // Typing-specific difficulty options (translated)
    const difficultyOptions: DifficultyOption[] = [
      {
        value: "easy",
        label: t("typingAdventure.difficulty.easy"),
        description: t("typingAdventure.difficulty.easyDesc"),
        color: "from-emerald-400 to-green-500",
      },
      {
        value: "medium",
        label: t("typingAdventure.difficulty.medium"),
        description: t("typingAdventure.difficulty.mediumDesc"),
        color: "from-amber-400 to-orange-500",
      },
      {
        value: "hard",
        label: t("typingAdventure.difficulty.hard"),
        description: t("typingAdventure.difficulty.hardDesc"),
        color: "from-red-400 to-rose-500",
      },
    ];

    // How to play instructions (translated)
    const howToPlay = t("typingAdventure.howToPlay", { returnObjects: true }) as string[];

    return (
      <GameMenu
        title={t("typingAdventure.title")}
        description={t("typingAdventure.description")}
        icon="keyboard"
        themeColor="from-primary-500 to-purple-500"
        difficulty={difficulty}
        onDifficultyChange={(d) => $game.setDifficulty(d)}
        difficultyOptions={difficultyOptions}
        energy={energy}
        energyCost={1}
        onPlay={() => $game.startGame()}
        howToPlay={howToPlay}
        howToPlayColor="bg-blue-50"
      />
    );
  });
}
