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
import type { IconName } from "./Icons";

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

/** Star icon for difficulty indicator */
function StarIcon({ filled, className = "w-4 h-4" }: { filled: boolean; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2">
      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
    </svg>
  );
}

/** Renders 1-3 stars based on difficulty */
function DifficultyStars({ difficulty, selected }: { difficulty: Difficulty; selected: boolean }) {
  const starCount = difficulty === "easy" ? 1 : difficulty === "medium" ? 2 : 3;
  
  return (
    <div className="flex justify-center gap-0.5 mb-1">
      {Array.from({ length: 3 }).map((_, i) => (
        <StarIcon
          key={i}
          filled={i < starCount}
          className={`w-4 h-4 ${
            selected 
              ? i < starCount ? "text-yellow-300" : "text-white/30"
              : i < starCount ? "text-amber-400" : "text-gray-300"
          }`}
        />
      ))}
    </div>
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
      className={`px-2 py-2.5 rounded-xl text-center transition-all ${
        selected
          ? `bg-gradient-to-br ${option.color} text-white scale-105 shadow-lg`
          : "bg-gray-100 hover:bg-gray-200"
      }`}
    >
      <DifficultyStars difficulty={option.value} selected={selected} />
      <div className="font-display font-semibold text-sm">{option.label}</div>
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
  // Suppress unused variable warnings - these are kept for future use/flexibility
  void title;
  void icon;
  void themeColor;

  const hasEnergy = energy >= energyCost;

  return (
    <div className="space-y-4">
      {/* Game Description */}
      <div className="card text-center bg-white/95 py-4">
        <p className="text-gray-600">{description}</p>
      </div>

      {/* Custom Content (e.g., Theme Selection) */}
      {children}

      {/* Difficulty Selection */}
      <div className="card bg-white/95 py-4">
        <h3 className="font-display text-base font-semibold text-gray-700 mb-2">
          Choose Difficulty
        </h3>
        <div className="grid grid-cols-3 gap-2">
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
      <div className={`card py-4 ${howToPlayColor}`}>
        <h3 className="font-display text-base font-semibold text-gray-700 mb-2">
          How to Play
        </h3>
        <ul className="text-sm text-gray-600 space-y-0.5">
          {howToPlay.map((instruction, i) => (
            <li key={i}>• {instruction}</li>
          ))}
        </ul>
      </div>

      {/* Start Button */}
      <button
        onClick={onPlay}
        disabled={!hasEnergy || isLoading}
        className={`w-full py-3 rounded-2xl font-display text-lg font-bold transition-all ${
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
  /** Optional SVG icon component */
  icon?: React.ReactNode;
}

export interface ThemeSelectorProps {
  themes: ThemeOption[];
  selected: string;
  onChange: (value: string) => void;
  /** Title for the section (default: "Choose Theme") */
  title?: string;
}

export function ThemeSelector({
  themes,
  selected,
  onChange,
  title = "Choose Theme",
}: ThemeSelectorProps) {
  return (
    <div className="card bg-white/95">
      <h3 className="font-display text-lg font-semibold text-gray-700 mb-3">
        {title}
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
            {theme.icon && (
              <div className="flex justify-center mb-1">
                {theme.icon}
              </div>
            )}
            <div className="font-medium text-sm">{theme.label}</div>
          </button>
        ))}
      </div>
    </div>
  );
}

// =============================================================================
// Common Category/Theme Icons
// =============================================================================

/** Memory Match Theme Icons */
export const ThemeIcons = {
  // Animals
  animals: (
    <svg viewBox="0 0 24 24" className="w-6 h-6" fill="currentColor">
      <path d="M4.5 12c-1.5 0-2.5-1.5-2.5-3s1-3 2.5-3c.5 0 1 .5 1.5 1 .5-1.5 2-3 4-3s3.5 1.5 4 3c.5-.5 1-1 1.5-1 1.5 0 2.5 1.5 2.5 3s-1 3-2.5 3c-.5 0-1-.5-1.5-1-.5 1.5-2 3-4 3s-3.5-1.5-4-3c-.5.5-1 1-1.5 1z M8 14c0 .5.5 1 1 1s1-.5 1-1-.5-1-1-1-1 .5-1 1zm6 0c0 .5.5 1 1 1s1-.5 1-1-.5-1-1-1-1 .5-1 1zm-3 3c1 0 2-1 2-2h-4c0 1 1 2 2 2z"/>
    </svg>
  ),
  // Nature
  nature: (
    <svg viewBox="0 0 24 24" className="w-6 h-6" fill="currentColor">
      <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2zm0 18c-4.4 0-8-3.6-8-8 0-1.8.6-3.5 1.7-4.9l11.2 11.2c-1.4 1.1-3.1 1.7-4.9 1.7zm6.3-3.1L7.1 5.7C8.5 4.6 10.2 4 12 4c4.4 0 8 3.6 8 8 0 1.8-.6 3.5-1.7 4.9z"/>
      <circle cx="12" cy="12" r="3" fill="currentColor"/>
    </svg>
  ),
  // Food
  food: (
    <svg viewBox="0 0 24 24" className="w-6 h-6" fill="currentColor">
      <path d="M18 3c-1.5 0-3 .5-4 2-1-1.5-2.5-2-4-2-3 0-6 2.5-6 6 0 5 8 12 10 12s10-7 10-12c0-3.5-3-6-6-6z"/>
    </svg>
  ),
  // Transport
  transport: (
    <svg viewBox="0 0 24 24" className="w-6 h-6" fill="currentColor">
      <path d="M18.9 6c-.2-.6-.8-1-1.4-1H6.5c-.6 0-1.2.4-1.4 1L3 12v8c0 .6.4 1 1 1h1c.6 0 1-.4 1-1v-1h12v1c0 .6.4 1 1 1h1c.6 0 1-.4 1-1v-8l-2.1-6zM6.5 16c-.8 0-1.5-.7-1.5-1.5S5.7 13 6.5 13s1.5.7 1.5 1.5S7.3 16 6.5 16zm11 0c-.8 0-1.5-.7-1.5-1.5s.7-1.5 1.5-1.5 1.5.7 1.5 1.5-.7 1.5-1.5 1.5zM5 11l1.5-4.5h11L19 11H5z"/>
    </svg>
  ),
  // Objects
  objects: (
    <svg viewBox="0 0 24 24" className="w-6 h-6" fill="currentColor">
      <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
    </svg>
  ),
  // Fun
  fun: (
    <svg viewBox="0 0 24 24" className="w-6 h-6" fill="currentColor">
      <circle cx="12" cy="12" r="10"/>
      <path d="M8 14s1.5 2 4 2 4-2 4-2" stroke="white" strokeWidth="2" fill="none" strokeLinecap="round"/>
      <circle cx="9" cy="10" r="1.5" fill="white"/>
      <circle cx="15" cy="10" r="1.5" fill="white"/>
    </svg>
  ),
  // Mixed
  mixed: (
    <svg viewBox="0 0 24 24" className="w-6 h-6" fill="currentColor">
      <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM9 17H7v-7h2v7zm4 0h-2V7h2v10zm4 0h-2v-4h2v4z"/>
    </svg>
  ),
};

/** Math Quest Category Icons - Using fixed colors that work on both light and gradient backgrounds */
export const MathCategoryIcons = {
  // Mix - dice/random (purple dice)
  mix: (
    <svg viewBox="0 0 24 24" className="w-6 h-6">
      <rect x="2" y="2" width="20" height="20" rx="3" fill="#a855f7" />
      <circle cx="7" cy="7" r="1.5" fill="white"/>
      <circle cx="12" cy="12" r="1.5" fill="white"/>
      <circle cx="17" cy="17" r="1.5" fill="white"/>
      <circle cx="17" cy="7" r="1.5" fill="white"/>
      <circle cx="7" cy="17" r="1.5" fill="white"/>
    </svg>
  ),
  // Quiz - question mark (blue circle)
  quiz: (
    <svg viewBox="0 0 24 24" className="w-6 h-6">
      <circle cx="12" cy="12" r="10" fill="#3b82f6"/>
      <text x="12" y="17" textAnchor="middle" fontSize="14" fill="white" fontWeight="bold">?</text>
    </svg>
  ),
  // Compare - balance scale (purple)
  compare: (
    <svg viewBox="0 0 24 24" className="w-6 h-6">
      <path d="M12 2v20" stroke="#8b5cf6" strokeWidth="2"/>
      <path d="M4 7l8-3 8 3" stroke="#8b5cf6" strokeWidth="2" fill="none"/>
      <ellipse cx="6" cy="10" rx="4" ry="2" fill="#c4b5fd"/>
      <ellipse cx="18" cy="10" rx="4" ry="2" fill="#c4b5fd"/>
      <text x="6" y="19" textAnchor="middle" fontSize="10" fill="#7c3aed" fontWeight="bold">&lt;</text>
      <text x="18" y="19" textAnchor="middle" fontSize="10" fill="#7c3aed" fontWeight="bold">&gt;</text>
    </svg>
  ),
  // Fill Blank - input box with underscore (orange)
  fillBlank: (
    <svg viewBox="0 0 24 24" className="w-6 h-6">
      <rect x="3" y="6" width="18" height="12" rx="2" fill="#fed7aa" stroke="#f97316" strokeWidth="2"/>
      <path d="M7 13h5" stroke="#ea580c" strokeWidth="3" strokeLinecap="round"/>
      <text x="16" y="14" fontSize="8" fill="#ea580c" fontWeight="bold">=</text>
    </svg>
  ),
  // Sort - ascending bars (green)
  sort: (
    <svg viewBox="0 0 24 24" className="w-6 h-6">
      <rect x="4" y="14" width="4" height="7" rx="1" fill="#22c55e"/>
      <rect x="10" y="10" width="4" height="11" rx="1" fill="#16a34a"/>
      <rect x="16" y="6" width="4" height="15" rx="1" fill="#15803d"/>
      <path d="M12 1l3 3h-2v2h-2V4H9l3-3z" fill="#22c55e"/>
    </svg>
  ),
  // Chain - linked operations (red/coral)
  chain: (
    <svg viewBox="0 0 24 24" className="w-6 h-6">
      <circle cx="5" cy="12" r="4" fill="#f87171"/>
      <circle cx="12" cy="12" r="4" fill="#ef4444"/>
      <circle cx="19" cy="12" r="4" fill="#dc2626"/>
      <path d="M9 12h-1M14 12h1" stroke="#fca5a5" strokeWidth="2"/>
      <text x="5" y="14" textAnchor="middle" fontSize="7" fill="white" fontWeight="bold">+</text>
      <text x="12" y="14" textAnchor="middle" fontSize="7" fill="white" fontWeight="bold">−</text>
      <text x="19" y="14" textAnchor="middle" fontSize="7" fill="white" fontWeight="bold">=</text>
    </svg>
  ),
};

