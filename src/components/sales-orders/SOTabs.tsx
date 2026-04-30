"use client";

import { cn } from "@/lib/utils";
import type { SOFilterStatus, SOStatusCounts } from "@/services/sales-orders";

interface Tab {
  label: string;
  status: SOFilterStatus | undefined;
  countKey: keyof SOStatusCounts;
}

const TABS: Tab[] = [
  { label: "All",          status: undefined,      countKey: "all"        },
  { label: "In Progress", status: "in_progress",  countKey: "inProgress" },
  { label: "Completed",   status: "completed",    countKey: "completed"  },
  { label: "Drafts",      status: "draft",        countKey: "draft"      },
  { label: "Cancelled",   status: "cancelled",    countKey: "cancelled"  },
  { label: "Delayed",     status: "delayed",      countKey: "delayed"    },
];

interface SOTabsProps {
  activeStatus: SOFilterStatus | undefined;
  counts: SOStatusCounts | undefined;
  onChange: (status: SOFilterStatus | undefined) => void;
}

export function SOTabs({ activeStatus, counts, onChange }: SOTabsProps) {
  return (
    <div className="flex overflow-x-auto border-b border-gray-200 bg-white px-4 sm:px-6">
      {TABS.map((tab) => {
        const isActive = tab.status === activeStatus;
        const count = counts?.[tab.countKey] ?? 0;

        return (
          <button
            key={tab.countKey}
            onClick={() => onChange(tab.status)}
            className={cn(
              "flex items-center gap-1.5 border-b-2 px-2.5 sm:px-4 py-3 text-[13px] font-medium transition-colors whitespace-nowrap",
              isActive
                ? "border-[#0d9488] text-[#0d9488]"
                : "border-transparent text-gray-500 hover:text-[#0F1720]"
            )}
          >
            {tab.label}
            {count > 0 && (
              <span
                className={cn(
                  "rounded-full px-1.5 py-0.5 text-[11px] font-semibold leading-none",
                  isActive
                    ? "bg-[#0d9488]/10 text-[#0d9488]"
                    : "bg-gray-100 text-gray-500"
                )}
              >
                {count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
