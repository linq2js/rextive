export function StatItem({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="p-3 bg-gray-50 rounded-lg">
      <div className="text-xs text-gray-500">{label}</div>
      <div className="font-bold text-gray-800">{value}</div>
    </div>
  );
}

