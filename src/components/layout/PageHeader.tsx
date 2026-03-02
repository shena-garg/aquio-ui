"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";

const LIMIT_OPTIONS = [10, 25, 50, 100];

interface PageHeaderProps {
  title: string;
  total: number;
  page: number;
  limit: number;
  onPageChange: (page: number) => void;
  onLimitChange: (limit: number) => void;
  actions?: React.ReactNode;
}

export function PageHeader({
  title,
  total,
  page,
  limit,
  onPageChange,
  onLimitChange,
  actions,
}: PageHeaderProps) {
  const totalPages = Math.ceil(total / limit);
  const start = total === 0 ? 0 : (page - 1) * limit + 1;
  const end = Math.min(page * limit, total);

  return (
    <div className="flex h-[56px] flex-shrink-0 items-center justify-between border-b border-gray-200 bg-white px-6">

      {/* Title */}
      <h1 className="text-[15px] font-semibold text-[#0F1720]">{title}</h1>

      {/* Right controls */}
      <div className="flex items-center gap-4">

        {/* Record range */}
        <span className="text-[13px] text-gray-500">
          {start}–{end} of {total}
        </span>

        {/* Rows per page */}
        <div className="flex items-center gap-1.5">
          <span className="text-[13px] text-gray-500">Rows</span>
          <select
            value={limit}
            onChange={(e) => {
              onLimitChange(Number(e.target.value));
              onPageChange(1);
            }}
            className="cursor-pointer rounded-md border border-gray-200 bg-white px-2 py-1 text-[13px] text-[#0F1720] outline-none focus:border-[#4A51D8]"
          >
            {LIMIT_OPTIONS.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
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

        {/* Actions slot */}
        {actions && <div className="flex items-center gap-2">{actions}</div>}

      </div>
    </div>
  );
}
