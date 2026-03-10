"use client";

import { EventCardShell } from "./EventCardShell";
import type { ParsedEvent } from "./types";

interface CancelEventCardProps {
  parsed: ParsedEvent;
  isExpanded: boolean;
  onToggle: () => void;
}

export function CancelEventCard({
  parsed,
  isExpanded,
  onToggle,
}: CancelEventCardProps) {
  const nv = parsed.event.newValues ?? {};
  const reason = nv.cancellationReason ?? "—";
  const notes = nv.cancellationNotes;

  return (
    <EventCardShell
      dotColor="bg-[#ef4444]"
      title="Order Cancelled"
      userName={parsed.userName}
      formattedDate={parsed.formattedDate}
      isExpanded={isExpanded}
      onToggle={onToggle}
    >
      <div className="space-y-2">
        <div>
          <p className="text-xs font-medium text-[#6b7280]">Reason</p>
          <p className="text-sm text-[#111827]">{reason}</p>
        </div>

        {notes != null && notes !== "" && (
          <div>
            <p className="text-xs font-medium text-[#6b7280]">Notes</p>
            <p className="text-sm text-[#111827]">{notes}</p>
          </div>
        )}
      </div>
    </EventCardShell>
  );
}
