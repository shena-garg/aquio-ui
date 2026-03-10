const STATUS_COLORS: Record<string, string> = {
  issued: "bg-[#dbeafe] text-[#1d4ed8]",
  completed: "bg-[#d1fae5] text-[#065f46]",
  cancelled: "bg-[#fee2e2] text-[#b91c1c]",
  partial: "bg-[#fef9c3] text-[#a16207]",
  "force closed": "bg-[#ffedd5] text-[#c2410c]",
  "forcefully closed": "bg-[#ffedd5] text-[#c2410c]",
};

const FALLBACK = "bg-[#f3f4f6] text-[#374151]";

interface EventBadgeProps {
  status: string;
}

export function EventBadge({ status }: EventBadgeProps) {
  const key = status.toLowerCase();
  const colors = STATUS_COLORS[key] ?? FALLBACK;
  const label = status.charAt(0).toUpperCase() + status.slice(1);

  return (
    <span
      className={`inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full ${colors}`}
    >
      {label}
    </span>
  );
}
