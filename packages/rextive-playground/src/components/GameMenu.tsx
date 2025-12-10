/**
 * Shared Game Menu Component
 *
 * A reusable menu component for all games that provides:
 * - Game title and icon with customizable theme color
 * - Difficulty selection (Easy/Medium/Hard)
 * - Optional custom sections (e.g., theme selection for Memory Match)
 * - How to Play instructions
 * - Play button with energy cost display
 */
import { Icon, type IconName } from "./Icons";

// =============================================================================
// Types
// =============================================================================

export type Difficulty = "easy" | "medium" | "hard";

export interface DifficultyOption {
  value: Difficulty;
  label: string;
  description: string;
  color: string;
}

export interface GameMenuProps {
  /** Game title displayed in header */
  title: string;
  /** Game description shown below title */
  description: string;
  /** Icon name for the game */
  icon: IconName;
  /** Theme color gradient class (e.g., "from-purple-500 to-pink-500") */
  themeColor: string;
  /** Current selected difficulty */
  difficulty: Difficulty;
  /** Callback when difficulty changes */
  onDifficultyChange: (difficulty: Difficulty) => void;
  /** Difficulty options with custom descriptions */
  difficultyOptions?: DifficultyOption[];
  /** Current energy amount */
  energy: number;
  /** Energy cost per game (default: 1) */
  energyCost?: number;
  /** Callback when play button is clicked */
  onPlay: () => void;
  /** Whether the play action is loading */
  isLoading?: boolean;
  /** Optional custom content rendered before difficulty selection */
  children?: React.ReactNode;
  /** How to play instructions */
  howToPlay: string[];
  /** How to play section background color class */
  howToPlayColor?: string;
}

// =============================================================================
// Default Difficulty Options
// =============================================================================

const DEFAULT_DIFFICULTY_OPTIONS: DifficultyOption[] = [
  {
    value: "easy",
    label: "Easy",
    description: "Beginner friendly",
    color: "from-emerald-400 to-green-500",
  },
  {
    value: "medium",
    label: "Medium",
    description: "Balanced challenge",
    color: "from-amber-400 to-orange-500",
  },
  {
    value: "hard",
    label: "Hard",
    description: "For experts",
    color: "from-red-400 to-rose-500",
  },
];

// =============================================================================
// Sub-Components
// =============================================================================

function EnergyIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor">
      <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
    </svg>
  );
}

function DifficultyButton({
  option,
  selected,
  onClick,
}: {
  option: DifficultyOption;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`p-3 rounded-xl text-center transition-all ${
        selected
          ? `bg-gradient-to-br ${option.color} text-white scale-105 shadow-lg`
          : "bg-gray-100 hover:bg-gray-200"
      }`}
    >
      <div className="font-display font-semibold">{option.label}</div>
      <div
        className={`text-xs ${selected ? "text-white/80" : "text-gray-500"}`}
      >
        {option.description}
      </div>
    </button>
  );
}

// =============================================================================
// Main Component
// =============================================================================

export function GameMenu({
  title,
  description,
  icon,
  themeColor,
  difficulty,
  onDifficultyChange,
  difficultyOptions = DEFAULT_DIFFICULTY_OPTIONS,
  energy,
  energyCost = 1,
  onPlay,
  isLoading = false,
  children,
  howToPlay,
  howToPlayColor = "bg-blue-50",
}: GameMenuProps) {
  const hasEnergy = energy >= energyCost;

  return (
    <div className="space-y-6">
      {/* Game Info Card */}
      <div className="card text-center bg-white/95">
        <div
          className={`mb-4 flex justify-center text-transparent bg-clip-text bg-gradient-to-r ${themeColor}`}
        >
          <Icon name={icon} size={64} className={`text-current`} />
        </div>
        <h2 className="font-display text-2xl font-bold text-gray-800">
          {title}
        </h2>
        <p className="mt-2 text-gray-600">{description}</p>
      </div>

      {/* Custom Content (e.g., Theme Selection) */}
      {children}

      {/* Difficulty Selection */}
      <div className="card bg-white/95">
        <h3 className="font-display text-lg font-semibold text-gray-700 mb-3">
          Choose Difficulty
        </h3>
        <div className="grid grid-cols-3 gap-3">
          {difficultyOptions.map((option) => (
            <DifficultyButton
              key={option.value}
              option={option}
              selected={difficulty === option.value}
              onClick={() => onDifficultyChange(option.value)}
            />
          ))}
        </div>
      </div>

      {/* How to Play */}
      <div className={`card ${howToPlayColor}`}>
        <h3 className="font-display text-lg font-semibold text-gray-700 mb-2">
          How to Play
        </h3>
        <ul className="text-sm text-gray-600 space-y-1">
          {howToPlay.map((instruction, i) => (
            <li key={i}>• {instruction}</li>
          ))}
        </ul>
      </div>

      {/* Start Button */}
      <button
        onClick={onPlay}
        disabled={!hasEnergy || isLoading}
        className={`w-full py-4 rounded-2xl font-display text-xl font-bold transition-all ${
          hasEnergy && !isLoading
            ? "bg-gradient-to-r from-green-400 to-emerald-500 text-white hover:scale-105 active:scale-95 shadow-lg"
            : "bg-gray-300 text-gray-500 cursor-not-allowed"
        }`}
      >
        {isLoading ? (
          "Starting..."
        ) : hasEnergy ? (
          <span className="flex items-center justify-center gap-2">
            Play <EnergyIcon /> {energyCost}
          </span>
        ) : (
          "No Energy - Come Back Tomorrow!"
        )}
      </button>
    </div>
  );
}

// =============================================================================
// Theme Selector Component (for games like Memory Match)
// =============================================================================

export interface ThemeOption {
  value: string;
  label: string;
  color: string;
}

export interface ThemeSelectorProps {
  themes: ThemeOption[];
  selected: string;
  onChange: (value: string) => void;
}

export function ThemeSelector({
  themes,
  selected,
  onChange,
}: ThemeSelectorProps) {
  return (
    <div className="card bg-white/95">
      <h3 className="font-display text-lg font-semibold text-gray-700 mb-3">
        Choose Theme
      </h3>
      <div className="grid grid-cols-3 gap-3">
        {themes.map((theme) => (
          <button
            key={theme.value}
            onClick={() => onChange(theme.value)}
            className={`p-3 rounded-xl text-center transition-all ${
              selected === theme.value
                ? `bg-gradient-to-br ${theme.color} text-white scale-105 shadow-lg`
                : "bg-gray-100 hover:bg-gray-200"
            }`}
          >
            <div className="font-medium">{theme.label}</div>
          </button>
        ))}
      </div>
    </div>
  );
}

