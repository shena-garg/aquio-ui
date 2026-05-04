"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { X, History } from "lucide-react";
import {
  getEntityActivityLog,
  getUsers,
  resolveUserName,
  formatEventDate,
} from "@/services/activity";
import { ReceiptEventCard } from "./ReceiptEventCard";

interface ReceiptActivityModalProps {
  receiptId: string;
  receiptLabel: string;
  poProducts: any[];
  orderType?: "purchase" | "sales";
  onClose: () => void;
}

export function ReceiptActivityModal({
  receiptId,
  receiptLabel,
  poProducts,
  orderType,
  onClose,
}: ReceiptActivityModalProps) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const { data: events = [], isLoading: eventsLoading } = useQuery({
    queryKey: ["receipt-activity", receiptId],
    queryFn: () => getEntityActivityLog("receipt", receiptId),
    staleTime: 0,
  });

  const { data: users = [] } = useQuery({
    queryKey: ["users"],
    queryFn: getUsers,
    staleTime: 5 * 60 * 1000,
  });

  function toggleExpand(id: string) {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const label = orderType === "sales" ? "Shipment" : "Receipt";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      {/* Modal */}
      <div className="relative z-10 bg-white rounded-xl shadow-2xl w-full max-w-xl max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#e5e7eb]">
          <div className="flex items-center gap-2">
            <History size={16} className="text-[#0d9488]" />
            <span className="text-sm font-semibold text-[#111827]">
              {label} Activity · {receiptLabel}
            </span>
          </div>
          <button
            onClick={onClose}
            className="text-[#6b7280] hover:text-[#111827] transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {eventsLoading ? (
            <div className="flex items-center justify-center h-24 text-sm text-[#6b7280]">
              Loading activity…
            </div>
          ) : events.length === 0 ? (
            <div className="flex items-center justify-center h-24 text-sm text-[#6b7280]">
              No activity recorded for this {label.toLowerCase()}.
            </div>
          ) : (
            <div className="space-y-0">
              {events.map((event) => {
                const parsed = {
                  event,
                  userName: resolveUserName(users, event.userId),
                  formattedDate: formatEventDate(event.timestamp),
                };
                return (
                  <ReceiptEventCard
                    key={event._id}
                    parsed={parsed}
                    poProducts={poProducts}
                    orderType={orderType}
                    isExpanded={expandedIds.has(event._id)}
                    onToggle={() => toggleExpand(event._id)}
                  />
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
