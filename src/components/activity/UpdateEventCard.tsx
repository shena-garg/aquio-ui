"use client";

import type { DiffResult } from "@/services/activity";
import { EventCardShell } from "./EventCardShell";
import { FieldDiffList } from "./fields/FieldDiffList";
import { ProductDiffList } from "./fields/ProductDiffList";
import type { ParsedEvent } from "./types";

interface UpdateEventCardProps {
  parsed: ParsedEvent;
  diff: DiffResult;
  isExpanded: boolean;
  onToggle: () => void;
}

export function UpdateEventCard({
  parsed,
  diff,
  isExpanded,
  onToggle,
}: UpdateEventCardProps) {
  const hasFieldDiffs = diff.fieldDiffs.length > 0;
  const hasProductDiffs = diff.productDiffs.length > 0;
  const hasAnyChanges = hasFieldDiffs || hasProductDiffs;

  return (
    <EventCardShell
      dotColor="bg-[#3b82f6]"
      title="Order Updated"
      subtitle={diff.summary}
      userName={parsed.userName}
      formattedDate={parsed.formattedDate}
      isExpanded={isExpanded}
      onToggle={onToggle}
    >
      {!hasAnyChanges ? (
        <p className="text-xs text-[#9ca3af] italic">
          No significant changes detected.
        </p>
      ) : (
        <div className="space-y-4">
          {hasFieldDiffs && <FieldDiffList diffs={diff.fieldDiffs} />}

          {hasProductDiffs && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-[#6b7280]">Products</p>
              <ProductDiffList diffs={diff.productDiffs} />
            </div>
          )}
        </div>
      )}
    </EventCardShell>
  );
}
