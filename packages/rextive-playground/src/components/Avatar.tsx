import React from "react";
import { AVATAR_COLORS } from "@/domain/types";

// Simple generic face components to compose animals
const FaceBase = ({ color = "#FCD34D" }: { color?: string }) => (
  <circle cx="50" cy="50" r="40" fill={color} />
);

const Eyes = () => (
  <>
    <circle cx="35" cy="45" r="5" fill="#374151" />
    <circle cx="65" cy="45" r="5" fill="#374151" />
    <circle cx="37" cy="43" r="1.5" fill="white" />
    <circle cx="67" cy="43" r="1.5" fill="white" />
  </>
);

const MouthHappy = () => (
  <path
    d="M 35 65 Q 50 75 65 65"
    fill="none"
    stroke="#374151"
    strokeWidth="3"
    strokeLinecap="round"
  />
);

const Nose = () => (
  <circle cx="50" cy="55" r="4" fill="#F87171" />
);

// Animal specific features
const EarsBear = ({ color }: { color: string }) => (
  <>
    <circle cx="20" cy="25" r="12" fill={color} />
    <circle cx="80" cy="25" r="12" fill={color} />
    <circle cx="20" cy="25" r="6" fill="#FCE7F3" />
    <circle cx="80" cy="25" r="6" fill="#FCE7F3" />
  </>
);

const EarsCat = ({ color }: { color: string }) => (
  <>
    <path d="M 15 40 L 25 10 L 45 25 Z" fill={color} stroke={color} strokeWidth="2" strokeLinejoin="round" />
    <path d="M 85 40 L 75 10 L 55 25 Z" fill={color} stroke={color} strokeWidth="2" strokeLinejoin="round" />
  </>
);

const EarsRabbit = ({ color }: { color: string }) => (
  <>
    <ellipse cx="30" cy="20" rx="8" ry="25" fill={color} />
    <ellipse cx="70" cy="20" rx="8" ry="25" fill={color} />
    <ellipse cx="30" cy="20" rx="4" ry="18" fill="#FCE7F3" />
    <ellipse cx="70" cy="20" rx="4" ry="18" fill="#FCE7F3" />
  </>
);

// Generic Animal Avatar Component
const AnimalAvatar = ({ 
  color, 
  ears = "bear", 
  details 
}: { 
  color: string; 
  ears?: "bear" | "cat" | "rabbit" | "none"; 
  details?: React.ReactNode;
}) => (
  <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-sm">
    {ears === "bear" && <EarsBear color={color} />}
    {ears === "cat" && <EarsCat color={color} />}
    {ears === "rabbit" && <EarsRabbit color={color} />}
    
    <FaceBase color={color} />
    <Eyes />
    <Nose />
    <MouthHappy />
    {details}
  </svg>
);

// Specific Implementations
const Rat = () => <AnimalAvatar color="#9CA3AF" ears="bear" />; // Gray
const Ox = () => <AnimalAvatar color="#FCD34D" ears="bear" details={
  // Horns
  <>
    <path d="M 20 40 Q 10 20 30 30" fill="none" stroke="#D1D5DB" strokeWidth="4" />
    <path d="M 80 40 Q 90 20 70 30" fill="none" stroke="#D1D5DB" strokeWidth="4" />
  </>
} />;
const Tiger = () => <AnimalAvatar color="#FDBA74" ears="cat" details={
  // Stripes
  <>
    <path d="M 50 20 L 45 30 L 55 30 Z" fill="#374151" />
    <path d="M 20 50 L 30 55" stroke="#374151" strokeWidth="2" />
    <path d="M 80 50 L 70 55" stroke="#374151" strokeWidth="2" />
  </>
} />;
const Rabbit = () => <AnimalAvatar color="#FCE7F3" ears="rabbit" />;
const Dragon = () => <AnimalAvatar color="#6EE7B7" ears="cat" details={
  // Scales/Horns
  <path d="M 50 15 L 45 25 L 55 25 Z" fill="#047857" />
} />;
const Snake = () => <AnimalAvatar color="#86EFAC" ears="none" />;
const Horse = () => <AnimalAvatar color="#FDBA74" ears="cat" />;
const Goat = () => <AnimalAvatar color="#E5E7EB" ears="bear" details={
  // Horns
  <>
    <path d="M 30 20 L 35 35" stroke="#9CA3AF" strokeWidth="3" />
    <path d="M 70 20 L 65 35" stroke="#9CA3AF" strokeWidth="3" />
  </>
} />;
const Monkey = () => <AnimalAvatar color="#FCD34D" ears="bear" />;
const Rooster = () => <AnimalAvatar color="#FCA5A5" ears="none" details={
  // Comb
  <path d="M 40 15 Q 50 5 60 15 L 60 25 L 40 25 Z" fill="#EF4444" />
} />;
const Dog = () => <AnimalAvatar color="#FDE047" ears="bear" details={
  // Spot
  <circle cx="70" cy="35" r="10" fill="#F59E0B" opacity="0.5" />
} />;
const Pig = () => <AnimalAvatar color="#F9A8D4" ears="bear" details={
  // Snout
  <ellipse cx="50" cy="55" rx="8" ry="6" fill="#F472B6" />
} />;

// Other Animals
const Lion = () => <AnimalAvatar color="#FCD34D" ears="bear" details={
  // Mane
  <circle cx="50" cy="50" r="45" fill="none" stroke="#F59E0B" strokeWidth="5" strokeDasharray="10 5" />
} />;
const Panda = () => <AnimalAvatar color="white" ears="bear" details={
  // Eye patches
  <>
    <circle cx="35" cy="45" r="8" fill="#1F2937" opacity="0.2" />
    <circle cx="65" cy="45" r="8" fill="#1F2937" opacity="0.2" />
  </>
} />;
const Koala = () => <AnimalAvatar color="#D1D5DB" ears="bear" details={
  <ellipse cx="50" cy="55" rx="6" ry="8" fill="#374151" />
} />;
const Fox = () => <AnimalAvatar color="#F97316" ears="cat" />;
const Frog = () => <AnimalAvatar color="#86EFAC" ears="bear" />;

// Zodiac Symbols
const ZodiacSymbol = ({ symbol, color }: { symbol: string, color: string }) => (
  <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-sm">
    <circle cx="50" cy="50" r="45" fill={color} />
    <text x="50" y="65" textAnchor="middle" fontSize="50" fill="white" fontWeight="bold">
      {symbol}
    </text>
  </svg>
);

const MAPPING: Record<string, React.FC> = {
  // Chinese
  "🐀": Rat,
  "🐂": Ox,
  "🐅": Tiger,
  "🐇": Rabbit,
  "🐉": Dragon,
  "🐍": Snake,
  "🐎": Horse,
  "🐐": Goat,
  "🐒": Monkey,
  "🐓": Rooster,
  "🐕": Dog,
  "🐖": Pig,
  
  // Others
  "🦁": Lion,
  "🐼": Panda,
  "🐨": Koala,
  "🦊": Fox,
  "🐸": Frog,
  "🐰": Rabbit, // Reuse
  "🐯": Tiger,  // Reuse
  "🐷": Pig,    // Reuse
  "🐵": Monkey, // Reuse
  "🐶": Dog,    // Reuse
};

export const Avatar = ({ 
  avatar, 
  className = "" 
}: { 
  avatar: string; 
  className?: string;
}) => {
  const Component = MAPPING[avatar];
  
  if (Component) {
    return (
      <div className={`${className}`}>
        <Component />
      </div>
    );
  }

  // Western Zodiacs or fallback
  const bgColor = AVATAR_COLORS[avatar as any] || "bg-gray-200";
  // Extract color hex from Tailwind class if possible, otherwise rely on CSS class
  // For SVG we need actual color values. 
  // Map Tailwind classes to hex roughly
  const colorMap: Record<string, string> = {
    "bg-red-300": "#FCA5A5",
    "bg-emerald-300": "#6EE7B7",
    "bg-yellow-200": "#FEF08A",
    "bg-blue-200": "#BFDBFE",
    "bg-orange-300": "#FDBA74",
    "bg-green-200": "#BBF7D0",
    "bg-sky-200": "#BAE6FD",
    "bg-indigo-300": "#A5B4FC",
    "bg-rose-300": "#FDA4AF",
    "bg-stone-300": "#D6D3D1",
    "bg-cyan-200": "#A5F3FC",
    "bg-violet-200": "#DDD6FE",
  };

  const hexColor = colorMap[bgColor.split(" ")[0]] || "#E5E7EB";

  // If it's a western zodiac (checking if it has a color mapping)
  if (colorMap[bgColor.split(" ")[0]]) {
    return (
      <div className={className}>
        <ZodiacSymbol symbol={avatar} color={hexColor} />
      </div>
    );
  }

  // Fallback: Text Emoji
  return (
    <div className={`flex items-center justify-center rounded-full bg-white text-4xl shadow-sm ${className}`}>
      {avatar}
    </div>
  );
};

