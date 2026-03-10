interface FieldGridProps {
  items: { label: string; value: string }[];
}

export function FieldGrid({ items }: FieldGridProps) {
  return (
    <div className="grid grid-cols-2 gap-x-6 gap-y-2">
      {items.map((item) => (
        <div key={item.label}>
          <p className="text-xs text-[#6b7280]">{item.label}</p>
          <p className="text-sm text-[#111827]">{item.value || "—"}</p>
        </div>
      ))}
    </div>
  );
}
