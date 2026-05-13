"use client";

import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

interface CustomSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  disabled?: boolean;
  error?: boolean;
  className?: string;
}

export function CustomSelect({
  value,
  onChange,
  options,
  placeholder = "Select…",
  disabled = false,
  error = false,
  className,
}: CustomSelectProps) {
  const [open, setOpen] = useState(false);
  const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({});
  const wrapperRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const selectedLabel = options.find((o) => o.value === value)?.label;

  function updatePosition() {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const maxWidth = window.innerWidth - rect.left - 8;
    setDropdownStyle({
      position: "fixed",
      top: rect.bottom + 4,
      left: rect.left,
      width: Math.min(rect.width, maxWidth),
      zIndex: 9999,
    });
  }

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (
        wrapperRef.current?.contains(e.target as Node) ||
        dropdownRef.current?.contains(e.target as Node)
      ) return;
      setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  useEffect(() => {
    if (!open) return;
    function reposition() { updatePosition(); }
    window.addEventListener("scroll", reposition, true);
    window.addEventListener("resize", reposition);
    return () => {
      window.removeEventListener("scroll", reposition, true);
      window.removeEventListener("resize", reposition);
    };
  }, [open]);

  return (
    <div ref={wrapperRef} className="relative">
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        onClick={() => {
          if (!disabled) {
            if (!open) updatePosition();
            setOpen((o) => !o);
          }
        }}
        className={cn(
          "flex w-full items-center justify-between gap-1 rounded-md border bg-white px-2.5 text-[13px] outline-none transition-colors",
          error
            ? "border-[#dc2626]"
            : open
            ? "border-[#0d9488]"
            : "border-[#e5e7eb] hover:border-gray-300",
          disabled && "cursor-not-allowed opacity-50",
          selectedLabel ? "text-[#111827]" : "text-gray-400",
          className
        )}
      >
        <span className="truncate">{selectedLabel ?? placeholder}</span>
        <ChevronDown
          className={cn(
            "h-3.5 w-3.5 flex-shrink-0 text-gray-400 transition-transform",
            open && "rotate-180"
          )}
        />
      </button>
      {open && !disabled && createPortal(
        <div
          ref={dropdownRef}
          style={dropdownStyle}
          className="bg-white border border-[#e5e7eb] rounded-md shadow-lg overflow-y-auto max-h-64"
        >
          {options.map((opt) => (
            <button
              key={opt.value}
              type="button"
              disabled={opt.disabled}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                onChange(opt.value);
                setOpen(false);
              }}
              className={cn(
                "w-full text-left px-3 py-2 text-[13px] transition-colors truncate",
                opt.value === value
                  ? "bg-[#f0fdfa] text-[#0d9488] font-medium"
                  : "text-[#0F1720] hover:bg-[#f3f4f6]",
                opt.disabled && "cursor-not-allowed opacity-40"
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>,
        document.body
      )}
    </div>
  );
}
