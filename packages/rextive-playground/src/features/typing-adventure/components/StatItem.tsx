import { Icon, type IconName } from "@/components/Icons";

export function StatItem({
  label,
  value,
  iconName,
}: {
  label: string;
  value: string | number;
  iconName?: IconName;
}) {
  return (
    <div className="p-3 bg-gray-50 rounded-lg">
      <div className="text-xs text-gray-500">{label}</div>
      <div className="font-bold text-gray-800 flex items-center gap-1">
        {iconName && <Icon name={iconName} size={16} className="text-orange-500" />}
        {value}
      </div>
    </div>
  );
}

