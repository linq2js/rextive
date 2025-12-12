import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState, Suspense } from "react";
import { rx, wait } from "rextive/react";
import { kidProfilesLogic, selectedProfileLogic } from "@/logic";
import { AVATAR_NAMES } from "@/domain/types";
import { WELCOME_CHIME } from "@/hooks/useSound";
import { Avatar } from "@/components/Avatar";
import { Icon, type IconName } from "@/components/Icons";
import { useTranslation } from "@/i18n";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";

export const Route = createFileRoute("/")({
  component: HomePage,
});

const FUN_QUOTES: { icon: IconName; text: string }[] = [
  {
    icon: "map",
    text: "Ready for an adventure? Ask your parent to create your profile!",
  },
  {
    icon: "star",
    text: "Every star was once just a little spark. Let's get started!",
  },
  {
    icon: "palette",
    text: "A blank canvas is full of possibilities. Create your profile!",
  },
  { icon: "trophy", text: "Every hero needs an origin story. What's yours?" },
  {
    icon: "target",
    text: "The journey of a thousand games begins with a single profile!",
  },
  {
    icon: "baby",
    text: "Every great gamer started small. Let's get you set up!",
  },
  {
    icon: "controller",
    text: "Player 1, we're waiting for you! Get your profile set up!",
  },
  {
    icon: "brain",
    text: "A great mind is never late... but your profile might be!",
  },
  {
    icon: "puzzle",
    text: "Every puzzle starts with a single piece. Time to begin!",
  },
  {
    icon: "fire",
    text: "The show can't start without the star performer - you!",
  },
];

function getRandomQuote() {
  return FUN_QUOTES[Math.floor(Math.random() * FUN_QUOTES.length)];
}

function LoadingSpinner() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-4xl animate-bounce text-primary-500">
        <Icon name="controller" size={48} />
      </div>
    </div>
  );
}

function HomePage() {
  const $profiles = kidProfilesLogic();
  const hasPlayedSound = useRef(false);
  const [quote] = useState(() => getRandomQuote());
  const { t } = useTranslation();

  // Play sound when profiles exist
  useEffect(() => {
    const unsub = $profiles.profilesTask.on(() => {
      const profiles = $profiles.profilesTask().value;
      if (!hasPlayedSound.current && profiles.length > 0) {
        hasPlayedSound.current = true;
        const audio = new Audio(WELCOME_CHIME);
        audio.volume = 0.3;
        audio.play().catch(() => {});
      }
    });
    return unsub;
  }, [$profiles.profilesTask]);

  return (
    <Suspense fallback={<LoadingSpinner />}>
      {rx(() => {
        // Use wait() to read async data - will suspend if loading
        const profiles = wait($profiles.profiles());

        return (
          <div className="min-h-screen p-4 safe-bottom">
            <div className="mx-auto max-w-4xl">
              <header className="mb-8 text-center">
                <h1 className="font-display text-3xl font-bold text-gray-800 sm:text-4xl flex items-center justify-center gap-2">
                  <Icon
                    name="controller"
                    size={36}
                    className="text-primary-500"
                  />
                  {t("app.title")}
                </h1>
                <p className="mt-2 text-gray-600">
                  {t("app.subtitle")}
                </p>
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
                  viewTransition
                  className="inline-flex items-center gap-2 px-4 py-2 text-sm text-gray-500 hover:text-gray-700 transition-colors"
                >
                  <Icon name="lock" size={16} />
                  <span>{t("app.parentMode")}</span>
                </Link>
              </div>
            </div>
          </div>
        );
      })}
    </Suspense>
  );
}

function NoProfiles({ quote }: { quote: { icon: IconName; text: string } }) {
  return (
    <div className="card mx-auto max-w-md text-center animate-pop">
      <div className="mb-4 text-primary-500 flex justify-center">
        <Icon name={quote.icon} size={72} />
      </div>
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
  const { t } = useTranslation();

  const handleSelect = (profileId: number) => {
    $selected.select(profileId);
    navigate({ to: "/dashboard", viewTransition: true });
  };

  return (
    <section className="mb-8">
      {/* Language Switcher - Centered above Select Profile */}
      <div className="flex justify-center mb-4">
        <LanguageSwitcher />
      </div>
      <h2 className="mb-4 font-display text-xl font-semibold text-gray-700 text-center">
        {t("profile.selectProfile")}
      </h2>
      <div className="flex flex-wrap justify-center gap-4">
        {profiles.map((profile) => {
          const avatarName =
            AVATAR_NAMES[profile.avatar as keyof typeof AVATAR_NAMES] || "";
          return (
            <button
              key={profile.id}
              onClick={() => handleSelect(profile.id)}
              className="card flex w-36 flex-col items-center p-4 transition-transform hover:scale-105 active:scale-95 sm:w-40"
            >
              <div className="h-16 w-16 mb-2">
                <Avatar avatar={profile.avatar} className="w-full h-full" />
              </div>
              <span className="mt-2 font-display font-semibold text-gray-800">
                {profile.name}
              </span>
              <span className="text-xs text-gray-500">
                {avatarName && `${avatarName} • `}
                {profile.age} years
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
