import { createFileRoute, Link } from "@tanstack/react-router";
import { rx, useScope } from "rextive/react";
import { energyLogic, selectedProfileLogic } from "@/logic";
import { useRef } from "react";
import {
  typingGameLogic,
  TypingGameProvider,
  useTypingGame,
  MenuScreen,
  PlayingScreen,
  PausedScreen,
  FinishedScreen,
  NoProfileScreen,
} from "@/features/typing-adventure";
import { Icon } from "@/components/Icons";

export const Route = createFileRoute("/games/typing-adventure")({
  component: TypingAdventure,
});

function TypingAdventure() {
  const $game = useScope(typingGameLogic);

  return (
    <TypingGameProvider value={$game}>
      <TypingAdventureContent />
    </TypingGameProvider>
  );
}

function TypingAdventureContent() {
  const $game = useTypingGame();
  const $profile = selectedProfileLogic();
  const $energy = energyLogic();
  const inputRef = useRef<HTMLInputElement>(null);

  // Component Effect: Auto-focus input when playing
  // - Logic emits state changes, component handles DOM concerns
  // - Auto-cleanup on unmount
  useScope($game.onStateChange, [
    (state) => {
      if (state === "playing") {
        inputRef.current?.focus();
      }
    },
  ]);

  return rx(() => {
    const state = $game.gameState();
    const profile = $profile.profile();
    const energy = $energy.energy();

    if (!profile) {
      return <NoProfileScreen />;
    }

    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-400 via-purple-400 to-pink-400 p-4 safe-bottom">
        {/* Header */}
        <header className="mb-4">
          <div className="mx-auto max-w-2xl flex items-center justify-between">
            <Link
              to="/dashboard"
              className="flex items-center gap-2 text-white/80 hover:text-white transition-colors"
            >
              <Icon name="back" size={20} />
              <span className="text-sm font-medium hidden sm:inline">Back</span>
            </Link>
            <h1 className="font-display text-2xl font-bold text-white drop-shadow-lg flex items-center gap-2">
              <Icon name="keyboard" size={28} /> Typing Adventure
            </h1>
            <div className="flex items-center gap-2 text-white">
              <Icon name="lightning" size={18} />
              <span className="font-bold">{energy}</span>
            </div>
          </div>
        </header>

        <div className="mx-auto max-w-2xl">
          {state === "menu" && <MenuScreen />}
          {state === "playing" && <PlayingScreen inputRef={inputRef} />}
          {state === "paused" && <PausedScreen />}
          {state === "finished" && <FinishedScreen />}
        </div>
      </div>
    );
  });
}
