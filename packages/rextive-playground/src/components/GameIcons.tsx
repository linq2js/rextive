import React from "react";

// Game Icons organized by category
export type GameIconName = 
  // Animals (30)
  | "cat" | "dog" | "rabbit" | "bear" | "mouse" | "elephant" | "lion" | "tiger"
  | "monkey" | "penguin" | "owl" | "fish" | "whale" | "dolphin" | "turtle" | "frog"
  | "bird" | "butterfly" | "bee" | "duck" | "pig" | "cow" | "zebra" | "sheep"
  | "snake" | "spider" | "giraffe" | "chicken" | "ladybug"
  // Food (20)
  | "apple" | "banana" | "pizza" | "cake" | "candy" | "ice-cream" | "cookie"
  | "bread" | "carrot" | "grape" | "orange" | "strawberry" | "watermelon" | "cheese" | "egg"
  | "corn" | "milk" | "soda" | "fries" | "donut" | "burger"
  // Nature (15)
  | "sun" | "moon" | "star" | "cloud" | "rainbow" | "flower" | "tree" | "leaf"
  | "mountain" | "water" | "fire" | "snowflake" | "lightning" | "rain" | "wind"
  | "snow" | "river" | "ocean"
  // Transport (10)
  | "car" | "train" | "plane" | "boat" | "rocket" | "bus" | "bike" | "ship" | "truck" | "helicopter"
  // Objects (25)
  | "hat" | "cup" | "house" | "ball" | "gift" | "heart" | "crown" | "key" | "bell" | "clock" | "book"
  | "pencil" | "scissors" | "umbrella" | "balloon" | "bed" | "shoe" | "lock" | "chair" | "table"
  | "watch" | "shirt" | "pants" | "glasses"
  // Body & People (10)
  | "hand" | "foot" | "eye" | "ear" | "nose" | "smile" | "baby" | "king" | "queen" | "robot" | "mouth"
  // Music & Fun (10)
  | "music" | "drum" | "guitar" | "piano" | "dice" | "puzzle" | "kite" | "teddy" | "yo-yo" | "top"
  // Tech & Tools (10)
  | "computer" | "phone" | "camera" | "lamp" | "hammer" | "wrench" | "magnet" | "battery" | "bulb" | "gear"
  // Generic fallback
  | "generic";

export const GameIcons: Record<GameIconName, React.FC<React.SVGProps<SVGSVGElement>>> = {
  // ============================================
  // ANIMALS (20)
  // ============================================
  cat: (props) => (
    <svg viewBox="0 0 64 64" {...props}>
      <circle cx="32" cy="36" r="20" fill="#f59e0b" />
      <polygon points="16,20 22,36 10,30" fill="#f59e0b" />
      <polygon points="48,20 42,36 54,30" fill="#f59e0b" />
      <circle cx="24" cy="32" r="4" fill="#1f2937" />
      <circle cx="40" cy="32" r="4" fill="#1f2937" />
      <ellipse cx="32" cy="42" rx="4" ry="3" fill="#f472b6" />
    </svg>
  ),
  dog: (props) => (
    <svg viewBox="0 0 64 64" {...props}>
      <ellipse cx="32" cy="38" rx="18" ry="16" fill="#92400e" />
      <ellipse cx="14" cy="28" rx="8" ry="12" fill="#78350f" />
      <ellipse cx="50" cy="28" rx="8" ry="12" fill="#78350f" />
      <circle cx="24" cy="34" r="4" fill="#1f2937" />
      <circle cx="40" cy="34" r="4" fill="#1f2937" />
      <ellipse cx="32" cy="44" rx="6" ry="4" fill="#1f2937" />
    </svg>
  ),
  rabbit: (props) => (
    <svg viewBox="0 0 64 64" {...props}>
      <ellipse cx="22" cy="16" rx="6" ry="18" fill="#fecaca" />
      <ellipse cx="42" cy="16" rx="6" ry="18" fill="#fecaca" />
      <ellipse cx="32" cy="42" rx="16" ry="14" fill="#fecaca" />
      <circle cx="26" cy="38" r="3" fill="#1f2937" />
      <circle cx="38" cy="38" r="3" fill="#1f2937" />
      <ellipse cx="32" cy="46" rx="3" ry="2" fill="#f472b6" />
    </svg>
  ),
  bear: (props) => (
    <svg viewBox="0 0 64 64" {...props}>
      <circle cx="14" cy="20" r="8" fill="#78350f" />
      <circle cx="50" cy="20" r="8" fill="#78350f" />
      <circle cx="32" cy="36" r="20" fill="#78350f" />
      <ellipse cx="32" cy="42" rx="8" ry="6" fill="#d97706" />
      <circle cx="24" cy="32" r="3" fill="#1f2937" />
      <circle cx="40" cy="32" r="3" fill="#1f2937" />
    </svg>
  ),
  mouse: (props) => (
    <svg viewBox="0 0 64 64" {...props}>
      <ellipse cx="32" cy="38" rx="16" ry="14" fill="#9ca3af" />
      <circle cx="18" cy="24" r="10" fill="#9ca3af" />
      <circle cx="46" cy="24" r="10" fill="#9ca3af" />
      <circle cx="26" cy="36" r="2" fill="#1f2937" />
      <circle cx="38" cy="36" r="2" fill="#1f2937" />
      <ellipse cx="32" cy="42" rx="3" ry="2" fill="#f472b6" />
    </svg>
  ),
  elephant: (props) => (
    <svg viewBox="0 0 64 64" {...props}>
      <circle cx="32" cy="32" r="20" fill="#6b7280" />
      <ellipse cx="14" cy="28" rx="8" ry="10" fill="#6b7280" />
      <ellipse cx="50" cy="28" rx="8" ry="10" fill="#6b7280" />
      <path d="M32 40 Q28 56 24 56 Q20 56 24 40" fill="#6b7280" stroke="#4b5563" strokeWidth="2" />
      <circle cx="24" cy="28" r="3" fill="#1f2937" />
      <circle cx="40" cy="28" r="3" fill="#1f2937" />
    </svg>
  ),
  lion: (props) => (
    <svg viewBox="0 0 64 64" {...props}>
      <circle cx="32" cy="32" r="24" fill="#f59e0b" />
      <circle cx="32" cy="36" r="16" fill="#fbbf24" />
      <circle cx="26" cy="32" r="3" fill="#1f2937" />
      <circle cx="38" cy="32" r="3" fill="#1f2937" />
      <ellipse cx="32" cy="40" rx="4" ry="3" fill="#1f2937" />
    </svg>
  ),
  tiger: (props) => (
    <svg viewBox="0 0 64 64" {...props}>
      <circle cx="32" cy="36" r="18" fill="#f97316" />
      <path d="M20 28 L24 36 M28 26 L30 34 M34 26 L34 34 M40 28 L36 36 M44 30 L40 36" stroke="#1f2937" strokeWidth="3" />
      <circle cx="26" cy="34" r="3" fill="#1f2937" />
      <circle cx="38" cy="34" r="3" fill="#1f2937" />
      <ellipse cx="32" cy="42" rx="4" ry="2" fill="#f472b6" />
    </svg>
  ),
  monkey: (props) => (
    <svg viewBox="0 0 64 64" {...props}>
      <circle cx="32" cy="36" r="18" fill="#92400e" />
      <circle cx="12" cy="32" r="8" fill="#d4a574" />
      <circle cx="52" cy="32" r="8" fill="#d4a574" />
      <ellipse cx="32" cy="40" rx="10" ry="8" fill="#d4a574" />
      <circle cx="26" cy="32" r="3" fill="#1f2937" />
      <circle cx="38" cy="32" r="3" fill="#1f2937" />
    </svg>
  ),
  penguin: (props) => (
    <svg viewBox="0 0 64 64" {...props}>
      <ellipse cx="32" cy="36" rx="16" ry="20" fill="#1f2937" />
      <ellipse cx="32" cy="40" rx="10" ry="14" fill="#f3f4f6" />
      <circle cx="26" cy="28" r="3" fill="#f3f4f6" />
      <circle cx="38" cy="28" r="3" fill="#f3f4f6" />
      <circle cx="26" cy="28" r="2" fill="#1f2937" />
      <circle cx="38" cy="28" r="2" fill="#1f2937" />
      <path d="M32 36 L28 40 L36 40 Z" fill="#f97316" />
    </svg>
  ),
  owl: (props) => (
    <svg viewBox="0 0 64 64" {...props}>
      <ellipse cx="32" cy="36" rx="18" ry="20" fill="#92400e" />
      <circle cx="24" cy="30" r="8" fill="#fef3c7" />
      <circle cx="40" cy="30" r="8" fill="#fef3c7" />
      <circle cx="24" cy="30" r="4" fill="#1f2937" />
      <circle cx="40" cy="30" r="4" fill="#1f2937" />
      <path d="M32 38 L28 44 L36 44 Z" fill="#f97316" />
      <path d="M20 16 L24 26 M44 16 L40 26" stroke="#92400e" strokeWidth="4" />
    </svg>
  ),
  fish: (props) => (
    <svg viewBox="0 0 64 64" {...props}>
      <ellipse cx="32" cy="32" rx="20" ry="14" fill="#3b82f6" />
      <path d="M52 32 L64 20 L64 44 Z" fill="#3b82f6" />
      <circle cx="20" cy="28" r="4" fill="#1f2937" />
      <path d="M28 36 Q32 40 36 36" stroke="#1d4ed8" strokeWidth="2" fill="none" />
    </svg>
  ),
  whale: (props) => (
    <svg viewBox="0 0 64 64" {...props}>
      <ellipse cx="32" cy="36" rx="24" ry="16" fill="#60a5fa" />
      <path d="M56 36 Q60 24 56 20" stroke="#60a5fa" strokeWidth="4" fill="none" />
      <ellipse cx="32" cy="42" rx="12" ry="6" fill="#bfdbfe" />
      <circle cx="18" cy="32" r="3" fill="#1f2937" />
      <path d="M32 12 Q28 4 32 4 Q36 4 32 12" fill="#93c5fd" />
    </svg>
  ),
  dolphin: (props) => (
    <svg viewBox="0 0 64 64" {...props}>
      <path d="M8 32 Q16 20 40 24 Q56 28 56 36 Q56 44 40 44 Q16 44 8 32" fill="#6b7280" />
      <path d="M40 20 L44 8 L48 20" fill="#6b7280" />
      <circle cx="16" cy="32" r="2" fill="#1f2937" />
      <path d="M4 32 L8 28 L8 36 Z" fill="#6b7280" />
    </svg>
  ),
  turtle: (props) => (
    <svg viewBox="0 0 64 64" {...props}>
      <ellipse cx="32" cy="36" rx="20" ry="14" fill="#22c55e" />
      <circle cx="32" cy="36" r="12" fill="#16a34a" />
      <ellipse cx="14" cy="44" rx="6" ry="4" fill="#22c55e" />
      <ellipse cx="50" cy="44" rx="6" ry="4" fill="#22c55e" />
      <circle cx="32" cy="20" r="8" fill="#22c55e" />
      <circle cx="30" cy="18" r="2" fill="#1f2937" />
      <circle cx="34" cy="18" r="2" fill="#1f2937" />
    </svg>
  ),
  frog: (props) => (
    <svg viewBox="0 0 64 64" {...props}>
      <ellipse cx="32" cy="40" rx="20" ry="14" fill="#22c55e" />
      <circle cx="20" cy="24" r="10" fill="#22c55e" />
      <circle cx="44" cy="24" r="10" fill="#22c55e" />
      <circle cx="20" cy="24" r="5" fill="#f3f4f6" />
      <circle cx="44" cy="24" r="5" fill="#f3f4f6" />
      <circle cx="20" cy="24" r="3" fill="#1f2937" />
      <circle cx="44" cy="24" r="3" fill="#1f2937" />
      <path d="M26 44 Q32 48 38 44" stroke="#16a34a" strokeWidth="2" fill="none" />
    </svg>
  ),
  bird: (props) => (
    <svg viewBox="0 0 64 64" {...props}>
      <ellipse cx="32" cy="36" rx="16" ry="12" fill="#ef4444" />
      <circle cx="40" cy="28" r="10" fill="#ef4444" />
      <circle cx="44" cy="26" r="3" fill="#1f2937" />
      <path d="M50 28 L58 26 L58 30 Z" fill="#f97316" />
      <path d="M16 40 L8 48 L16 48 Z" fill="#ef4444" />
      <path d="M24 48 L32 56 L40 48" fill="#ef4444" />
    </svg>
  ),
  butterfly: (props) => (
    <svg viewBox="0 0 64 64" {...props}>
      <ellipse cx="20" cy="24" rx="14" ry="12" fill="#ec4899" />
      <ellipse cx="44" cy="24" rx="14" ry="12" fill="#ec4899" />
      <ellipse cx="20" cy="44" rx="10" ry="8" fill="#f472b6" />
      <ellipse cx="44" cy="44" rx="10" ry="8" fill="#f472b6" />
      <rect x="30" y="16" width="4" height="40" rx="2" fill="#1f2937" />
      <path d="M30 16 Q24 8 28 8 M34 16 Q40 8 36 8" stroke="#1f2937" strokeWidth="2" />
    </svg>
  ),
  bee: (props) => (
    <svg viewBox="0 0 64 64" {...props}>
      <ellipse cx="32" cy="36" rx="16" ry="12" fill="#fbbf24" />
      <path d="M20 32 h24 M20 40 h24" stroke="#1f2937" strokeWidth="4" />
      <circle cx="44" cy="36" r="8" fill="#fbbf24" />
      <circle cx="48" cy="34" r="2" fill="#1f2937" />
      <ellipse cx="24" cy="24" rx="8" ry="4" fill="#bfdbfe" style={{opacity:0.7}} />
      <ellipse cx="40" cy="24" rx="8" ry="4" fill="#bfdbfe" style={{opacity:0.7}} />
    </svg>
  ),
  duck: (props) => (
    <svg viewBox="0 0 64 64" {...props}>
      <ellipse cx="32" cy="44" rx="18" ry="12" fill="#fbbf24" />
      <circle cx="40" cy="28" r="12" fill="#fbbf24" />
      <circle cx="44" cy="24" r="3" fill="#1f2937" />
      <path d="M48 30 L58 28 L58 34 L48 32" fill="#f97316" />
    </svg>
  ),
  pig: (props) => (
    <svg viewBox="0 0 64 64" {...props}>
      <circle cx="32" cy="36" r="20" fill="#fda4af" />
      <circle cx="18" cy="24" r="8" fill="#fda4af" />
      <circle cx="46" cy="24" r="8" fill="#fda4af" />
      <ellipse cx="32" cy="42" rx="10" ry="8" fill="#fb7185" />
      <circle cx="28" cy="40" r="3" fill="#1f2937" />
      <circle cx="36" cy="40" r="3" fill="#1f2937" />
      <circle cx="24" cy="32" r="3" fill="#1f2937" />
      <circle cx="40" cy="32" r="3" fill="#1f2937" />
    </svg>
  ),
  cow: (props) => (
    <svg viewBox="0 0 64 64" {...props}>
      <ellipse cx="32" cy="40" rx="20" ry="16" fill="#f3f4f6" />
      <circle cx="20" cy="20" r="8" fill="#f3f4f6" />
      <circle cx="44" cy="20" r="8" fill="#f3f4f6" />
      <ellipse cx="32" cy="48" rx="8" ry="6" fill="#fda4af" />
      <circle cx="24" cy="36" r="3" fill="#1f2937" />
      <circle cx="40" cy="36" r="3" fill="#1f2937" />
      <ellipse cx="24" cy="44" rx="6" ry="4" fill="#1f2937" />
    </svg>
  ),
  zebra: (props) => (
    <svg viewBox="0 0 64 64" {...props}>
      <ellipse cx="32" cy="40" rx="18" ry="14" fill="#f3f4f6" />
      <path d="M18 32 L22 44 M26 28 L28 42 M34 26 L34 40 M42 28 L40 42 M46 32 L42 44" stroke="#1f2937" strokeWidth="3" />
      <ellipse cx="40" cy="28" rx="12" ry="10" fill="#f3f4f6" />
      <circle cx="44" cy="26" r="2" fill="#1f2937" />
    </svg>
  ),
  sheep: (props) => (
    <svg viewBox="0 0 64 64" {...props}>
      <circle cx="20" cy="36" r="10" fill="#f3f4f6" />
      <circle cx="44" cy="36" r="10" fill="#f3f4f6" />
      <circle cx="32" cy="28" r="12" fill="#f3f4f6" />
      <circle cx="32" cy="44" r="10" fill="#f3f4f6" />
      <circle cx="32" cy="36" r="8" fill="#1f2937" />
      <circle cx="28" cy="34" r="2" fill="#f3f4f6" />
      <circle cx="36" cy="34" r="2" fill="#f3f4f6" />
    </svg>
  ),
  snake: (props) => (
    <svg viewBox="0 0 64 64" {...props}>
      <path d="M12 48 Q20 32 32 40 Q44 48 52 32 Q56 24 52 20" fill="none" stroke="#22c55e" strokeWidth="8" strokeLinecap="round" />
      <circle cx="52" cy="20" r="6" fill="#22c55e" />
      <circle cx="50" cy="18" r="2" fill="#1f2937" />
      <path d="M56 22 L60 20 L60 24" fill="#ef4444" />
    </svg>
  ),
  spider: (props) => (
    <svg viewBox="0 0 64 64" {...props}>
      <ellipse cx="32" cy="36" rx="12" ry="10" fill="#1f2937" />
      <circle cx="32" cy="24" r="8" fill="#1f2937" />
      <path d="M20 36 L8 28 M20 40 L8 44 M20 44 L8 52 M44 36 L56 28 M44 40 L56 44 M44 44 L56 52" stroke="#1f2937" strokeWidth="3" />
      <circle cx="28" cy="22" r="3" fill="#ef4444" />
      <circle cx="36" cy="22" r="3" fill="#ef4444" />
    </svg>
  ),
  giraffe: (props) => (
    <svg viewBox="0 0 64 64" {...props}>
      <ellipse cx="32" cy="52" rx="16" ry="8" fill="#fbbf24" />
      <rect x="28" y="24" width="8" height="28" fill="#fbbf24" />
      <circle cx="32" cy="16" r="10" fill="#fbbf24" />
      <circle cx="28" cy="14" r="2" fill="#1f2937" />
      <circle cx="36" cy="14" r="2" fill="#1f2937" />
      <circle cx="24" cy="36" r="3" fill="#92400e" />
      <circle cx="36" cy="40" r="3" fill="#92400e" />
    </svg>
  ),
  chicken: (props) => (
    <svg viewBox="0 0 64 64" {...props}>
      <ellipse cx="32" cy="44" rx="16" ry="12" fill="#fef3c7" />
      <circle cx="32" cy="28" r="12" fill="#fef3c7" />
      <path d="M32 16 L28 8 L32 12 L36 8 Z" fill="#ef4444" />
      <circle cx="28" cy="26" r="2" fill="#1f2937" />
      <circle cx="36" cy="26" r="2" fill="#1f2937" />
      <path d="M32 32 L28 36 L36 36 Z" fill="#f97316" />
    </svg>
  ),
  ladybug: (props) => (
    <svg viewBox="0 0 64 64" {...props}>
      <ellipse cx="32" cy="36" rx="20" ry="16" fill="#ef4444" />
      <path d="M32 20 L32 52" stroke="#1f2937" strokeWidth="2" />
      <circle cx="24" cy="28" r="4" fill="#1f2937" />
      <circle cx="40" cy="28" r="4" fill="#1f2937" />
      <circle cx="20" cy="40" r="4" fill="#1f2937" />
      <circle cx="44" cy="40" r="4" fill="#1f2937" />
      <circle cx="32" cy="20" r="8" fill="#1f2937" />
    </svg>
  ),

  // ============================================
  // FOOD (20)
  // ============================================
  apple: (props) => (
    <svg viewBox="0 0 64 64" {...props}>
      <circle cx="32" cy="38" r="20" fill="#ef4444" />
      <path d="M32 18 Q38 10 42 14" stroke="#78350f" strokeWidth="3" fill="none" />
      <ellipse cx="42" cy="14" rx="6" ry="4" fill="#22c55e" />
    </svg>
  ),
  banana: (props) => (
    <svg viewBox="0 0 64 64" {...props}>
      <path d="M16 52 Q4 32 24 12 Q36 20 48 36 Q44 48 16 52" fill="#fbbf24" />
      <path d="M24 12 Q30 6 36 8" stroke="#78350f" strokeWidth="3" fill="none" />
    </svg>
  ),
  pizza: (props) => (
    <svg viewBox="0 0 64 64" {...props}>
      <path d="M4 12 L60 12 L32 56 Z" fill="#fcd34d" stroke="#d97706" strokeWidth="2" />
      <rect x="4" y="8" width="56" height="8" rx="4" fill="#d97706" />
      <circle cx="24" cy="28" r="5" fill="#ef4444" />
      <circle cx="40" cy="28" r="5" fill="#ef4444" />
      <circle cx="32" cy="40" r="5" fill="#ef4444" />
    </svg>
  ),
  cake: (props) => (
    <svg viewBox="0 0 64 64" {...props}>
      <rect x="8" y="28" width="48" height="28" rx="4" fill="#fecaca" />
      <rect x="8" y="28" width="48" height="8" fill="#f472b6" />
      <rect x="28" y="12" width="8" height="16" fill="#fbbf24" />
      <ellipse cx="32" cy="8" rx="4" ry="6" fill="#f97316" />
    </svg>
  ),
  candy: (props) => (
    <svg viewBox="0 0 64 64" {...props}>
      <circle cx="32" cy="32" r="16" fill="#ec4899" />
      <path d="M16 32 L4 24 M16 32 L4 40" stroke="#f472b6" strokeWidth="4" />
      <path d="M48 32 L60 24 M48 32 L60 40" stroke="#f472b6" strokeWidth="4" />
      <path d="M20 24 Q32 32 44 24 M20 40 Q32 32 44 40" stroke="#fce7f3" strokeWidth="3" fill="none" />
    </svg>
  ),
  "ice-cream": (props) => (
    <svg viewBox="0 0 64 64" {...props}>
      <path d="M20 32 L32 60 L44 32" fill="#d97706" />
      <circle cx="32" cy="24" r="14" fill="#fecdd3" />
      <circle cx="24" cy="18" r="8" fill="#fda4af" />
      <circle cx="40" cy="20" r="6" fill="#fda4af" />
    </svg>
  ),
  cookie: (props) => (
    <svg viewBox="0 0 64 64" {...props}>
      <circle cx="32" cy="32" r="22" fill="#d97706" />
      <circle cx="24" cy="24" r="4" fill="#78350f" />
      <circle cx="40" cy="28" r="4" fill="#78350f" />
      <circle cx="28" cy="40" r="4" fill="#78350f" />
      <circle cx="42" cy="42" r="3" fill="#78350f" />
    </svg>
  ),
  bread: (props) => (
    <svg viewBox="0 0 64 64" {...props}>
      <path d="M8 40 Q8 24 32 24 Q56 24 56 40 L56 52 L8 52 Z" fill="#f59e0b" />
      <path d="M12 40 Q12 28 32 28 Q52 28 52 40" fill="#fbbf24" />
    </svg>
  ),
  carrot: (props) => (
    <svg viewBox="0 0 64 64" {...props}>
      <path d="M32 8 L44 56 L20 56 Z" fill="#f97316" />
      <path d="M28 8 Q32 4 36 8 M24 12 Q28 8 32 12 M36 12 Q40 8 44 12" fill="#22c55e" stroke="#22c55e" strokeWidth="2" />
    </svg>
  ),
  grape: (props) => (
    <svg viewBox="0 0 64 64" {...props}>
      <circle cx="24" cy="28" r="8" fill="#8b5cf6" />
      <circle cx="40" cy="28" r="8" fill="#8b5cf6" />
      <circle cx="32" cy="36" r="8" fill="#8b5cf6" />
      <circle cx="24" cy="44" r="8" fill="#8b5cf6" />
      <circle cx="40" cy="44" r="8" fill="#8b5cf6" />
      <circle cx="32" cy="52" r="8" fill="#8b5cf6" />
      <path d="M32 20 Q36 12 40 16" stroke="#78350f" strokeWidth="2" fill="none" />
    </svg>
  ),
  orange: (props) => (
    <svg viewBox="0 0 64 64" {...props}>
      <circle cx="32" cy="36" r="20" fill="#f97316" />
      <ellipse cx="32" cy="14" rx="4" ry="3" fill="#22c55e" />
    </svg>
  ),
  strawberry: (props) => (
    <svg viewBox="0 0 64 64" {...props}>
      <path d="M32 12 Q48 24 48 44 Q48 56 32 56 Q16 56 16 44 Q16 24 32 12" fill="#ef4444" />
      <path d="M28 8 L32 12 L36 8 M24 12 L28 16 M40 12 L36 16" stroke="#22c55e" strokeWidth="3" />
      <circle cx="24" cy="32" r="2" fill="#fbbf24" />
      <circle cx="32" cy="28" r="2" fill="#fbbf24" />
      <circle cx="40" cy="32" r="2" fill="#fbbf24" />
      <circle cx="28" cy="44" r="2" fill="#fbbf24" />
      <circle cx="36" cy="44" r="2" fill="#fbbf24" />
    </svg>
  ),
  watermelon: (props) => (
    <svg viewBox="0 0 64 64" {...props}>
      <path d="M8 40 A24 24 0 0 1 56 40 L56 44 L8 44 Z" fill="#22c55e" />
      <path d="M12 40 A20 20 0 0 1 52 40" fill="#ef4444" />
      <circle cx="24" cy="36" r="2" fill="#1f2937" />
      <circle cx="32" cy="34" r="2" fill="#1f2937" />
      <circle cx="40" cy="36" r="2" fill="#1f2937" />
    </svg>
  ),
  cheese: (props) => (
    <svg viewBox="0 0 64 64" {...props}>
      <path d="M4 48 L32 12 L60 48 Z" fill="#fbbf24" />
      <circle cx="20" cy="40" r="4" fill="#fcd34d" />
      <circle cx="36" cy="36" r="5" fill="#fcd34d" />
      <circle cx="48" cy="44" r="3" fill="#fcd34d" />
    </svg>
  ),
  egg: (props) => (
    <svg viewBox="0 0 64 64" {...props}>
      <path d="M32 8 Q48 24 48 40 Q48 56 32 56 Q16 56 16 40 Q16 24 32 8" fill="#fef3c7" stroke="#fcd34d" strokeWidth="2" />
    </svg>
  ),
  corn: (props) => (
    <svg viewBox="0 0 64 64" {...props}>
      <ellipse cx="32" cy="36" rx="12" ry="20" fill="#fbbf24" />
      <path d="M24 20 L20 8 M32 16 L32 4 M40 20 L44 8" stroke="#22c55e" strokeWidth="3" />
      <path d="M24 28 h16 M24 36 h16 M24 44 h16" stroke="#f59e0b" strokeWidth="2" />
    </svg>
  ),
  milk: (props) => (
    <svg viewBox="0 0 64 64" {...props}>
      <rect x="20" y="20" width="24" height="36" rx="4" fill="#f3f4f6" />
      <rect x="16" y="12" width="32" height="12" rx="2" fill="#3b82f6" />
      <rect x="24" y="28" width="16" height="20" fill="#bfdbfe" />
    </svg>
  ),
  soda: (props) => (
    <svg viewBox="0 0 64 64" {...props}>
      <rect x="20" y="16" width="24" height="40" rx="4" fill="#ef4444" />
      <rect x="20" y="24" width="24" height="8" fill="#f3f4f6" />
      <circle cx="32" cy="8" r="4" fill="#6b7280" />
      <rect x="30" y="8" width="4" height="8" fill="#6b7280" />
    </svg>
  ),
  fries: (props) => (
    <svg viewBox="0 0 64 64" {...props}>
      <path d="M16 24 L20 56 H44 L48 24" fill="#ef4444" />
      <rect x="22" y="12" width="4" height="32" rx="2" fill="#fbbf24" />
      <rect x="28" y="8" width="4" height="36" rx="2" fill="#fbbf24" />
      <rect x="34" y="12" width="4" height="32" rx="2" fill="#fbbf24" />
      <rect x="40" y="16" width="4" height="28" rx="2" fill="#fbbf24" />
    </svg>
  ),
  donut: (props) => (
    <svg viewBox="0 0 64 64" {...props}>
      <circle cx="32" cy="32" r="20" fill="#f472b6" />
      <circle cx="32" cy="32" r="8" fill="#fef3c7" />
      <circle cx="24" cy="24" r="3" fill="#fbbf24" />
      <circle cx="40" cy="28" r="3" fill="#22c55e" />
      <circle cx="36" cy="40" r="3" fill="#3b82f6" />
    </svg>
  ),
  burger: (props) => (
    <svg viewBox="0 0 64 64" {...props}>
      <path d="M12 28 Q12 16 32 16 Q52 16 52 28" fill="#f59e0b" />
      <rect x="12" y="28" width="40" height="6" fill="#22c55e" />
      <rect x="12" y="34" width="40" height="6" fill="#ef4444" />
      <rect x="12" y="40" width="40" height="6" fill="#fbbf24" />
      <path d="M12 46 Q12 52 32 52 Q52 52 52 46" fill="#f59e0b" />
    </svg>
  ),

  // ============================================
  // NATURE (15)
  // ============================================
  sun: (props) => (
    <svg viewBox="0 0 64 64" {...props}>
      <circle cx="32" cy="32" r="14" fill="#fbbf24" />
      <path d="M32 4V14 M32 50V60 M4 32H14 M50 32H60 M11 11L18 18 M46 46L53 53 M11 53L18 46 M46 18L53 11" stroke="#fbbf24" strokeWidth="4" strokeLinecap="round" />
    </svg>
  ),
  moon: (props) => (
    <svg viewBox="0 0 64 64" {...props}>
      <path d="M40 8 A24 24 0 1 0 40 56 A18 18 0 1 1 40 8" fill="#fef08a" />
    </svg>
  ),
  star: (props) => (
    <svg viewBox="0 0 64 64" {...props}>
      <path d="M32 4 L38 24 L60 24 L42 38 L48 58 L32 46 L16 58 L22 38 L4 24 L26 24 Z" fill="#fbbf24" />
    </svg>
  ),
  cloud: (props) => (
    <svg viewBox="0 0 64 64" {...props}>
      <circle cx="20" cy="36" r="12" fill="#e5e7eb" />
      <circle cx="36" cy="32" r="16" fill="#e5e7eb" />
      <circle cx="50" cy="38" r="10" fill="#e5e7eb" />
      <rect x="8" y="36" width="48" height="12" fill="#e5e7eb" />
    </svg>
  ),
  rainbow: (props) => (
    <svg viewBox="0 0 64 64" {...props}>
      <path d="M4 56 A28 28 0 0 1 60 56" fill="none" stroke="#ef4444" strokeWidth="4" />
      <path d="M8 56 A24 24 0 0 1 56 56" fill="none" stroke="#f97316" strokeWidth="4" />
      <path d="M12 56 A20 20 0 0 1 52 56" fill="none" stroke="#fbbf24" strokeWidth="4" />
      <path d="M16 56 A16 16 0 0 1 48 56" fill="none" stroke="#22c55e" strokeWidth="4" />
      <path d="M20 56 A12 12 0 0 1 44 56" fill="none" stroke="#3b82f6" strokeWidth="4" />
      <path d="M24 56 A8 8 0 0 1 40 56" fill="none" stroke="#8b5cf6" strokeWidth="4" />
    </svg>
  ),
  flower: (props) => (
    <svg viewBox="0 0 64 64" {...props}>
      <circle cx="32" cy="20" r="10" fill="#f472b6" />
      <circle cx="20" cy="32" r="10" fill="#f472b6" />
      <circle cx="44" cy="32" r="10" fill="#f472b6" />
      <circle cx="24" cy="44" r="10" fill="#f472b6" />
      <circle cx="40" cy="44" r="10" fill="#f472b6" />
      <circle cx="32" cy="32" r="8" fill="#fbbf24" />
      <rect x="30" y="44" width="4" height="16" fill="#22c55e" />
    </svg>
  ),
  tree: (props) => (
    <svg viewBox="0 0 64 64" {...props}>
      <rect x="28" y="44" width="8" height="16" fill="#78350f" />
      <path d="M32 4 L52 44 L12 44 Z" fill="#22c55e" />
    </svg>
  ),
  leaf: (props) => (
    <svg viewBox="0 0 64 64" {...props}>
      <path d="M32 8 Q56 16 56 40 Q56 56 32 56 Q8 56 8 40 Q8 16 32 8" fill="#22c55e" />
      <path d="M32 56 L32 24 M32 32 L24 24 M32 40 L40 32" stroke="#16a34a" strokeWidth="3" fill="none" />
    </svg>
  ),
  mountain: (props) => (
    <svg viewBox="0 0 64 64" {...props}>
      <path d="M4 56 L24 20 L36 36 L44 24 L60 56 Z" fill="#6b7280" />
      <path d="M24 20 L28 28 L20 28 Z" fill="#f3f4f6" />
      <path d="M44 24 L48 32 L40 32 Z" fill="#f3f4f6" />
    </svg>
  ),
  water: (props) => (
    <svg viewBox="0 0 64 64" {...props}>
      <path d="M32 4 Q52 28 52 40 A20 20 0 0 1 12 40 Q12 28 32 4" fill="#3b82f6" />
      <path d="M24 24 Q24 36 20 40" stroke="#60a5fa" strokeWidth="3" strokeLinecap="round" fill="none" />
    </svg>
  ),
  fire: (props) => (
    <svg viewBox="0 0 64 64" {...props}>
      <path d="M32 4 Q44 20 44 32 Q44 48 32 56 Q20 48 20 32 Q20 20 32 4" fill="#f97316" />
      <path d="M32 20 Q38 28 38 36 Q38 48 32 52 Q26 48 26 36 Q26 28 32 20" fill="#fbbf24" />
    </svg>
  ),
  snowflake: (props) => (
    <svg viewBox="0 0 64 64" {...props}>
      <path d="M32 4 V60 M4 32 H60 M11 11 L53 53 M11 53 L53 11" stroke="#60a5fa" strokeWidth="4" strokeLinecap="round" />
      <circle cx="32" cy="32" r="4" fill="#60a5fa" />
    </svg>
  ),
  lightning: (props) => (
    <svg viewBox="0 0 64 64" {...props}>
      <path d="M36 4 L16 32 L28 32 L24 60 L48 28 L36 28 Z" fill="#fbbf24" />
    </svg>
  ),
  rain: (props) => (
    <svg viewBox="0 0 64 64" {...props}>
      <circle cx="20" cy="20" r="10" fill="#9ca3af" />
      <circle cx="36" cy="16" r="14" fill="#9ca3af" />
      <circle cx="48" cy="22" r="8" fill="#9ca3af" />
      <rect x="8" y="20" width="44" height="10" fill="#9ca3af" />
      <path d="M16 40 L12 52 M28 38 L24 50 M40 40 L36 52 M52 38 L48 50" stroke="#3b82f6" strokeWidth="3" strokeLinecap="round" />
    </svg>
  ),
  wind: (props) => (
    <svg viewBox="0 0 64 64" {...props}>
      <path d="M4 24 Q20 20 32 24 Q44 28 52 24 Q56 20 60 24" stroke="#9ca3af" strokeWidth="4" strokeLinecap="round" fill="none" />
      <path d="M8 36 Q24 32 36 36 Q48 40 56 36" stroke="#9ca3af" strokeWidth="4" strokeLinecap="round" fill="none" />
      <path d="M12 48 Q28 44 40 48 Q52 52 60 48" stroke="#9ca3af" strokeWidth="4" strokeLinecap="round" fill="none" />
    </svg>
  ),
  snow: (props) => (
    <svg viewBox="0 0 64 64" {...props}>
      <path d="M32 4 V60 M4 32 H60 M11 11 L53 53 M11 53 L53 11" stroke="#60a5fa" strokeWidth="4" strokeLinecap="round" />
      <circle cx="32" cy="32" r="4" fill="#60a5fa" />
    </svg>
  ),
  river: (props) => (
    <svg viewBox="0 0 64 64" {...props}>
      <path d="M0 32 Q16 24 32 32 Q48 40 64 32" fill="#3b82f6" />
      <path d="M0 44 Q16 36 32 44 Q48 52 64 44 L64 64 L0 64 Z" fill="#60a5fa" />
      <path d="M8 40 Q16 36 24 40" stroke="#bfdbfe" strokeWidth="2" fill="none" />
    </svg>
  ),
  ocean: (props) => (
    <svg viewBox="0 0 64 64" {...props}>
      <rect x="0" y="32" width="64" height="32" fill="#3b82f6" />
      <path d="M0 32 Q8 28 16 32 Q24 36 32 32 Q40 28 48 32 Q56 36 64 32" fill="#60a5fa" />
      <path d="M0 40 Q8 36 16 40 Q24 44 32 40 Q40 36 48 40 Q56 44 64 40" fill="#3b82f6" />
    </svg>
  ),

  // ============================================
  // TRANSPORT (10)
  // ============================================
  hat: (props) => (
    <svg viewBox="0 0 64 64" {...props}>
      <path d="M4 52 H60" stroke="#1f2937" strokeWidth="4" strokeLinecap="round" />
      <path d="M12 52 V44 Q12 20 32 20 Q52 20 52 44 V52" fill="#ef4444" />
      <rect x="12" y="44" width="40" height="8" fill="#dc2626" />
    </svg>
  ),
  cup: (props) => (
    <svg viewBox="0 0 64 64" {...props}>
      <path d="M12 16 H48 V48 Q48 56 32 56 Q16 56 16 48 V16" fill="#3b82f6" stroke="#1d4ed8" strokeWidth="2" />
      <path d="M48 24 H56 Q60 24 60 32 Q60 40 56 40 H48" stroke="#3b82f6" strokeWidth="4" fill="none" />
    </svg>
  ),
  house: (props) => (
    <svg viewBox="0 0 64 64" {...props}>
      <path d="M32 4 L4 28 H12 V56 H52 V28 H60 Z" fill="#ea580c" stroke="#9a3412" strokeWidth="2" />
      <rect x="26" y="36" width="12" height="20" fill="#78350f" />
      <rect x="16" y="32" width="8" height="8" fill="#bfdbfe" />
      <rect x="40" y="32" width="8" height="8" fill="#bfdbfe" />
    </svg>
  ),
  car: (props) => (
    <svg viewBox="0 0 64 64" {...props}>
      <rect x="4" y="28" width="56" height="20" rx="4" fill="#ef4444" />
      <path d="M12 28 L18 16 H46 L52 28" fill="#dc2626" />
      <rect x="20" y="18" width="10" height="10" rx="2" fill="#bfdbfe" />
      <rect x="34" y="18" width="10" height="10" rx="2" fill="#bfdbfe" />
      <circle cx="16" cy="48" r="6" fill="#1f2937" />
      <circle cx="48" cy="48" r="6" fill="#1f2937" />
    </svg>
  ),
  train: (props) => (
    <svg viewBox="0 0 64 64" {...props}>
      <rect x="8" y="16" width="48" height="32" rx="4" fill="#3b82f6" />
      <rect x="12" y="20" width="16" height="12" fill="#bfdbfe" />
      <rect x="36" y="20" width="16" height="12" fill="#bfdbfe" />
      <circle cx="16" cy="52" r="6" fill="#1f2937" />
      <circle cx="48" cy="52" r="6" fill="#1f2937" />
      <rect x="28" y="4" width="8" height="12" fill="#6b7280" />
    </svg>
  ),
  plane: (props) => (
    <svg viewBox="0 0 64 64" {...props}>
      <ellipse cx="32" cy="32" rx="28" ry="8" fill="#e5e7eb" />
      <path d="M32 24 L20 8 L20 24 M32 40 L20 56 L20 40" fill="#9ca3af" />
      <circle cx="56" cy="32" r="4" fill="#3b82f6" />
      <path d="M32 24 L44 16 L44 24 M32 40 L44 48 L44 40" fill="#9ca3af" />
    </svg>
  ),
  boat: (props) => (
    <svg viewBox="0 0 64 64" {...props}>
      <path d="M4 40 L12 56 H52 L60 40 Z" fill="#78350f" />
      <rect x="28" y="16" width="8" height="24" fill="#92400e" />
      <path d="M36 16 L56 32 L36 40" fill="#f3f4f6" />
    </svg>
  ),
  rocket: (props) => (
    <svg viewBox="0 0 64 64" {...props}>
      <path d="M32 4 Q44 16 44 36 L44 44 H20 L20 36 Q20 16 32 4" fill="#e5e7eb" />
      <circle cx="32" cy="24" r="6" fill="#3b82f6" />
      <path d="M20 36 L12 48 L20 44" fill="#ef4444" />
      <path d="M44 36 L52 48 L44 44" fill="#ef4444" />
      <path d="M24 44 L32 60 L40 44" fill="#f97316" />
    </svg>
  ),
  bus: (props) => (
    <svg viewBox="0 0 64 64" {...props}>
      <rect x="8" y="16" width="48" height="32" rx="4" fill="#fbbf24" />
      <rect x="12" y="20" width="12" height="12" fill="#bfdbfe" />
      <rect x="28" y="20" width="12" height="12" fill="#bfdbfe" />
      <rect x="44" y="20" width="8" height="12" fill="#bfdbfe" />
      <circle cx="18" cy="52" r="6" fill="#1f2937" />
      <circle cx="46" cy="52" r="6" fill="#1f2937" />
    </svg>
  ),
  bike: (props) => (
    <svg viewBox="0 0 64 64" {...props}>
      <circle cx="16" cy="44" r="12" fill="none" stroke="#1f2937" strokeWidth="4" />
      <circle cx="48" cy="44" r="12" fill="none" stroke="#1f2937" strokeWidth="4" />
      <path d="M16 44 L28 24 L40 24 L48 44 M28 24 L28 44 L40 24" stroke="#ef4444" strokeWidth="3" fill="none" />
    </svg>
  ),
  ship: (props) => (
    <svg viewBox="0 0 64 64" {...props}>
      <path d="M4 40 L12 56 H52 L60 40 Z" fill="#1f2937" />
      <rect x="24" y="20" width="16" height="20" fill="#6b7280" />
      <rect x="30" y="8" width="4" height="12" fill="#78350f" />
      <path d="M34 8 L50 20 L34 20" fill="#f3f4f6" />
    </svg>
  ),
  truck: (props) => (
    <svg viewBox="0 0 64 64" {...props}>
      <rect x="4" y="24" width="36" height="24" fill="#3b82f6" />
      <rect x="40" y="32" width="20" height="16" fill="#60a5fa" />
      <rect x="44" y="36" width="12" height="8" fill="#bfdbfe" />
      <circle cx="16" cy="52" r="6" fill="#1f2937" />
      <circle cx="52" cy="52" r="6" fill="#1f2937" />
    </svg>
  ),
  helicopter: (props) => (
    <svg viewBox="0 0 64 64" {...props}>
      <ellipse cx="28" cy="36" rx="20" ry="12" fill="#ef4444" />
      <rect x="4" y="32" width="48" height="4" fill="#1f2937" />
      <path d="M48 36 L56 32 L56 40 L48 36" fill="#ef4444" />
      <rect x="24" y="24" width="8" height="8" fill="#bfdbfe" />
      <rect x="12" y="16" width="32" height="4" fill="#6b7280" />
    </svg>
  ),

  // ============================================
  // OBJECTS (25)
  // ============================================
  ball: (props) => (
    <svg viewBox="0 0 64 64" {...props}>
      <circle cx="32" cy="32" r="24" fill="#ef4444" />
      <path d="M8 32 Q32 8 56 32 Q32 56 8 32" fill="#f3f4f6" />
    </svg>
  ),
  gift: (props) => (
    <svg viewBox="0 0 64 64" {...props}>
      <rect x="8" y="24" width="48" height="32" rx="2" fill="#8b5cf6" />
      <rect x="28" y="24" width="8" height="32" fill="#fbbf24" />
      <rect x="4" y="16" width="56" height="12" rx="2" fill="#a78bfa" />
      <rect x="28" y="16" width="8" height="12" fill="#fbbf24" />
      <path d="M32 16 Q24 4 20 8 Q16 12 24 16 M32 16 Q40 4 44 8 Q48 12 40 16" fill="#fbbf24" />
    </svg>
  ),
  heart: (props) => (
    <svg viewBox="0 0 64 64" {...props}>
      <path d="M32 56 Q8 36 8 20 Q8 8 20 8 Q28 8 32 16 Q36 8 44 8 Q56 8 56 20 Q56 36 32 56" fill="#ef4444" />
    </svg>
  ),
  crown: (props) => (
    <svg viewBox="0 0 64 64" {...props}>
      <path d="M4 48 V20 L16 32 L32 12 L48 32 L60 20 V48 Z" fill="#fbbf24" />
      <circle cx="4" cy="20" r="4" fill="#fbbf24" />
      <circle cx="32" cy="12" r="4" fill="#fbbf24" />
      <circle cx="60" cy="20" r="4" fill="#fbbf24" />
      <circle cx="16" cy="44" r="4" fill="#ef4444" />
      <circle cx="32" cy="44" r="4" fill="#3b82f6" />
      <circle cx="48" cy="44" r="4" fill="#22c55e" />
    </svg>
  ),
  key: (props) => (
    <svg viewBox="0 0 64 64" {...props}>
      <circle cx="20" cy="20" r="12" fill="#fbbf24" stroke="#d97706" strokeWidth="2" />
      <circle cx="20" cy="20" r="6" fill="#fef3c7" />
      <rect x="28" y="16" width="32" height="8" fill="#fbbf24" />
      <rect x="52" y="24" width="8" height="8" fill="#fbbf24" />
      <rect x="44" y="24" width="4" height="6" fill="#fbbf24" />
    </svg>
  ),
  bell: (props) => (
    <svg viewBox="0 0 64 64" {...props}>
      <path d="M32 8 Q48 12 48 32 V44 H16 V32 Q16 12 32 8" fill="#fbbf24" />
      <rect x="12" y="44" width="40" height="4" fill="#d97706" />
      <circle cx="32" cy="52" r="6" fill="#fbbf24" />
      <rect x="30" y="4" width="4" height="8" fill="#d97706" />
    </svg>
  ),
  clock: (props) => (
    <svg viewBox="0 0 64 64" {...props}>
      <circle cx="32" cy="32" r="26" fill="#f3f4f6" stroke="#1f2937" strokeWidth="4" />
      <path d="M32 32 L32 16" stroke="#1f2937" strokeWidth="4" strokeLinecap="round" />
      <path d="M32 32 L44 32" stroke="#ef4444" strokeWidth="3" strokeLinecap="round" />
      <circle cx="32" cy="32" r="3" fill="#1f2937" />
    </svg>
  ),
  book: (props) => (
    <svg viewBox="0 0 64 64" {...props}>
      <rect x="8" y="8" width="48" height="48" rx="4" fill="#3b82f6" />
      <rect x="12" y="12" width="40" height="40" fill="#f3f4f6" />
      <path d="M20 20 H44 M20 28 H44 M20 36 H36" stroke="#9ca3af" strokeWidth="2" />
    </svg>
  ),
  pencil: (props) => (
    <svg viewBox="0 0 64 64" {...props}>
      <path d="M12 52 L8 56 L12 56 L52 16 L48 12 Z" fill="#fbbf24" />
      <path d="M48 12 L52 16 L56 12 L52 8 Z" fill="#f472b6" />
      <path d="M12 52 L8 56 L12 56 Z" fill="#1f2937" />
    </svg>
  ),
  scissors: (props) => (
    <svg viewBox="0 0 64 64" {...props}>
      <circle cx="16" cy="48" r="8" fill="none" stroke="#6b7280" strokeWidth="4" />
      <circle cx="48" cy="48" r="8" fill="none" stroke="#6b7280" strokeWidth="4" />
      <path d="M22 42 L48 12 M42 42 L16 12" stroke="#6b7280" strokeWidth="4" strokeLinecap="round" />
    </svg>
  ),
  umbrella: (props) => (
    <svg viewBox="0 0 64 64" {...props}>
      <path d="M4 32 Q4 8 32 8 Q60 8 60 32 Z" fill="#ef4444" />
      <rect x="30" y="28" width="4" height="24" fill="#78350f" />
      <path d="M34 52 Q40 52 40 56 Q40 60 34 60" stroke="#78350f" strokeWidth="4" fill="none" />
    </svg>
  ),
  balloon: (props) => (
    <svg viewBox="0 0 64 64" {...props}>
      <ellipse cx="32" cy="24" rx="18" ry="22" fill="#ef4444" />
      <path d="M32 46 L30 50 H34 Z" fill="#dc2626" />
      <path d="M32 50 Q28 54 32 58 Q36 54 32 58" stroke="#1f2937" strokeWidth="2" fill="none" />
    </svg>
  ),
  bed: (props) => (
    <svg viewBox="0 0 64 64" {...props}>
      <rect x="4" y="32" width="56" height="20" rx="4" fill="#92400e" />
      <rect x="8" y="24" width="16" height="12" rx="4" fill="#f3f4f6" />
      <rect x="8" y="36" width="48" height="8" fill="#3b82f6" />
      <rect x="4" y="52" width="8" height="8" fill="#78350f" />
      <rect x="52" y="52" width="8" height="8" fill="#78350f" />
    </svg>
  ),
  shoe: (props) => (
    <svg viewBox="0 0 64 64" {...props}>
      <path d="M8 40 Q8 32 20 32 L48 32 Q56 32 56 40 L56 48 L8 48 Z" fill="#1f2937" />
      <path d="M8 40 L8 44 L24 44 L24 36 Q16 36 8 40" fill="#6b7280" />
      <rect x="8" y="44" width="48" height="8" fill="#4b5563" />
    </svg>
  ),
  lock: (props) => (
    <svg viewBox="0 0 64 64" {...props}>
      <rect x="12" y="28" width="40" height="28" rx="4" fill="#fbbf24" />
      <path d="M20 28 V20 Q20 8 32 8 Q44 8 44 20 V28" fill="none" stroke="#fbbf24" strokeWidth="6" />
      <circle cx="32" cy="42" r="6" fill="#1f2937" />
      <rect x="30" y="42" width="4" height="8" fill="#1f2937" />
    </svg>
  ),
  chair: (props) => (
    <svg viewBox="0 0 64 64" {...props}>
      <rect x="12" y="8" width="40" height="8" rx="2" fill="#92400e" />
      <rect x="12" y="16" width="40" height="24" fill="#78350f" />
      <rect x="12" y="40" width="4" height="20" fill="#78350f" />
      <rect x="48" y="40" width="4" height="20" fill="#78350f" />
    </svg>
  ),
  table: (props) => (
    <svg viewBox="0 0 64 64" {...props}>
      <rect x="4" y="24" width="56" height="8" rx="2" fill="#92400e" />
      <rect x="8" y="32" width="6" height="24" fill="#78350f" />
      <rect x="50" y="32" width="6" height="24" fill="#78350f" />
    </svg>
  ),
  watch: (props) => (
    <svg viewBox="0 0 64 64" {...props}>
      <rect x="20" y="4" width="24" height="12" rx="4" fill="#6b7280" />
      <rect x="20" y="48" width="24" height="12" rx="4" fill="#6b7280" />
      <circle cx="32" cy="32" r="20" fill="#1f2937" />
      <circle cx="32" cy="32" r="16" fill="#f3f4f6" />
      <path d="M32 32 L32 20" stroke="#1f2937" strokeWidth="2" />
      <path d="M32 32 L40 32" stroke="#ef4444" strokeWidth="2" />
    </svg>
  ),
  shirt: (props) => (
    <svg viewBox="0 0 64 64" {...props}>
      <path d="M16 16 L24 8 L40 8 L48 16 L56 24 L48 32 L48 56 L16 56 L16 32 L8 24 Z" fill="#3b82f6" />
      <path d="M24 8 L32 16 L40 8" fill="#60a5fa" />
      <circle cx="32" cy="28" r="3" fill="#1f2937" />
      <circle cx="32" cy="40" r="3" fill="#1f2937" />
    </svg>
  ),
  pants: (props) => (
    <svg viewBox="0 0 64 64" {...props}>
      <path d="M12 8 L52 8 L52 24 L36 56 L28 56 L28 24 L36 24 L36 56 L28 56 L12 24 Z" fill="#1e40af" />
      <rect x="12" y="8" width="40" height="8" fill="#1d4ed8" />
    </svg>
  ),
  glasses: (props) => (
    <svg viewBox="0 0 64 64" {...props}>
      <circle cx="18" cy="32" r="12" fill="none" stroke="#1f2937" strokeWidth="4" />
      <circle cx="46" cy="32" r="12" fill="none" stroke="#1f2937" strokeWidth="4" />
      <path d="M30 32 L34 32" stroke="#1f2937" strokeWidth="4" />
      <path d="M6 32 L6 28" stroke="#1f2937" strokeWidth="4" />
      <path d="M58 32 L58 28" stroke="#1f2937" strokeWidth="4" />
    </svg>
  ),

  // ============================================
  // BODY & PEOPLE (10)
  // ============================================
  hand: (props) => (
    <svg viewBox="0 0 64 64" {...props}>
      <path d="M32 56 Q16 56 16 44 V32 Q16 28 20 28 V20 Q20 16 24 16 V12 Q24 8 28 8 Q32 8 32 12 V8 Q32 4 36 4 Q40 4 40 8 V16 Q44 16 44 20 V28 Q48 28 48 32 V44 Q48 56 32 56" fill="#fcd9b6" stroke="#d4a574" strokeWidth="2" />
    </svg>
  ),
  foot: (props) => (
    <svg viewBox="0 0 64 64" {...props}>
      <path d="M20 8 Q32 8 40 16 Q52 28 52 44 Q52 56 32 56 Q12 56 12 44 Q12 28 20 8" fill="#fcd9b6" stroke="#d4a574" strokeWidth="2" />
      <circle cx="20" cy="16" r="4" fill="#fcd9b6" stroke="#d4a574" strokeWidth="2" />
      <circle cx="28" cy="12" r="4" fill="#fcd9b6" stroke="#d4a574" strokeWidth="2" />
      <circle cx="36" cy="12" r="4" fill="#fcd9b6" stroke="#d4a574" strokeWidth="2" />
      <circle cx="42" cy="16" r="4" fill="#fcd9b6" stroke="#d4a574" strokeWidth="2" />
    </svg>
  ),
  eye: (props) => (
    <svg viewBox="0 0 64 64" {...props}>
      <ellipse cx="32" cy="32" rx="28" ry="18" fill="#f3f4f6" stroke="#1f2937" strokeWidth="2" />
      <circle cx="32" cy="32" r="12" fill="#3b82f6" />
      <circle cx="32" cy="32" r="6" fill="#1f2937" />
      <circle cx="28" cy="28" r="3" fill="#f3f4f6" />
    </svg>
  ),
  ear: (props) => (
    <svg viewBox="0 0 64 64" {...props}>
      <path d="M40 8 Q56 16 56 32 Q56 56 32 56 Q24 56 24 48 Q24 40 32 40 Q40 40 40 32 Q40 24 32 24" fill="#fcd9b6" stroke="#d4a574" strokeWidth="2" />
    </svg>
  ),
  nose: (props) => (
    <svg viewBox="0 0 64 64" {...props}>
      <path d="M32 8 Q36 32 44 44 Q44 52 32 52 Q20 52 20 44 Q28 32 32 8" fill="#fcd9b6" stroke="#d4a574" strokeWidth="2" />
      <circle cx="26" cy="44" r="4" fill="#e5c4a8" />
      <circle cx="38" cy="44" r="4" fill="#e5c4a8" />
    </svg>
  ),
  smile: (props) => (
    <svg viewBox="0 0 64 64" {...props}>
      <circle cx="32" cy="32" r="28" fill="#fbbf24" />
      <circle cx="22" cy="26" r="4" fill="#1f2937" />
      <circle cx="42" cy="26" r="4" fill="#1f2937" />
      <path d="M18 40 Q32 52 46 40" stroke="#1f2937" strokeWidth="4" strokeLinecap="round" fill="none" />
    </svg>
  ),
  baby: (props) => (
    <svg viewBox="0 0 64 64" {...props}>
      <circle cx="32" cy="24" r="16" fill="#fcd9b6" />
      <circle cx="26" cy="22" r="3" fill="#1f2937" />
      <circle cx="38" cy="22" r="3" fill="#1f2937" />
      <ellipse cx="32" cy="28" rx="2" ry="1" fill="#f472b6" />
      <path d="M26 32 Q32 36 38 32" stroke="#1f2937" strokeWidth="2" fill="none" />
      <ellipse cx="32" cy="48" rx="12" ry="10" fill="#93c5fd" />
    </svg>
  ),
  king: (props) => (
    <svg viewBox="0 0 64 64" {...props}>
      <circle cx="32" cy="32" r="16" fill="#fcd9b6" />
      <circle cx="26" cy="30" r="2" fill="#1f2937" />
      <circle cx="38" cy="30" r="2" fill="#1f2937" />
      <path d="M26 38 Q32 42 38 38" stroke="#1f2937" strokeWidth="2" fill="none" />
      <path d="M20 16 L24 24 L32 16 L40 24 L44 16" fill="#fbbf24" />
      <rect x="20" y="8" width="24" height="8" fill="#fbbf24" />
    </svg>
  ),
  queen: (props) => (
    <svg viewBox="0 0 64 64" {...props}>
      <circle cx="32" cy="32" r="16" fill="#fcd9b6" />
      <circle cx="26" cy="30" r="2" fill="#1f2937" />
      <circle cx="38" cy="30" r="2" fill="#1f2937" />
      <path d="M26 38 Q32 42 38 38" stroke="#1f2937" strokeWidth="2" fill="none" />
      <path d="M16 16 Q32 4 48 16 L44 24 H20 Z" fill="#ec4899" />
      <circle cx="32" cy="8" r="4" fill="#fbbf24" />
    </svg>
  ),
  robot: (props) => (
    <svg viewBox="0 0 64 64" {...props}>
      <rect x="16" y="20" width="32" height="28" rx="4" fill="#6b7280" />
      <rect x="20" y="24" width="8" height="8" fill="#22c55e" />
      <rect x="36" y="24" width="8" height="8" fill="#22c55e" />
      <rect x="24" y="36" width="16" height="4" fill="#4b5563" />
      <rect x="28" y="8" width="8" height="12" fill="#6b7280" />
      <circle cx="32" cy="4" r="4" fill="#ef4444" />
      <rect x="8" y="28" width="8" height="12" fill="#6b7280" />
      <rect x="48" y="28" width="8" height="12" fill="#6b7280" />
    </svg>
  ),
  mouth: (props) => (
    <svg viewBox="0 0 64 64" {...props}>
      <path d="M12 28 Q32 20 52 28 Q52 44 32 52 Q12 44 12 28" fill="#fda4af" />
      <path d="M16 32 Q32 24 48 32" stroke="#ef4444" strokeWidth="2" fill="none" />
      <rect x="20" y="28" width="6" height="8" rx="1" fill="#f3f4f6" />
      <rect x="28" y="28" width="8" height="10" rx="1" fill="#f3f4f6" />
      <rect x="38" y="28" width="6" height="8" rx="1" fill="#f3f4f6" />
    </svg>
  ),

  // ============================================
  // MUSIC & FUN (10)
  // ============================================
  music: (props) => (
    <svg viewBox="0 0 64 64" {...props}>
      <ellipse cx="16" cy="48" rx="10" ry="8" fill="#1f2937" />
      <ellipse cx="48" cy="44" rx="10" ry="8" fill="#1f2937" />
      <rect x="24" y="12" width="4" height="36" fill="#1f2937" />
      <rect x="56" y="8" width="4" height="36" fill="#1f2937" />
      <rect x="24" y="8" width="36" height="8" fill="#1f2937" />
    </svg>
  ),
  drum: (props) => (
    <svg viewBox="0 0 64 64" {...props}>
      <ellipse cx="32" cy="48" rx="24" ry="8" fill="#dc2626" />
      <rect x="8" y="24" width="48" height="24" fill="#ef4444" />
      <ellipse cx="32" cy="24" rx="24" ry="8" fill="#fca5a5" />
      <path d="M16 24 L16 48 M48 24 L48 48 M24 24 L24 48 M40 24 L40 48" stroke="#dc2626" strokeWidth="2" />
    </svg>
  ),
  guitar: (props) => (
    <svg viewBox="0 0 64 64" {...props}>
      <ellipse cx="32" cy="44" rx="16" ry="12" fill="#92400e" />
      <ellipse cx="32" cy="44" rx="6" ry="4" fill="#1f2937" />
      <rect x="30" y="8" width="4" height="32" fill="#78350f" />
      <rect x="26" y="4" width="12" height="8" fill="#fbbf24" />
      <path d="M28 8 H36 M28 10 H36" stroke="#1f2937" strokeWidth="1" />
    </svg>
  ),
  piano: (props) => (
    <svg viewBox="0 0 64 64" {...props}>
      <rect x="4" y="16" width="56" height="32" fill="#f3f4f6" stroke="#1f2937" strokeWidth="2" />
      <rect x="12" y="16" width="6" height="20" fill="#1f2937" />
      <rect x="22" y="16" width="6" height="20" fill="#1f2937" />
      <rect x="36" y="16" width="6" height="20" fill="#1f2937" />
      <rect x="46" y="16" width="6" height="20" fill="#1f2937" />
    </svg>
  ),
  dice: (props) => (
    <svg viewBox="0 0 64 64" {...props}>
      <rect x="8" y="8" width="48" height="48" rx="8" fill="#f3f4f6" stroke="#1f2937" strokeWidth="2" />
      <circle cx="20" cy="20" r="4" fill="#1f2937" />
      <circle cx="44" cy="20" r="4" fill="#1f2937" />
      <circle cx="32" cy="32" r="4" fill="#1f2937" />
      <circle cx="20" cy="44" r="4" fill="#1f2937" />
      <circle cx="44" cy="44" r="4" fill="#1f2937" />
    </svg>
  ),
  puzzle: (props) => (
    <svg viewBox="0 0 64 64" {...props}>
      <path d="M8 8 H28 V20 Q32 16 36 20 V8 H56 V28 H44 Q48 32 44 36 H56 V56 H8 Z" fill="#8b5cf6" stroke="#7c3aed" strokeWidth="2" />
      <path d="M8 28 H20 Q16 32 20 36 H8 Z" fill="#8b5cf6" stroke="#7c3aed" strokeWidth="2" />
    </svg>
  ),
  kite: (props) => (
    <svg viewBox="0 0 64 64" {...props}>
      <path d="M32 4 L52 32 L32 52 L12 32 Z" fill="#ef4444" />
      <path d="M32 4 L32 52 M12 32 L52 32" stroke="#fbbf24" strokeWidth="2" />
      <path d="M32 52 Q28 56 32 60 Q36 56 40 60 Q36 64 32 60" stroke="#1f2937" strokeWidth="2" fill="none" />
    </svg>
  ),
  teddy: (props) => (
    <svg viewBox="0 0 64 64" {...props}>
      <circle cx="16" cy="16" r="8" fill="#d97706" />
      <circle cx="48" cy="16" r="8" fill="#d97706" />
      <circle cx="32" cy="32" r="20" fill="#d97706" />
      <ellipse cx="32" cy="38" rx="8" ry="6" fill="#fbbf24" />
      <circle cx="24" cy="28" r="3" fill="#1f2937" />
      <circle cx="40" cy="28" r="3" fill="#1f2937" />
      <ellipse cx="32" cy="36" rx="3" ry="2" fill="#1f2937" />
    </svg>
  ),
  "yo-yo": (props) => (
    <svg viewBox="0 0 64 64" {...props}>
      <circle cx="32" cy="40" r="20" fill="#ef4444" />
      <circle cx="32" cy="40" r="8" fill="#fbbf24" />
      <path d="M32 4 L32 20" stroke="#1f2937" strokeWidth="2" />
      <circle cx="32" cy="4" r="4" fill="#1f2937" />
    </svg>
  ),
  top: (props) => (
    <svg viewBox="0 0 64 64" {...props}>
      <path d="M16 24 L48 24 L32 60 Z" fill="#8b5cf6" />
      <ellipse cx="32" cy="24" rx="16" ry="6" fill="#a78bfa" />
      <rect x="30" y="8" width="4" height="16" fill="#6b7280" />
    </svg>
  ),

  // ============================================
  // TECH & TOOLS (10)
  // ============================================
  computer: (props) => (
    <svg viewBox="0 0 64 64" {...props}>
      <rect x="8" y="8" width="48" height="32" rx="2" fill="#1f2937" />
      <rect x="12" y="12" width="40" height="24" fill="#3b82f6" />
      <path d="M24 40 L20 52 H44 L40 40" fill="#6b7280" />
      <rect x="16" y="52" width="32" height="4" fill="#4b5563" />
    </svg>
  ),
  phone: (props) => (
    <svg viewBox="0 0 64 64" {...props}>
      <rect x="16" y="4" width="32" height="56" rx="4" fill="#1f2937" />
      <rect x="20" y="12" width="24" height="36" fill="#3b82f6" />
      <circle cx="32" cy="54" r="4" fill="#4b5563" />
    </svg>
  ),
  camera: (props) => (
    <svg viewBox="0 0 64 64" {...props}>
      <rect x="4" y="20" width="56" height="36" rx="4" fill="#1f2937" />
      <circle cx="32" cy="38" r="12" fill="#6b7280" />
      <circle cx="32" cy="38" r="8" fill="#3b82f6" />
      <rect x="24" y="12" width="16" height="8" fill="#4b5563" />
    </svg>
  ),
  lamp: (props) => (
    <svg viewBox="0 0 64 64" {...props}>
      <path d="M24 32 L16 8 H48 L40 32" fill="#fbbf24" />
      <ellipse cx="32" cy="32" rx="12" ry="4" fill="#f59e0b" />
      <rect x="28" y="36" width="8" height="16" fill="#78350f" />
      <ellipse cx="32" cy="56" rx="12" ry="4" fill="#92400e" />
    </svg>
  ),
  hammer: (props) => (
    <svg viewBox="0 0 64 64" {...props}>
      <rect x="28" y="24" width="8" height="36" fill="#78350f" />
      <rect x="16" y="8" width="32" height="16" rx="2" fill="#6b7280" />
    </svg>
  ),
  wrench: (props) => (
    <svg viewBox="0 0 64 64" {...props}>
      <path d="M16 8 Q8 16 16 24 L40 48 Q48 56 56 48 Q64 40 56 32 L32 8 Q24 0 16 8" fill="#6b7280" />
      <circle cx="16" cy="16" r="4" fill="#4b5563" />
      <circle cx="48" cy="48" r="4" fill="#4b5563" />
    </svg>
  ),
  magnet: (props) => (
    <svg viewBox="0 0 64 64" {...props}>
      <path d="M12 8 V32 Q12 52 32 52 Q52 52 52 32 V8" fill="none" stroke="#ef4444" strokeWidth="12" />
      <rect x="8" y="4" width="16" height="12" fill="#6b7280" />
      <rect x="40" y="4" width="16" height="12" fill="#6b7280" />
    </svg>
  ),
  battery: (props) => (
    <svg viewBox="0 0 64 64" {...props}>
      <rect x="4" y="16" width="48" height="32" rx="4" fill="#22c55e" />
      <rect x="52" y="24" width="8" height="16" rx="2" fill="#16a34a" />
      <rect x="8" y="20" width="12" height="24" fill="#15803d" />
      <rect x="24" y="20" width="12" height="24" fill="#15803d" />
    </svg>
  ),
  bulb: (props) => (
    <svg viewBox="0 0 64 64" {...props}>
      <path d="M32 4 Q52 12 52 32 Q52 44 40 48 V56 H24 V48 Q12 44 12 32 Q12 12 32 4" fill="#fbbf24" />
      <rect x="24" y="56" width="16" height="4" fill="#6b7280" />
      <path d="M24 28 Q32 36 40 28" stroke="#f59e0b" strokeWidth="3" fill="none" />
    </svg>
  ),
  gear: (props) => (
    <svg viewBox="0 0 64 64" {...props}>
      <path d="M28 4 H36 L38 12 L46 16 L54 12 L60 20 L54 26 L56 34 H64 V42 L56 44 L54 52 L60 58 L52 64 L46 58 L38 62 L36 70 H28 L26 62 L18 58 L12 64 L4 58 L10 52 L8 44 L0 42 V34 L8 32 L10 24 L4 18 L12 12 L18 18 L26 14 Z" fill="#6b7280" transform="translate(0,-3) scale(1)" />
      <circle cx="32" cy="32" r="10" fill="#4b5563" />
    </svg>
  ),

  // ============================================
  // GENERIC FALLBACK
  // ============================================
  generic: (props) => (
    <svg viewBox="0 0 64 64" {...props}>
      {/* Alphabet block / letter icon */}
      <rect x="8" y="8" width="48" height="48" rx="8" fill="#a78bfa" />
      <rect x="12" y="12" width="40" height="40" rx="6" fill="#c4b5fd" />
      <text x="32" y="44" textAnchor="middle" fontSize="28" fontWeight="bold" fill="#7c3aed" fontFamily="sans-serif">
        Aa
      </text>
    </svg>
  ),
};

// Word to Icon mapping
export const WORD_ICON_MAP: Partial<Record<string, GameIconName>> = {
  // Animals
  cat: "cat", dog: "dog", rabbit: "rabbit", bear: "bear", mouse: "mouse",
  elephant: "elephant", lion: "lion", tiger: "tiger", monkey: "monkey",
  penguin: "penguin", owl: "owl", fish: "fish", whale: "whale", dolphin: "dolphin",
  turtle: "turtle", frog: "frog", bird: "bird", butterfly: "butterfly", bee: "bee", duck: "duck",
  // Food
  apple: "apple", banana: "banana", pizza: "pizza", cake: "cake", candy: "candy",
  cookie: "cookie", bread: "bread", carrot: "carrot", grape: "grape", orange: "orange",
  strawberry: "strawberry", watermelon: "watermelon", cheese: "cheese", egg: "egg",
  // Nature
  sun: "sun", moon: "moon", star: "star", cloud: "cloud", rainbow: "rainbow",
  flower: "flower", tree: "tree", leaf: "leaf", mountain: "mountain", water: "water",
  fire: "fire", snowflake: "snowflake", rain: "rain", wind: "wind",
  // Objects
  hat: "hat", cup: "cup", house: "house", car: "car", train: "train", plane: "plane",
  boat: "boat", rocket: "rocket", ball: "ball", gift: "gift", heart: "heart",
  crown: "crown", key: "key", bell: "bell", clock: "clock", book: "book",
  pencil: "pencil", umbrella: "umbrella", balloon: "balloon",
  // Body & People
  hand: "hand", foot: "foot", eye: "eye", ear: "ear", nose: "nose",
  smile: "smile", baby: "baby", king: "king", queen: "queen", robot: "robot",
  // Music & Fun
  music: "music", drum: "drum", guitar: "guitar", piano: "piano", dice: "dice",
  puzzle: "puzzle", kite: "kite", teddy: "teddy",
  // Tech & Tools
  computer: "computer", phone: "phone", camera: "camera", lamp: "lamp",
  hammer: "hammer", magnet: "magnet", bulb: "bulb", gear: "gear",
  // Compound words (map to closest icon)
  sunshine: "sun", sunlight: "sun", moonlight: "moon", starlight: "star",
  birthday: "cake", chocolate: "cookie", playground: "ball", adventure: "rocket",
  wonderful: "star", fantastic: "star", dinosaur: "turtle",
  happy: "smile", dance: "music", plant: "leaf", green: "leaf",
  red: "apple", big: "elephant", run: "rabbit", fun: "ball", hop: "frog",
  top: "top", pot: "cup", bat: "bird", rat: "mouse", map: "book",
  cap: "hat", tap: "water", nap: "moon", zip: "lightning", tip: "pencil",
  beach: "sun", horse: "dog",
  ice: "snowflake", cream: "ice-cream",
};

// GameIcon Component
export const GameIcon: React.FC<{
  name: GameIconName;
  size?: number | string;
  className?: string;
}> = ({ name, size = 64, className }) => {
  if (!name || !GameIcons[name]) return null;
  const IconComponent = GameIcons[name];
  return <IconComponent width={size} height={size} className={className} />;
};

// Helper to get icon for a word
export function getIconForWord(word: string): GameIconName | null {
  const lowerWord = word.toLowerCase();
  return WORD_ICON_MAP[lowerWord] || null;
}
