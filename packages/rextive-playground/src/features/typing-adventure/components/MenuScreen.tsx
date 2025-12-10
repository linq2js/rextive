/**
 * Typing Adventure Menu Screen
 * Uses the shared GameMenu component with game-specific configuration.
 */
import { rx } from "rextive/react";
import { energyLogic } from "@/logic";
import { useTypingGame } from "../provider";
import { GameMenu, type DifficultyOption } from "@/components/GameMenu";

// Typing-specific difficulty options
const DIFFICULTY_OPTIONS: DifficultyOption[] = [
  {
    value: "easy",
    label: "Easy",
    description: "5 pts/word",
    color: "from-emerald-400 to-green-500",
  },
  {
    value: "medium",
    label: "Medium",
    description: "10 pts/word",
    color: "from-amber-400 to-orange-500",
  },
  {
    value: "hard",
    label: "Hard",
    description: "20 pts/word",
    color: "from-red-400 to-rose-500",
  },
];

const HOW_TO_PLAY = [
  "Type the words that appear on screen",
  "Complete words to earn points",
  "Build streaks for bonus points!",
  "Press Space or Enter to skip a word",
];

export function MenuScreen() {
  const $game = useTypingGame();
  const $energy = energyLogic();

  return rx(() => {
    const difficulty = $game.difficulty();
    const energy = $energy.energy();

    return (
      <GameMenu
        title="Typing Adventure"
        description="Practice typing words as fast as you can!"
        icon="keyboard"
        themeColor="from-primary-500 to-purple-500"
        difficulty={difficulty}
        onDifficultyChange={(d) => $game.setDifficulty(d)}
        difficultyOptions={DIFFICULTY_OPTIONS}
        energy={energy}
        energyCost={1}
        onPlay={() => $game.startGame()}
        howToPlay={HOW_TO_PLAY}
        howToPlayColor="bg-blue-50"
      />
    );
  });
}
