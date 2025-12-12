import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { signal } from "rextive";
import { rx, useScope } from "rextive/react";
import { energyLogic, selectedProfileLogic, modalLogic } from "@/logic";
import { gameProgressRepository } from "@/infrastructure/repositories";
import { calculateAnswerPoints, calculateStarRating } from "@/domain/scoring";
import {
  playCorrectSound,
  playWrongSound,
  playWinSound,
  playClickSound,
  backgroundMusic,
} from "@/hooks/useSound";
import { Icon } from "@/components/Icons";
import {
  GameMenu,
  ThemeSelector,
  MathCategoryIcons,
  type DifficultyOption,
  type ThemeOption,
} from "@/components/GameMenu";
import { gameTickLogic } from "@/utils";

export const Route = createFileRoute("/games/math-quest")({
  component: MathQuest,
});

// =============================================================================
// Types & Config
// =============================================================================

type Difficulty = "easy" | "medium" | "hard";
type GameState = "menu" | "playing" | "finished";
type Operation = "+" | "-" | "×" | "÷";
type MathCategory = "mix" | "quiz" | "compare" | "fillBlank" | "sort" | "chain";

// Categories that can be randomly selected in "mix" mode
const MIXABLE_CATEGORIES: Exclude<MathCategory, "mix">[] = [
  "quiz",
  "compare",
  "fillBlank",
  "sort",
  "chain",
];
type CompareOperator = "<" | ">" | "=";

// Base problem interface
interface BaseProblem {
  category: MathCategory;
}

// Quiz: Multiple choice (e.g., 5 + 3 = ?)
interface QuizProblem extends BaseProblem {
  category: "quiz";
  num1: number;
  num2: number;
  operation: Operation;
  answer: number;
  options: number[];
}

// Compare: Choose <, >, = (e.g., 5 + 3 __ 10)
interface CompareProblem extends BaseProblem {
  category: "compare";
  leftExpr: string;
  leftValue: number;
  rightExpr: string;
  rightValue: number;
  answer: CompareOperator;
}

// FillBlank: Find the missing number (e.g., 5 + _ = 8)
interface FillBlankProblem extends BaseProblem {
  category: "fillBlank";
  expression: string; // "5 + _ = 8"
  answer: number;
  options: number[];
}

// Sort: Arrange numbers in order
interface SortProblem extends BaseProblem {
  category: "sort";
  numbers: number[];
  sortedNumbers: number[];
  ascending: boolean;
}

// Chain: Solve chained operations (e.g., 2 + 3 - 1 = ?)
interface ChainProblem extends BaseProblem {
  category: "chain";
  expression: string; // "2 + 3 - 1"
  answer: number;
  options: number[];
}

type MathProblem =
  | QuizProblem
  | CompareProblem
  | FillBlankProblem
  | SortProblem
  | ChainProblem;

// Difficulty configuration
const DIFFICULTY_CONFIG = {
  easy: {
    operations: ["+", "-"] as Operation[],
    numRange: { min: 1, max: 10 },
    timeLimit: 60,
    problemCount: 12,
  },
  medium: {
    operations: ["+", "-"] as Operation[],
    numRange: { min: 1, max: 20 },
    timeLimit: 60,
    problemCount: 10,
  },
  hard: {
    operations: ["+", "-"] as Operation[],
    numRange: { min: 5, max: 50 },
    timeLimit: 60,
    problemCount: 8,
  },
};

// Category info for theme selector
const CATEGORY_INFO: Record<
  MathCategory,
  { name: string; description: string; color: string }
> = {
  mix: {
    name: "Mix",
    description: "All categories!",
    color: "from-fuchsia-400 to-violet-500",
  },
  quiz: {
    name: "Quiz",
    description: "Multiple choice",
    color: "from-blue-400 to-cyan-500",
  },
  compare: {
    name: "Compare",
    description: "< > =",
    color: "from-purple-400 to-pink-500",
  },
  fillBlank: {
    name: "Fill Blank",
    description: "Find missing",
    color: "from-amber-400 to-orange-500",
  },
  sort: {
    name: "Sort",
    description: "Order numbers",
    color: "from-emerald-400 to-green-500",
  },
  chain: {
    name: "Chain",
    description: "Multi-step",
    color: "from-red-400 to-rose-500",
  },
};

// =============================================================================
// Problem Generation Utilities
// =============================================================================

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

function compute(a: number, op: Operation, b: number): number {
  switch (op) {
    case "+":
      return a + b;
    case "-":
      return a - b;
    case "×":
      return a * b;
    case "÷":
      return a / b;
  }
}

function generateOptions(correctAnswer: number, count: number = 4): number[] {
  const options = new Set<number>([correctAnswer]);
  let fallback = 1;
  while (options.size < count) {
    const variance = randomInt(1, 5);
    const direction = Math.random() > 0.5 ? 1 : -1;
    const wrongAnswer = correctAnswer + variance * direction;
    if (wrongAnswer >= 0 && !options.has(wrongAnswer)) {
      options.add(wrongAnswer);
    }
    if (options.size < count && !options.has(correctAnswer + fallback)) {
      options.add(correctAnswer + fallback);
    }
    if (
      options.size < count &&
      correctAnswer - fallback >= 0 &&
      !options.has(correctAnswer - fallback)
    ) {
      options.add(correctAnswer - fallback);
    }
    fallback++;
  }
  return shuffleArray(Array.from(options));
}

// =============================================================================
// Problem Generators by Category
// =============================================================================

function generateQuizProblem(difficulty: Difficulty): QuizProblem {
  const config = DIFFICULTY_CONFIG[difficulty];
  const operation =
    config.operations[randomInt(0, config.operations.length - 1)];

  let num1: number, num2: number, answer: number;

  switch (operation) {
    case "+":
      num1 = randomInt(config.numRange.min, config.numRange.max);
      num2 = randomInt(config.numRange.min, config.numRange.max);
      answer = num1 + num2;
      break;
    case "-":
      num1 = randomInt(config.numRange.min, config.numRange.max);
      num2 = randomInt(
        config.numRange.min,
        Math.min(num1, config.numRange.max)
      );
      answer = num1 - num2;
      break;
    default:
      // Fallback to addition if operation is not + or -
      num1 = randomInt(config.numRange.min, config.numRange.max);
      num2 = randomInt(config.numRange.min, config.numRange.max);
      answer = num1 + num2;
  }

  return {
    category: "quiz",
    num1,
    num2,
    operation,
    answer,
    options: generateOptions(answer),
  };
}

function generateCompareProblem(difficulty: Difficulty): CompareProblem {
  const config = DIFFICULTY_CONFIG[difficulty];

  // For hard difficulty, use chain expressions (a + b [?] c - d + e)
  if (difficulty === "hard") {
    return generateChainCompareProblem(config);
  }

  const operation =
    config.operations[randomInt(0, config.operations.length - 1)];

  // Generate left side expression
  let leftNum1: number, leftNum2: number, leftValue: number;

  switch (operation) {
    case "+":
      leftNum1 = randomInt(config.numRange.min, config.numRange.max);
      leftNum2 = randomInt(config.numRange.min, config.numRange.max);
      leftValue = leftNum1 + leftNum2;
      break;
    case "-":
      leftNum1 = randomInt(config.numRange.min, config.numRange.max);
      leftNum2 = randomInt(
        config.numRange.min,
        Math.min(leftNum1, config.numRange.max)
      );
      leftValue = leftNum1 - leftNum2;
      break;
    default:
      // Fallback to addition if operation is not + or -
      leftNum1 = randomInt(config.numRange.min, config.numRange.max);
      leftNum2 = randomInt(config.numRange.min, config.numRange.max);
      leftValue = leftNum1 + leftNum2;
  }

  const leftExpr = `${leftNum1} ${operation} ${leftNum2}`;

  // Generate right side (can be a number or another expression)
  let rightExpr: string, rightValue: number;

  if (Math.random() > 0.5) {
    // Simple number comparison
    const variation = randomInt(-3, 3);
    rightValue = Math.max(0, leftValue + variation);
    rightExpr = String(rightValue);
  } else {
    // Expression comparison
    const rightOp =
      config.operations[randomInt(0, config.operations.length - 1)];
    const rightNum1 = randomInt(config.numRange.min, config.numRange.max);
    const rightNum2 = randomInt(1, Math.min(rightNum1, 10));
    rightValue = compute(rightNum1, rightOp, rightNum2);
    rightExpr = `${rightNum1} ${rightOp} ${rightNum2}`;
  }

  const answer: CompareOperator =
    leftValue < rightValue ? "<" : leftValue > rightValue ? ">" : "=";

  return {
    category: "compare",
    leftExpr,
    leftValue,
    rightExpr,
    rightValue,
    answer,
  };
}

// Generate chain comparison for hard difficulty: a + b [?] c - d + e
function generateChainCompareProblem(
  _config: (typeof DIFFICULTY_CONFIG)["hard"]
): CompareProblem {
  // Only use + and - for chain expressions (easier to compute mentally)
  const chainOps: Operation[] = ["+", "-"];

  // Generate left side chain (2-3 operations)
  const leftSteps = randomInt(2, 3);
  let leftValue = randomInt(5, 15); // Start with reasonable number
  let leftExpr = String(leftValue);

  for (let i = 0; i < leftSteps; i++) {
    const op = chainOps[randomInt(0, chainOps.length - 1)];
    let operand: number;

    if (op === "-") {
      // Ensure we don't go negative
      operand = randomInt(1, Math.min(leftValue - 1, 10));
      leftValue = leftValue - operand;
    } else {
      operand = randomInt(1, 10);
      leftValue = leftValue + operand;
    }
    leftExpr += ` ${op} ${operand}`;
  }

  // Generate right side chain (2-3 operations)
  const rightSteps = randomInt(2, 3);
  let rightValue = randomInt(5, 15);
  let rightExpr = String(rightValue);

  for (let i = 0; i < rightSteps; i++) {
    const op = chainOps[randomInt(0, chainOps.length - 1)];
    let operand: number;

    if (op === "-") {
      operand = randomInt(1, Math.min(rightValue - 1, 10));
      rightValue = rightValue - operand;
    } else {
      operand = randomInt(1, 10);
      rightValue = rightValue + operand;
    }
    rightExpr += ` ${op} ${operand}`;
  }

  // Sometimes make them equal for variety
  if (Math.random() < 0.2) {
    // Adjust right side to equal left
    const diff = leftValue - rightValue;
    if (diff > 0) {
      rightExpr += ` + ${diff}`;
      rightValue = leftValue;
    } else if (diff < 0) {
      rightExpr += ` + ${-diff}`;
      rightValue = leftValue;
    }
  }

  const answer: CompareOperator =
    leftValue < rightValue ? "<" : leftValue > rightValue ? ">" : "=";

  return {
    category: "compare",
    leftExpr,
    leftValue,
    rightExpr,
    rightValue,
    answer,
  };
}

function generateFillBlankProblem(difficulty: Difficulty): FillBlankProblem {
  const config = DIFFICULTY_CONFIG[difficulty];
  const operation =
    config.operations[randomInt(0, config.operations.length - 1)];

  let num1: number,
    num2: number,
    result: number,
    blankPosition: number,
    answer: number,
    expression: string;

  switch (operation) {
    case "+":
      num1 = randomInt(config.numRange.min, config.numRange.max);
      num2 = randomInt(config.numRange.min, config.numRange.max);
      result = num1 + num2;
      blankPosition = randomInt(0, 2);
      if (blankPosition === 0) {
        answer = num1;
        expression = `_ + ${num2} = ${result}`;
      } else if (blankPosition === 1) {
        answer = num2;
        expression = `${num1} + _ = ${result}`;
      } else {
        answer = result;
        expression = `${num1} + ${num2} = _`;
      }
      break;
    case "-":
      num1 = randomInt(config.numRange.min, config.numRange.max);
      num2 = randomInt(
        config.numRange.min,
        Math.min(num1, config.numRange.max)
      );
      result = num1 - num2;
      blankPosition = randomInt(0, 2);
      if (blankPosition === 0) {
        answer = num1;
        expression = `_ - ${num2} = ${result}`;
      } else if (blankPosition === 1) {
        answer = num2;
        expression = `${num1} - _ = ${result}`;
      } else {
        answer = result;
        expression = `${num1} - ${num2} = _`;
      }
      break;
    default:
      // Fallback to addition if operation is not + or -
      num1 = randomInt(config.numRange.min, config.numRange.max);
      num2 = randomInt(config.numRange.min, config.numRange.max);
      result = num1 + num2;
      answer = result;
      expression = `${num1} + ${num2} = _`;
  }

  return {
    category: "fillBlank",
    expression,
    answer,
    options: generateOptions(answer),
  };
}

function generateSortProblem(difficulty: Difficulty): SortProblem {
  const config = DIFFICULTY_CONFIG[difficulty];
  const count = difficulty === "easy" ? 4 : difficulty === "medium" ? 5 : 6;

  // Generate unique numbers
  const numbers = new Set<number>();
  while (numbers.size < count) {
    numbers.add(randomInt(config.numRange.min, config.numRange.max));
  }

  const numbersArray = Array.from(numbers);
  const ascending = Math.random() > 0.5;
  const sortedNumbers = [...numbersArray].sort((a, b) =>
    ascending ? a - b : b - a
  );

  return {
    category: "sort",
    numbers: shuffleArray(numbersArray),
    sortedNumbers,
    ascending,
  };
}

function generateChainProblem(difficulty: Difficulty): ChainProblem {
  const config = DIFFICULTY_CONFIG[difficulty];
  const stepCount = difficulty === "easy" ? 2 : difficulty === "medium" ? 3 : 4;

  // Start with a random number
  let current = randomInt(
    config.numRange.min,
    Math.min(20, config.numRange.max)
  );
  let expression = String(current);

  for (let i = 0; i < stepCount; i++) {
    // Pick operation (only addition and subtraction)
    const ops = ["+", "-"] as Operation[];
    const op = ops[randomInt(0, ops.length - 1)];

    let operand: number;
    switch (op) {
      case "+":
        operand = randomInt(1, Math.min(10, config.numRange.max));
        current = current + operand;
        break;
      case "-":
        operand = randomInt(1, Math.min(current, 10));
        current = current - operand;
        break;
      default:
        // Fallback to addition
        operand = randomInt(1, Math.min(10, config.numRange.max));
        current = current + operand;
    }
    expression += ` ${op} ${operand}`;
  }

  return {
    category: "chain",
    expression,
    answer: current,
    options: generateOptions(current),
  };
}

function generateProblem(
  category: MathCategory,
  difficulty: Difficulty
): MathProblem {
  // For "mix" mode, randomly select from all categories
  const actualCategory =
    category === "mix"
      ? MIXABLE_CATEGORIES[randomInt(0, MIXABLE_CATEGORIES.length - 1)]
      : category;

  switch (actualCategory) {
    case "quiz":
      return generateQuizProblem(difficulty);
    case "compare":
      return generateCompareProblem(difficulty);
    case "fillBlank":
      return generateFillBlankProblem(difficulty);
    case "sort":
      return generateSortProblem(difficulty);
    case "chain":
      return generateChainProblem(difficulty);
  }
}

// =============================================================================
// Fun Feedback Messages
// =============================================================================

const CORRECT_MESSAGES = [
  "🎉 Amazing!",
  "⭐ You're a star!",
  "🚀 Super!",
  "💪 You got it!",
  "🔥 On fire!",
  "✨ Brilliant!",
  "🏆 Champion!",
  "👏 Well done!",
  "🎯 Perfect!",
  "💯 Excellent!",
  "🌟 Fantastic!",
  "😎 Cool!",
  "🤩 Awesome!",
  "🎊 Woohoo!",
  "👍 Great job!",
];

const WRONG_MESSAGES = [
  "😅 Oops!",
  "🤔 Try again!",
  "💪 Keep going!",
  "🌈 Almost!",
  "😊 Next one!",
  "🎯 Close!",
  "📚 Learning!",
  "🔄 Try more!",
  "💡 Think again!",
  "🌟 Don't give up!",
];

function getRandomMessage(messages: string[]): string {
  return messages[Math.floor(Math.random() * messages.length)];
}

// =============================================================================
// Game Logic
// =============================================================================

function mathQuestLogic() {
  const $energy = energyLogic();
  const $profile = selectedProfileLogic();

  // Game state signals
  const gameState = signal<GameState>("menu", { name: "math.gameState" });
  const difficulty = signal<Difficulty>("easy", { name: "math.difficulty" });
  const category = signal<MathCategory>("quiz", { name: "math.category" });
  const currentProblem = signal<MathProblem | null>(null, {
    name: "math.currentProblem",
  });
  const problemIndex = signal(0, { name: "math.problemIndex" });
  const timeLeft = signal(120, { name: "math.timeLeft" });
  const score = signal(0, { name: "math.score" });
  const streak = signal(0, { name: "math.streak" });
  const bestStreak = signal(0, { name: "math.bestStreak" });
  const correctCount = signal(0, { name: "math.correctCount" });
  const wrongCount = signal(0, { name: "math.wrongCount" });
  const answerStatus = signal<"correct" | "wrong" | null>(null, {
    name: "math.answerStatus",
  });
  const feedbackMessage = signal("", { name: "math.feedbackMessage" });

  // For sort problems - track user's current arrangement
  const sortUserOrder = signal<number[]>([], { name: "math.sortUserOrder" });

  async function startGame(): Promise<boolean> {
    const hasEnergy = await $energy.spend(1);
    if (!hasEnergy) return false;

    const config = DIFFICULTY_CONFIG[difficulty()];

    timeLeft.set(config.timeLimit);
    score.set(0);
    streak.set(0);
    bestStreak.set(0);
    correctCount.set(0);
    wrongCount.set(0);
    problemIndex.set(0);
    answerStatus.set(null);
    sortUserOrder.set([]);

    currentProblem.set(generateProblem(category(), difficulty()));
    gameState.set("playing");
    backgroundMusic.playMemoryMusic();

    return true;
  }

  function handleCorrectAnswer() {
    playCorrectSound();
    answerStatus.set("correct");
    feedbackMessage.set(getRandomMessage(CORRECT_MESSAGES));

    const newStreak = streak() + 1;
    streak.set(newStreak);
    bestStreak.set(Math.max(bestStreak(), newStreak));

    const points = calculateAnswerPoints(difficulty(), newStreak - 1);
    score.set((s) => s + points);
    correctCount.set((c) => c + 1);
  }

  function handleWrongAnswer() {
    playWrongSound();
    answerStatus.set("wrong");
    feedbackMessage.set(getRandomMessage(WRONG_MESSAGES));
    streak.set(0);
    wrongCount.set((c) => c + 1);
  }

  function nextProblem() {
    setTimeout(() => {
      const config = DIFFICULTY_CONFIG[difficulty()];
      const nextIndex = problemIndex() + 1;

      if (nextIndex >= config.problemCount) {
        playWinSound();
        finishGame();
      } else {
        problemIndex.set(nextIndex);
        currentProblem.set(generateProblem(category(), difficulty()));
        answerStatus.set(null);
        sortUserOrder.set([]);
      }
    }, 800);
  }

  // Submit answer for quiz, fillBlank, chain
  function submitAnswer(answer: number) {
    const problem = currentProblem();
    if (!problem || answerStatus() !== null) return;
    if (
      problem.category !== "quiz" &&
      problem.category !== "fillBlank" &&
      problem.category !== "chain"
    )
      return;

    if (answer === problem.answer) {
      handleCorrectAnswer();
    } else {
      handleWrongAnswer();
    }
    nextProblem();
  }

  // Submit answer for compare
  function submitCompare(op: CompareOperator) {
    const problem = currentProblem();
    if (!problem || answerStatus() !== null || problem.category !== "compare")
      return;

    if (op === problem.answer) {
      handleCorrectAnswer();
    } else {
      handleWrongAnswer();
    }
    nextProblem();
  }

  // Handle sort - add number to user order
  function addToSortOrder(num: number) {
    const problem = currentProblem();
    if (!problem || answerStatus() !== null || problem.category !== "sort")
      return;

    const current = sortUserOrder();
    if (current.includes(num)) return;

    const newOrder = [...current, num];
    sortUserOrder.set(newOrder);

    // Check if complete
    if (newOrder.length === problem.numbers.length) {
      const isCorrect = newOrder.every(
        (n, i) => n === problem.sortedNumbers[i]
      );
      if (isCorrect) {
        handleCorrectAnswer();
      } else {
        handleWrongAnswer();
      }
      nextProblem();
    }
  }

  // Clear sort order to retry
  function clearSortOrder() {
    sortUserOrder.set([]);
  }

  // Game tick effect - auto-managed timer that cleans up when logic disposes
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
    { name: "math" }
  );

  async function finishGame() {
    backgroundMusic.stop();
    gameState.set("finished");

    const profile = $profile.profile();
    if (profile) {
      await gameProgressRepository.recordGameSession(
        profile.id,
        "math-quest",
        score(),
        1
      );
    }
  }

  function backToMenu() {
    backgroundMusic.stop();
    gameState.set("menu");
  }

  return {
    gameState,
    difficulty,
    category,
    currentProblem,
    problemIndex,
    timeLeft,
    score,
    streak,
    bestStreak,
    correctCount,
    wrongCount,
    answerStatus,
    sortUserOrder,
    feedbackMessage,
    energy: $energy.energy,
    profile: $profile.profile,
    setDifficulty: (d: Difficulty) => difficulty.set(d),
    setCategory: (c: MathCategory) => category.set(c),
    startGame,
    submitAnswer,
    submitCompare,
    addToSortOrder,
    clearSortOrder,
    backToMenu,

    dispose() {
      backgroundMusic.stop();
    },
  };
}

// =============================================================================
// Main Component
// =============================================================================

function MathQuest() {
  const $game = useScope(mathQuestLogic);
  const navigate = useNavigate();

  // Handle back button with confirmation during gameplay
  const handleBack = async () => {
    if ($game.gameState() === "playing") {
      const $modal = modalLogic();
      const confirmed = await $modal.confirm(
        "Are you sure you want to quit? Your progress will be lost!",
        "Leave Game?"
      );
      if (!confirmed) return;
      $game.backToMenu();
    }
    navigate({ to: "/dashboard", viewTransition: true });
  };

  return rx(() => {
    const state = $game.gameState();

    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-500 via-cyan-500 to-teal-500 p-4 pb-12 safe-bottom">
        <header className="mb-4">
          <div className="mx-auto max-w-3xl flex items-center justify-between">
            <button
              onClick={handleBack}
              className="flex items-center gap-2 text-white/80 hover:text-white transition-colors"
            >
              <Icon name="back" size={20} />
              <span className="text-sm font-medium hidden sm:inline">Back</span>
            </button>
            <h1 className="font-display text-2xl font-bold text-white drop-shadow-lg flex items-center gap-2">
              <MathIcon className="w-8 h-8" />
              Math Quest
            </h1>
            <div className="flex items-center gap-1 text-amber-300 font-bold">
              <EnergyIcon />
              <span>{$game.energy()}</span>
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

// =============================================================================
// SVG Icons
// =============================================================================

function MathIcon({ className = "w-16 h-16" }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className}>
      <rect x="8" y="4" width="48" height="56" rx="8" fill="#3b82f6" />
      <rect x="14" y="10" width="36" height="14" rx="3" fill="#bfdbfe" />
      <text
        x="44"
        y="21"
        fontSize="10"
        fill="#1e40af"
        fontWeight="bold"
        textAnchor="end"
      >
        123
      </text>
      <rect x="14" y="28" width="8" height="8" rx="2" fill="#60a5fa" />
      <rect x="28" y="28" width="8" height="8" rx="2" fill="#60a5fa" />
      <rect x="42" y="28" width="8" height="8" rx="2" fill="#f97316" />
      <rect x="14" y="40" width="8" height="8" rx="2" fill="#60a5fa" />
      <rect x="28" y="40" width="8" height="8" rx="2" fill="#60a5fa" />
      <rect x="42" y="40" width="8" height="8" rx="2" fill="#f97316" />
      <rect x="14" y="52" width="22" height="8" rx="2" fill="#60a5fa" />
      <rect x="42" y="52" width="8" height="8" rx="2" fill="#22c55e" />
      <text x="18" y="35" fontSize="7" fill="white" fontWeight="bold">
        7
      </text>
      <text x="32" y="35" fontSize="7" fill="white" fontWeight="bold">
        8
      </text>
      <text x="46" y="35" fontSize="7" fill="white" fontWeight="bold">
        +
      </text>
      <text x="18" y="47" fontSize="7" fill="white" fontWeight="bold">
        4
      </text>
      <text x="32" y="47" fontSize="7" fill="white" fontWeight="bold">
        5
      </text>
      <text x="46" y="47" fontSize="7" fill="white" fontWeight="bold">
        −
      </text>
      <text x="25" y="59" fontSize="7" fill="white" fontWeight="bold">
        0
      </text>
      <text x="46" y="59" fontSize="7" fill="white" fontWeight="bold">
        =
      </text>
    </svg>
  );
}

function TrophyIcon({ className = "w-16 h-16" }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={className}>
      <path
        d="M38 8H34V6C34 4.9 33.1 4 32 4H16C14.9 4 14 4.9 14 6V8H10C7.79 8 6 9.79 6 12V14C6 18.42 9.58 22 14 22C14.36 22 14.71 21.97 15.06 21.92C16.59 25.15 19.5 27.52 23 28.28V34H18C16.9 34 16 34.9 16 36V42C16 43.1 16.9 44 18 44H30C31.1 44 32 43.1 32 42V36C32 34.9 31.1 34 30 34H25V28.28C28.5 27.52 31.41 25.15 32.94 21.92C33.29 21.97 33.64 22 34 22C38.42 22 42 18.42 42 14V12C42 9.79 40.21 8 38 8Z"
        fill="#fbbf24"
      />
      <path
        d="M14 18C11.79 18 10 16.21 10 14V12H14V18ZM34 12H38V14C38 16.21 36.21 18 34 18V12Z"
        fill="#f59e0b"
      />
    </svg>
  );
}

function StarRatingIcon({ filled }: { filled: boolean }) {
  return (
    <svg viewBox="0 0 24 24" className="w-10 h-10">
      <path
        d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
        fill={filled ? "#fbbf24" : "#374151"}
        className={filled ? "drop-shadow-lg" : "opacity-30"}
      />
    </svg>
  );
}

function TimerIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-6 h-6" fill="currentColor">
      <path d="M15 1H9v2h6V1zm-4 13h2V8h-2v6zm8.03-6.61l1.42-1.42c-.43-.51-.9-.99-1.41-1.41l-1.42 1.42C16.07 4.74 14.12 4 12 4c-4.97 0-9 4.03-9 9s4.03 9 9 9 9-4.03 9-9c0-2.12-.74-4.07-1.97-5.61zM12 20c-3.87 0-7-3.13-7-7s3.13-7 7-7 7 3.13 7 7-3.13 7-7 7z" />
    </svg>
  );
}

function FireIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-5 h-5" fill="#f59e0b">
      <path d="M13.5.67s.74 2.65.74 4.8c0 2.06-1.35 3.73-3.41 3.73-2.07 0-3.63-1.67-3.63-3.73l.03-.36C5.21 7.51 4 10.62 4 14c0 4.42 3.58 8 8 8s8-3.58 8-8C20 8.61 17.41 3.8 13.5.67zM11.71 19c-1.78 0-3.22-1.4-3.22-3.14 0-1.62 1.05-2.76 2.81-3.12 1.77-.36 3.6-1.21 4.62-2.58.39 1.29.59 2.65.59 4.04 0 2.65-2.15 4.8-4.8 4.8z" />
    </svg>
  );
}

function EnergyIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor">
      <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
    </svg>
  );
}

function CheckIcon({ className = "w-6 h-6" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor">
      <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
    </svg>
  );
}

function XIcon({ className = "w-6 h-6" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor">
      <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
    </svg>
  );
}

// =============================================================================
// Menu Screen
// =============================================================================

const MATH_DIFFICULTY_OPTIONS: DifficultyOption[] = [
  {
    value: "easy",
    label: "Easy",
    description: "Numbers 1-10",
    color: "from-emerald-400 to-green-500",
  },
  {
    value: "medium",
    label: "Medium",
    description: "Numbers 1-20",
    color: "from-amber-400 to-orange-500",
  },
  {
    value: "hard",
    label: "Hard",
    description: "Numbers 5-50",
    color: "from-red-400 to-rose-500",
  },
];

const CATEGORY_OPTIONS: ThemeOption[] = Object.entries(CATEGORY_INFO).map(
  ([key, info]) => ({
    value: key,
    label: info.name,
    color: info.color,
    icon: MathCategoryIcons[key as keyof typeof MathCategoryIcons],
  })
);

const HOW_TO_PLAY: Record<MathCategory, string[]> = {
  mix: [
    "Random challenge mode!",
    "Each problem is a different type",
    "Quiz, Compare, Fill, Sort & Chain!",
  ],
  quiz: [
    "Solve math problems!",
    "Tap the correct answer",
    "Build streaks for bonus points",
  ],
  compare: [
    "Compare two sides!",
    "Choose < (less), > (greater), or = (equal)",
    "Think fast!",
  ],
  fillBlank: [
    "Find the missing number!",
    "Complete the equation",
    "All operations included",
  ],
  sort: [
    "Arrange numbers in order!",
    "Tap numbers from smallest to largest (or reverse)",
    "Clear to retry",
  ],
  chain: [
    "Solve step-by-step!",
    "Calculate the chain of operations",
    "Follow order: left to right",
  ],
};

function MenuScreen({ $game }: { $game: ReturnType<typeof mathQuestLogic> }) {
  return rx(() => {
    const difficulty = $game.difficulty();
    const cat = $game.category();
    const energy = $game.energy();

    return (
      <GameMenu
        title="Math Quest"
        description={CATEGORY_INFO[cat].description}
        icon="math"
        themeColor="from-blue-500 to-cyan-500"
        difficulty={difficulty}
        onDifficultyChange={(d) => $game.setDifficulty(d)}
        difficultyOptions={MATH_DIFFICULTY_OPTIONS}
        energy={energy}
        energyCost={1}
        onPlay={async () => {
          playClickSound();
          const started = await $game.startGame();
          if (!started) {
            const $modal = modalLogic();
            await $modal.warning(
              "No energy left! Come back tomorrow to play again.",
              "No Energy"
            );
          }
        }}
        howToPlay={HOW_TO_PLAY[cat]}
        howToPlayColor="bg-blue-100/80"
      >
        {/* Category Selection */}
        <ThemeSelector
          title="Choose Category"
          themes={CATEGORY_OPTIONS}
          selected={cat}
          onChange={(c) => $game.setCategory(c as MathCategory)}
        />
      </GameMenu>
    );
  });
}

// =============================================================================
// Playing Screen
// =============================================================================

function PlayingScreen({
  $game,
}: {
  $game: ReturnType<typeof mathQuestLogic>;
}) {
  return rx(() => {
    const problem = $game.currentProblem();
    const difficulty = $game.difficulty();
    const category = $game.category();
    const timeLeft = $game.timeLeft();
    const score = $game.score();
    const streak = $game.streak();
    const correctCount = $game.correctCount();
    const problemIndex = $game.problemIndex();
    const answerStatus = $game.answerStatus();
    const feedbackMessage = $game.feedbackMessage();

    const config = DIFFICULTY_CONFIG[difficulty];
    const catInfo = CATEGORY_INFO[category];

    if (!problem) return null;

    return (
      <div className="space-y-4">
        {/* Stats Bar */}
        <div className="card bg-white/95 backdrop-blur">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-4">
              <div>
                <span className="text-gray-500">Score:</span>
                <span className="ml-1 font-bold text-blue-600">{score}</span>
              </div>
              <div>
                <span className="text-gray-500">Problem:</span>
                <span className="ml-1 font-bold">
                  {problemIndex + 1}/{config.problemCount}
                </span>
              </div>
              {streak > 0 && (
                <div className="text-amber-600 font-bold flex items-center gap-1">
                  <FireIcon /> {streak}
                </div>
              )}
            </div>
            <div
              className={`text-2xl font-bold flex items-center gap-1 ${timeLeft <= 10 ? "text-red-500 animate-pulse" : "text-gray-800"}`}
            >
              <TimerIcon /> {timeLeft}s
            </div>
          </div>
          <div className="mt-2 text-xs text-center">
            <span
              className={`px-2 py-0.5 rounded-full bg-gradient-to-r ${catInfo.color} text-white`}
            >
              {catInfo.name}
            </span>
          </div>
          <div className="mt-2 h-2 rounded-full bg-gray-200 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-blue-400 to-cyan-500 transition-all duration-300"
              style={{
                width: `${(correctCount / config.problemCount) * 100}%`,
              }}
            />
          </div>
        </div>

        {/* Problem UI - varies by category */}
        {problem.category === "quiz" && (
          <QuizProblemUI
            problem={problem}
            $game={$game}
            answerStatus={answerStatus}
            feedbackMessage={feedbackMessage}
          />
        )}
        {problem.category === "compare" && (
          <CompareProblemUI
            problem={problem}
            $game={$game}
            answerStatus={answerStatus}
            feedbackMessage={feedbackMessage}
          />
        )}
        {problem.category === "fillBlank" && (
          <FillBlankProblemUI
            problem={problem}
            $game={$game}
            answerStatus={answerStatus}
            feedbackMessage={feedbackMessage}
          />
        )}
        {problem.category === "sort" && (
          <SortProblemUI
            problem={problem}
            $game={$game}
            answerStatus={answerStatus}
            feedbackMessage={feedbackMessage}
          />
        )}
        {problem.category === "chain" && (
          <ChainProblemUI
            problem={problem}
            $game={$game}
            answerStatus={answerStatus}
            feedbackMessage={feedbackMessage}
          />
        )}
      </div>
    );
  });
}

// =============================================================================
// Problem UIs by Category
// =============================================================================

function QuizProblemUI({
  problem,
  $game,
  answerStatus,
  feedbackMessage,
}: {
  problem: QuizProblem;
  $game: ReturnType<typeof mathQuestLogic>;
  answerStatus: "correct" | "wrong" | null;
  feedbackMessage: string;
}) {
  return (
    <>
      <ProblemCard
        answerStatus={answerStatus}
        correctAnswer={problem.answer}
        feedbackMessage={feedbackMessage}
      >
        <div className="text-5xl sm:text-6xl font-bold text-gray-800 mb-2 font-display">
          {problem.num1} {problem.operation} {problem.num2}
        </div>
        <div className="text-2xl text-gray-500">= ?</div>
      </ProblemCard>
      <OptionsGrid
        options={problem.options}
        correctAnswer={problem.answer}
        answerStatus={answerStatus}
        onSelect={(n) => $game.submitAnswer(n)}
      />
    </>
  );
}

function CompareProblemUI({
  problem,
  $game,
  answerStatus,
  feedbackMessage,
}: {
  problem: CompareProblem;
  $game: ReturnType<typeof mathQuestLogic>;
  answerStatus: "correct" | "wrong" | null;
  feedbackMessage: string;
}) {
  const operators: CompareOperator[] = ["<", "=", ">"];

  return (
    <>
      <ProblemCard
        answerStatus={answerStatus}
        correctAnswer={problem.answer}
        feedbackMessage={feedbackMessage}
      >
        <div className="text-3xl sm:text-4xl font-bold text-gray-800 mb-2 font-display">
          {problem.leftExpr}
        </div>
        <div className="text-4xl sm:text-5xl font-bold text-blue-500 my-2">
          ?
        </div>
        <div className="text-3xl sm:text-4xl font-bold text-gray-800 font-display">
          {problem.rightExpr}
        </div>
      </ProblemCard>

      <div className="grid grid-cols-3 gap-3">
        {operators.map((op) => {
          const isCorrect = answerStatus !== null && op === problem.answer;
          const isWrong = answerStatus === "wrong" && op !== problem.answer;

          return (
            <button
              key={op}
              onClick={() => $game.submitCompare(op)}
              disabled={answerStatus !== null}
              className={`py-5 px-4 rounded-2xl text-4xl font-bold transition-all ${
                isCorrect
                  ? "bg-green-500 text-white scale-105 shadow-lg"
                  : isWrong
                    ? "bg-gray-200 text-gray-400"
                    : answerStatus !== null
                      ? "bg-gray-200 text-gray-400"
                      : "bg-white hover:bg-blue-50 hover:scale-105 active:scale-95 shadow-md text-gray-800"
              }`}
            >
              {op}
            </button>
          );
        })}
      </div>
    </>
  );
}

function FillBlankProblemUI({
  problem,
  $game,
  answerStatus,
  feedbackMessage,
}: {
  problem: FillBlankProblem;
  $game: ReturnType<typeof mathQuestLogic>;
  answerStatus: "correct" | "wrong" | null;
  feedbackMessage: string;
}) {
  return (
    <>
      <ProblemCard
        answerStatus={answerStatus}
        correctAnswer={problem.answer}
        feedbackMessage={feedbackMessage}
      >
        <div className="text-4xl sm:text-5xl font-bold text-gray-800 font-display">
          {problem.expression.split("_").map((part, i, arr) => (
            <span key={i}>
              {part}
              {i < arr.length - 1 && (
                <span className="text-blue-500 mx-1">?</span>
              )}
            </span>
          ))}
        </div>
      </ProblemCard>
      <OptionsGrid
        options={problem.options}
        correctAnswer={problem.answer}
        answerStatus={answerStatus}
        onSelect={(n) => $game.submitAnswer(n)}
      />
    </>
  );
}

function SortProblemUI({
  problem,
  $game,
  answerStatus,
  feedbackMessage,
}: {
  problem: SortProblem;
  $game: ReturnType<typeof mathQuestLogic>;
  answerStatus: "correct" | "wrong" | null;
  feedbackMessage: string;
}) {
  const userOrder = $game.sortUserOrder();
  const availableNumbers = problem.numbers.filter(
    (n) => !userOrder.includes(n)
  );

  return (
    <>
      <ProblemCard
        answerStatus={answerStatus}
        correctAnswer={problem.sortedNumbers.join(", ")}
        feedbackMessage={feedbackMessage}
      >
        <div className="text-xl font-medium text-gray-600 mb-3">
          Sort {problem.ascending ? "smallest → largest" : "largest → smallest"}
        </div>

        {/* User's current order */}
        <div className="flex flex-wrap justify-center gap-2 min-h-14 p-3 bg-gray-100 rounded-xl">
          {userOrder.length === 0 ? (
            <span className="text-gray-400">Tap numbers below...</span>
          ) : (
            userOrder.map((n, i) => (
              <span
                key={i}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg text-xl font-bold"
              >
                {n}
              </span>
            ))
          )}
        </div>

        {answerStatus === "wrong" && (
          <div className="mt-2 text-red-500 text-sm">
            Correct: {problem.sortedNumbers.join(" → ")}
          </div>
        )}
      </ProblemCard>

      {/* Available numbers to tap */}
      <div className="grid grid-cols-3 gap-3">
        {availableNumbers.map((num) => (
          <button
            key={num}
            onClick={() => $game.addToSortOrder(num)}
            disabled={answerStatus !== null}
            className="py-4 px-4 rounded-2xl text-2xl font-bold bg-white hover:bg-blue-50 hover:scale-105 active:scale-95 shadow-md text-gray-800 transition-all"
          >
            {num}
          </button>
        ))}
      </div>

      {userOrder.length > 0 && answerStatus === null && (
        <button
          onClick={() => $game.clearSortOrder()}
          className="w-full py-2 text-gray-500 hover:text-gray-700"
        >
          ↺ Clear & Retry
        </button>
      )}
    </>
  );
}

function ChainProblemUI({
  problem,
  $game,
  answerStatus,
  feedbackMessage,
}: {
  problem: ChainProblem;
  $game: ReturnType<typeof mathQuestLogic>;
  answerStatus: "correct" | "wrong" | null;
  feedbackMessage: string;
}) {
  return (
    <>
      <ProblemCard
        answerStatus={answerStatus}
        correctAnswer={problem.answer}
        feedbackMessage={feedbackMessage}
      >
        <div className="text-3xl sm:text-4xl font-bold text-gray-800 mb-2 font-display">
          {problem.expression}
        </div>
        <div className="text-2xl text-gray-500">= ?</div>
      </ProblemCard>
      <OptionsGrid
        options={problem.options}
        correctAnswer={problem.answer}
        answerStatus={answerStatus}
        onSelect={(n) => $game.submitAnswer(n)}
      />
    </>
  );
}

// =============================================================================
// Shared UI Components
// =============================================================================

function ProblemCard({
  children,
  answerStatus,
  correctAnswer,
  feedbackMessage,
}: {
  children: React.ReactNode;
  answerStatus: "correct" | "wrong" | null;
  correctAnswer: string | number;
  feedbackMessage?: string;
}) {
  return (
    <div
      className={`card bg-white/95 text-center py-6 transition-all duration-300 ${
        answerStatus === "correct"
          ? "ring-4 ring-green-400 bg-green-50"
          : answerStatus === "wrong"
            ? "ring-4 ring-red-400 bg-red-50"
            : ""
      }`}
    >
      {children}

      {/* Feedback area - fixed height with fun message */}
      <div className="h-20 flex flex-col items-center justify-center mt-2">
        {answerStatus === "correct" ? (
          <div className="flex flex-col items-center">
            <CheckIcon className="w-10 h-10 text-green-500 animate-bounce" />
            <span className="text-lg font-bold text-green-600 mt-1">
              {feedbackMessage}
            </span>
          </div>
        ) : answerStatus === "wrong" ? (
          <div className="flex flex-col items-center text-red-500">
            <XIcon className="w-8 h-8" />
            <span className="text-base font-bold">{feedbackMessage}</span>
            <span className="text-sm font-medium opacity-80">
              Answer: {correctAnswer}
            </span>
          </div>
        ) : (
          <div className="h-20 opacity-0" />
        )}
      </div>
    </div>
  );
}

function OptionsGrid({
  options,
  correctAnswer,
  answerStatus,
  onSelect,
}: {
  options: number[];
  correctAnswer: number;
  answerStatus: "correct" | "wrong" | null;
  onSelect: (n: number) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {options.map((option, index) => {
        const isCorrect = answerStatus !== null && option === correctAnswer;
        const isWrong = answerStatus === "wrong" && option !== correctAnswer;

        return (
          <button
            key={index}
            onClick={() => onSelect(option)}
            disabled={answerStatus !== null}
            className={`py-5 px-4 rounded-2xl text-2xl font-bold transition-all ${
              isCorrect
                ? "bg-green-500 text-white scale-105 shadow-lg"
                : isWrong
                  ? "bg-gray-200 text-gray-400"
                  : answerStatus !== null
                    ? "bg-gray-200 text-gray-400"
                    : "bg-white hover:bg-blue-50 hover:scale-105 active:scale-95 shadow-md text-gray-800"
            }`}
          >
            {option}
          </button>
        );
      })}
    </div>
  );
}

// =============================================================================
// Finished Screen
// =============================================================================

function FinishedScreen({
  $game,
}: {
  $game: ReturnType<typeof mathQuestLogic>;
}) {
  return rx(() => {
    const score = $game.score();
    const correctCount = $game.correctCount();
    const wrongCount = $game.wrongCount();
    const bestStreak = $game.bestStreak();
    const difficulty = $game.difficulty();
    const category = $game.category();
    const timeLeft = $game.timeLeft();
    const config = DIFFICULTY_CONFIG[difficulty];

    const totalProblems = correctCount + wrongCount;
    const accuracy =
      totalProblems > 0 ? Math.round((correctCount / totalProblems) * 100) : 0;
    const completed = totalProblems >= config.problemCount;

    const stars = calculateStarRating(
      correctCount,
      config.problemCount,
      accuracy,
      bestStreak
    );
    const baseXP = score;
    const timeBonus =
      completed && timeLeft > 0 ? Math.round(timeLeft * 0.5) : 0;
    const totalXP = baseXP + timeBonus;

    return (
      <div className="space-y-6">
        <div className="card text-center py-8 bg-white/95">
          {completed && accuracy >= 70 ? (
            <TrophyIcon className="w-20 h-20 mx-auto" />
          ) : (
            <MathIcon className="w-20 h-20 mx-auto" />
          )}
          <h2 className="font-display text-2xl font-bold text-gray-800 mt-4">
            {completed
              ? accuracy >= 80
                ? "Great Job!"
                : "Well Done!"
              : "Time's Up!"}
          </h2>

          <div className="mt-2 text-sm text-gray-500">
            {CATEGORY_INFO[category].name} Mode
          </div>

          <div className="mt-4 flex justify-center gap-2">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className={i <= stars ? "animate-bounce" : ""}
                style={{ animationDelay: `${i * 0.1}s` }}
              >
                <StarRatingIcon filled={i <= stars} />
              </div>
            ))}
          </div>

          <div className="mt-6 text-4xl font-bold text-blue-600">
            {score} pts
          </div>

          <div className="mt-6 grid grid-cols-2 gap-4 text-left">
            <StatItem
              label="Correct"
              value={`${correctCount}/${config.problemCount}`}
            />
            <StatItem label="Accuracy" value={`${accuracy}%`} />
            <StatItem
              label="Best Streak"
              value={bestStreak}
              icon={<FireIcon />}
            />
            <StatItem label="Wrong" value={wrongCount} />
          </div>

          <div className="mt-6 p-4 bg-amber-50 rounded-xl">
            <div className="text-sm text-amber-700">XP Earned</div>
            <div className="text-2xl font-bold text-amber-600">
              +{totalXP} XP
            </div>
            {timeBonus > 0 && (
              <div className="text-xs text-amber-600">
                (includes +{timeBonus} time bonus)
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <button
            onClick={async () => {
              playClickSound();
              const started = await $game.startGame();
              if (!started) {
                const $modal = modalLogic();
                await $modal.warning(
                  "No energy left! Come back tomorrow to play again.",
                  "No Energy"
                );
              }
            }}
            disabled={$game.energy() === 0}
            className={`py-4 rounded-2xl font-display text-lg font-bold transition-all ${
              $game.energy() > 0
                ? "bg-gradient-to-r from-green-400 to-emerald-500 text-white hover:scale-105 active:scale-95 shadow-lg"
                : "bg-gray-300 text-gray-500 cursor-not-allowed"
            }`}
          >
            {$game.energy() > 0 ? (
              <span className="flex items-center justify-center gap-2">
                Play Again <EnergyIcon /> 1
              </span>
            ) : (
              "No Energy Left"
            )}
          </button>
          <Link
            to="/dashboard"
            viewTransition
            className="btn bg-gray-200 text-gray-700 py-3 text-center hover:bg-gray-300"
          >
            Back to Dashboard
          </Link>
        </div>
      </div>
    );
  });
}

function StatItem({
  label,
  value,
  icon,
}: {
  label: string;
  value: string | number;
  icon?: React.ReactNode;
}) {
  return (
    <div className="p-3 bg-gray-50 rounded-lg">
      <div className="text-xs text-gray-500">{label}</div>
      <div className="font-bold text-gray-800 flex items-center gap-1">
        {icon}
        {value}
      </div>
    </div>
  );
}
