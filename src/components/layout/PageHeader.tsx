"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { CustomSelect } from "@/components/ui/CustomSelect";

const LIMIT_OPTIONS = [10, 25, 50, 100];

interface PageHeaderProps {
  title: string;
  left?: React.ReactNode;
  right?: React.ReactNode;
  total?: number;
  page?: number;
  limit?: number;
  onPageChange?: (page: number) => void;
  onLimitChange?: (limit: number) => void;
  actions?: React.ReactNode;
}

export function PageHeader({
  title,
  left,
  right,
  total,
  page,
  limit,
  onPageChange,
  onLimitChange,
  actions,
}: PageHeaderProps) {
  const showPagination = total != null && page != null && limit != null && onPageChange && onLimitChange;
  const totalPages = showPagination ? Math.ceil(total / limit) : 0;
  const start = showPagination ? (total === 0 ? 0 : (page - 1) * limit + 1) : 0;
  const end = showPagination ? Math.min(page * limit, total) : 0;

  return (
    <div className="flex flex-shrink-0 items-center justify-between border-b border-[#e5e7eb] bg-white px-4 sm:px-6 h-[55px] gap-2 sm:gap-3 sticky top-[56px] lg:top-0 z-20">

      {/* Left side */}
      <div className="flex items-center gap-2.5 min-w-0">
        <span className="text-[16px] sm:text-[18px] font-semibold text-[#111827] truncate">{title}</span>
        {left}
      </div>

      {/* Right side */}
      <div className="flex items-center gap-3 sm:gap-4 flex-shrink-0">

        {showPagination && (
          <>
            {/* Record range */}
            <span className="text-[12px] sm:text-[13px] text-gray-500 whitespace-nowrap">
              {start}–{end} of {total}
            </span>

            {/* Rows per page – hidden on very small screens */}
            <div className="hidden sm:flex items-center gap-1.5">
              <span className="text-[13px] text-gray-500">Rows</span>
              <CustomSelect
                value={String(limit)}
                onChange={(val) => {
                  onLimitChange(Number(val));
                  onPageChange(1);
                }}
                options={LIMIT_OPTIONS.map((opt) => ({ value: String(opt), label: String(opt) }))}
                className="h-7 w-16"
              />
            </div>

            {/* Prev / Next arrows */}
            <div className="flex items-center gap-0.5">
              <button
                onClick={() => onPageChange(page - 1)}
                disabled={page <= 1}
                aria-label="Previous page"
                className="rounded p-1 text-gray-500 transition-colors hover:bg-gray-100 hover:text-[#0F1720] disabled:cursor-not-allowed disabled:opacity-40"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                onClick={() => onPageChange(page + 1)}
                disabled={page >= totalPages}
                aria-label="Next page"
                className="rounded p-1 text-gray-500 transition-colors hover:bg-gray-100 hover:text-[#0F1720] disabled:cursor-not-allowed disabled:opacity-40"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </>
        )}

        {/* Actions slot (legacy) */}
        {actions && <div className="flex items-center gap-2">{actions}</div>}

        {/* Right slot */}
        {right}

      </div>
    </div>
  );
}
