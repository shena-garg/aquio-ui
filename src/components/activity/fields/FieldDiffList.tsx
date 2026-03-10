import type { SimpleFieldDiff } from "@/services/activity";

interface FieldDiffListProps {
  diffs: SimpleFieldDiff[];
}

export function FieldDiffList({ diffs }: FieldDiffListProps) {
  if (diffs.length === 0) return null;

  return (
    <div className="space-y-2">
      {diffs.map((diff) => (
        <div key={diff.field}>
          <p className="text-xs font-medium text-[#6b7280]">{diff.label}</p>
          <p className="text-sm mt-0.5">
            {!diff.oldValue && diff.newValue ? (
              <span className="text-[#0d9488]">Set to {diff.newValue}</span>
            ) : diff.oldValue && !diff.newValue ? (
              <>
                <span className="text-[#111827]">{diff.oldValue}</span>{" "}
                <span className="text-[#ef4444]">Removed</span>
              </>
            ) : (
              <>
                <span className="line-through text-[#9ca3af]">
                  {diff.oldValue}
                </span>{" "}
                <span className="text-[#111827]">→ {diff.newValue}</span>
              </>
            )}
          </p>
        </div>
      ))}
    </div>
  );
}
