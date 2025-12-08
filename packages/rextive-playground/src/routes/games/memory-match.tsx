import { createFileRoute, Link } from "@tanstack/react-router";
import { signal } from "rextive";
import { rx, useScope } from "rextive/react";
import { energyLogic, selectedProfileLogic } from "@/logic";
import { useEffect } from "react";
import {
  calculateAnswerPoints,
  calculateStarRating,
} from "@/domain/scoring";

export const Route = createFileRoute("/games/memory-match")({
  component: MemoryMatch,
});

// =============================================================================
// Card Data - Categories with cute images and names
// =============================================================================

interface CardItem {
  id: string;
  emoji: string;
  name: string;
  category: string;
}

const CARD_CATEGORIES: Record<string, CardItem[]> = {
  animals: [
    { id: "cat", emoji: "🐱", name: "Cat", category: "animals" },
    { id: "dog", emoji: "🐶", name: "Dog", category: "animals" },
    { id: "rabbit", emoji: "🐰", name: "Rabbit", category: "animals" },
    { id: "bear", emoji: "🐻", name: "Bear", category: "animals" },
    { id: "panda", emoji: "🐼", name: "Panda", category: "animals" },
    { id: "koala", emoji: "🐨", name: "Koala", category: "animals" },
    { id: "lion", emoji: "🦁", name: "Lion", category: "animals" },
    { id: "tiger", emoji: "🐯", name: "Tiger", category: "animals" },
    { id: "fox", emoji: "🦊", name: "Fox", category: "animals" },
    { id: "owl", emoji: "🦉", name: "Owl", category: "animals" },
    { id: "penguin", emoji: "🐧", name: "Penguin", category: "animals" },
    { id: "dolphin", emoji: "🐬", name: "Dolphin", category: "animals" },
  ],
  food: [
    { id: "apple", emoji: "🍎", name: "Apple", category: "food" },
    { id: "banana", emoji: "🍌", name: "Banana", category: "food" },
    { id: "grape", emoji: "🍇", name: "Grape", category: "food" },
    { id: "orange", emoji: "🍊", name: "Orange", category: "food" },
    { id: "strawberry", emoji: "🍓", name: "Strawberry", category: "food" },
    { id: "watermelon", emoji: "🍉", name: "Watermelon", category: "food" },
    { id: "pizza", emoji: "🍕", name: "Pizza", category: "food" },
    { id: "burger", emoji: "🍔", name: "Burger", category: "food" },
    { id: "icecream", emoji: "🍦", name: "Ice Cream", category: "food" },
    { id: "cake", emoji: "🎂", name: "Cake", category: "food" },
    { id: "cookie", emoji: "🍪", name: "Cookie", category: "food" },
    { id: "candy", emoji: "🍬", name: "Candy", category: "food" },
  ],
  nature: [
    { id: "sun", emoji: "☀️", name: "Sun", category: "nature" },
    { id: "moon", emoji: "🌙", name: "Moon", category: "nature" },
    { id: "star", emoji: "⭐", name: "Star", category: "nature" },
    { id: "rainbow", emoji: "🌈", name: "Rainbow", category: "nature" },
    { id: "cloud", emoji: "☁️", name: "Cloud", category: "nature" },
    { id: "flower", emoji: "🌸", name: "Flower", category: "nature" },
    { id: "tree", emoji: "🌳", name: "Tree", category: "nature" },
    { id: "leaf", emoji: "🍀", name: "Clover", category: "nature" },
    { id: "mushroom", emoji: "🍄", name: "Mushroom", category: "nature" },
    { id: "mountain", emoji: "⛰️", name: "Mountain", category: "nature" },
    { id: "ocean", emoji: "🌊", name: "Wave", category: "nature" },
    { id: "fire", emoji: "🔥", name: "Fire", category: "nature" },
  ],
  transport: [
    { id: "car", emoji: "🚗", name: "Car", category: "transport" },
    { id: "bus", emoji: "🚌", name: "Bus", category: "transport" },
    { id: "train", emoji: "🚂", name: "Train", category: "transport" },
    { id: "plane", emoji: "✈️", name: "Plane", category: "transport" },
    { id: "rocket", emoji: "🚀", name: "Rocket", category: "transport" },
    { id: "boat", emoji: "⛵", name: "Boat", category: "transport" },
    { id: "bike", emoji: "🚲", name: "Bike", category: "transport" },
    { id: "helicopter", emoji: "🚁", name: "Helicopter", category: "transport" },
    { id: "tractor", emoji: "🚜", name: "Tractor", category: "transport" },
    { id: "ambulance", emoji: "🚑", name: "Ambulance", category: "transport" },
    { id: "firetruck", emoji: "🚒", name: "Fire Truck", category: "transport" },
    { id: "police", emoji: "🚓", name: "Police Car", category: "transport" },
  ],
  objects: [
    { id: "ball", emoji: "⚽", name: "Ball", category: "objects" },
    { id: "gift", emoji: "🎁", name: "Gift", category: "objects" },
    { id: "balloon", emoji: "🎈", name: "Balloon", category: "objects" },
    { id: "heart", emoji: "❤️", name: "Heart", category: "objects" },
    { id: "crown", emoji: "👑", name: "Crown", category: "objects" },
    { id: "key", emoji: "🔑", name: "Key", category: "objects" },
    { id: "bell", emoji: "🔔", name: "Bell", category: "objects" },
    { id: "book", emoji: "📚", name: "Book", category: "objects" },
    { id: "pencil", emoji: "✏️", name: "Pencil", category: "objects" },
    { id: "clock", emoji: "⏰", name: "Clock", category: "objects" },
    { id: "umbrella", emoji: "☂️", name: "Umbrella", category: "objects" },
    { id: "house", emoji: "🏠", name: "House", category: "objects" },
  ],
};

const CATEGORY_INFO = {
  animals: { name: "Animals", icon: "🐾", color: "bg-amber-100" },
  food: { name: "Food", icon: "🍎", color: "bg-red-100" },
  nature: { name: "Nature", icon: "🌿", color: "bg-green-100" },
  transport: { name: "Transport", icon: "🚗", color: "bg-blue-100" },
  objects: { name: "Objects", icon: "🎁", color: "bg-purple-100" },
};

// =============================================================================
// Game Types & Config
// =============================================================================

type Difficulty = "easy" | "medium" | "hard";
type GameState = "menu" | "playing" | "finished";
type Category = keyof typeof CARD_CATEGORIES;

interface GameCard {
  uid: number;
  item: CardItem;
  isFlipped: boolean;
  isMatched: boolean;
}

const DIFFICULTY_CONFIG = {
  easy: { pairs: 6, cols: 4, rows: 3, timeLimit: 120 },
  medium: { pairs: 8, cols: 4, rows: 4, timeLimit: 90 },
  hard: { pairs: 10, cols: 5, rows: 4, timeLimit: 60 },
};

// =============================================================================
// Game Logic
// =============================================================================

function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

function memoryMatchLogic() {
  const $energy = energyLogic();
  const $profile = selectedProfileLogic();

  const gameState = signal<GameState>("menu", { name: "memory.gameState" });
  const difficulty = signal<Difficulty>("easy", { name: "memory.difficulty" });
  const category = signal<Category>("animals", { name: "memory.category" });
  const cards = signal<GameCard[]>([], { name: "memory.cards" });
  const flippedIndices = signal<number[]>([], { name: "memory.flipped" });
  const isChecking = signal(false, { name: "memory.isChecking" });
  const timeLeft = signal(120, { name: "memory.timeLeft" });
  const moves = signal(0, { name: "memory.moves" });
  const matches = signal(0, { name: "memory.matches" });
  const score = signal(0, { name: "memory.score" });
  const streak = signal(0, { name: "memory.streak" });
  const bestStreak = signal(0, { name: "memory.bestStreak" });

  function generateCards(): GameCard[] {
    const config = DIFFICULTY_CONFIG[difficulty()];
    const categoryItems = CARD_CATEGORIES[category()];
    
    // Select random items for pairs
    const selectedItems = shuffleArray(categoryItems).slice(0, config.pairs);
    
    // Create pairs (each item appears twice)
    const cardPairs: GameCard[] = [];
    let uid = 0;
    
    for (const item of selectedItems) {
      cardPairs.push({ uid: uid++, item, isFlipped: false, isMatched: false });
      cardPairs.push({ uid: uid++, item, isFlipped: false, isMatched: false });
    }
    
    return shuffleArray(cardPairs);
  }

  async function startGame(): Promise<boolean> {
    const hasEnergy = await $energy.spend(1);
    if (!hasEnergy) return false;

    const config = DIFFICULTY_CONFIG[difficulty()];
    
    cards.set(generateCards());
    flippedIndices.set([]);
    isChecking.set(false);
    timeLeft.set(config.timeLimit);
    moves.set(0);
    matches.set(0);
    score.set(0);
    streak.set(0);
    bestStreak.set(0);
    gameState.set("playing");
    
    return true;
  }

  function flipCard(index: number) {
    if (isChecking()) return;
    
    const currentCards = cards();
    const card = currentCards[index];
    
    // Can't flip matched or already flipped cards
    if (card.isMatched || card.isFlipped) return;
    
    const currentFlipped = flippedIndices();
    
    // Can't flip more than 2 cards
    if (currentFlipped.length >= 2) return;
    
    // Flip the card
    cards.set(
      currentCards.map((c, i) =>
        i === index ? { ...c, isFlipped: true } : c
      )
    );
    
    const newFlipped = [...currentFlipped, index];
    flippedIndices.set(newFlipped);
    
    // If 2 cards flipped, check for match
    if (newFlipped.length === 2) {
      checkMatch(newFlipped[0], newFlipped[1]);
    }
  }

  function checkMatch(index1: number, index2: number) {
    isChecking.set(true);
    moves.set((m) => m + 1);
    
    const currentCards = cards();
    const card1 = currentCards[index1];
    const card2 = currentCards[index2];
    
    const isMatch = card1.item.id === card2.item.id;
    
    setTimeout(() => {
      if (isMatch) {
        // Match found!
        cards.set(
          currentCards.map((c, i) =>
            i === index1 || i === index2 ? { ...c, isMatched: true } : c
          )
        );
        
        const newStreak = streak() + 1;
        streak.set(newStreak);
        bestStreak.set(Math.max(bestStreak(), newStreak));
        
        // Calculate points
        const points = calculateAnswerPoints(difficulty(), newStreak - 1);
        score.set((s) => s + points);
        
        const newMatches = matches() + 1;
        matches.set(newMatches);
        
        // Check if game won
        const config = DIFFICULTY_CONFIG[difficulty()];
        if (newMatches >= config.pairs) {
          finishGame();
        }
      } else {
        // No match - flip back
        cards.set(
          currentCards.map((c, i) =>
            i === index1 || i === index2 ? { ...c, isFlipped: false } : c
          )
        );
        streak.set(0);
      }
      
      flippedIndices.set([]);
      isChecking.set(false);
    }, 800);
  }

  function tick() {
    if (gameState() !== "playing") return;
    
    timeLeft.set((t) => {
      if (t <= 1) {
        finishGame();
        return 0;
      }
      return t - 1;
    });
  }

  function finishGame() {
    gameState.set("finished");
  }

  function backToMenu() {
    gameState.set("menu");
  }

  return {
    // State
    gameState,
    difficulty,
    category,
    cards,
    isChecking,
    timeLeft,
    moves,
    matches,
    score,
    streak,
    bestStreak,
    energy: $energy.energy,
    profile: $profile.profile,
    // Actions
    setDifficulty: (d: Difficulty) => difficulty.set(d),
    setCategory: (c: Category) => category.set(c),
    startGame,
    flipCard,
    tick,
    backToMenu,
  };
}

// =============================================================================
// Components
// =============================================================================

function MemoryMatch() {
  const $game = useScope(memoryMatchLogic);

  // Timer effect
  useEffect(() => {
    const unsub = $game.gameState.on(() => {
      if ($game.gameState() === "playing") {
        const interval = setInterval(() => $game.tick(), 1000);
        return () => clearInterval(interval);
      }
    });
    return unsub;
  }, [$game]);

  return rx(() => {
    const state = $game.gameState();
    const profile = $game.profile();

    if (!profile) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-purple-400 to-pink-500 p-4">
          <div className="card text-center">
            <div className="text-5xl mb-4">🧠</div>
            <h2 className="font-display text-xl font-bold text-gray-800">
              Please select a profile first
            </h2>
            <Link to="/" className="btn btn-primary mt-4">
              Go Home
            </Link>
          </div>
        </div>
      );
    }

    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-400 via-pink-400 to-red-400 p-4 pb-12 safe-bottom">
        {/* Header */}
        <header className="mb-4">
          <div className="mx-auto max-w-3xl flex items-center justify-between">
            <Link
              to="/dashboard"
              className="flex items-center gap-2 text-white/80 hover:text-white transition-colors"
            >
              <span>←</span>
              <span className="text-sm font-medium hidden sm:inline">Back</span>
            </Link>
            <h1 className="font-display text-2xl font-bold text-white drop-shadow-lg">
              🧠 Memory Match
            </h1>
            <div className="flex items-center gap-2 text-white">
              <span>⚡</span>
              <span className="font-bold">{$game.energy()}</span>
            </div>
          </div>
        </header>

        <div className="mx-auto max-w-3xl">
          {state === "menu" && <MenuScreen $game={$game} />}
          {state === "playing" && <PlayingScreen $game={$game} />}
          {state === "finished" && <FinishedScreen $game={$game} />}
        </div>
      </div>
    );
  });
}

function MenuScreen({ $game }: { $game: ReturnType<typeof memoryMatchLogic> }) {
  return rx(() => {
    const difficulty = $game.difficulty();
    const category = $game.category();
    const energy = $game.energy();
    const hasEnergy = energy > 0;

    return (
      <div className="space-y-6">
        {/* Game Info */}
        <div className="card text-center">
          <div className="text-6xl mb-4">🧠</div>
          <h2 className="font-display text-2xl font-bold text-gray-800">
            Memory Match
          </h2>
          <p className="mt-2 text-gray-600">
            Find matching pairs before time runs out!
          </p>
        </div>

        {/* Category Selection */}
        <div className="card">
          <h3 className="font-display text-lg font-semibold text-gray-700 mb-3">
            Choose Category
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {(Object.entries(CATEGORY_INFO) as [Category, typeof CATEGORY_INFO.animals][]).map(
              ([key, info]) => (
                <button
                  key={key}
                  onClick={() => $game.setCategory(key)}
                  className={`p-3 rounded-xl text-center transition-all ${
                    category === key
                      ? `${info.color} border-2 border-primary-500 scale-105`
                      : "bg-gray-50 border-2 border-transparent hover:bg-gray-100"
                  }`}
                >
                  <div className="text-3xl">{info.icon}</div>
                  <div className="mt-1 font-medium text-gray-800">{info.name}</div>
                </button>
              )
            )}
          </div>
        </div>

        {/* Difficulty Selection */}
        <div className="card">
          <h3 className="font-display text-lg font-semibold text-gray-700 mb-3">
            Choose Difficulty
          </h3>
          <div className="grid grid-cols-3 gap-3">
            <DifficultyButton
              icon="🐣"
              label="Easy"
              description="6 pairs • 2 min"
              selected={difficulty === "easy"}
              onClick={() => $game.setDifficulty("easy")}
            />
            <DifficultyButton
              icon="🐥"
              label="Medium"
              description="8 pairs • 90s"
              selected={difficulty === "medium"}
              onClick={() => $game.setDifficulty("medium")}
            />
            <DifficultyButton
              icon="🦅"
              label="Hard"
              description="10 pairs • 60s"
              selected={difficulty === "hard"}
              onClick={() => $game.setDifficulty("hard")}
            />
          </div>
        </div>

        {/* How to Play */}
        <div className="card bg-purple-50">
          <h3 className="font-display text-lg font-semibold text-purple-800 mb-2">
            📖 How to Play
          </h3>
          <ul className="text-sm text-purple-700 space-y-1">
            <li>• Tap cards to flip them</li>
            <li>• Find matching pairs</li>
            <li>• Match all pairs before time runs out!</li>
            <li>• Consecutive matches = bonus points!</li>
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
          {hasEnergy ? <>Start Game ⚡1</> : <>No Energy - Come Back Tomorrow!</>}
        </button>
      </div>
    );
  });
}

function DifficultyButton({
  icon,
  label,
  description,
  selected,
  onClick,
}: {
  icon: string;
  label: string;
  description: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`p-3 rounded-xl text-center transition-all ${
        selected
          ? "bg-primary-100 border-2 border-primary-500 scale-105"
          : "bg-gray-50 border-2 border-transparent hover:bg-gray-100"
      }`}
    >
      <div className="text-2xl">{icon}</div>
      <div className="font-display font-semibold text-gray-800">{label}</div>
      <div className="text-xs text-gray-500">{description}</div>
    </button>
  );
}

function PlayingScreen({ $game }: { $game: ReturnType<typeof memoryMatchLogic> }) {
  return rx(() => {
    const cards = $game.cards();
    const difficulty = $game.difficulty();
    const timeLeft = $game.timeLeft();
    const moves = $game.moves();
    const matches = $game.matches();
    const score = $game.score();
    const streak = $game.streak();
    const config = DIFFICULTY_CONFIG[difficulty];

    return (
      <div className="space-y-4">
        {/* Stats Bar */}
        <div className="card bg-white/90 backdrop-blur">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-4">
              <div>
                <span className="text-gray-500">Score:</span>
                <span className="ml-1 font-bold text-primary-600">{score}</span>
              </div>
              <div>
                <span className="text-gray-500">Pairs:</span>
                <span className="ml-1 font-bold">{matches}/{config.pairs}</span>
              </div>
              <div>
                <span className="text-gray-500">Moves:</span>
                <span className="ml-1 font-bold">{moves}</span>
              </div>
              {streak > 0 && (
                <div className="text-amber-600 font-bold">
                  🔥 {streak}
                </div>
              )}
            </div>
            <div className={`text-2xl font-bold ${timeLeft <= 10 ? "text-red-500 animate-pulse" : "text-gray-800"}`}>
              ⏱️ {timeLeft}s
            </div>
          </div>

          {/* Progress Bar */}
          <div className="mt-3 h-2 rounded-full bg-gray-200 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-purple-400 to-pink-500 transition-all duration-300"
              style={{ width: `${(matches / config.pairs) * 100}%` }}
            />
          </div>
        </div>

        {/* Game Board */}
        <div
          className="grid gap-2 sm:gap-3"
          style={{
            gridTemplateColumns: `repeat(${config.cols}, minmax(0, 1fr))`,
          }}
        >
          {cards.map((card, index) => (
            <GameCardComponent
              key={card.uid}
              card={card}
              onClick={() => $game.flipCard(index)}
            />
          ))}
        </div>
      </div>
    );
  });
}

function GameCardComponent({
  card,
  onClick,
}: {
  card: GameCard;
  onClick: () => void;
}) {
  const isRevealed = card.isFlipped || card.isMatched;

  return (
    <button
      onClick={onClick}
      disabled={card.isMatched}
      className={`aspect-square rounded-xl transition-all duration-300 transform ${
        card.isMatched
          ? "opacity-50 scale-95 cursor-default"
          : isRevealed
          ? "bg-white shadow-lg scale-100"
          : "bg-gradient-to-br from-purple-500 to-pink-500 hover:scale-105 active:scale-95 shadow-md"
      }`}
      style={{
        transformStyle: "preserve-3d",
      }}
    >
      {isRevealed ? (
        <div className="flex flex-col items-center justify-center h-full p-1">
          <span className="text-5xl sm:text-6xl">{card.item.emoji}</span>
          <span className="text-xs sm:text-sm font-medium text-gray-700 mt-2 truncate w-full text-center">
            {card.item.name}
          </span>
        </div>
      ) : (
        <div className="flex items-center justify-center h-full">
          <span className="text-4xl sm:text-5xl text-white/80">❓</span>
        </div>
      )}
    </button>
  );
}

function FinishedScreen({ $game }: { $game: ReturnType<typeof memoryMatchLogic> }) {
  return rx(() => {
    const score = $game.score();
    const matches = $game.matches();
    const moves = $game.moves();
    const bestStreak = $game.bestStreak();
    const difficulty = $game.difficulty();
    const timeLeft = $game.timeLeft();
    const config = DIFFICULTY_CONFIG[difficulty];

    const won = matches >= config.pairs;
    const accuracy = moves > 0 ? Math.round((matches / moves) * 100) : 0;
    
    // Calculate stars
    const stars = calculateStarRating(
      matches,
      config.pairs,
      accuracy,
      bestStreak
    );

    // Calculate XP
    const baseXP = score;
    const timeBonus = won ? Math.round(timeLeft * 0.5) : 0;
    const totalXP = baseXP + timeBonus;

    return (
      <div className="space-y-6">
        <div className="card text-center py-8">
          <div className="text-6xl mb-4">{won ? "🎉" : "⏰"}</div>
          <h2 className="font-display text-2xl font-bold text-gray-800">
            {won ? "You Win!" : "Time's Up!"}
          </h2>

          {/* Stars */}
          {won && (
            <div className="mt-4 flex justify-center gap-2">
              {[1, 2, 3].map((i) => (
                <span
                  key={i}
                  className={`text-4xl ${i <= stars ? "animate-bounce" : "grayscale opacity-30"}`}
                  style={{ animationDelay: `${i * 0.1}s` }}
                >
                  ⭐
                </span>
              ))}
            </div>
          )}

          {/* Score */}
          <div className="mt-6 text-4xl font-bold text-primary-600">
            {score} pts
          </div>

          {/* Stats Grid */}
          <div className="mt-6 grid grid-cols-2 gap-4 text-left">
            <StatItem label="Pairs Found" value={`${matches}/${config.pairs}`} />
            <StatItem label="Moves" value={moves} />
            <StatItem label="Best Streak" value={`🔥 ${bestStreak}`} />
            <StatItem label="Accuracy" value={`${accuracy}%`} />
          </div>

          {/* XP Earned */}
          <div className="mt-6 p-4 bg-amber-50 rounded-xl">
            <div className="text-sm text-amber-700">XP Earned</div>
            <div className="text-2xl font-bold text-amber-600">+{totalXP} XP</div>
            {timeBonus > 0 && (
              <div className="text-xs text-amber-600">
                (includes +{timeBonus} time bonus)
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-3">
          <button
            onClick={() => $game.startGame()}
            disabled={$game.energy() === 0}
            className={`py-4 rounded-2xl font-display text-lg font-bold transition-all ${
              $game.energy() > 0
                ? "bg-gradient-to-r from-green-400 to-emerald-500 text-white hover:scale-105 active:scale-95 shadow-lg"
                : "bg-gray-300 text-gray-500 cursor-not-allowed"
            }`}
          >
            {$game.energy() > 0 ? <>Play Again ⚡1</> : <>No Energy Left</>}
          </button>
          <Link to="/dashboard" className="btn btn-outline py-3 text-center">
            Back to Dashboard
          </Link>
        </div>
      </div>
    );
  });
}

function StatItem({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="p-3 bg-gray-50 rounded-lg">
      <div className="text-xs text-gray-500">{label}</div>
      <div className="font-bold text-gray-800">{value}</div>
    </div>
  );
}

