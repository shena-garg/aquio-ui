"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { POActiveFilters } from "@/services/purchase-orders";

// ── Field config ──────────────────────────────────────────────────────────────

type FieldKey =
  | "poNumber"
  | "referenceId"
  | "supplierReferenceId"
  | "status"
  | "receiptStatus"
  | "issueDate"
  | "deliveryDate";

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

interface DateRangeField {
  key: FieldKey;
  label: string;
  type: "dateRange";
  fromParam: keyof POActiveFilters;
  toParam: keyof POActiveFilters;
}

type FieldConfig = TextField | SelectField | DateRangeField;

const FIELDS: FieldConfig[] = [
  { key: "poNumber",            label: "PO Number",       type: "text",      param: "poNumber"            },
  { key: "referenceId",         label: "Reference ID",    type: "text",      param: "referenceId"         },
  { key: "supplierReferenceId", label: "Supplier Ref. ID",type: "text",      param: "supplierReferenceId" },
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

const CHIP_FORMATTERS: Record<keyof POActiveFilters, (v: string) => string> = {
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

const SELECT_INPUT_CLASS =
  "h-8 cursor-pointer rounded-md border border-gray-200 bg-white px-2.5 text-[13px] text-[#0F1720] outline-none focus:border-[#0d9488]";

// ── Props ─────────────────────────────────────────────────────────────────────

interface POSearchBarProps {
  activeFilters: POActiveFilters;
  onSearch: (params: POActiveFilters) => void;
  onReset: () => void;
  onRemoveFilter: (key: keyof POActiveFilters) => void;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function POSearchBar({
  activeFilters,
  onSearch,
  onReset,
  onRemoveFilter,
}: POSearchBarProps) {
  const [selectedField, setSelectedField] = useState<FieldKey>("poNumber");
  const [inputValue, setInputValue] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const currentField = FIELDS.find((f) => f.key === selectedField)!;

  // Clears input values only — used when the field selector changes
  function resetInputState() {
    setInputValue("");
    setDateFrom("");
    setDateTo("");
  }

  // Clears the entire local search bar state — used after search is submitted or reset
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
      if (dateFrom) params[currentField.fromParam] = dateFrom;
      if (dateTo)   params[currentField.toParam]   = dateTo;
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

  const activeEntries = (
    Object.entries(activeFilters) as [keyof POActiveFilters, string][]
  ).filter(([, v]) => Boolean(v));

  const hasFilters = activeEntries.length > 0;

  return (
    <div className="bg-white">

      {/* ── Search row ─────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-2 px-6 py-3">

        {/* Field selector */}
        <select
          value={selectedField}
          onChange={(e) => handleFieldChange(e.target.value as FieldKey)}
          className={SELECT_INPUT_CLASS}
        >
          {FIELDS.map((f) => (
            <option key={f.key} value={f.key}>{f.label}</option>
          ))}
        </select>

        {/* Text input */}
        {currentField.type === "text" && (
          <Input
            type="text"
            placeholder={`Search by ${currentField.label}…`}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            className="h-8 w-56 border-gray-200 text-[13px] shadow-none focus-visible:border-[#0d9488] focus-visible:ring-[#0d9488]/20"
          />
        )}

        {/* Select input */}
        {currentField.type === "select" && (
          <select
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            className={SELECT_INPUT_CLASS}
          >
            <option value="">Select {currentField.label}…</option>
            {currentField.options.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        )}

        {/* Date range inputs */}
        {currentField.type === "dateRange" && (
          <div className="flex items-center gap-2">
            <span className="text-[13px] text-gray-500">From</span>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className={SELECT_INPUT_CLASS}
            />
            <span className="text-[13px] text-gray-500">To</span>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className={SELECT_INPUT_CLASS}
            />
          </div>
        )}

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
      </div>

      {/* ── Active filter chips ─────────────────────────────────────────── */}
      {hasFilters && (
        <div className="flex flex-wrap items-center gap-2 px-6 pb-3">
          {activeEntries.map(([key, value]) => (
            <span
              key={key}
              className="flex items-center gap-1 rounded-full border border-[#0d9488]/20 bg-[#0d9488]/10 px-3 py-1 text-xs text-[#0d9488]"
            >
              {CHIP_FORMATTERS[key]?.(value) ?? `${key}: ${value}`}
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
      )}

    </div>
  );
}
