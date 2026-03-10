"use client";

import { useState, useMemo } from "react";
import type { AuditEvent, DiffResult, User } from "@/services/activity";
import {
  resolveUserName,
  formatEventDate,
  computeDiff,
} from "@/services/activity";
import type { ParsedEvent } from "./types";
import { CreateEventCard } from "./CreateEventCard";
import { UpdateEventCard } from "./UpdateEventCard";
import { CancelEventCard } from "./CancelEventCard";
import { ReceiptEventCard } from "./ReceiptEventCard";
import { ForceCloseEventCard } from "./ForceCloseEventCard";

interface ActivityTimelineProps {
  events: AuditEvent[];
  users: User[];
  poProducts: any[];
}

export function ActivityTimeline({
  events,
  users,
  poProducts,
}: ActivityTimelineProps) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  function toggleExpand(id: string) {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  const parsed = useMemo(
    () =>
      events.map(
        (event): ParsedEvent => ({
          event,
          userName: resolveUserName(users, event.userId),
          formattedDate: formatEventDate(event.timestamp),
        })
      ),
    [events, users]
  );

  const diffs = useMemo(() => {
    const map = new Map<string, DiffResult>();
    for (const event of events) {
      if (
        event.action === "update" &&
        event.previousValues &&
        event.newValues
      ) {
        map.set(event._id, computeDiff(event.previousValues, event.newValues));
      }
    }
    return map;
  }, [events]);

  return (
    <div className="space-y-0">
      {parsed.map((p) => {
        const isExpanded = expandedIds.has(p.event._id);
        const toggle = () => toggleExpand(p.event._id);

        switch (p.event.action) {
          case "create":
            return (
              <CreateEventCard
                key={p.event._id}
                parsed={p}
                isExpanded={isExpanded}
                onToggle={toggle}
              />
            );
          case "update":
            return (
              <UpdateEventCard
                key={p.event._id}
                parsed={p}
                diff={
                  diffs.get(p.event._id) ?? {
                    productDiffs: [],
                    fieldDiffs: [],
                    summary: "No changes",
                  }
                }
                isExpanded={isExpanded}
                onToggle={toggle}
              />
            );
          case "cancel":
            return (
              <CancelEventCard
                key={p.event._id}
                parsed={p}
                isExpanded={isExpanded}
                onToggle={toggle}
              />
            );
          case "receipt_create":
            return (
              <ReceiptEventCard
                key={p.event._id}
                parsed={p}
                poProducts={poProducts}
                isExpanded={isExpanded}
                onToggle={toggle}
              />
            );
          case "forcefully_close_item":
            return (
              <ForceCloseEventCard
                key={p.event._id}
                parsed={p}
                poProducts={poProducts}
                isExpanded={isExpanded}
                onToggle={toggle}
              />
            );
          default:
            return null;
        }
      })}
    </div>
  );
}
