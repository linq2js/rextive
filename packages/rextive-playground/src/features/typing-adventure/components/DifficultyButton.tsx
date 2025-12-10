import { Icon, type IconName } from "@/components/Icons";

export function DifficultyButton({
  iconName,
  label,
  description,
  selected,
  onClick,
}: {
  iconName: IconName;
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
      <div className="flex justify-center text-primary-500">
        <Icon name={iconName} size={28} />
      </div>
      <div className="font-display font-semibold text-gray-800">{label}</div>
      <div className="text-xs text-gray-500">{description}</div>
    </button>
  );
}

