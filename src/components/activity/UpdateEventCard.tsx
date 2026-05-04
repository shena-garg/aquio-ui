"use client";

import { useMemo } from "react";
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
  orderType?: "purchase" | "sales";
}

export function UpdateEventCard({
  parsed,
  diff,
  isExpanded,
  onToggle,
  orderType,
}: UpdateEventCardProps) {
  const isSales = orderType === "sales";

  const fieldDiffs = useMemo(() => {
    if (!isSales) return diff.fieldDiffs;
    return diff.fieldDiffs.map((fd) =>
      fd.field === "supplierReferenceId"
        ? { ...fd, label: "Buyer Ref. ID" }
        : fd
    );
  }, [diff.fieldDiffs, isSales]);

  const hasFieldDiffs = fieldDiffs.length > 0;
  const hasProductDiffs = diff.productDiffs.length > 0;
  const hasTermsDiff =
    (diff.termsDiff?.added.length ?? 0) + (diff.termsDiff?.removed.length ?? 0) > 0;
  const hasFilesDiff =
    (diff.filesDiff?.added.length ?? 0) + (diff.filesDiff?.removed.length ?? 0) > 0;
  const hasAnyChanges = hasFieldDiffs || hasProductDiffs || hasTermsDiff || hasFilesDiff;

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
        <p className="text-xs text-[#9ca3af] italic">No significant changes detected.</p>
      ) : (
        <div className="space-y-4">
          {hasFieldDiffs && <FieldDiffList diffs={fieldDiffs} />}

          {hasProductDiffs && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-[#6b7280]">Products</p>
              <ProductDiffList diffs={diff.productDiffs} />
            </div>
          )}

          {hasTermsDiff && (
            <div className="space-y-1">
              <p className="text-xs font-medium text-[#6b7280]">Terms & Conditions</p>
              {diff.termsDiff.added.map((t, i) => (
                <p key={`ta-${i}`} className="text-sm text-[#16a34a]">+ {t}</p>
              ))}
              {diff.termsDiff.removed.map((t, i) => (
                <p key={`tr-${i}`} className="text-sm line-through text-[#9ca3af]">{t}</p>
              ))}
            </div>
          )}

          {hasFilesDiff && (
            <div className="space-y-1">
              <p className="text-xs font-medium text-[#6b7280]">Attachments</p>
              {diff.filesDiff.added.map((f, i) => (
                <p key={`fa-${i}`} className="text-sm text-[#16a34a]">+ {f.name}</p>
              ))}
              {diff.filesDiff.removed.map((f, i) => (
                <p key={`fr-${i}`} className="text-sm line-through text-[#9ca3af]">{f.name}</p>
              ))}
            </div>
          )}
        </div>
      )}
    </EventCardShell>
  );
}
