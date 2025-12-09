export function DifficultyButton({
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

