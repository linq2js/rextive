import { rx } from "rextive/react";
import { useTypingGame } from "../provider";

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
              <div>
                <span className="text-gray-500">Streak:</span>
                <span className="ml-1 font-bold text-amber-600">
                  🔥{stats.streak}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span
                className={`text-2xl font-bold ${timeLeft <= 10 ? "text-red-500 animate-pulse" : "text-gray-800"}`}
              >
                ⏱️ {timeLeft}s
              </span>
              <button
                onClick={() => $game.pauseGame()}
                className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors"
              >
                ⏸️
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

        {/* Main Game Area */}
        <div className="card bg-white text-center py-8">
          {/* Message */}
          <div className="h-8 mb-4">
            {message && (
              <span className="text-lg font-semibold text-primary-600 animate-bounce inline-block">
                {message}
              </span>
            )}
          </div>

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
                $game.handleBackspace();
              } else if (e.key === " " || e.key === "Enter") {
                e.preventDefault();
                $game.skipWord();
              } else if (e.key.length === 1 && /[a-zA-Z]/.test(e.key)) {
                $game.handleKeyPress(e.key);
              }
            }}
            className="opacity-0 absolute -z-10"
            autoFocus
          />

          {/* Keyboard Hint */}
          <p className="text-gray-500 text-sm">
            Type the word above! Press{" "}
            <kbd className="px-2 py-1 bg-gray-100 rounded">Space</kbd> to skip
          </p>

          {/* Tap to Focus (Mobile) */}
          <button
            onClick={() => inputRef.current?.focus()}
            className="mt-4 px-6 py-2 bg-primary-100 text-primary-700 rounded-full text-sm font-medium sm:hidden"
          >
            Tap to type ⌨️
          </button>
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

