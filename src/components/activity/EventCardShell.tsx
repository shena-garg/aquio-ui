"use client";

import { ChevronDown, ChevronRight } from "lucide-react";

interface EventCardShellProps {
  dotColor: string;
  title: string;
  subtitle?: string;
  badge?: React.ReactNode;
  userName: string;
  formattedDate: string;
  isExpanded: boolean;
  onToggle: () => void;
  children?: React.ReactNode;
}

export function EventCardShell({
  dotColor,
  title,
  subtitle,
  badge,
  userName,
  formattedDate,
  isExpanded,
  onToggle,
  children,
}: EventCardShellProps) {
  return (
    <div className="bg-white border border-[#e5e7eb] rounded-lg p-4 mb-3">
      <div className="flex items-start gap-3">
        {/* Colored dot */}
        <div
          className={`mt-1.5 h-2.5 w-2.5 rounded-full flex-shrink-0 ${dotColor}`}
        />

        <div className="min-w-0 flex-1">
          {/* Header row */}
          <button
            type="button"
            onClick={onToggle}
            className="flex w-full items-start justify-between text-left"
          >
            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between">
                <span className="text-sm font-semibold text-[#111827]">
                  {title}
                </span>
                <span className="text-xs text-[#9ca3af] whitespace-nowrap ml-4">
                  {formattedDate}
                </span>
              </div>

              <p className="text-xs italic text-[#6b7280] mt-0.5">
                By {userName}
              </p>

              {badge && <div className="mt-1">{badge}</div>}

              {subtitle && (
                <p className="text-xs text-[#9ca3af] mt-0.5">{subtitle}</p>
              )}
            </div>

            <div className="ml-2 mt-0.5 flex-shrink-0">
              {isExpanded ? (
                <ChevronDown className="h-4 w-4 text-[#9ca3af]" />
              ) : (
                <ChevronRight className="h-4 w-4 text-[#9ca3af]" />
              )}
            </div>
          </button>

          {/* Expanded content */}
          {isExpanded && <div className="mt-3">{children}</div>}
        </div>
      </div>
    </div>
  );
}
