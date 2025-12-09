import { useTypingGame } from "../provider";

export function PausedScreen() {
  const $game = useTypingGame();

  return (
    <div className="card text-center py-8">
      <div className="text-6xl mb-4">⏸️</div>
      <h2 className="font-display text-2xl font-bold text-gray-800">
        Game Paused
      </h2>
      <p className="mt-2 text-gray-600">Take a break!</p>
      <div className="mt-6 flex flex-col gap-3">
        <button
          onClick={() => $game.resumeGame()}
          className="btn btn-primary py-3"
        >
          Resume Game ▶️
        </button>
        <button
          onClick={() => $game.backToMenu()}
          className="btn btn-outline py-3"
        >
          Quit to Menu
        </button>
      </div>
    </div>
  );
}

