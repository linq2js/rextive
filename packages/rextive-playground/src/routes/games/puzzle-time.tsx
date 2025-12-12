import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { signal } from "rextive";
import { rx, useScope } from "rextive/react";
import { energyLogic, selectedProfileLogic, modalLogic } from "@/logic";
import { gameProgressRepository } from "@/infrastructure/repositories";
import { gameTickLogic } from "@/utils";
import { calculateAnswerPoints, calculateStarRating } from "@/domain/scoring";
import {
  playCorrectSound,
  playWrongSound,
  playWinSound,
  playClickSound,
  backgroundMusic,
} from "@/hooks/useSound";
import { GameIcon, type GameIconName } from "@/components/GameIcons";
import { Icon } from "@/components/Icons";
import { GameMenu, type DifficultyOption } from "@/components/GameMenu";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useTranslation } from "@/i18n";
import { useMemo, useState } from "react";

export const Route = createFileRoute("/games/puzzle-time")({
  component: PuzzleTime,
});

// =============================================================================
// Types & Config
// =============================================================================

type Difficulty = "easy" | "medium" | "hard";
type GameState = "menu" | "playing" | "finished";

interface Shape {
  id: string;
  icon: GameIconName;
  name: string;
  position: number; // Position in the correct order
}

interface Puzzle {
  shapes: Shape[];
  targetShapes: Shape[]; // Shapes in the correct order (shown as reference)
  correctOrder: string[]; // Array of shape IDs in correct order
}

const DIFFICULTY_CONFIG: Record<
  Difficulty,
  {
    shapeCount: number;
    timeLimit: number;
    pointsPerMatch: number;
  }
> = {
  easy: {
    shapeCount: 4,
    timeLimit: 120,
    pointsPerMatch: 10,
  },
  medium: {
    shapeCount: 6,
    timeLimit: 180,
    pointsPerMatch: 15,
  },
  hard: {
    shapeCount: 8,
    timeLimit: 240,
    pointsPerMatch: 20,
  },
};

// Available shapes for puzzles (using GameIcons)
const AVAILABLE_SHAPES: Array<{ icon: GameIconName; name: string }> = [
  { icon: "cat", name: "Cat" },
  { icon: "dog", name: "Dog" },
  { icon: "rabbit", name: "Rabbit" },
  { icon: "bear", name: "Bear" },
  { icon: "bird", name: "Bird" },
  { icon: "fish", name: "Fish" },
  { icon: "butterfly", name: "Butterfly" },
  { icon: "bee", name: "Bee" },
  { icon: "apple", name: "Apple" },
  { icon: "banana", name: "Banana" },
  { icon: "carrot", name: "Carrot" },
  { icon: "cake", name: "Cake" },
  { icon: "sun", name: "Sun" },
  { icon: "moon", name: "Moon" },
  { icon: "star", name: "Star" },
  { icon: "flower", name: "Flower" },
  { icon: "tree", name: "Tree" },
  { icon: "heart", name: "Heart" },
  { icon: "gift", name: "Gift" },
  { icon: "balloon", name: "Balloon" },
];

function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

function generatePuzzle(difficulty: Difficulty): Puzzle {
  const config = DIFFICULTY_CONFIG[difficulty];
  const selectedShapes = shuffleArray(AVAILABLE_SHAPES).slice(
    0,
    config.shapeCount
  );

  // Create shapes with IDs
  const shapes: Shape[] = selectedShapes.map((shape, index) => ({
    id: `shape-${index}`,
    icon: shape.icon,
    name: shape.name,
    position: index,
  }));

  // Target order (what user needs to match) - sorted alphabetically by name
  const targetShapes = [...shapes].sort((a, b) => a.name.localeCompare(b.name));
  const correctOrder = targetShapes.map((s) => s.id);

  // Shuffle for the puzzle (starting order)
  let shuffledShapes = shuffleArray(shapes);

  // Make sure shuffled order is different from correct order
  while (shuffledShapes.map((s) => s.id).join() === correctOrder.join()) {
    shuffledShapes = shuffleArray(shapes);
  }

  return {
    shapes: shuffledShapes,
    targetShapes,
    correctOrder,
  };
}

// =============================================================================
// Game Logic
// =============================================================================

function puzzleTimeLogic() {
  const $energy = energyLogic();
  const $profile = selectedProfileLogic();

  const gameState = signal<GameState>("menu", { name: "puzzle.gameState" });
  const difficulty = signal<Difficulty>("easy", { name: "puzzle.difficulty" });
  const puzzle = signal<Puzzle | null>(null, { name: "puzzle.puzzle" });
  const userOrder = signal<string[]>([], { name: "puzzle.userOrder" });
  const timeLeft = signal(120, { name: "puzzle.timeLeft" });
  const score = signal(0, { name: "puzzle.score" });
  const moves = signal(0, { name: "puzzle.moves" });
  const matches = signal(0, { name: "puzzle.matches" });
  const streak = signal(0, { name: "puzzle.streak" });
  const bestStreak = signal(0, { name: "puzzle.bestStreak" });

  async function startGame(): Promise<boolean> {
    const hasEnergy = await $energy.spend(1);
    if (!hasEnergy) return false;

    const config = DIFFICULTY_CONFIG[difficulty()];
    const newPuzzle = generatePuzzle(difficulty());

    puzzle.set(newPuzzle);
    userOrder.set(newPuzzle.shapes.map((s) => s.id));
    timeLeft.set(config.timeLimit);
    score.set(0);
    moves.set(0);
    matches.set(0);
    streak.set(0);
    bestStreak.set(0);
    gameState.set("playing");
    backgroundMusic.playMemoryMusic();

    return true;
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const currentOrder = userOrder();
    const oldIndex = currentOrder.indexOf(active.id as string);
    const newIndex = currentOrder.indexOf(over.id as string);

    const newOrder = arrayMove(currentOrder, oldIndex, newIndex);
    userOrder.set(newOrder);
    moves.set((m) => m + 1);
    playClickSound();

    checkMatch(newOrder);
  }

  function checkMatch(order: string[]) {
    const currentPuzzle = puzzle();
    if (!currentPuzzle) return;

    const isCorrect = order.every(
      (id, index) => id === currentPuzzle.correctOrder[index]
    );

    if (isCorrect) {
      handleCorrectMatch();
    } else {
      handleWrongMatch();
    }
  }

  function handleCorrectMatch() {
    playCorrectSound();
    const newStreak = streak() + 1;
    streak.set(newStreak);
    bestStreak.set(Math.max(bestStreak(), newStreak));

    const points = calculateAnswerPoints(difficulty(), newStreak - 1);
    score.set((s) => s + points);
    matches.set((m) => m + 1);

    // Generate new puzzle
    setTimeout(() => {
      const newPuzzle = generatePuzzle(difficulty());
      puzzle.set(newPuzzle);
      userOrder.set(newPuzzle.shapes.map((s) => s.id));
      streak.set(0); // Reset streak for new puzzle
    }, 1000);
  }

  function handleWrongMatch() {
    playWrongSound();
    streak.set(0);
  }

  async function finishGame() {
    playWinSound();
    backgroundMusic.stop();
    gameState.set("finished");

    const profile = $profile.profile();
    if (profile) {
      const finalScore = score();
      await gameProgressRepository.recordGameSession(
        profile.id,
        "puzzle-time",
        finalScore,
        1
      );
    }
  }

  function backToMenu() {
    backgroundMusic.stop();
    gameState.set("menu");
  }

  // Game tick effect - auto-managed timer that cleans up when logic disposes
  // IMPORTANT: This must be inside the logic function, not in a component
  gameTickLogic(
    gameState,
    () => {
      timeLeft.set((t) => {
        if (t <= 1) {
          finishGame();
          return 0;
        }
        return t - 1;
      });
    },
    { name: "puzzle" }
  );

  return {
    gameState,
    difficulty,
    puzzle,
    userOrder,
    timeLeft,
    score,
    moves,
    matches,
    streak,
    bestStreak,
    startGame,
    handleDragEnd,
    finishGame,
    backToMenu,
  };
}

// =============================================================================
// Components
// =============================================================================

function PuzzleTime() {
  const navigate = useNavigate();
  const $game = useScope(puzzleTimeLogic);
  const $energy = energyLogic();
  const $modal = modalLogic();
  const { t } = useTranslation();

  // Handle back button with confirmation during gameplay
  const handleBack = async () => {
    const state = $game.gameState();
    if (state === "playing") {
      const confirmed = await $modal.confirm(
        t("puzzle.quitConfirm"),
        t("puzzle.quitTitle")
      );
      if (!confirmed) return;
    }
    // Cleanup happens automatically via useScope dispose on unmount
    navigate({ to: "/dashboard", viewTransition: true });
  };

  return rx(() => {
    const state = $game.gameState();
    const energy = $energy.energy();

    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-400 via-orange-400 to-red-400 p-4 safe-bottom">
        {/* Header */}
        <header className="mb-4">
          <div className="mx-auto max-w-2xl flex items-center justify-between">
            <button
              onClick={handleBack}
              className="flex items-center gap-2 text-white/80 hover:text-white transition-colors"
            >
              <Icon name="back" size={20} />
              <span className="text-sm font-medium hidden sm:inline">
                {t("common.back")}
              </span>
            </button>
            <h1 className="font-display text-2xl font-bold text-white drop-shadow-lg flex items-center gap-2">
              <GameIcon name="puzzle" className="w-7 h-7" /> {t("puzzle.title")}
            </h1>
            <div className="flex items-center gap-2 text-white">
              <Icon name="lightning" size={18} />
              <span className="font-bold">{energy}</span>
            </div>
          </div>
        </header>

        <div className="mx-auto max-w-2xl">
          {state === "menu" && <MenuScreen $game={$game} />}
          {state === "playing" && <PlayingScreen $game={$game} />}
          {state === "finished" && (
            <FinishedScreen $game={$game} navigate={navigate} />
          )}
        </div>
      </div>
    );
  });
}

function MenuScreen({ $game }: { $game: ReturnType<typeof puzzleTimeLogic> }) {
  const $energy = energyLogic();
  const [isLoading, setIsLoading] = useState(false);
  const { t } = useTranslation();

  const difficultyOptions: DifficultyOption[] = [
    {
      value: "easy",
      label: t("games.difficulty.easy"),
      description: t("puzzle.difficulty.easyDesc"),
      color: "from-emerald-400 to-green-500",
    },
    {
      value: "medium",
      label: t("games.difficulty.medium"),
      description: t("puzzle.difficulty.mediumDesc"),
      color: "from-amber-400 to-orange-500",
    },
    {
      value: "hard",
      label: t("games.difficulty.hard"),
      description: t("puzzle.difficulty.hardDesc"),
      color: "from-red-400 to-rose-500",
    },
  ];

  const howToPlay = [
    t("puzzle.howToPlay1"),
    t("puzzle.howToPlay2"),
    t("puzzle.howToPlay3"),
    t("puzzle.howToPlay4"),
  ];

  const handlePlay = async () => {
    setIsLoading(true);
    playClickSound();
    const started = await $game.startGame();
    setIsLoading(false);
    if (!started) {
      // Energy check failed - handled by energy logic
    }
  };

  return (
    <GameMenu
      title={t("puzzle.title")}
      description={t("puzzle.description")}
      icon="puzzle"
      themeColor="from-amber-500 to-orange-500"
      difficulty={$game.difficulty()}
      onDifficultyChange={(diff) => $game.difficulty.set(diff)}
      difficultyOptions={difficultyOptions}
      energy={$energy.energy()}
      energyCost={1}
      onPlay={handlePlay}
      isLoading={isLoading}
      howToPlay={howToPlay}
      howToPlayColor="bg-amber-50"
    />
  );
}

function PlayingScreen({
  $game,
}: {
  $game: ReturnType<typeof puzzleTimeLogic>;
}) {
  const { t } = useTranslation();
  const $modal = modalLogic();

  // Timer is now managed by the logic function (puzzleTimeLogic),
  // so it properly cleans up when the logic scope is disposed

  const handleQuit = async () => {
    const confirmed = await $modal.confirm(
      t("puzzle.quitConfirm"),
      t("puzzle.quitTitle")
    );
    if (confirmed) {
      $game.backToMenu();
    }
  };

  return rx(() => {
    const currentPuzzle = $game.puzzle();
    if (!currentPuzzle) return null;

    const timeLeft = $game.timeLeft();
    const score = $game.score();
    const moves = $game.moves();
    const matches = $game.matches();
    const streak = $game.streak();

    return (
      <div className="space-y-4">
        {/* Quit button */}
        <div className="flex justify-end">
          <button
            onClick={handleQuit}
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/80 text-gray-600 hover:bg-white hover:text-gray-900 transition-colors"
          >
            <Icon name="x" size={18} />
            <span className="text-sm font-medium">{t("common.quit")}</span>
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-2">
          <StatCard
            icon="clock"
            value={timeLeft}
            label={t("puzzle.timeLeft")}
          />
          <StatCard icon="trophy" value={score} label={t("puzzle.score")} />
          <StatCard icon="refresh" value={moves} label={t("puzzle.moves")} />
          <StatCard icon="fire" value={matches} label={t("puzzle.matches")} />
        </div>

        {/* Target Order - What user needs to match */}
        <div className="card bg-gradient-to-r from-amber-50 to-orange-50 border-amber-200">
          <h3 className="font-display text-sm font-semibold text-amber-700 mb-2 text-center flex items-center justify-center gap-2">
            <Icon name="target" size={16} />
            {t("puzzle.targetOrder")}
          </h3>
          <div className="flex flex-wrap justify-center gap-2">
            {currentPuzzle.targetShapes.map((shape, index) => (
              <div
                key={shape.id}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-white rounded-lg shadow-sm border border-amber-200"
              >
                <span className="text-xs font-bold text-amber-600">
                  {index + 1}.
                </span>
                <GameIcon name={shape.icon} className="w-5 h-5" />
                <span className="text-sm font-medium text-gray-700">
                  {shape.name}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Puzzle Area - User drags to match */}
        <div className="card bg-white/95">
          <h3 className="font-display text-sm font-semibold text-gray-700 mb-3 text-center flex items-center justify-center gap-2">
            <Icon name="refresh" size={16} />
            {t("puzzle.dragToMatch")}
          </h3>
          <PuzzleBoard $game={$game} puzzle={currentPuzzle} />
        </div>

        {/* Streak Indicator */}
        {streak > 0 && (
          <div className="text-center">
            <span className="inline-flex items-center gap-2 px-4 py-2 bg-orange-100 text-orange-700 rounded-full text-sm font-medium">
              <Icon name="fire" size={16} />
              {t("puzzle.streak", { count: streak })}
            </span>
          </div>
        )}
      </div>
    );
  });
}

function PuzzleBoard({
  $game,
  puzzle,
}: {
  $game: ReturnType<typeof puzzleTimeLogic>;
  puzzle: Puzzle;
}) {
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const userOrder = $game.userOrder();
  const orderedShapes = useMemo(() => {
    return userOrder.map((id) => puzzle.shapes.find((s) => s.id === id)!);
  }, [userOrder, puzzle.shapes]);

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={$game.handleDragEnd}
    >
      <SortableContext items={userOrder} strategy={verticalListSortingStrategy}>
        <div className="space-y-3">
          {orderedShapes.map((shape) => (
            <SortableShape key={shape.id} shape={shape} />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}

function SortableShape({ shape }: { shape: Shape }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: shape.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl border-2 border-gray-200 hover:border-amber-300 cursor-grab active:cursor-grabbing transition-all"
    >
      <div className="flex-shrink-0 w-12 h-12 flex items-center justify-center bg-white rounded-lg shadow-sm">
        <GameIcon name={shape.icon} className="w-8 h-8" />
      </div>
      <div className="flex-1">
        <div className="font-medium text-gray-800">{shape.name}</div>
      </div>
      <Icon
        name="chevron-right"
        size={20}
        className="text-gray-400 rotate-90"
      />
    </div>
  );
}

function StatCard({
  icon,
  value,
  label,
}: {
  icon: string;
  value: number;
  label: string;
}) {
  return (
    <div className="card bg-white/95 text-center py-3">
      <Icon
        name={icon as any}
        size={20}
        className="mx-auto mb-1 text-gray-600"
      />
      <div className="text-lg font-bold text-gray-800">{value}</div>
      <div className="text-xs text-gray-500">{label}</div>
    </div>
  );
}

function FinishedScreen({
  $game,
  navigate,
}: {
  $game: ReturnType<typeof puzzleTimeLogic>;
  navigate: ReturnType<typeof useNavigate>;
}) {
  const { t } = useTranslation();

  return rx(() => {
    const score = $game.score();
    const matches = $game.matches();
    const moves = $game.moves();
    const bestStreak = $game.bestStreak();
    const difficulty = $game.difficulty();
    const config = DIFFICULTY_CONFIG[difficulty];
    // Calculate star rating based on matches completed vs target
    const starRating = calculateStarRating(
      matches,
      config.shapeCount,
      100, // Assume 100% accuracy for puzzle completion
      bestStreak
    );

    return (
      <div className="card w-full bg-white/95">
        <div className="text-center">
          <div className="text-6xl mb-4">🎉</div>
          <h2 className="font-display text-2xl font-bold text-gray-800 mb-2">
            {t("puzzle.finished")}
          </h2>
          <p className="text-gray-600 mb-6">{t("puzzle.greatJob")}</p>

          {/* Stats */}
          <div className="space-y-3 mb-6">
            <StatRow
              icon="trophy"
              label={t("puzzle.finalScore")}
              value={score.toString()}
            />
            <StatRow
              icon="fire"
              label={t("puzzle.matches")}
              value={matches.toString()}
            />
            <StatRow
              icon="refresh"
              label={t("puzzle.totalMoves")}
              value={moves.toString()}
            />
            <StatRow
              icon="star"
              label={t("puzzle.bestStreak")}
              value={bestStreak.toString()}
            />
            <StatRow
              icon="star"
              label={t("puzzle.rating")}
              value={"⭐".repeat(starRating)}
            />
          </div>

          {/* Actions */}
          <div className="space-y-2">
            <button
              onClick={() => {
                playClickSound();
                $game.gameState.set("menu");
              }}
              className="btn btn-primary w-full py-3"
            >
              {t("puzzle.playAgain")}
            </button>
            <button
              onClick={() => {
                playClickSound();
                navigate({ to: "/dashboard" });
              }}
              className="btn btn-outline w-full py-3"
            >
              {t("common.back")}
            </button>
          </div>
        </div>
      </div>
    );
  });
}

function StatRow({
  icon,
  label,
  value,
}: {
  icon: string;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
      <div className="flex items-center gap-2">
        <Icon name={icon as any} size={18} className="text-gray-600" />
        <span className="text-sm text-gray-600">{label}</span>
      </div>
      <span className="font-bold text-gray-800">{value}</span>
    </div>
  );
}
