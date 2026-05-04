"use client";

import { EventCardShell } from "./EventCardShell";
import type { ParsedEvent } from "./types";

interface ConfirmEventCardProps {
  parsed: ParsedEvent;
  isExpanded: boolean;
  onToggle: () => void;
  orderType?: "purchase" | "sales";
}

export function ConfirmEventCard({
  parsed,
  isExpanded,
  onToggle,
  orderType,
}: ConfirmEventCardProps) {
  const nv = parsed.event.newValues ?? {};
  const refId = nv.supplierReferenceId as string | undefined;
  const refLabel = orderType === "sales" ? "Buyer Ref. ID" : "Supplier Ref. ID";

  return (
    <EventCardShell
      dotColor="bg-[#0d9488]"
      title="Order Confirmed"
      userName={parsed.userName}
      formattedDate={parsed.formattedDate}
      isExpanded={isExpanded}
      onToggle={onToggle}
    >
      {refId ? (
        <div>
          <p className="text-xs font-medium text-[#6b7280]">{refLabel}</p>
          <p className="text-sm text-[#111827]">{refId}</p>
        </div>
      ) : (
        <p className="text-sm text-[#6b7280]">Status changed to Confirmed.</p>
      )}
    </EventCardShell>
  );
}
