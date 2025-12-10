import { rx } from "rextive/react";
import { useTypingGame } from "../provider";
import { GameIcon, getIconForWord } from "@/components/GameIcons";
import { playTypingSound } from "@/hooks/useSound";

export function PlayingScreen({
  inputRef,
}: {
  inputRef: React.RefObject<HTMLInputElement | null>;
}) {
  const $game = useTypingGame();

  return rx(() => {
    const currentWord = $game.currentWord();
    const userInput = $game.userInput();
    const message = $game.message();
    const stats = $game.stats();
    const timeLeft = $game.timeLeft();
    const wordsToComplete = $game.wordsToComplete();
    const wordIcon = getIconForWord(currentWord);

    return (
      <div className="space-y-4">
        {/* Stats Bar */}
        <div className="card bg-white/90 backdrop-blur">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-4">
              <div>
                <span className="text-gray-500">Score:</span>
                <span className="ml-1 font-bold text-primary-600">
                  {stats.score}
                </span>
              </div>
              <div>
                <span className="text-gray-500">Words:</span>
                <span className="ml-1 font-bold">
                  {stats.wordsCompleted}/{wordsToComplete}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-gray-500">Streak:</span>
                <span className="font-bold text-amber-600">
                  {stats.streak}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span
                className={`text-2xl font-bold ${timeLeft <= 10 ? "text-red-500 animate-pulse" : "text-gray-800"}`}
              >
                {timeLeft}s
              </span>
              <button
                onClick={() => $game.pauseGame()}
                className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors"
              >
                ||
              </button>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="mt-3 h-2 rounded-full bg-gray-200 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-green-400 to-emerald-500 transition-all duration-300"
              style={{
                width: `${(stats.wordsCompleted / wordsToComplete) * 100}%`,
              }}
            />
          </div>
        </div>

        {/* Main Game Area - Click anywhere to focus */}
        <div 
          className="card bg-white text-center py-8 cursor-text"
          onClick={() => inputRef.current?.focus()}
        >
          {/* Message */}
          <div className="h-8 mb-4">
            {message && (
              <span className="text-lg font-semibold text-primary-600 animate-bounce inline-block">
                {message}
              </span>
            )}
          </div>

          {/* Word Image */}
          {wordIcon && (
            <div className="mb-6 flex justify-center">
              <div className="p-4 bg-gradient-to-br from-primary-100 to-purple-100 rounded-2xl shadow-inner">
                <GameIcon name={wordIcon} size={96} className="drop-shadow-lg" />
              </div>
            </div>
          )}

          {/* Current Word Display */}
          <div className="mb-6">
            <div className="flex justify-center gap-1 text-4xl sm:text-5xl font-mono font-bold">
              {currentWord.split("").map((char, i) => {
                const typed = userInput[i];
                const isCorrect = typed?.toLowerCase() === char.toLowerCase();
                const isCurrent = i === userInput.length;

                return (
                  <span
                    key={i}
                    className={`inline-block w-12 h-14 sm:w-14 sm:h-16 rounded-lg flex items-center justify-center transition-all ${
                      typed
                        ? isCorrect
                          ? "bg-green-100 text-green-600"
                          : "bg-red-100 text-red-600"
                        : isCurrent
                          ? "bg-primary-100 text-primary-600 ring-2 ring-primary-400 animate-pulse"
                          : "bg-gray-100 text-gray-400"
                    }`}
                  >
                    {char.toUpperCase()}
                  </span>
                );
              })}
            </div>
          </div>

          {/* Hidden Input */}
          <input
            ref={inputRef}
            type="text"
            value={userInput}
            onChange={() => {}}
            onKeyDown={(e) => {
              if (e.key === "Backspace") {
                playTypingSound();
                $game.handleBackspace();
              } else if (e.key === " " || e.key === "Enter") {
                e.preventDefault();
                $game.skipWord();
              } else if (e.key.length === 1 && /[a-zA-Z]/.test(e.key)) {
                playTypingSound();
                $game.handleKeyPress(e.key);
              }
            }}
            onBlur={() => {
              // Auto-refocus after a brief delay to allow button clicks to work
              setTimeout(() => inputRef.current?.focus(), 100);
            }}
            className="opacity-0 absolute -z-10"
            autoFocus
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck={false}
          />

          {/* Keyboard Hint */}
          <p className="text-gray-500 text-sm pointer-events-none">
            Type the word above! Press{" "}
            <kbd className="px-2 py-1 bg-gray-100 rounded">Space</kbd> to skip
          </p>

          {/* Tap to Focus hint (Mobile) */}
          <p className="mt-4 text-primary-600 text-sm font-medium sm:hidden pointer-events-none">
            Tap here to type ⌨️
          </p>
        </div>

        {/* Accuracy */}
        <div className="card bg-white/80 backdrop-blur">
          <div className="flex items-center justify-between">
            <span className="text-gray-600">Accuracy</span>
            <span
              className={`font-bold ${stats.accuracy >= 90 ? "text-green-600" : stats.accuracy >= 70 ? "text-amber-600" : "text-red-600"}`}
            >
              {stats.accuracy}%
            </span>
          </div>
          <div className="mt-2 h-2 rounded-full bg-gray-200 overflow-hidden">
            <div
              className={`h-full transition-all duration-300 ${
                stats.accuracy >= 90
                  ? "bg-green-500"
                  : stats.accuracy >= 70
                    ? "bg-amber-500"
                    : "bg-red-500"
              }`}
              style={{ width: `${stats.accuracy}%` }}
            />
          </div>
        </div>
      </div>
    );
  });
}

