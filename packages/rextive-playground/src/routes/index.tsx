import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { rx } from "rextive/react";
import { kidProfilesLogic, selectedProfileLogic } from "@/logic";
import { AVATAR_COLORS, ZODIAC_NAMES } from "@/domain/types";
import { WELCOME_CHIME } from "@/hooks/useSound";

export const Route = createFileRoute("/")({
  component: HomePage,
});

const FUN_QUOTES = [
  { emoji: "🚀", text: "Ready for an adventure? Ask your parent to create your profile!" },
  { emoji: "🌟", text: "Every star was once just a little spark. Let's get started!" },
  { emoji: "🎨", text: "A blank canvas is full of possibilities. Create your profile!" },
  { emoji: "🦸", text: "Every hero needs an origin story. What's yours?" },
  { emoji: "🌈", text: "The journey of a thousand games begins with a single profile!" },
  { emoji: "🐣", text: "Even the mightiest dinosaurs started as tiny eggs!" },
  { emoji: "🎮", text: "Player 1, we're waiting for you! Get your profile set up!" },
  { emoji: "🧙", text: "A wizard is never late... but your profile might be!" },
  { emoji: "🦋", text: "Every butterfly was once a caterpillar. Time to transform!" },
  { emoji: "🎪", text: "The show can't start without the star performer - you!" },
];

function getRandomQuote() {
  return FUN_QUOTES[Math.floor(Math.random() * FUN_QUOTES.length)];
}

function HomePage() {
  const $profiles = kidProfilesLogic();
  const hasPlayedSound = useRef(false);
  const [quote] = useState(getRandomQuote);

  // Play sound when profiles exist
  useEffect(() => {
    const unsub = $profiles.profiles.on(() => {
      if (!hasPlayedSound.current && $profiles.profiles().length > 0) {
        hasPlayedSound.current = true;
        const audio = new Audio(WELCOME_CHIME);
        audio.volume = 0.3;
        audio.play().catch(() => {});
      }
    });
    return unsub;
  }, [$profiles.profiles]);

  return rx(() => {
    if ($profiles.isLoading()) {
      return (
        <div className="flex min-h-screen items-center justify-center">
          <div className="text-4xl animate-bounce">🎮</div>
        </div>
      );
    }

    const profiles = $profiles.profiles();

    return (
      <div className="min-h-screen p-4 safe-bottom">
        <div className="mx-auto max-w-4xl">
          <header className="mb-8 text-center">
            <h1 className="font-display text-3xl font-bold text-gray-800 sm:text-4xl">
              🎮 Rextive
              <span className="text-gradient-kid"> Playground</span>
            </h1>
            <p className="mt-2 text-gray-600">Fun learning games for kids!</p>
          </header>

          {profiles.length === 0 ? (
            <NoProfiles quote={quote} />
          ) : (
            <ProfileSelector profiles={profiles} />
          )}

          {/* Parent Mode Link */}
          <div className="mt-12 text-center">
            <Link
              to="/mode/parent"
              className="inline-flex items-center gap-2 px-4 py-2 text-sm text-gray-500 hover:text-gray-700 transition-colors"
            >
              <span>👨‍👩‍👧‍👦</span>
              <span>Parent Mode</span>
            </Link>
          </div>
        </div>
      </div>
    );
  });
}

function NoProfiles({ quote }: { quote: { emoji: string; text: string } }) {
  return (
    <div className="card mx-auto max-w-md text-center animate-pop">
      <div className="text-7xl mb-4">{quote.emoji}</div>
      <p className="text-xl font-display font-semibold text-gray-700 leading-relaxed">
        {quote.text}
      </p>
    </div>
  );
}

function ProfileSelector({
  profiles,
}: {
  profiles: { id: number; name: string; avatar: string; age: number }[];
}) {
  const navigate = useNavigate();
  const $selected = selectedProfileLogic();

  const handleSelect = (profileId: number) => {
    $selected.select(profileId);
    navigate({ to: "/dashboard" });
  };

  return (
    <section className="mb-8">
      <h2 className="mb-4 font-display text-xl font-semibold text-gray-700 text-center">
        Who's playing today? 👋
      </h2>
      <div className="flex flex-wrap justify-center gap-4">
        {profiles.map((profile) => {
          const zodiacName =
            ZODIAC_NAMES[profile.avatar as keyof typeof ZODIAC_NAMES] || "";
          return (
            <button
              key={profile.id}
              onClick={() => handleSelect(profile.id)}
              className="card flex w-36 flex-col items-center p-4 transition-transform hover:scale-105 active:scale-95 sm:w-40"
            >
              <div
                className={`avatar ${AVATAR_COLORS[profile.avatar as keyof typeof AVATAR_COLORS] || "bg-gray-200"}`}
              >
                {profile.avatar}
              </div>
              <span className="mt-2 font-display font-semibold text-gray-800">
                {profile.name}
              </span>
              <span className="text-xs text-gray-500">
                {zodiacName && `${zodiacName} • `}
                {profile.age} years
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}

