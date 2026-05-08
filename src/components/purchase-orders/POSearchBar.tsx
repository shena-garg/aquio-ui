"use client";

import { useState, useEffect, useRef } from "react";
import { Filter, X, ChevronDown, Search, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { POActiveFilters, POFilterStatus } from "@/services/purchase-orders";
import { searchProducts } from "@/services/purchaseOrderForm";
import type { ProductSearchResult } from "@/services/purchaseOrderForm";
import { CustomSelect } from "@/components/ui/CustomSelect";

// ── Field config ──────────────────────────────────────────────────────────────

type FieldKey =
  | "poNumber"
  | "referenceId"
  | "supplierReferenceId"
  | "status"
  | "receiptStatus"
  | "issueDate"
  | "deliveryDate"
  | "supplierId"
  | "productValue";

interface TextField {
  key: FieldKey;
  label: string;
  type: "text";
  param: keyof POActiveFilters;
}

interface SelectField {
  key: FieldKey;
  label: string;
  type: "select";
  param: keyof POActiveFilters;
  options: { value: string; label: string }[];
}

interface DynamicSelectField {
  key: FieldKey;
  label: string;
  type: "dynamicSelect";
  param: keyof POActiveFilters;
}

interface ProductSearchField {
  key: FieldKey;
  label: string;
  type: "productSearch";
  param: keyof POActiveFilters;
}

interface DateRangeField {
  key: FieldKey;
  label: string;
  type: "dateRange";
  fromParam: keyof POActiveFilters;
  toParam: keyof POActiveFilters;
}

type FieldConfig = TextField | SelectField | DynamicSelectField | ProductSearchField | DateRangeField;

const FIELDS: FieldConfig[] = [
  { key: "poNumber",            label: "PO Number",       type: "text",          param: "poNumber"            },
  { key: "referenceId",         label: "Reference ID",    type: "text",          param: "referenceId"         },
  { key: "supplierReferenceId", label: "Supplier Ref. ID",type: "text",          param: "supplierReferenceId" },
  { key: "supplierId",          label: "Supplier",        type: "dynamicSelect", param: "supplierId"          },
  { key: "productValue",        label: "Product",         type: "productSearch", param: "productValue"        },
  {
    key: "status",
    label: "PO Status",
    type: "select",
    param: "status",
    options: [
      { value: "issued",    label: "Issued"    },
      { value: "confirmed", label: "Confirmed" },
      { value: "completed", label: "Completed" },
      { value: "draft",     label: "Draft"     },
      { value: "cancelled", label: "Cancelled" },
    ],
  },
  {
    key: "receiptStatus",
    label: "Receipt Status",
    type: "select",
    param: "receiptStatus",
    options: [
      { value: "pending",          label: "Pending"          },
      { value: "partial",          label: "Partial"          },
      { value: "completed",        label: "Completed"        },
      { value: "force closed",     label: "Force Closed"     },
      { value: "excess delivered", label: "Excess Delivered" },
    ],
  },
  { key: "issueDate",    label: "Issue Date",    type: "dateRange", fromParam: "issueDateFrom",    toParam: "issueDateTo"    },
  { key: "deliveryDate", label: "Delivery Date", type: "dateRange", fromParam: "deliveryDateFrom", toParam: "deliveryDateTo" },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function capitalize(str: string): string {
  return str.split(" ").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
}

function formatChipDate(iso: string): string {
  if (!iso) return iso;
  const [year, month, day] = iso.split("-").map(Number);
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  return `${day} ${months[month - 1]} ${year}`;
}

// ── Partner searchable dropdown ───────────────────────────────────────────────

function PartnerSearchInput({
  options,
  value,
  onChange,
  mobile,
}: {
  options: { value: string; label: string }[];
  value: string;
  onChange: (id: string) => void;
  mobile?: boolean;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({});
  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selectedLabel = options.find((o) => o.value === value)?.label ?? "";
  const displayValue = open ? query : selectedLabel;

  const filtered = query.trim()
    ? options.filter((o) => o.label.toLowerCase().includes(query.toLowerCase()))
    : options;

  function updatePosition() {
    if (!inputRef.current) return;
    const rect = inputRef.current.getBoundingClientRect();
    setDropdownStyle({
      position: "fixed",
      top: rect.bottom + 4,
      left: rect.left,
      width: Math.max(rect.width, 200),
      zIndex: 9999,
    });
  }

  function handleOpen() {
    setQuery("");
    setOpen(true);
    updatePosition();
  }

  function handleSelect(opt: { value: string; label: string }) {
    onChange(opt.value);
    setQuery("");
    setOpen(false);
  }

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
        setQuery("");
      }
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

  const inputCls = mobile
    ? "h-9 w-full flex-1 rounded-md border border-gray-200 bg-white px-2.5 pr-7 text-[13px] text-[#0F1720] outline-none focus:border-[#0d9488]"
    : "h-8 w-48 rounded-md border border-gray-200 bg-white px-2.5 pr-7 text-[13px] text-[#0F1720] outline-none focus:border-[#0d9488]";

  return (
    <div ref={wrapperRef} className={mobile ? "flex-1 relative" : "relative"}>
      <input
        ref={inputRef}
        type="text"
        placeholder="Select Supplier…"
        value={displayValue}
        onFocus={handleOpen}
        onChange={(e) => { setQuery(e.target.value); if (!open) setOpen(true); updatePosition(); }}
        className={inputCls}
        autoComplete="off"
      />
      <ChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
      {open && (
        <div style={dropdownStyle} className="bg-white border border-[#e5e7eb] rounded-md shadow-lg max-h-56 overflow-y-auto">
          {filtered.length > 0 ? (
            filtered.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => handleSelect(opt)}
                className={`w-full text-left px-3 py-2 text-[13px] hover:bg-[#f3f4f6] ${
                  opt.value === value ? "bg-[#f0fdfa] text-[#0d9488] font-medium" : "text-[#0F1720]"
                }`}
              >
                {opt.label}
              </button>
            ))
          ) : (
            <p className="px-3 py-2 text-[13px] text-gray-400">No matches</p>
          )}
        </div>
      )}
    </div>
  );
}

// ── Product searchable input ──────────────────────────────────────────────────

function ProductSearchInput({
  value,
  onSelect,
  mobile,
}: {
  value: string;
  onSelect: (id: string, name: string) => void;
  mobile?: boolean;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ProductSearchResult[]>([]);
  const [open, setOpen] = useState(false);
  const [searching, setSearching] = useState(false);
  const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({});
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  function updatePosition() {
    if (!inputRef.current) return;
    const rect = inputRef.current.getBoundingClientRect();
    setDropdownStyle({ position: "fixed", top: rect.bottom + 4, left: rect.left, width: Math.max(rect.width, 240), zIndex: 9999 });
  }

  function handleChange(term: string) {
    setQuery(term);
    if (timerRef.current) clearTimeout(timerRef.current);
    if (term.trim().length < 2) { setResults([]); setOpen(false); return; }
    timerRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await searchProducts(term);
        setResults(res);
        updatePosition();
        setOpen(true);
      } catch { setResults([]); }
      finally { setSearching(false); }
    }, 300);
  }

  function handleSelect(p: ProductSearchResult) {
    setQuery(p.name);
    setOpen(false);
    onSelect(p._id, p.name);
  }

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  useEffect(() => {
    if (!open) return;
    function reposition() { updatePosition(); }
    window.addEventListener("scroll", reposition, true);
    window.addEventListener("resize", reposition);
    return () => { window.removeEventListener("scroll", reposition, true); window.removeEventListener("resize", reposition); };
  }, [open]);

  // Clear query when external value is cleared
  useEffect(() => { if (!value) setQuery(""); }, [value]);

  const inputCls = mobile
    ? "h-9 w-full flex-1 rounded-md border border-gray-200 bg-white pl-7 pr-7 text-[13px] text-[#0F1720] outline-none focus:border-[#0d9488]"
    : "h-8 w-48 rounded-md border border-gray-200 bg-white pl-7 pr-7 text-[13px] text-[#0F1720] outline-none focus:border-[#0d9488]";

  return (
    <div ref={wrapperRef} className={mobile ? "flex-1 relative" : "relative"}>
      <Search className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
      <input
        ref={inputRef}
        type="text"
        placeholder="Search product…"
        value={query}
        onChange={(e) => handleChange(e.target.value)}
        onFocus={() => { updatePosition(); if (results.length > 0) setOpen(true); }}
        className={inputCls}
        autoComplete="off"
      />
      {searching && <Loader2 className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400 animate-spin" />}
      {open && (
        <div style={dropdownStyle} className="bg-white border border-[#e5e7eb] rounded-md shadow-lg max-h-56 overflow-y-auto">
          {results.length > 0 ? results.map((p) => (
            <button
              key={p._id}
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => handleSelect(p)}
              className={`w-full text-left px-3 py-2 hover:bg-[#f3f4f6] ${p._id === value ? "bg-[#f0fdfa]" : ""}`}
            >
              <div className="text-[13px] font-medium text-[#111827] leading-tight">{p.name}</div>
              {(p.categoryName || p.subCategoryName) && (
                <div className="text-[11px] text-[#9ca3af] mt-0.5 leading-tight">
                  {[p.categoryName, p.subCategoryName].filter(Boolean).join(" | ")}
                </div>
              )}
            </button>
          )) : !searching && query.length >= 2 && (
            <p className="px-3 py-2 text-[13px] text-gray-400">No products found</p>
          )}
        </div>
      )}
    </div>
  );
}

const SELECT_INPUT_CLASS =
  "h-8 cursor-pointer rounded-md border border-gray-200 bg-white px-2.5 text-[13px] text-[#0F1720] outline-none focus:border-[#0d9488]";

// ── Props ─────────────────────────────────────────────────────────────────────

export interface PartnerOption {
  value: string;
  label: string;
}

interface POSearchBarProps {
  activeFilters: POActiveFilters;
  activeStatus?: POFilterStatus;
  partnerOptions?: PartnerOption[];
  onSearch: (params: POActiveFilters) => void;
  onReset: () => void;
  onRemoveFilter: (key: keyof POActiveFilters) => void;
  toolbarRight?: React.ReactNode;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function POSearchBar({
  activeFilters,
  activeStatus,
  partnerOptions = [],
  onSearch,
  onReset,
  onRemoveFilter,
  toolbarRight,
}: POSearchBarProps) {
  const [selectedField, setSelectedField] = useState<FieldKey>("poNumber");

  const hiddenKeys = new Set<FieldKey>();
  if (activeStatus === "completed" || activeStatus === "draft" || activeStatus === "cancelled") {
    hiddenKeys.add("status");
  }
  if (activeStatus === "draft" || activeStatus === "cancelled") {
    hiddenKeys.add("receiptStatus");
  }
  const visibleFields = FIELDS
    .filter((f) => !hiddenKeys.has(f.key))
    .map((f) => {
      if (f.key === "status" && activeStatus === "in_progress" && f.type === "select") {
        return { ...f, options: [
          { value: "issued",    label: "Issued"    },
          { value: "confirmed", label: "Confirmed" },
        ]};
      }
      if (f.key === "status" && activeStatus === "delayed" && f.type === "select") {
        return { ...f, options: [
          { value: "issued",    label: "Issued"    },
          { value: "confirmed", label: "Confirmed" },
          { value: "completed", label: "Completed" },
        ]};
      }
      if (f.key === "receiptStatus" && activeStatus === "in_progress" && f.type === "select") {
        return { ...f, options: [
          { value: "pending", label: "Pending" },
          { value: "partial", label: "Partial" },
        ]};
      }
      if (f.key === "receiptStatus" && activeStatus === "completed" && f.type === "select") {
        return { ...f, options: [
          { value: "completed",        label: "Completed"        },
          { value: "force closed",     label: "Force Closed"     },
          { value: "excess delivered", label: "Excess Delivered" },
        ]};
      }
      return f;
    });

  useEffect(() => {
    if (!visibleFields.find((f) => f.key === selectedField)) {
      setSelectedField("poNumber");
      setInputValue("");
    }
  }, [activeStatus]); // eslint-disable-line react-hooks/exhaustive-deps
  const [inputValue, setInputValue] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [productLabel, setProductLabel] = useState("");
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);

  const currentField = visibleFields.find((f) => f.key === selectedField) ?? visibleFields[0];

  function resetInputState() {
    setInputValue("");
    setDateFrom("");
    setDateTo("");
  }

  function resetAllLocalState() {
    setSelectedField("poNumber");
    setInputValue("");
    setDateFrom("");
    setDateTo("");
  }

  function handleFieldChange(key: FieldKey) {
    setSelectedField(key);
    resetInputState();
  }

  const isSearchDisabled =
    currentField.type === "dateRange" ? !dateFrom && !dateTo : !inputValue;

  function handleSearch() {
    if (isSearchDisabled) return;

    if (currentField.type === "dateRange") {
      const params: POActiveFilters = {};
      if (dateFrom) (params as Record<string, string>)[currentField.fromParam] = dateFrom;
      if (dateTo)   (params as Record<string, string>)[currentField.toParam]   = dateTo;
      onSearch(params);
    } else {
      onSearch({ [currentField.param]: inputValue });
    }
    resetAllLocalState();
  }

  function handleReset() {
    resetAllLocalState();
    onReset();
  }

  function formatChip(key: keyof POActiveFilters, value: string): string {
    if (key === "supplierId") {
      const name = partnerOptions.find((o) => o.value === value)?.label ?? value;
      return `Supplier: ${name}`;
    }
    if (key === "productValue") return `Product: ${productLabel || value}`;
    if (key === "delaySeverity") {
      const labels: Record<string, string> = { watch: "Delay: Watch (1–2d)", warning: "Delay: Warning (3–6d)", critical: "Delay: Critical (7+d)" };
      return labels[value] ?? `Delay: ${value}`;
    }
    const staticFormatters: Partial<Record<keyof POActiveFilters, (v: string) => string>> = {
      poNumber:            (v) => `PO Number: ${v}`,
      referenceId:         (v) => `Reference ID: ${v}`,
      supplierReferenceId: (v) => `Supplier Ref. ID: ${v}`,
      status:              (v) => `PO Status: ${capitalize(v)}`,
      receiptStatus:       (v) => `Receipt Status: ${capitalize(v)}`,
      issueDateFrom:       (v) => `Issue Date From: ${formatChipDate(v)}`,
      issueDateTo:         (v) => `Issue Date To: ${formatChipDate(v)}`,
      deliveryDateFrom:    (v) => `Delivery Date From: ${formatChipDate(v)}`,
      deliveryDateTo:      (v) => `Delivery Date To: ${formatChipDate(v)}`,
    };
    return staticFormatters[key]?.(value) ?? `${key}: ${value}`;
  }

  const activeEntries = (
    Object.entries(activeFilters) as [keyof POActiveFilters, string][]
  ).filter(([, v]) => Boolean(v));

  const hasFilters = activeEntries.length > 0;

  const valueInput = (mobile?: boolean) => {
    const cls = mobile
      ? "h-9 flex-1 border-gray-200 text-[13px] shadow-none focus-visible:border-[#0d9488] focus-visible:ring-[#0d9488]/20"
      : "h-8 w-full lg:w-56 border-gray-200 text-[13px] shadow-none focus-visible:border-[#0d9488] focus-visible:ring-[#0d9488]/20";
    const selectCls = mobile
      ? "h-9 flex-1 cursor-pointer rounded-md border border-gray-200 bg-white px-2 text-[13px] text-[#0F1720] outline-none focus:border-[#0d9488]"
      : SELECT_INPUT_CLASS;

    if (currentField.type === "text") {
      return (
        <Input
          type="text"
          placeholder={`Search by ${currentField.label}…`}
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          className={cls}
        />
      );
    }
    if (currentField.type === "select") {
      return (
        <CustomSelect
          value={inputValue}
          onChange={setInputValue}
          options={currentField.options}
          placeholder={`Select ${currentField.label}…`}
          className={mobile ? "h-9 flex-1" : "h-8 w-48"}
        />
      );
    }
    if (currentField.type === "dynamicSelect") {
      return (
        <PartnerSearchInput
          options={partnerOptions}
          value={inputValue}
          onChange={setInputValue}
          mobile={mobile}
        />
      );
    }
    if (currentField.type === "productSearch") {
      return (
        <ProductSearchInput
          value={inputValue}
          onSelect={(id, name) => { setInputValue(id); setProductLabel(name); }}
          mobile={mobile}
        />
      );
    }
    if (currentField.type === "dateRange") {
      if (mobile) {
        return (
          <div className="flex items-center gap-1.5 flex-1">
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="h-9 flex-1 rounded-md border border-gray-200 bg-white px-2 text-[12px] text-[#0F1720] outline-none focus:border-[#0d9488]"
            />
            <span className="text-[12px] text-gray-400">–</span>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="h-9 flex-1 rounded-md border border-gray-200 bg-white px-2 text-[12px] text-[#0F1720] outline-none focus:border-[#0d9488]"
            />
          </div>
        );
      }
      return (
        <div className="flex items-center gap-2">
          <span className="text-[13px] text-gray-500">From</span>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className={`${SELECT_INPUT_CLASS} w-[130px]`}
          />
          <span className="text-[13px] text-gray-500">To</span>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className={`${SELECT_INPUT_CLASS} w-[130px]`}
          />
        </div>
      );
    }
    return null;
  };

  const searchFields = (mobile?: boolean) => (
    <>
      <CustomSelect
        value={selectedField}
        onChange={(key) => handleFieldChange(key as FieldKey)}
        options={visibleFields.map((f) => ({ value: f.key, label: f.label }))}
        className={mobile ? "h-9 w-[130px] flex-shrink-0" : "h-8"}
      />

      {valueInput(mobile)}

      {!mobile && (
        <>
          <Button
            onClick={handleSearch}
            disabled={isSearchDisabled}
            size="sm"
            className="h-8 px-4 text-[13px] !bg-[#0d9488] hover:!bg-[#0f766e] text-white disabled:opacity-50"
          >
            Search
          </Button>
          <Button
            onClick={handleReset}
            variant="outline"
            size="sm"
            className="h-8 border-gray-200 px-4 text-[13px] text-gray-600 hover:text-[#0F1720]"
          >
            Reset
          </Button>
        </>
      )}
    </>
  );

  const filterChips = hasFilters && (
    <div className="flex flex-wrap items-center gap-2 px-4 sm:px-6 pb-3">
      {activeEntries.map(([key, value]) => (
        <span
          key={key}
          className="flex items-center gap-1 rounded-full border border-[#0d9488]/20 bg-[#0d9488]/10 px-3 py-1 text-xs text-[#0d9488]"
        >
          {formatChip(key, value)}
          <button
            onClick={() => onRemoveFilter(key)}
            className="ml-0.5 rounded-full hover:text-[#0f766e]"
            aria-label={`Remove ${key} filter`}
          >
            <X className="h-3 w-3" />
          </button>
        </span>
      ))}
      {activeEntries.length > 1 && (
        <button
          onClick={onReset}
          className="text-xs text-gray-400 underline hover:text-red-500"
        >
          Clear All
        </button>
      )}
    </div>
  );

  const delaySeverityPills = activeStatus === "delayed" && (
    <div className="flex items-center gap-2 px-4 sm:px-6 pb-3 pt-0">
      <span className="text-[11px] text-gray-400 font-medium">Filter by severity:</span>
      {(["watch", "warning", "critical"] as const).map((sev) => {
        const styles = {
          watch:    { bg: "bg-[#fffbeb]", text: "text-[#d97706]", border: "border-[#fde68a]", activeBg: "!bg-[#d97706]",    label: "Watch (1–2d)"    },
          warning:  { bg: "bg-[#fff7ed]", text: "text-[#ea580c]", border: "border-[#fed7aa]", activeBg: "!bg-[#ea580c]",    label: "Warning (3–6d)"  },
          critical: { bg: "bg-[#fef2f2]", text: "text-[#dc2626]", border: "border-[#fecaca]", activeBg: "!bg-[#dc2626]",    label: "Critical (7+d)"  },
        }[sev];
        const isActive = activeFilters.delaySeverity === sev;
        return (
          <button
            key={sev}
            type="button"
            onClick={() =>
              onSearch({ delaySeverity: isActive ? undefined : sev })
            }
            className={[
              "inline-flex items-center rounded-full border px-3 py-0.5 text-[11px] font-semibold transition-colors",
              isActive
                ? `${styles.activeBg} text-white border-transparent`
                : `${styles.bg} ${styles.text} ${styles.border} hover:opacity-80`,
            ].join(" ")}
          >
            {styles.label}
          </button>
        );
      })}
    </div>
  );

  return (
    <div className="bg-white">
      {/* ── Desktop search row ── */}
      <div className="hidden lg:flex flex-wrap items-center gap-2 px-6 py-3">
        {searchFields()}
      </div>

      {/* ── Delay severity quick-filter (Delayed tab only) ── */}
      <div className="hidden lg:block">
        {delaySeverityPills}
      </div>

      {/* ── Delay severity quick-filter (Delayed tab only, mobile) ── */}
      <div className="lg:hidden">
        {delaySeverityPills}
      </div>

      {/* ── Mobile: Filter button + chips ── */}
      <div className="lg:hidden px-4 py-3">
        {!mobileFilterOpen && (
          <div className="flex items-center gap-2 flex-wrap">
            {activeEntries.map(([key, value]) => (
              <span
                key={key}
                className="flex items-center gap-1 rounded-full border border-[#0d9488]/20 bg-[#0d9488]/10 px-2.5 py-1 text-[11px] text-[#0d9488]"
              >
                {formatChip(key, value)}
                <button
                  onClick={() => onRemoveFilter(key)}
                  className="ml-0.5 rounded-full hover:text-[#0f766e]"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
            {activeEntries.length > 1 && (
              <button onClick={onReset} className="text-[11px] text-gray-400 underline hover:text-red-500">
                Clear All
              </button>
            )}
            <div className="ml-auto flex items-center gap-2 flex-shrink-0">
              {toolbarRight}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setMobileFilterOpen(true)}
                className="h-8 gap-1.5 border-gray-200 text-[13px] text-gray-600"
              >
                <Filter className="h-3.5 w-3.5" />
                Filters
                {hasFilters && (
                  <span className="ml-1 rounded-full bg-[#0d9488] text-white text-[10px] px-1.5 py-0.5 leading-none">
                    {activeEntries.length}
                  </span>
                )}
              </Button>
            </div>
          </div>
        )}
        {mobileFilterOpen && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-gray-400">Filter by</span>
              <button
                onClick={() => setMobileFilterOpen(false)}
                className="text-[12px] text-gray-400 hover:text-gray-600 transition-colors"
              >
                Close
              </button>
            </div>
            <div className="flex items-center gap-2">
              {searchFields(true)}
            </div>
            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => { handleReset(); setMobileFilterOpen(false); }}
                className="text-[13px] text-gray-400 hover:text-red-500 transition-colors"
              >
                Reset
              </button>
              <Button
                onClick={() => { handleSearch(); setMobileFilterOpen(false); }}
                disabled={isSearchDisabled}
                size="sm"
                className="h-9 px-6 text-[13px] !bg-[#0d9488] hover:!bg-[#0f766e] text-white disabled:opacity-50"
              >
                Search
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* ── Desktop filter chips ── */}
      <div className="hidden lg:block">
        {filterChips}
      </div>
    </div>
  );
}
