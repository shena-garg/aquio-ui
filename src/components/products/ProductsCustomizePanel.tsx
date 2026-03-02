"use client";

import { useRef, useState, useEffect } from "react";
import { X, Lock, GripVertical, Check } from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface ColumnConfig {
  key: string;
  label: string;
  locked: boolean;
}

interface ProductsCustomizePanelProps {
  open: boolean;
  onClose: () => void;
  columns: ColumnConfig[];
  visibleColumns: string[];
  columnOrder: string[];
  frozenCount: number;
  onVisibilityChange: (key: string, visible: boolean) => void;
  onReorder: (newOrder: string[]) => void;
  onFrozenCountChange: (count: number) => void;
  onColumnChange?: () => void;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function ProductsCustomizePanel({
  open,
  onClose,
  columns,
  visibleColumns,
  columnOrder,
  frozenCount,
  onVisibilityChange,
  onReorder,
  onFrozenCountChange,
  onColumnChange,
}: ProductsCustomizePanelProps) {
  const dragSrc = useRef<number | null>(null);
  const dragDst = useRef<number | null>(null);
  const [saved, setSaved] = useState(false);
  const savedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function notifyChange() {
    onColumnChange?.();
    setSaved(true);
    if (savedTimer.current) clearTimeout(savedTimer.current);
    savedTimer.current = setTimeout(() => setSaved(false), 2000);
  }

  useEffect(() => () => {
    if (savedTimer.current) clearTimeout(savedTimer.current);
  }, []);

  // Build the ordered list of all columns (visible + hidden) based on columnOrder
  const orderedCols = columnOrder
    .map((key) => columns.find((c) => c.key === key))
    .filter(Boolean) as ColumnConfig[];

  function handleDragEnd() {
    const from = dragSrc.current;
    const to = dragDst.current;
    dragSrc.current = null;
    dragDst.current = null;

    if (from === null || to === null || from === to) return;

    const fromCol = orderedCols[from];
    const toCol = orderedCols[to];
    // Disallow dragging locked columns or dragging over locked columns
    if (fromCol?.locked || toCol?.locked) return;

    const newOrder = [...columnOrder];
    const [moved] = newOrder.splice(from, 1);
    newOrder.splice(to, 0, moved);
    onReorder(newOrder);
    notifyChange();
  }

  return (
    <>
      {/* Backdrop */}
      <div
        aria-hidden
        className={`fixed inset-0 z-40 bg-black/30 transition-opacity duration-300 ${
          open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
        onClick={onClose}
      />

      {/* Slide-in panel */}
      <div
        className={`fixed right-0 top-0 z-50 flex h-full w-[320px] flex-col bg-white shadow-xl transition-transform duration-300 ease-in-out ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
          <h2 className="text-[14px] font-semibold text-[#0F1720]">Customize Columns</h2>
          <button
            onClick={onClose}
            className="rounded p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-[#0F1720]"
            aria-label="Close panel"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">

          {/* ── Section 1: Freeze Columns ────────────────────────────────── */}
          <div className="border-b border-gray-100 px-5 py-5">
            <p className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-gray-400">
              Freeze Columns
            </p>
            <div className="flex items-center gap-3">
              <button
                onClick={() => { onFrozenCountChange(Math.max(0, frozenCount - 1)); notifyChange(); }}
                disabled={frozenCount === 0}
                className="flex h-7 w-7 items-center justify-center rounded border border-gray-200 text-[16px] text-gray-600 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
                aria-label="Decrease freeze count"
              >
                ‹
              </button>
              <span className="w-4 text-center text-[14px] font-semibold text-[#0F1720]">
                {frozenCount}
              </span>
              <button
                onClick={() => { onFrozenCountChange(Math.min(4, frozenCount + 1)); notifyChange(); }}
                disabled={frozenCount === 4}
                className="flex h-7 w-7 items-center justify-center rounded border border-gray-200 text-[16px] text-gray-600 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
                aria-label="Increase freeze count"
              >
                ›
              </button>
            </div>
            <p className="mt-2 text-[12px] text-gray-400">
              {frozenCount === 0
                ? "No columns frozen"
                : `First ${frozenCount} column${frozenCount > 1 ? "s" : ""} will be frozen`}
            </p>
          </div>

          {/* ── Section 2: Columns ───────────────────────────────────────── */}
          <div className="px-5 py-5">
            <p className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-gray-400">
              Columns
            </p>
            <div className="space-y-0.5">
              {orderedCols.map((col, index) => (
                <div
                  key={col.key}
                  draggable={!col.locked}
                  onDragStart={() => { dragSrc.current = index; }}
                  onDragEnter={() => { dragDst.current = index; }}
                  onDragEnd={handleDragEnd}
                  onDragOver={(e) => e.preventDefault()}
                  className="flex items-center gap-2.5 rounded-md px-1 py-2.5 transition-colors hover:bg-gray-50"
                >
                  <GripVertical
                    className={`h-4 w-4 flex-shrink-0 ${
                      col.locked
                        ? "cursor-default text-gray-200"
                        : "cursor-grab text-gray-300 hover:text-gray-400 active:cursor-grabbing"
                    }`}
                  />
                  {col.locked ? (
                    <Lock className="h-3.5 w-3.5 flex-shrink-0 text-gray-300" />
                  ) : (
                    <input
                      type="checkbox"
                      checked={visibleColumns.includes(col.key)}
                      onChange={(e) => { onVisibilityChange(col.key, e.target.checked); notifyChange(); }}
                      className="h-3.5 w-3.5 flex-shrink-0 cursor-pointer accent-[#4A51D8]"
                    />
                  )}
                  <span className="text-[13px] text-[#0F1720]">{col.label}</span>
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* Footer — Auto-saved indicator */}
        <div className="border-t border-gray-100 px-5 py-3">
          <div
            className={`flex items-center gap-1.5 text-[12px] text-green-600 transition-opacity duration-500 ${
              saved ? "opacity-100" : "opacity-0"
            }`}
          >
            <Check className="h-3.5 w-3.5" />
            Auto-saved
          </div>
        </div>
      </div>
    </>
  );
}
