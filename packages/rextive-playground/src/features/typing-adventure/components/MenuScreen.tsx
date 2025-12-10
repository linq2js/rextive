import { rx } from "rextive/react";
import { energyLogic } from "@/logic";
import { useTypingGame } from "../provider";
import { DifficultyButton } from "./DifficultyButton";
import { Icon } from "@/components/Icons";

export function MenuScreen() {
  const $game = useTypingGame();
  const $energy = energyLogic();

  return rx(() => {
    const difficulty = $game.difficulty();
    const energy = $energy.energy();
    const hasEnergy = energy > 0;

    return (
      <div className="space-y-6">
        {/* Game Info Card */}
        <div className="card text-center">
          <div className="text-primary-500 mb-4 flex justify-center">
            <Icon name="keyboard" size={64} />
          </div>
          <h2 className="font-display text-2xl font-bold text-gray-800">
            Typing Adventure
          </h2>
          <p className="mt-2 text-gray-600">
            Practice typing words as fast as you can!
          </p>
        </div>

        {/* Difficulty Selection */}
        <div className="card">
          <h3 className="font-display text-lg font-semibold text-gray-700 mb-3">
            Choose Difficulty
          </h3>
          <div className="grid grid-cols-3 gap-3">
            <DifficultyButton
              iconName="star"
              label="Easy"
              description="5 pts/word"
              selected={difficulty === "easy"}
              onClick={() => $game.setDifficulty("easy")}
            />
            <DifficultyButton
              iconName="fire"
              label="Medium"
              description="10 pts/word"
              selected={difficulty === "medium"}
              onClick={() => $game.setDifficulty("medium")}
            />
            <DifficultyButton
              iconName="trophy"
              label="Hard"
              description="20 pts/word"
              selected={difficulty === "hard"}
              onClick={() => $game.setDifficulty("hard")}
            />
          </div>
        </div>

        {/* How to Play */}
        <div className="card bg-blue-50">
          <h3 className="font-display text-lg font-semibold text-blue-800 mb-2">
            How to Play
          </h3>
          <ul className="text-sm text-blue-700 space-y-1">
            <li>• Type the words that appear on screen</li>
            <li>• Complete words to earn points</li>
            <li>• Build streaks for bonus points!</li>
            <li>• Press Space or Enter to skip a word</li>
          </ul>
        </div>

        {/* Start Button */}
        <button
          onClick={() => $game.startGame()}
          disabled={!hasEnergy}
          className={`w-full py-4 rounded-2xl font-display text-xl font-bold transition-all ${
            hasEnergy
              ? "bg-gradient-to-r from-green-400 to-emerald-500 text-white hover:scale-105 active:scale-95 shadow-lg"
              : "bg-gray-300 text-gray-500 cursor-not-allowed"
          }`}
        >
          {hasEnergy ? <>Start Game <Icon name="lightning" size={20} className="inline" />1</> : <>No Energy - Come Back Tomorrow!</>}
        </button>
      </div>
    );
  });
}

