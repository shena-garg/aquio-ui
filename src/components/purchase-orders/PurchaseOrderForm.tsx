"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Lock,
  Plus,
  X,
  Paperclip,
  Loader2,
  Trash2,
  Search,
  CalendarDays,
  AlertTriangle,
  Settings,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { uploadFile } from "@/lib/api-client";
import { organizationSettingsService } from "@/services/organization-settings";
import { productsService } from "@/services/products";
import { QuickCreateProductModal } from "@/components/products/QuickCreateProductModal";
import {
  getVendorCompaniesWithLocations,
  getMyOrganization,
  getPOFormSettings,
  createPurchaseOrder,
  updatePurchaseOrder,
  getOrderForEdit,
  buildPartnerPayload,
  buildProductLine,
  searchProducts,
  calculateLineTotal,
  type VendorCompany,
  type Organization,
  type POFormSettings,
  type ProductSearchResult,
  type ProductVariant,
} from "@/services/purchaseOrderForm";

// ---------------------------------------------------------------------------
// Product row type
// ---------------------------------------------------------------------------

interface ProductRow {
  id: string;
  product: ProductSearchResult | null;
  variant: ProductVariant | null;
  quantity: number;
  price: number;
  quantityStr: string;
  priceStr: string;
  isUnavailable?: boolean;
}

let rowIdCounter = 0;
function nextRowId(): string {
  return `row-${++rowIdCounter}`;
}

function emptyRow(): ProductRow {
  return { id: nextRowId(), product: null, variant: null, quantity: 0, price: 0, quantityStr: "", priceStr: "" };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatNumericInput(raw: string, maxDecimals: number): string {
  if (!raw) return raw;
  const [intPart, ...decParts] = raw.split(".");
  const intNum = parseInt(intPart, 10);
  const formattedInt = intPart === "" ? "" : isNaN(intNum) ? intPart : intNum.toLocaleString("en-IN");
  if (decParts.length > 0) {
    const dec = decParts.join("").slice(0, maxDecimals);
    return `${formattedInt}.${dec}`;
  }
  return formattedInt;
}

function todayString(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function defaultDeliveryDate(): string {
  const d = new Date();
  d.setDate(d.getDate() + 16);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

type CompanyOption = (VendorCompany | Organization) & { _type: "vendor" | "own" };

function numberToIndianWords(n: number): string {
  if (n === 0) return "Zero";
  const ones = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine",
    "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
  const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

  function twoDigits(num: number): string {
    if (num < 20) return ones[num];
    return tens[Math.floor(num / 10)] + (num % 10 ? " " + ones[num % 10] : "");
  }

  function threeDigits(num: number): string {
    if (num >= 100) {
      return ones[Math.floor(num / 100)] + " Hundred" + (num % 100 ? " " + twoDigits(num % 100) : "");
    }
    return twoDigits(num);
  }

  const intPart = Math.floor(Math.abs(n));
  const decPart = Math.round((Math.abs(n) - intPart) * 100);
  const parts: string[] = [];

  let rem = intPart;
  const crore = Math.floor(rem / 10000000);
  rem %= 10000000;
  const lakh = Math.floor(rem / 100000);
  rem %= 100000;
  const thousand = Math.floor(rem / 1000);
  rem %= 1000;

  if (crore > 0) parts.push(twoDigits(crore) + " Crore");
  if (lakh > 0) parts.push(twoDigits(lakh) + " Lakh");
  if (thousand > 0) parts.push(twoDigits(thousand) + " Thousand");
  if (rem > 0) parts.push(threeDigits(rem));

  let result = parts.join(" ") || "Zero";
  if (n < 0) result = "Minus " + result;
  if (decPart > 0) result += " and " + twoDigits(decPart) + " Paise";
  return result;
}

// ---------------------------------------------------------------------------
// Loading skeleton
// ---------------------------------------------------------------------------

function FullPageSkeleton() {
  return (
    <div className="flex flex-col h-full">
      <div className="flex h-[55px] flex-shrink-0 items-center justify-between border-b border-[#e5e7eb] bg-white px-6">
        <div className="h-5 w-48 rounded bg-gray-200 animate-pulse" />
        <div className="flex gap-2">
          <div className="h-8 w-20 rounded bg-gray-200 animate-pulse" />
          <div className="h-8 w-28 rounded bg-gray-200 animate-pulse" />
          <div className="h-8 w-28 rounded bg-gray-200 animate-pulse" />
        </div>
      </div>
      <div className="flex-1 overflow-auto">
        <div className="max-w-5xl mx-auto px-6 py-6 space-y-6">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="rounded-[10px] border border-[#e5e7eb] bg-white p-6 animate-pulse"
            >
              <div className="h-4 w-32 rounded bg-gray-200 mb-4" />
              <div className="grid grid-cols-3 gap-6">
                {Array.from({ length: 3 }).map((_, j) => (
                  <div key={j} className="space-y-3">
                    <div className="h-3 w-20 rounded bg-gray-200" />
                    <div className="h-9 w-full rounded bg-gray-200" />
                    <div className="h-3 w-28 rounded bg-gray-200" />
                    <div className="h-9 w-full rounded bg-gray-200" />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Partner column sub-component
// ---------------------------------------------------------------------------

function PartnerCard({
  label,
  companies,
  selectedCompanyId,
  selectedLocationId,
  onCompanyChange,
  onLocationChange,
  disabled,
  collapsed,
  headerRight,
}: {
  label: string;
  companies: CompanyOption[];
  selectedCompanyId: string;
  selectedLocationId: string;
  onCompanyChange: (id: string) => void;
  onLocationChange: (id: string) => void;
  disabled?: boolean;
  collapsed?: boolean;
  headerRight?: React.ReactNode;
}) {
  const company = companies.find((c) => c._id === selectedCompanyId);
  const locations = company?.locations ?? [];
  const location = locations.find((l) => l._id === selectedLocationId);

  return (
    <div className="flex flex-col gap-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <span className="text-[13px] font-medium text-[#111827]">
          {label}
        </span>
        {headerRight}
      </div>

      {collapsed ? null : (
      /* 2-column layout: Company side | Location side */
      <div className="grid grid-cols-2 gap-4">
        {/* Left column: Company dropdown + Tax/Contact */}
        <div className="flex flex-col gap-2">
          <select
            value={selectedCompanyId}
            onChange={(e) => onCompanyChange(e.target.value)}
            disabled={disabled}
            className="w-full h-9 border border-[#e5e7eb] rounded-[6px] px-3 text-[13px] text-[#111827] outline-none focus:ring-2 focus:ring-[#0d9488] focus:border-[#0d9488] bg-white disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <option value="">Select company</option>
            {companies.map((c) => (
              <option key={c._id} value={c._id}>
                {c.name}
                {c._type === "own" ? " (Your Org)" : ""}
              </option>
            ))}
          </select>

          {company ? (() => {
            const taxNum = (company as VendorCompany).taxNumber;
            const contactNum = company.phoneNumber || company.contactNumber || location?.contactNumber;
            const countryCodeVal = company.countryCode || location?.countryCode;
            if (!taxNum && !contactNum) return null;
            return (
              <div className="space-y-0.5">
                {taxNum && <p className="text-[11px] text-[#6b7280]">Tax: {taxNum}</p>}
                {contactNum && (
                  <p className="text-[11px] text-[#6b7280]">
                    {countryCodeVal ? `+${countryCodeVal} ` : ""}{contactNum}
                  </p>
                )}
              </div>
            );
          })() : (
            <div className="space-y-0.5">
              <p className="text-[11px] text-[#d1d5db]">Tax: —</p>
              <p className="text-[11px] text-[#d1d5db]">Contact: —</p>
            </div>
          )}
        </div>

        {/* Right column: Location dropdown + GST/Address */}
        <div className="flex flex-col gap-2">
          <select
            value={selectedLocationId}
            onChange={(e) => onLocationChange(e.target.value)}
            disabled={disabled || locations.length === 0}
            className="w-full h-9 border border-[#e5e7eb] rounded-[6px] px-3 text-[13px] text-[#111827] outline-none focus:ring-2 focus:ring-[#0d9488] focus:border-[#0d9488] bg-white disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <option value="">Select location</option>
            {locations.map((l) => (
              <option key={l._id} value={l._id}>
                {l.name}
              </option>
            ))}
          </select>

          {location ? (
            <div className="space-y-0.5">
              {location.gstNumber && location.gstNumber !== "-" && (
                <p className="text-[11px] text-[#6b7280]">
                  GST: {location.gstNumber}
                </p>
              )}
              {(() => {
                const addrStr = [
                  location.addressLine1,
                  location.addressLine2,
                  location.city,
                  location.state && location.zip ? `${location.state} - ${location.zip}` : location.state || location.zip,
                  location.country,
                ]
                  .filter(Boolean)
                  .join(", ");
                return addrStr ? (
                  <p className="text-[11px] text-[#6b7280] leading-relaxed">{addrStr}</p>
                ) : null;
              })()}
            </div>
          ) : (
            <div className="space-y-0.5">
              <p className="text-[11px] text-[#d1d5db]">GST: —</p>
              <p className="text-[11px] text-[#d1d5db] leading-relaxed">Address will appear here</p>
            </div>
          )}
        </div>
      </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Product typeahead
// ---------------------------------------------------------------------------

function ProductTypeahead({
  value,
  onSelect,
  onCreateNew,
  hasError,
}: {
  value: ProductSearchResult | null;
  onSelect: (p: ProductSearchResult) => void;
  onCreateNew?: (query: string) => void;
  hasError?: boolean;
}) {
  const [query, setQuery] = useState(value?.name ?? "");
  const [results, setResults] = useState<ProductSearchResult[]>([]);
  const [open, setOpen] = useState(false);
  const [searching, setSearching] = useState(false);
  const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({});
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Sync display when value is set or cleared externally
  useEffect(() => {
    setQuery(value?.name ?? "");
  }, [value]);

  function updateDropdownPosition() {
    if (!inputRef.current) return;
    const rect = inputRef.current.getBoundingClientRect();
    setDropdownStyle({
      position: "fixed",
      top: rect.bottom + 4,
      left: rect.left,
      width: rect.width,
    });
  }

  function handleSearch(term: string) {
    setQuery(term);
    if (timerRef.current) clearTimeout(timerRef.current);
    if (term.trim().length < 2) {
      setResults([]);
      setOpen(false);
      return;
    }
    timerRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await searchProducts(term);
        setResults(res);
        updateDropdownPosition();
        setOpen(true);
      } catch {
        setResults([]);
      } finally {
        setSearching(false);
      }
    }, 300);
  }

  function handleSelect(p: ProductSearchResult) {
    setQuery(p.name);
    setOpen(false);
    onSelect(p);
  }

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  // Reposition on scroll/resize while open
  useEffect(() => {
    if (!open) return;
    function reposition() {
      updateDropdownPosition();
    }
    window.addEventListener("scroll", reposition, true);
    window.addEventListener("resize", reposition);
    return () => {
      window.removeEventListener("scroll", reposition, true);
      window.removeEventListener("resize", reposition);
    };
  }, [open]);

  const dropdownContent = open && (
    <div
      style={dropdownStyle}
      className="z-[9999] bg-white border border-[#e5e7eb] rounded-md shadow-lg max-h-56 overflow-y-auto"
    >
      {results.length > 0
        ? results.map((p) => (
            <button
              key={p._id}
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => handleSelect(p)}
              className="w-full text-left px-3 py-2 text-[13px] text-[#111827] hover:bg-[#f3f4f6]"
            >
              <span className="font-medium">{p.name}</span>
              <span className="text-[#9ca3af] ml-1.5 text-[11px]">
                {p.unitOfMeasurement} · GST {p.gst}%
              </span>
            </button>
          ))
        : !searching &&
          query.length >= 2 && (
            <div className="px-3 py-2 text-[13px] text-[#9ca3af]">
              No products found
            </div>
          )}
      {onCreateNew && (
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => {
            setOpen(false);
            onCreateNew(query);
          }}
          className="w-full text-left px-3 py-2 text-[13px] text-[#0d9488] font-medium hover:bg-[#f0fdfa] border-t border-[#e5e7eb] flex items-center gap-1.5"
        >
          <span className="text-[16px] leading-none">+</span>
          {query.trim() ? `Create "${query.trim()}"` : "Create New Product"}
        </button>
      )}
    </div>
  );

  return (
    <div ref={wrapperRef}>
      <div className="relative flex items-center">
        <Search
          size={13}
          className="absolute left-2.5 text-[#9ca3af] pointer-events-none"
        />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => handleSearch(e.target.value)}
          onFocus={() => {
            updateDropdownPosition();
            if (results.length > 0 || onCreateNew) setOpen(true);
          }}
          placeholder="Search product..."
          className={`w-full h-8 pl-7 pr-2.5 border-0 outline-none bg-transparent focus:bg-[#f0fdfa] rounded text-[13px] text-[#111827] ${
            hasError ? "ring-1 ring-[#dc2626]" : ""
          }`}
        />
        {searching && (
          <Loader2
            size={13}
            className="absolute right-2.5 text-[#9ca3af] animate-spin"
          />
        )}
      </div>
      {dropdownContent}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Payment terms typeahead
// ---------------------------------------------------------------------------

function PaymentTermsTypeahead({
  value,
  options,
  onChange,
  onCreateNew,
  hasError,
}: {
  value: string;
  options: string[];
  onChange: (v: string) => void;
  onCreateNew: () => void;
  hasError?: boolean;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({});
  const wrapperRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const filtered = query.trim()
    ? options.filter((o) => o.toLowerCase().includes(query.toLowerCase()))
    : options;

  function updateDropdownPosition() {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    setDropdownStyle({
      position: "fixed",
      top: rect.bottom + 4,
      left: rect.left,
      width: rect.width,
    });
  }

  function handleSelect(term: string) {
    onChange(term);
    setQuery("");
    setOpen(false);
  }

  // Close on outside click
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

  // Reposition on scroll/resize while open
  useEffect(() => {
    if (!open) return;
    function reposition() { updateDropdownPosition(); }
    window.addEventListener("scroll", reposition, true);
    window.addEventListener("resize", reposition);
    return () => {
      window.removeEventListener("scroll", reposition, true);
      window.removeEventListener("resize", reposition);
    };
  }, [open]);

  const dropdownContent = open && (
    <div
      style={dropdownStyle}
      className="z-[9999] bg-white border border-[#e5e7eb] rounded-md shadow-lg max-h-56 overflow-y-auto"
    >
      {filtered.length > 0
        ? filtered.map((term) => (
            <button
              key={term}
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => handleSelect(term)}
              className={`w-full text-left px-3 py-2 text-[13px] hover:bg-[#f3f4f6] ${
                term === value ? "bg-[#f0fdfa] text-[#0d9488] font-medium" : "text-[#111827]"
              }`}
            >
              {term}
            </button>
          ))
        : query.trim() && (
            <div className="px-3 py-2 text-[13px] text-[#9ca3af]">No matching terms</div>
          )}
      <button
        type="button"
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => { setOpen(false); setQuery(""); onCreateNew(); }}
        className="w-full text-left px-3 py-2 text-[13px] text-[#0d9488] font-medium hover:bg-[#f0fdfa] border-t border-[#e5e7eb] flex items-center gap-1.5"
      >
        <span className="text-[16px] leading-none">+</span>
        Create Payment Term
      </button>
    </div>
  );

  return (
    <div ref={wrapperRef}>
      <button
        type="button"
        ref={triggerRef}
        onClick={() => { updateDropdownPosition(); setOpen((prev) => !prev); }}
        className={`w-full h-9 border rounded-[6px] px-3 text-[13px] text-left outline-none focus:ring-2 focus:ring-[#0d9488] focus:border-[#0d9488] bg-white flex items-center justify-between ${
          hasError ? "border-[#dc2626]" : "border-[#e5e7eb]"
        }`}
      >
        {open ? (
          <input
            autoFocus
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search or select..."
            className="flex-1 bg-transparent outline-none text-[13px] text-[#111827]"
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <span className={value ? "text-[#111827]" : "text-[#9ca3af]"}>
            {value || "Select payment terms"}
          </span>
        )}
        <svg className="h-4 w-4 text-[#6b7280] flex-shrink-0 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {dropdownContent}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

interface PurchaseOrderFormProps {
  editId?: string;
  duplicateFromId?: string;
  orderType?: "purchase" | "sales";
}

// ── PO/SO Number Settings Dialog ──────────────────────────────────────────────

function PONumberSettingsDialog({
  open,
  onClose,
  orderType,
  settings,
  onSave,
}: {
  open: boolean;
  onClose: () => void;
  orderType: "purchase" | "sales";
  settings: POFormSettings;
  onSave: (updated: Partial<POFormSettings>) => Promise<void>;
}) {
  const isPO = orderType === "purchase";
  const [autoGenerate, setAutoGenerate] = useState(
    isPO ? settings.generatePOAutomatically : settings.generateSOAutomatically
  );
  const [prefix, setPrefix] = useState(isPO ? settings.poPrefix : settings.soPrefix);
  const [separator, setSeparator] = useState(isPO ? settings.poSeparator : settings.soSeparator);
  const [nextNumber, setNextNumber] = useState(isPO ? settings.nextPONumber : settings.nextSONumber);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  async function handleSave() {
    setSaving(true);
    try {
      if (isPO) {
        await onSave({
          generatePOAutomatically: autoGenerate,
          poPrefix: prefix,
          poSeparator: separator,
          nextPONumber: nextNumber,
        });
      } else {
        await onSave({
          generateSOAutomatically: autoGenerate,
          soPrefix: prefix,
          soSeparator: separator,
          nextSONumber: nextNumber,
        });
      }
      onClose();
    } catch {
      setSaveError(`Failed to save ${isPO ? "PO" : "SO"} number settings`);
    } finally {
      setSaving(false);
    }
  }

  if (!open) return null;

  const label = isPO ? "PO" : "SO";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
      <div className="bg-white rounded-[10px] shadow-xl w-full max-w-[440px] mx-4 sm:mx-auto p-0">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#e5e7eb]">
          <h3 className="text-[15px] font-semibold text-[#111827]">
            {label} Number Settings
          </h3>
          <button onClick={onClose} className="text-[#9ca3af] hover:text-[#6b7280] transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="px-5 py-4">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div>
              <p className="text-sm font-medium text-gray-700">
                Auto-generate {label} Number
              </p>
              <p className="text-[12px] text-gray-400 mt-0.5">
                Automatically assign a sequential number
              </p>
            </div>
            <button
              type="button"
              onClick={() => setAutoGenerate(!autoGenerate)}
              className={`relative inline-flex h-6 w-11 flex-shrink-0 rounded-full border-2 border-transparent transition-colors ${
                autoGenerate ? "bg-[#0d9488]" : "bg-gray-200"
              }`}
            >
              <span
                className={`inline-block h-5 w-5 rounded-full bg-white shadow transition-transform ${
                  autoGenerate ? "translate-x-5" : "translate-x-0"
                }`}
              />
            </button>
          </div>

          {autoGenerate && (
            <div className="rounded-lg bg-[#f9fafb] p-4">
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[12px] font-medium text-gray-500 mb-1">Prefix</label>
                  <input
                    type="text"
                    value={prefix}
                    onChange={(e) => setPrefix(e.target.value)}
                    className="w-full border border-gray-300 rounded-md px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-[#0d9488] focus:border-[#0d9488]"
                  />
                </div>
                <div>
                  <label className="block text-[12px] font-medium text-gray-500 mb-1">Separator</label>
                  <input
                    type="text"
                    value={separator}
                    onChange={(e) => setSeparator(e.target.value)}
                    className="w-full border border-gray-300 rounded-md px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-[#0d9488] focus:border-[#0d9488]"
                  />
                </div>
                <div>
                  <label className="block text-[12px] font-medium text-gray-500 mb-1">Next Number</label>
                  <input
                    type="number"
                    value={nextNumber}
                    onChange={(e) => setNextNumber(Number(e.target.value))}
                    className="w-full border border-gray-300 rounded-md px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-[#0d9488] focus:border-[#0d9488]"
                  />
                </div>
              </div>
              <div className="mt-3 flex items-center gap-2">
                <span className="text-[12px] text-gray-400">Preview:</span>
                <span className="text-[13px] font-medium text-[#111827]">
                  {prefix}{separator}{nextNumber}
                </span>
              </div>
            </div>
          )}
        </div>

        {saveError && (
          <p className="px-5 pb-2 text-[13px] text-[#dc2626]">{saveError}</p>
        )}
        <div className="flex justify-end gap-2 px-5 py-4 border-t border-[#e5e7eb]">
          <Button variant="outline" size="sm" onClick={() => { onClose(); setSaveError(""); }} className="h-8 text-[13px]">
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={handleSave}
            disabled={saving}
            className="h-8 text-[13px] bg-[#0d9488] hover:bg-[#0f766e] text-white"
          >
            {saving && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />}
            Save
          </Button>
        </div>
      </div>
    </div>
  );
}

export function PurchaseOrderForm({ editId, duplicateFromId, orderType = "purchase" }: PurchaseOrderFormProps) {
  const isEditMode = !!editId;
  const isDuplicateMode = !!duplicateFromId;
  const router = useRouter();

  // ── Bootstrap data ──────────────────────────────────────────────────────
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [vendors, setVendors] = useState<VendorCompany[]>([]);
  const [ownOrg, setOwnOrg] = useState<Organization | null>(null);
  const [settings, setSettings] = useState<POFormSettings | null>(null);
  const [poNumberSettingsOpen, setPoNumberSettingsOpen] = useState(false);

  useEffect(() => {
    const fetchId = editId || duplicateFromId;
    const promises: [
      Promise<VendorCompany[]>,
      Promise<Organization>,
      Promise<POFormSettings>,
      Promise<any> | Promise<null>,
    ] = [
      getVendorCompaniesWithLocations(),
      getMyOrganization(),
      getPOFormSettings(),
      fetchId ? getOrderForEdit(fetchId) : Promise.resolve(null),
    ];

    Promise.all(promises)
      .then(([v, org, s, sourceOrder]) => {
        setVendors(v);
        setOwnOrg(org);
        setSettings(s);

        if (sourceOrder && editId) {
          populateFromOrder(sourceOrder, v, org);
        } else if (sourceOrder && duplicateFromId) {
          populateForDuplicate(sourceOrder, v, org);
        }
      })
      .catch(() => {
        setLoadError("Failed to load form data. Please try again.");
      })
      .finally(() => setLoading(false));
  }, [editId, duplicateFromId]);

  // ── Build unified company list ──────────────────────────────────────────
  const companies: CompanyOption[] = ownOrg
    ? [
        { ...ownOrg, status: "active" as const, _type: "own" },
        ...vendors.map((v) => ({ ...v, _type: "vendor" as const })),
      ]
    : vendors.map((v) => ({ ...v, _type: "vendor" as const }));

  // ── Partner state ───────────────────────────────────────────────────────
  const [supplierCompanyId, setSupplierCompanyId] = useState("");
  const [supplierLocationId, setSupplierLocationId] = useState("");
  const [consigneeCompanyId, setConsigneeCompanyId] = useState("");
  const [consigneeLocationId, setConsigneeLocationId] = useState("");
  const [buyerCompanyId, setBuyerCompanyId] = useState("");
  const [buyerLocationId, setBuyerLocationId] = useState("");
  const [sameAsConsignee, setSameAsConsignee] = useState(true);

  // Pre-select own org for consignee & buyer after load
  const didPreselect = useRef(false);
  useEffect(() => {
    if (!ownOrg || didPreselect.current) return;
    didPreselect.current = true;
    setConsigneeCompanyId(ownOrg._id);
    setBuyerCompanyId(ownOrg._id);
    if (ownOrg.locations.length > 0) {
      setConsigneeLocationId(ownOrg.locations[0]._id);
      setBuyerLocationId(ownOrg.locations[0]._id);
    }
  }, [ownOrg]);

  // Mirror buyer from consignee when checkbox is on
  useEffect(() => {
    if (sameAsConsignee) {
      setBuyerCompanyId(consigneeCompanyId);
      setBuyerLocationId(consigneeLocationId);
    }
  }, [sameAsConsignee, consigneeCompanyId, consigneeLocationId]);

  function handleCompanyChange(
    role: "supplier" | "consignee" | "buyer",
    id: string
  ) {
    const company = companies.find((c) => c._id === id);
    const defaultLoc = company?.locations?.[0]?._id ?? "";
    if (role === "supplier") {
      setSupplierCompanyId(id);
      setSupplierLocationId(defaultLoc);
    } else if (role === "consignee") {
      setConsigneeCompanyId(id);
      setConsigneeLocationId(defaultLoc);
    } else {
      setBuyerCompanyId(id);
      setBuyerLocationId(defaultLoc);
    }
  }

  // ── Original PO data (edit mode — never changes) ───────────────────────
  const originalPoNumber = useRef("");
  const originalStatus = useRef<string>("");
  const duplicateValidationRan = useRef(false);

  // Match a stored address back to a location ID using gstNumber → addressLine1+city → first
  function resolveLocationId(
    allCompanies: CompanyOption[],
    companyId: string,
    address: any
  ): string {
    if (!address) return "";
    if (address.locationId) return String(address.locationId);
    if (address._id) return String(address._id);
    const company = allCompanies.find((c) => c._id === companyId);
    if (!company) return "";
    const locs = company.locations;
    if (address.gstNumber) {
      const m = locs.find((l) => l.gstNumber && l.gstNumber === address.gstNumber);
      if (m) return m._id;
    }
    if (address.addressLine1) {
      const m = locs.find((l) => l.addressLine1 === address.addressLine1 && (!address.city || l.city === address.city));
      if (m) return m._id;
    }
    return locs[0]?._id ?? "";
  }

  // ── Populate form from existing order (edit mode) ──────────────────────
  function populateFromOrder(
    order: any,
    _vendorList: VendorCompany[],
    _org: Organization
  ) {
    // Build unified company list from the just-loaded data for address matching
    const allCompanies: CompanyOption[] = _org
      ? [{ ..._org, status: "active" as const, _type: "own" }, ..._vendorList.map((v) => ({ ...v, _type: "vendor" as const }))]
      : _vendorList.map((v) => ({ ...v, _type: "vendor" as const }));

    // Partners
    if (order.supplier?.id) {
      setSupplierCompanyId(order.supplier.id);
      const supLocId = resolveLocationId(allCompanies, order.supplier.id, order.supplier.address);
      if (supLocId) setSupplierLocationId(supLocId);
    }

    // Map buyer → consignee, biller → buyer in UI
    const buyerData = order.buyer ?? order.biller;
    const billerData = order.biller ?? order.buyer;
    if (buyerData?.id) {
      setConsigneeCompanyId(buyerData.id);
      const conLocId = resolveLocationId(allCompanies, buyerData.id, buyerData.address);
      if (conLocId) setConsigneeLocationId(conLocId);
    }
    if (billerData?.id) {
      setBuyerCompanyId(billerData.id);
      const buyLocId = resolveLocationId(allCompanies, billerData.id, billerData.address);
      if (buyLocId) setBuyerLocationId(buyLocId);
    }

    // Check if buyer and biller are the same
    const buyerSame =
      buyerData?.id === billerData?.id &&
      buyerData?.address?.locationId === billerData?.address?.locationId;
    setSameAsConsignee(buyerSame);
    didPreselect.current = true;

    // Order details
    if (order.status) originalStatus.current = order.status;
    if (order.poNumber) {
      originalPoNumber.current = order.poNumber;
      setPoNumber(order.poNumber);
    }
    if (order.referenceId) setReferenceId(order.referenceId);
    if (order.supplierReferenceId) setSupplierRefId(order.supplierReferenceId);
    if (order.paymentTerms) setPaymentTerms(order.paymentTerms);
    if (order.notes) setNotes(order.notes);
    if (order.termsAndConditions) setTerms(order.termsAndConditions);

    // Dates (convert to YYYY-MM-DD)
    if (order.issueDate) {
      const d = new Date(order.issueDate);
      setIssueDate(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`);
    }
    if (order.deliveryDate) {
      const d = new Date(order.deliveryDate);
      setDeliveryDate(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`);
    }

    // Files
    if (order.files && Array.isArray(order.files)) {
      setFiles(
        order.files.map((f: any) => ({
          id: f.id ?? f._id ?? "",
          name: f.name ?? f.fileName ?? "",
        }))
      );
    }

    // Products
    if (order.products && Array.isArray(order.products) && order.products.length > 0) {
      const rows: ProductRow[] = order.products.map((p: any) => {
        const productName = p.metadata?.product?.name ?? p.product?.name ?? "";
        const variantName = p.metadata?.variant?.name ?? p.variant?.name ?? "";
        const productId = p.product?._id ?? p.product?.id ?? "";
        const variantId = p.variant?._id ?? p.variant?.id ?? "";
        const uom = p.quantity?.postfix ?? "";
        const gst = p.gst?.value ?? 0;
        const qty = p.quantity?.value ?? 0;
        const price = typeof p.price?.value === "object"
          ? parseFloat(p.price.value.$numberDecimal ?? "0")
          : (p.price?.value ?? 0);

        const variant: ProductVariant = { _id: variantId, name: variantName };
        const product: ProductSearchResult = {
          _id: productId,
          name: productName,
          unitOfMeasurement: uom,
          gst,
          variants: [variant],
        };

        return {
          id: nextRowId(),
          product,
          variant,
          quantity: qty,
          price,
          quantityStr: qty > 0 ? formatNumericInput(String(qty), 3) : "",
          priceStr: price > 0 ? formatNumericInput(String(price), 2) : "",
        };
      });
      setProductRows(rows);
    }
  }

  // ── Populate form for duplicate (only copy relevant fields) ───────────
  function populateForDuplicate(
    order: any,
    _vendorList: VendorCompany[],
    _org: Organization
  ) {
    const allCompanies: CompanyOption[] = _org
      ? [{ ..._org, status: "active" as const, _type: "own" }, ..._vendorList.map((v) => ({ ...v, _type: "vendor" as const }))]
      : _vendorList.map((v) => ({ ...v, _type: "vendor" as const }));

    // Partners
    if (order.supplier?.id) {
      setSupplierCompanyId(order.supplier.id);
      const supLocId = resolveLocationId(allCompanies, order.supplier.id, order.supplier.address);
      if (supLocId) setSupplierLocationId(supLocId);
    }
    const buyerData = order.buyer ?? order.biller;
    const billerData = order.biller ?? order.buyer;
    if (buyerData?.id) {
      setConsigneeCompanyId(buyerData.id);
      const conLocId = resolveLocationId(allCompanies, buyerData.id, buyerData.address);
      if (conLocId) setConsigneeLocationId(conLocId);
    }
    if (billerData?.id) {
      setBuyerCompanyId(billerData.id);
      const buyLocId = resolveLocationId(allCompanies, billerData.id, billerData.address);
      if (buyLocId) setBuyerLocationId(buyLocId);
    }
    const buyerSame =
      buyerData?.id === billerData?.id &&
      buyerData?.address?.locationId === billerData?.address?.locationId;
    setSameAsConsignee(buyerSame);
    didPreselect.current = true;

    // Payment terms
    if (order.paymentTerms) setPaymentTerms(order.paymentTerms);

    // Terms & Conditions
    if (order.termsAndConditions) setTerms(order.termsAndConditions);

    // Files
    if (order.files && Array.isArray(order.files)) {
      setFiles(
        order.files.map((f: any) => ({
          id: f.id ?? f._id ?? "",
          name: f.name ?? f.fileName ?? "",
        }))
      );
    }

    // Products
    if (order.products && Array.isArray(order.products) && order.products.length > 0) {
      const rows: ProductRow[] = order.products.map((p: any) => {
        const productName = p.metadata?.product?.name ?? p.product?.name ?? "";
        const variantName = p.metadata?.variant?.name ?? p.variant?.name ?? "";
        const productId = p.product?._id ?? p.product?.id ?? "";
        const variantId = p.variant?._id ?? p.variant?.id ?? "";
        const uom = p.quantity?.postfix ?? "";
        const gst = p.gst?.value ?? 0;
        const qty = p.quantity?.value ?? 0;
        const price = typeof p.price?.value === "object"
          ? parseFloat(p.price.value.$numberDecimal ?? "0")
          : (p.price?.value ?? 0);

        const variant: ProductVariant = { _id: variantId, name: variantName };
        const product: ProductSearchResult = {
          _id: productId,
          name: productName,
          unitOfMeasurement: uom,
          gst,
          variants: [variant],
        };

        return {
          id: nextRowId(),
          product,
          variant,
          quantity: qty,
          price,
          quantityStr: qty > 0 ? formatNumericInput(String(qty), 3) : "",
          priceStr: price > 0 ? formatNumericInput(String(price), 2) : "",
        };
      });
      setProductRows(rows);
    }

    // Leave blank: PO Number, Issue Date (already today), Delivery Date (already default),
    // Reference ID, Supplier Reference ID, Internal Notes
  }

  // ── Order details state ─────────────────────────────────────────────────
  const [poNumber, setPoNumber] = useState("");
  const [referenceId, setReferenceId] = useState("");
  const [supplierRefId, setSupplierRefId] = useState("");
  const [issueDate, setIssueDate] = useState(todayString());
  const [deliveryDate, setDeliveryDate] = useState(defaultDeliveryDate());
  const [paymentTerms, setPaymentTerms] = useState("");
  const [showAddPaymentTerm, setShowAddPaymentTerm] = useState(false);
  const [newPaymentTerm, setNewPaymentTerm] = useState("");
  const [addingPaymentTerm, setAddingPaymentTerm] = useState(false);
  const [paymentTermError, setPaymentTermError] = useState("");
  const [notes, setNotes] = useState("");
  const [terms, setTerms] = useState<string[]>([]);
  const [termInput, setTermInput] = useState("");
  const [files, setFiles] = useState<{ id: string; name: string }[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [fileUploadError, setFileUploadError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);


  function addTerm() {
    const v = termInput.trim();
    if (v && !terms.includes(v)) {
      setTerms((prev) => [...prev, v]);
    }
    setTermInput("");
  }

  function removeTerm(idx: number) {
    setTerms((prev) => prev.filter((_, i) => i !== idx));
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const fileList = e.target.files;
    if (!fileList || fileList.length === 0) return;

    setIsUploading(true);
    try {
      for (const file of Array.from(fileList)) {
        const uploaded = await uploadFile(file);
        setFiles((prev) => [
          ...prev,
          { id: uploaded.id, name: uploaded.name },
        ]);
      }
    } catch {
      setFileUploadError("Failed to upload file");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  function removeFile(idx: number) {
    setFiles((prev) => prev.filter((_, i) => i !== idx));
  }

  // ── Product rows ─────────────────────────────────────────────────────────
  const [productRows, setProductRows] = useState<ProductRow[]>([emptyRow()]);

  // ── Validate product availability after duplicate populate ───────────────
  // Runs once — but only after productRows is actually populated (not empty on mount).
  // The ref prevents re-running after setProductRows updates the rows below.
  useEffect(() => {
    if (!isDuplicateMode || duplicateValidationRan.current) return;
    const rowsWithProduct = productRows.filter((r) => r.product?._id);
    if (rowsWithProduct.length === 0) return; // Not populated yet — wait for next render

    duplicateValidationRan.current = true;

    Promise.all(
      rowsWithProduct.map(async (row) => {
        try {
          const product = await productsService.getById(row.product!._id);
          const variantExists = product.variants.some((v) => String(v._id) === String(row.variant?._id));
          const unavailable = product.status !== "active" || !variantExists;
          return { id: row.id, unavailable };
        } catch {
          return { id: row.id, unavailable: true };
        }
      }),
    ).then((results) => {
      setProductRows((prev) =>
        prev.map((r) => {
          const result = results.find((res) => res.id === r.id);
          return result ? { ...r, isUnavailable: result.unavailable } : r;
        }),
      );
    });
  }, [isDuplicateMode, productRows]);
  const [attempted, setAttempted] = useState(false);
  const [submitError, setSubmitError] = useState("");

  // Field-level errors — collected all at once on submit
  interface FieldErrors {
    supplier?: string;
    consignee?: string;
    buyer?: string;
    poNumber?: string;
    paymentTerms?: string;
    deliveryDate?: string;
    productsUnavailable?: string;
    productsEmpty?: string;
    productsIncomplete?: string;
    productsDuplicate?: string;
  }
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const unavailableRows = productRows.filter((r) => r.isUnavailable);
  const hasUnavailableRows = unavailableRows.length > 0;

  const incompleteRowIds = attempted
    ? new Set(
        productRows
          .filter(
            (r) =>
              !r.isUnavailable &&
              ((r.product && (!r.variant || r.quantity <= 0 || r.price <= 0)) ||
              (!r.product && (r.quantity > 0 || r.price > 0)))
          )
          .map((r) => r.id)
      )
    : new Set<string>();

  function updateRow(id: string, patch: Partial<ProductRow>) {
    setProductRows((prev) =>
      prev.map((r) => (r.id === id ? { ...r, ...patch } : r))
    );
  }

  function handleProductSelect(rowId: string, product: ProductSearchResult) {
    updateRow(rowId, { product, variant: null });
  }

  function handleVariantChange(rowId: string, row: ProductRow, variantId: string) {
    const variant = row.product?.variants.find((v) => v._id === variantId);
    if (!variant) return;

    const duplicateRow = productRows.find(
      (r) =>
        r.id !== rowId &&
        r.product?._id === row.product?._id &&
        r.variant?._id === variantId
    );

    if (duplicateRow) {
      const dupIndex = productRows.findIndex((r) => r.id === duplicateRow.id);
      setSubmitError(
        `"${row.product?.name} – ${variant.name}" is already added as Product ${dupIndex + 1}. Update quantity there instead.`
      );
      return;
    }

    updateRow(rowId, { variant });
  }

  // ── Quick-create product modal ───────────────────────────────────────────
  const [createProductForRowId, setCreateProductForRowId] = useState<string | null>(null);
  const [createProductInitialName, setCreateProductInitialName] = useState("");

  async function handleProductCreated(created: { _id: string; name: string }) {
    const rowId = createProductForRowId;
    setCreateProductForRowId(null);
    if (!rowId) return;
    // Fetch full product so we have variants + gst + unitOfMeasurement
    try {
      const res = await searchProducts(created.name);
      const found = res.find((p) => p._id === created._id) ?? res[0] ?? null;
      if (found) {
        handleProductSelect(rowId, found);
      }
    } catch {
      // Silently ignore — user can manually select from the dropdown
    }
  }

  function addRow() {
    setProductRows((prev) => [...prev, emptyRow()]);
  }

  function removeRow(id: string) {
    if (productRows.length <= 1) return;
    setProductRows((prev) => prev.filter((r) => r.id !== id));
  }

  const totalAmount = productRows.reduce((sum, r) => {
    if (r.isUnavailable || !r.product || r.quantity <= 0 || r.price <= 0) return sum;
    return sum + calculateLineTotal(r.quantity, r.price, r.product.gst);
  }, 0);

  const totalQuantity = productRows.reduce((sum, r) => {
    if (r.isUnavailable || !r.product || r.quantity <= 0) return sum;
    return sum + r.quantity;
  }, 0);

  const productUoms = productRows
    .filter((r) => !r.isUnavailable && r.product && r.quantity > 0)
    .map((r) => r.product!.unitOfMeasurement);
  const allSameUom = productUoms.length > 0 && productUoms.every((u) => u === productUoms[0]);
  const commonUom = allSameUom ? productUoms[0] : null;

  // ── Add payment term handler ────────────────────────────────────────────

  const paymentTermsList = orderType === "sales"
    ? (settings?.soPaymentTerms ?? [])
    : (settings?.paymentTerms ?? []);

  async function handlePONumberSettingsSave(updated: Partial<POFormSettings>) {
    await organizationSettingsService.update(updated as Parameters<typeof organizationSettingsService.update>[0]);
    const refreshed = await getPOFormSettings();
    setSettings(refreshed);
    toast.success(`${orderType === "sales" ? "SO" : "PO"} number settings updated`);
  }

  async function handleAddPaymentTerm() {
    const term = newPaymentTerm.trim();
    if (!term || addingPaymentTerm) return;
    setAddingPaymentTerm(true);
    try {
      if (orderType === "sales") {
        await organizationSettingsService.addSOPaymentTerm(term);
      } else {
        await organizationSettingsService.addPaymentTerm(term);
      }
      // Refresh settings
      const updated = await getPOFormSettings();
      setSettings(updated);
      setPaymentTerms(term);
      setShowAddPaymentTerm(false);
      setNewPaymentTerm("");
      toast.success("Payment term added");
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? "Failed to add payment term";
      setPaymentTermError(message);
    } finally {
      setAddingPaymentTerm(false);
    }
  }

  // ── Submit ──────────────────────────────────────────────────────────────
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(status?: "issued" | "draft") {
    setAttempted(true);
    setSubmitError("");

    const supplierCompany = companies.find(
      (c) => c._id === supplierCompanyId
    );
    const supplierLocation = supplierCompany?.locations.find(
      (l) => l._id === supplierLocationId
    );
    const consigneeCompany = companies.find(
      (c) => c._id === consigneeCompanyId
    );
    const consigneeLocation = consigneeCompany?.locations.find(
      (l) => l._id === consigneeLocationId
    );
    const buyerCompany = companies.find((c) => c._id === buyerCompanyId);
    const buyerLocation = buyerCompany?.locations.find(
      (l) => l._id === buyerLocationId
    );

    // Collect all errors at once
    const errors: FieldErrors = {};

    if (!supplierCompany || !supplierLocation) {
      errors.supplier = "Please select a supplier and location.";
    }
    if (!consigneeCompany || !consigneeLocation) {
      errors.consignee = "Please select a consignee and location.";
    }
    if (!buyerCompany || !buyerLocation) {
      errors.buyer = "Please select a buyer and location.";
    }
    if (!isEditMode && !settings?.generatePOAutomatically && !poNumber.trim()) {
      errors.poNumber = `${orderType === "sales" ? "SO" : "PO"} Number is required.`;
    }
    if (!paymentTerms) {
      errors.paymentTerms = "Payment terms is required.";
    }
    if (deliveryDate && issueDate && deliveryDate < issueDate) {
      errors.deliveryDate = "Delivery date cannot be before issue date.";
    }

    // Block if unavailable (deleted/archived) products remain
    if (hasUnavailableRows) {
      errors.productsUnavailable = `${unavailableRows.length} product${unavailableRows.length > 1 ? "s are" : " is"} no longer available. Remove ${unavailableRows.length > 1 ? "them" : "it"} before submitting.`;
    }

    // Validate products
    const completeRows = productRows.filter(
      (r) => !r.isUnavailable && r.product && r.variant && r.quantity > 0 && r.price > 0
    );
    if (completeRows.length === 0) {
      errors.productsEmpty = "At least one product with quantity and price is required.";
    }

    // Check for incomplete rows (have product but missing data)
    const hasIncomplete = productRows.some(
      (r) =>
        !r.isUnavailable &&
        ((r.product && (!r.variant || r.quantity <= 0 || r.price <= 0)) ||
        (!r.product && (r.quantity > 0 || r.price > 0)))
    );
    if (hasIncomplete) {
      errors.productsIncomplete = "All product rows must have a product, variant, quantity, and price.";
    }

    // Check for duplicate product+variant combos
    const seen = new Set<string>();
    for (const r of completeRows) {
      const key = `${r.product!._id}::${r.variant!._id}`;
      if (seen.has(key)) {
        errors.productsDuplicate = `"${r.product!.name} – ${r.variant!.name}" is added more than once. Combine the quantities into a single row.`;
        break;
      }
      seen.add(key);
    }

    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setSubmitting(true);
    try {
      const productLines = completeRows.map((r) =>
        buildProductLine(
          r.product!,
          r.variant!,
          r.quantity,
          r.product!.unitOfMeasurement,
          r.price,
          r.product!.gst
        )
      );

      const payload: any = {
        supplier: buildPartnerPayload(supplierCompany!, supplierLocation!),
        buyer: buildPartnerPayload(buyerCompany!, buyerLocation!),
        biller: buildPartnerPayload(buyerCompany!, buyerLocation!),
        referenceId,
        supplierReferenceId: supplierRefId,
        issueDate,
        deliveryDate,
        paymentTerms,
        termsAndConditions: terms,
        notes,
        products: productLines,
        orderType,
        poNumber: isEditMode
          ? originalPoNumber.current
          : settings?.generatePOAutomatically
            ? ""
            : poNumber,
        files: files.map((f) => ({ id: f.id, name: f.name })),
      };
      // Only include status when explicitly provided (omit for issued/confirmed edits)
      if (status) {
        payload.status = status;
      }
      const isSO = orderType === "sales";
      const basePath = isSO ? "/sales-orders" : "/purchase-orders";

      if (isEditMode && editId) {
        await updatePurchaseOrder(editId, payload);
        toast.success(`${isSO ? "Sales" : "Purchase"} order updated successfully.`);
        router.push(`${basePath}/${editId}`);
      } else {
        const result = await createPurchaseOrder(payload);
        toast.success(
          status === "draft"
            ? `${isSO ? "Sales" : "Purchase"} order saved as draft.`
            : `${isSO ? "Sales" : "Purchase"} order created and issued.`
        );
        const newId = result?._id ?? result?.id;
        router.push(newId ? `${basePath}/${newId}` : basePath);
      }
    } catch (err: unknown) {
      const label = orderType === "sales" ? "sales order" : "purchase order";
      const apiMessage =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setSubmitError(
        apiMessage ||
          (isEditMode
            ? `Failed to update ${label}. Please try again.`
            : `Failed to create ${label}. Please try again.`)
      );
    } finally {
      setSubmitting(false);
    }
  }

  // ── Render ──────────────────────────────────────────────────────────────

  if (loading) return <FullPageSkeleton />;

  return (
    <div className="flex flex-col h-full">
      {/* ── Sticky top bar ──────────────────────────────────────────────── */}
      <div className="flex h-[55px] flex-shrink-0 items-center justify-between border-b border-[#e5e7eb] bg-white px-4 sm:px-6 sticky top-0 z-10">
        <span className="text-[16px] sm:text-[18px] font-semibold text-[#111827]">
          {isEditMode
            ? `Edit ${orderType === "sales" ? "Sales" : "Purchase"} Order`
            : `New ${orderType === "sales" ? "Sales" : "Purchase"} Order`}
        </span>
      </div>

      {/* ── Load error ──────────────────────────────────────────────────── */}
      {loadError && (
        <div className="bg-red-50 border-b border-red-200 px-4 sm:px-6 py-2.5 text-[13px] text-[#dc2626]">
          {loadError}
        </div>
      )}

      {/* ── Unavailable products banner ─────────────────────────────────── */}
      {hasUnavailableRows && (
        <div className="flex items-start gap-2 bg-[#fffbeb] border-b border-[#fde68a] px-6 py-2.5">
          <AlertTriangle size={14} className="text-[#d97706] flex-shrink-0 mt-0.5" />
          <span className="text-[13px] text-[#92400e]">
            {unavailableRows.length} product{unavailableRows.length > 1 ? "s" : ""} from the original order {unavailableRows.length > 1 ? "are" : "is"} no longer available and {unavailableRows.length > 1 ? "have" : "has"} been highlighted below. Remove {unavailableRows.length > 1 ? "them" : "it"} before submitting.
          </span>
        </div>
      )}

      {/* ── Error banner ────────────────────────────────────────────────── */}
      {(submitError || Object.keys(fieldErrors).length > 0) && (() => {
        const allErrors = [
          ...(submitError ? [submitError] : []),
          ...Object.values(fieldErrors).filter(Boolean),
        ] as string[];
        return (
          <div className="flex items-start justify-between bg-[#fef2f2] border-b border-[#fecaca] px-6 py-2.5">
            <ul className="list-disc list-inside flex flex-col gap-0.5">
              {allErrors.map((msg, i) => (
                <li key={i} className="text-[13px] text-[#b91c1c]">{msg}</li>
              ))}
            </ul>
            <button
              type="button"
              onClick={() => { setSubmitError(""); setFieldErrors({}); setAttempted(false); }}
              className="text-[#b91c1c] hover:text-[#991b1b] flex-shrink-0 mt-0.5 ml-4"
            >
              <X size={14} />
            </button>
          </div>
        );
      })()}

      {/* ── Scrollable content ──────────────────────────────────────────── */}
      <div className="flex-1 overflow-auto">
        <div className="mx-4 pt-3 pb-6">
          {/* ── Partner cards ────────────────────────────────────────── */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 mb-3">
            <div className="rounded-[10px] border border-[#e5e7eb] bg-white px-4 pt-[10px] pb-3">
              <PartnerCard
                label="Supplier"
                companies={companies}
                selectedCompanyId={supplierCompanyId}
                selectedLocationId={supplierLocationId}
                onCompanyChange={(id) => handleCompanyChange("supplier", id)}
                onLocationChange={setSupplierLocationId}
              />
            </div>
            <div className="rounded-[10px] border border-[#e5e7eb] bg-white px-4 pt-[10px] pb-3">
              <PartnerCard
                label="Consignee (Ship To)"
                companies={companies}
                selectedCompanyId={consigneeCompanyId}
                selectedLocationId={consigneeLocationId}
                onCompanyChange={(id) => handleCompanyChange("consignee", id)}
                onLocationChange={setConsigneeLocationId}
              />
            </div>
            <div className="rounded-[10px] border border-[#e5e7eb] bg-white px-4 pt-[10px] pb-3">
              <PartnerCard
                label="Buyer (Bill To)"
                companies={companies}
                selectedCompanyId={buyerCompanyId}
                selectedLocationId={buyerLocationId}
                onCompanyChange={(id) => handleCompanyChange("buyer", id)}
                onLocationChange={setBuyerLocationId}
                disabled={sameAsConsignee}
                collapsed={sameAsConsignee}
                headerRight={
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={sameAsConsignee}
                      onChange={(e) => setSameAsConsignee(e.target.checked)}
                      className="h-3.5 w-3.5 rounded border-[#d1d5db] text-[#0d9488] focus:ring-[#0d9488]"
                    />
                    <span className="text-[11px] text-[#6b7280]">
                      Same as Consignee
                    </span>
                  </label>
                }
              />
            </div>
          </div>

          {/* ── Order Details card (full width) ─────────────────────── */}
          <div className="rounded-[10px] border border-[#e5e7eb] bg-white px-4 pt-[10px] pb-4 mb-3">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {/* PO/SO Number */}
              <div>
                <label className="block text-[13px] font-medium text-[#111827] mb-1.5">
                  {orderType === "sales" ? "SO Number" : "PO Number"}{" "}
                  {!settings?.generatePOAutomatically && (
                    <span className="text-[#dc2626]">*</span>
                  )}
                </label>
                {isEditMode ? (
                  <input
                    type="text"
                    value={poNumber}
                    disabled
                    className="w-full h-9 border border-[#e5e7eb] rounded-[6px] px-3 bg-[#f9fafb] text-[13px] text-[#6b7280] cursor-not-allowed"
                  />
                ) : (() => {
                  const autoOn = orderType === "sales"
                    ? settings?.generateSOAutomatically
                    : settings?.generatePOAutomatically;
                  const prefix = orderType === "sales" ? settings?.soPrefix : settings?.poPrefix;
                  const sep = orderType === "sales" ? settings?.soSeparator : settings?.poSeparator;
                  const next = orderType === "sales" ? settings?.nextSONumber : settings?.nextPONumber;
                  return autoOn ? (
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-2 flex-1 h-9 border border-[#e5e7eb] rounded-[6px] px-3 bg-[#f9fafb] text-[13px] text-[#9ca3af]">
                        <Lock className="h-3.5 w-3.5" />
                        {prefix}{sep}{next}
                      </div>
                      <button
                        type="button"
                        onClick={() => setPoNumberSettingsOpen(true)}
                        className="flex-shrink-0 p-2 text-[#9ca3af] hover:text-[#0d9488] transition-colors rounded hover:bg-[#f0fdfa]"
                        title={`${orderType === "sales" ? "SO" : "PO"} Number Settings`}
                      >
                        <Settings className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={poNumber}
                        onChange={(e) => setPoNumber(e.target.value)}
                        placeholder={`Enter ${orderType === "sales" ? "SO" : "PO"} number`}
                        className="flex-1 h-9 border border-[#e5e7eb] rounded-[6px] px-3 text-[13px] text-[#111827] outline-none focus:ring-2 focus:ring-[#0d9488] focus:border-[#0d9488]"
                      />
                      <button
                        type="button"
                        onClick={() => setPoNumberSettingsOpen(true)}
                        className="flex-shrink-0 p-2 text-[#9ca3af] hover:text-[#0d9488] transition-colors rounded hover:bg-[#f0fdfa]"
                        title={`${orderType === "sales" ? "SO" : "PO"} Number Settings`}
                      >
                        <Settings className="h-4 w-4" />
                      </button>
                    </div>
                  );
                })()}
              </div>

              {/* Reference ID */}
              <div>
                <label className="block text-[13px] font-medium text-[#111827] mb-1.5">
                  Reference ID
                </label>
                <input
                  type="text"
                  value={referenceId}
                  onChange={(e) => setReferenceId(e.target.value)}
                  placeholder="Enter reference ID"
                  className="w-full h-9 border border-[#e5e7eb] rounded-[6px] px-3 text-[13px] text-[#111827] outline-none focus:ring-2 focus:ring-[#0d9488] focus:border-[#0d9488]"
                />
              </div>

              {/* Supplier Ref ID */}
              <div>
                <label className="block text-[13px] font-medium text-[#111827] mb-1.5">
                  {orderType === "sales" ? "Buyer Reference ID" : "Supplier Reference ID"}
                </label>
                <input
                  type="text"
                  value={supplierRefId}
                  onChange={(e) => setSupplierRefId(e.target.value)}
                  placeholder={orderType === "sales" ? "Enter buyer ref ID" : "Enter supplier ref ID"}
                  className="w-full h-9 border border-[#e5e7eb] rounded-[6px] px-3 text-[13px] text-[#111827] outline-none focus:ring-2 focus:ring-[#0d9488] focus:border-[#0d9488]"
                />
              </div>

              {/* Payment Terms */}
              <div>
                <label className="block text-[13px] font-medium text-[#111827] mb-1.5">
                  Payment Terms <span className="text-[#dc2626]">*</span>
                </label>
                <PaymentTermsTypeahead
                  value={paymentTerms}
                  options={paymentTermsList}
                  onChange={(v) => { setPaymentTerms(v); setShowAddPaymentTerm(false); }}
                  onCreateNew={() => setShowAddPaymentTerm(true)}
                  hasError={!!fieldErrors.paymentTerms}
                />
                {showAddPaymentTerm && (
                  <div className="mt-2 flex gap-2">
                    <input
                      type="text"
                      placeholder="e.g. Net 45"
                      value={newPaymentTerm}
                      onChange={(e) => setNewPaymentTerm(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleAddPaymentTerm()}
                      autoFocus
                      className="flex-1 border border-gray-300 rounded-md px-3 py-1.5 text-[13px] outline-none focus:ring-2 focus:ring-[#0d9488] focus:border-[#0d9488]"
                    />
                    <Button
                      size="sm"
                      disabled={!newPaymentTerm.trim() || addingPaymentTerm}
                      onClick={handleAddPaymentTerm}
                      className="bg-[#0d9488] hover:bg-[#0f766e] text-white h-8 px-3 text-[12px]"
                    >
                      {addingPaymentTerm ? <Loader2 size={14} className="animate-spin" /> : "Add"}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => { setShowAddPaymentTerm(false); setNewPaymentTerm(""); }}
                      className="h-8 px-3 text-[12px]"
                    >
                      Cancel
                    </Button>
                  </div>
                )}
                {fieldErrors.paymentTerms && (
                  <p className="text-[12px] text-[#dc2626] mt-1">{fieldErrors.paymentTerms}</p>
                )}
                {paymentTermError && (
                  <p className="text-[12px] text-[#dc2626] mt-1">{paymentTermError}</p>
                )}
              </div>

              {/* Issue Date */}
              <div>
                <label className="block text-[13px] font-medium text-[#111827] mb-1.5">
                  Issue Date <span className="text-[#dc2626]">*</span>
                </label>
                <div className="relative">
                  <input
                    type="date"
                    value={issueDate}
                    max={todayString()}
                    onChange={(e) => {
                      setIssueDate(e.target.value);
                      if (deliveryDate < e.target.value) {
                        setDeliveryDate(e.target.value);
                      }
                      if (fieldErrors.deliveryDate) setFieldErrors((prev) => ({ ...prev, deliveryDate: undefined }));
                    }}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  <div className="flex items-center justify-between h-9 border border-[#e5e7eb] rounded-[6px] px-3 bg-white cursor-pointer">
                    <span className="text-[13px] text-[#111827]">
                      {issueDate
                        ? new Date(issueDate + "T00:00:00").toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
                        : "Select date"}
                    </span>
                    <CalendarDays className="h-4 w-4 text-[#6b7280]" />
                  </div>
                </div>
              </div>

              {/* Delivery Date */}
              <div>
                <label className="block text-[13px] font-medium text-[#111827] mb-1.5">
                  Delivery Date <span className="text-[#dc2626]">*</span>
                </label>
                <div className="relative">
                  <input
                    type="date"
                    value={deliveryDate}
                    min={issueDate}
                    onChange={(e) => {
                      setDeliveryDate(e.target.value);
                      if (fieldErrors.deliveryDate) setFieldErrors((prev) => ({ ...prev, deliveryDate: undefined }));
                    }}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  <div className={`flex items-center justify-between h-9 border rounded-[6px] px-3 bg-white cursor-pointer ${fieldErrors.deliveryDate ? "border-[#dc2626]" : "border-[#e5e7eb]"}`}>
                    <span className="text-[13px] text-[#111827]">
                      {deliveryDate
                        ? new Date(deliveryDate + "T00:00:00").toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
                        : "Select date"}
                    </span>
                    <CalendarDays className="h-4 w-4 text-[#6b7280]" />
                  </div>
                </div>
                {fieldErrors.deliveryDate && (
                  <p className="text-[12px] text-[#dc2626] mt-1">{fieldErrors.deliveryDate}</p>
                )}
              </div>

              {/* Internal Notes — spans 2 columns */}
              <div className="col-span-2">
                <label className="block text-[13px] font-medium text-[#111827] mb-1.5">
                  Internal Notes
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Add internal notes..."
                  rows={3}
                  className="w-full border border-[#e5e7eb] rounded-[6px] px-3 py-2 text-[13px] text-[#111827] resize-none outline-none focus:ring-2 focus:ring-[#0d9488] focus:border-[#0d9488]"
                />
              </div>
            </div>
          </div>
              {/* Products – mobile cards */}
              <div className="lg:hidden space-y-2">
                {productRows.map((row, idx) => {
                  if (row.isUnavailable) {
                    return (
                      <div
                        key={row.id}
                        className="relative rounded-[8px] border border-[#fde68a] bg-[#fffbeb] px-3 pt-4 pb-2.5"
                      >
                        <span className="absolute -top-2.5 left-2.5 bg-[#d97706] text-white text-[10px] font-medium px-2 py-0.5 rounded-[4px]">
                          Product {idx + 1}
                        </span>
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <AlertTriangle size={13} className="text-[#d97706] flex-shrink-0" />
                            <div className="min-w-0">
                              <p className="text-[13px] text-[#92400e] line-through truncate">
                                {row.product?.name ?? "Unknown product"}{row.variant?.name ? ` – ${row.variant.name}` : ""}
                              </p>
                              <p className="text-[11px] text-[#d97706] font-medium">No longer available</p>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeRow(row.id)}
                            className="p-1.5 text-[#d97706] hover:text-[#dc2626] transition-colors flex-shrink-0"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    );
                  }

                  const hasProduct = !!row.product;
                  const gst = row.product?.gst ?? 0;
                  const uom = row.product?.unitOfMeasurement ?? "";
                  const lineTotal =
                    hasProduct && row.quantity > 0 && row.price > 0
                      ? calculateLineTotal(row.quantity, row.price, gst)
                      : 0;

                  return (
                    <div
                      key={row.id}
                      className={`relative rounded-[8px] border bg-white px-3 pt-4 pb-2.5 space-y-2 ${
                        incompleteRowIds.has(row.id)
                          ? "border-red-400 bg-[#fef2f2]"
                          : "border-[#e5e7eb]"
                      }`}
                    >
                      {/* Badge: Product N */}
                      <span className="absolute -top-2.5 left-2.5 bg-[#0d9488] text-white text-[10px] font-medium px-2 py-0.5 rounded-[4px]">
                        Product {idx + 1}
                      </span>

                      {/* Row 1: Product + Delete */}
                      <div className="flex items-center gap-2">
                        <div className="flex-1">
                          <ProductTypeahead
                            value={row.product}
                            onSelect={(p) => handleProductSelect(row.id, p)}
                            onCreateNew={(q) => {
                              setCreateProductInitialName(q);
                              setCreateProductForRowId(row.id);
                            }}
                            hasError={attempted && !row.product}
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => removeRow(row.id)}
                          disabled={productRows.length <= 1}
                          className="p-1.5 text-[#9ca3af] hover:text-[#dc2626] transition-colors disabled:opacity-30 disabled:cursor-not-allowed flex-shrink-0"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>

                      {/* Row 2: Variant (75%) | GST% (25%) */}
                      <div className="flex items-center gap-2">
                        <div className="w-3/4 min-w-0">
                          <select
                            value={row.variant?._id ?? ""}
                            onChange={(e) => handleVariantChange(row.id, row, e.target.value)}
                            disabled={!hasProduct}
                            className={`w-full h-8 border border-[#e5e7eb] rounded-[6px] px-2.5 text-[12px] text-[#111827] outline-none focus:ring-2 focus:ring-[#0d9488] focus:border-[#0d9488] bg-white disabled:opacity-50 disabled:cursor-not-allowed ${
                              attempted && hasProduct && !row.variant
                                ? "ring-1 ring-[#dc2626]"
                                : ""
                            }`}
                          >
                            <option value="">Select variant</option>
                            {(row.product?.variants ?? []).map((v) => (
                              <option key={v._id} value={v._id}>
                                {v.name}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="w-1/4 text-right">
                          <span className="text-[12px] font-medium text-[#374151]">
                            {hasProduct ? `GST ${gst}%` : ""}
                          </span>
                        </div>
                      </div>

                      {/* Row 3: Qty (37.5%) | Price (37.5%) | Total (25%) */}
                      <div className="flex items-end gap-2">
                        <div className="w-3/8 min-w-0" style={{ width: "37.5%" }}>
                          <label className="block text-[10px] text-[#9ca3af] mb-0.5">
                            Qty{uom ? ` (${uom})` : ""}
                          </label>
                          <input
                            type="text"
                            inputMode="decimal"
                            value={row.quantityStr}
                            onChange={(e) => {
                              const raw = e.target.value.replace(/,/g, "").replace(/[^0-9.]/g, "");
                              updateRow(row.id, {
                                quantityStr: formatNumericInput(raw, 3),
                                quantity: raw && !raw.endsWith(".") ? parseFloat(raw) || 0 : row.quantity,
                              });
                            }}
                            disabled={!hasProduct}
                            placeholder="0"
                            className="w-full h-8 border border-[#e5e7eb] rounded-[6px] px-2 text-[12px] text-[#111827] text-right outline-none focus:ring-2 focus:ring-[#0d9488] focus:border-[#0d9488] disabled:opacity-50 disabled:cursor-not-allowed"
                          />
                        </div>
                        <div className="min-w-0" style={{ width: "37.5%" }}>
                          <label className="block text-[10px] text-[#9ca3af] mb-0.5">Price</label>
                          <div className="flex items-center h-8 border border-[#e5e7eb] rounded-[6px] px-2 focus-within:ring-2 focus-within:ring-[#0d9488] focus-within:border-[#0d9488]">
                            <span className="text-[12px] text-[#9ca3af] flex-shrink-0">₹</span>
                            <input
                              type="text"
                              inputMode="decimal"
                              value={row.priceStr}
                              onChange={(e) => {
                                const raw = e.target.value.replace(/,/g, "").replace(/[^0-9.]/g, "");
                                updateRow(row.id, {
                                  priceStr: formatNumericInput(raw, 2),
                                  price: raw && !raw.endsWith(".") ? parseFloat(raw) || 0 : row.price,
                                });
                              }}
                              disabled={!hasProduct}
                              placeholder="0"
                              className="w-full border-0 outline-none bg-transparent text-[12px] text-[#111827] text-right disabled:opacity-50 disabled:cursor-not-allowed"
                            />
                          </div>
                        </div>
                        <div className="w-1/4 text-right">
                          <div className="h-8 flex items-center justify-end mt-[14px]">
                            {lineTotal > 0 ? (
                              <span className="text-[12px] font-medium text-[#111827]">
                                ₹{parseFloat(lineTotal.toFixed(2)).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </span>
                            ) : (
                              <span className="text-[12px] text-[#9ca3af]">—</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}

                {/* Add Product button */}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addRow}
                  className="h-9 w-full text-[13px] text-[#0d9488] border-[#0d9488] hover:bg-[#f0fdfa]"
                >
                  <Plus className="h-3.5 w-3.5 mr-1" />
                  Add Product
                </Button>

                {/* Total */}
                {totalAmount > 0 && (
                  <div className="flex items-center justify-between rounded-[10px] border border-[#e5e7eb] bg-white px-4 py-3">
                    <span className="text-[14px] font-semibold text-[#111827]">Total</span>
                    <span className="text-[14px] font-semibold text-[#111827]">
                      ₹{parseFloat(totalAmount.toFixed(2)).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                )}

                {(fieldErrors.productsEmpty || fieldErrors.productsIncomplete) && (
                  <p className="text-[12px] text-[#dc2626] mt-1.5 px-1">
                    {fieldErrors.productsEmpty || fieldErrors.productsIncomplete}
                  </p>
                )}
              </div>

              {/* Products – desktop table */}
              <div className="hidden lg:block rounded-[10px] bg-white">
                <div className="border border-[#e5e7eb] rounded-[8px] overflow-hidden">
                  <table className="w-full min-w-[700px] text-sm">
                    <thead>
                      <tr className="border-b border-[#e5e7eb] text-left text-[13px] font-medium text-[#111827] bg-[#fafafa] divide-x divide-[#e5e7eb]">
                        <th className="h-10 px-3" style={{ width: "28%" }}>Product</th>
                        <th className="h-10 px-3" style={{ width: "16%" }}>Variant</th>
                        <th className="h-10 px-3 text-right" style={{ width: "16%" }}>Quantity</th>
                        <th className="h-10 px-3 text-right" style={{ width: "14%" }}>Unit Price</th>
                        <th className="h-10 px-3 text-right" style={{ width: "8%" }}>GST%</th>
                        <th className="h-10 px-3 text-right" style={{ width: "14%" }}>Line Total</th>
                        <th className="h-10 px-2" style={{ width: "4%" }} />
                      </tr>
                    </thead>
                    <tbody>
                      {productRows.map((row) => {
                        if (row.isUnavailable) {
                          return (
                            <tr key={row.id} className="border-b border-[#fde68a] bg-[#fffbeb]">
                              <td colSpan={6} className="h-10 px-3">
                                <div className="flex items-center gap-2">
                                  <AlertTriangle size={13} className="text-[#d97706] flex-shrink-0" />
                                  <span className="text-[13px] text-[#92400e] line-through">
                                    {row.product?.name ?? "Unknown product"}{row.variant?.name ? ` – ${row.variant.name}` : ""}
                                  </span>
                                  <span className="text-[11px] text-[#d97706] font-medium">(no longer available)</span>
                                </div>
                              </td>
                              <td className="h-10 pl-1 text-center">
                                <button
                                  type="button"
                                  onClick={() => removeRow(row.id)}
                                  className="p-1 text-[#d97706] hover:text-[#dc2626] transition-colors"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </td>
                            </tr>
                          );
                        }

                        const hasProduct = !!row.product;
                        const gst = row.product?.gst ?? 0;
                        const uom = row.product?.unitOfMeasurement ?? "";
                        const lineTotal =
                          hasProduct && row.quantity > 0 && row.price > 0
                            ? calculateLineTotal(row.quantity, row.price, gst)
                            : 0;

                        return (
                          <tr
                            key={row.id}
                            className={`border-b hover:bg-[#fafafa] transition-colors divide-x divide-[#e5e7eb] ${
                              incompleteRowIds.has(row.id)
                                ? "border border-red-400 bg-[#fef2f2]"
                                : "border-[#f3f4f6]"
                            }`}
                          >
                            {/* Product */}
                            <td className="h-10 px-1">
                              <ProductTypeahead
                                value={row.product}
                                onSelect={(p) =>
                                  handleProductSelect(row.id, p)
                                }
                                onCreateNew={(q) => {
                                  setCreateProductInitialName(q);
                                  setCreateProductForRowId(row.id);
                                }}
                                hasError={attempted && !row.product}
                              />
                            </td>

                            {/* Variant */}
                            <td className="h-10 px-1">
                              <select
                                value={row.variant?._id ?? ""}
                                title={row.variant?.name ?? ""}
                                onChange={(e) => handleVariantChange(row.id, row, e.target.value)}
                                disabled={!hasProduct}
                                className={`w-full border-0 outline-none bg-transparent focus:bg-[#f0fdfa] rounded px-2 py-1 text-[13px] text-[#111827] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer ${
                                  attempted && hasProduct && !row.variant
                                    ? "ring-1 ring-[#dc2626]"
                                    : ""
                                }`}
                              >
                                <option value="">Select</option>
                                {(row.product?.variants ?? []).map((v) => (
                                  <option key={v._id} value={v._id}>
                                    {v.name}
                                  </option>
                                ))}
                              </select>
                            </td>

                            {/* Quantity */}
                            <td className="h-10 px-1">
                              <div className="flex items-center gap-1" title={row.quantity > 0 ? numberToIndianWords(row.quantity) : ""}>
                                <input
                                  type="text"
                                  inputMode="decimal"
                                  value={row.quantityStr}
                                  onChange={(e) => {
                                    const raw = e.target.value.replace(/,/g, "").replace(/[^0-9.]/g, "");
                                    updateRow(row.id, {
                                      quantityStr: formatNumericInput(raw, 3),
                                      quantity: raw && !raw.endsWith(".") ? parseFloat(raw) || 0 : row.quantity,
                                    });
                                  }}
                                  disabled={!hasProduct}
                                  placeholder="0"
                                  className="w-full border-0 outline-none bg-transparent focus:bg-[#f0fdfa] rounded px-2 py-1 text-[13px] text-[#111827] text-right disabled:opacity-50 disabled:cursor-not-allowed"
                                />
                                {uom && (
                                  <span className="text-[12px] text-[#9ca3af] flex-shrink-0">
                                    {uom}
                                  </span>
                                )}
                              </div>
                            </td>

                            {/* Unit Price */}
                            <td className="h-10 px-1">
                              <div className="flex items-center gap-0.5" title={row.price > 0 ? numberToIndianWords(row.price) : ""}>
                                <span className="text-[13px] text-[#9ca3af] flex-shrink-0">₹</span>
                                <input
                                  type="text"
                                  inputMode="decimal"
                                  value={row.priceStr}
                                  onChange={(e) => {
                                    const raw = e.target.value.replace(/,/g, "").replace(/[^0-9.]/g, "");
                                    updateRow(row.id, {
                                      priceStr: formatNumericInput(raw, 2),
                                      price: raw && !raw.endsWith(".") ? parseFloat(raw) || 0 : row.price,
                                    });
                                  }}
                                  disabled={!hasProduct}
                                  placeholder="0"
                                  className="w-full border-0 outline-none bg-transparent focus:bg-[#f0fdfa] rounded px-2 py-1 text-[13px] text-[#111827] text-right disabled:opacity-50 disabled:cursor-not-allowed"
                                />
                              </div>
                            </td>

                            {/* GST% */}
                            <td className="h-10 px-3 text-right">
                              <span className="text-[13px] text-[#9ca3af]">
                                {hasProduct ? `${gst}%` : "—"}
                              </span>
                            </td>

                            {/* Line Total */}
                            <td className="h-10 px-3 text-right" title={lineTotal > 0 ? numberToIndianWords(lineTotal) : ""}>
                              {lineTotal > 0 ? (
                                <span className="text-[13px] font-medium text-[#111827]">
                                  ₹{parseFloat(lineTotal.toFixed(2)).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </span>
                              ) : (
                                <span className="text-[13px] text-[#9ca3af]">—</span>
                              )}
                            </td>

                            {/* Delete */}
                            <td className="h-10 pl-1 text-center">
                              <button
                                type="button"
                                onClick={() => removeRow(row.id)}
                                disabled={productRows.length <= 1}
                                className="p-1 text-[#9ca3af] hover:text-[#dc2626] transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                              >
                                <Trash2 size={14} />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                      {/* Add Product row */}
                      <tr>
                        <td colSpan={7} className="px-3 py-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={addRow}
                            className="h-8 text-[13px] text-[#0d9488] border-[#0d9488] hover:bg-[#f0fdfa]"
                          >
                            <Plus className="h-3.5 w-3.5 mr-1" />
                            Add Product
                          </Button>
                        </td>
                      </tr>
                    </tbody>
                    {totalAmount > 0 && (
                      <tfoot>
                        <tr className="border-t border-[#e5e7eb]">
                          <td colSpan={2} />
                          <td className="h-10 px-3 text-right text-[13px] font-medium text-[#6b7280]" title={commonUom && totalQuantity > 0 ? numberToIndianWords(totalQuantity) : ""}>
                            {commonUom && totalQuantity > 0
                              ? `${totalQuantity.toLocaleString("en-IN")} ${commonUom}`
                              : ""}
                          </td>
                          <td />
                          <td className="h-10 px-3 text-right text-[14px] font-semibold text-[#111827]">
                            Total
                          </td>
                          <td className="h-10 px-3 text-right text-[14px] font-semibold text-[#111827]" title={numberToIndianWords(totalAmount)}>
                            ₹{parseFloat(totalAmount.toFixed(2)).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                          <td />
                        </tr>
                      </tfoot>
                    )}
                  </table>
                </div>
                {(fieldErrors.productsEmpty || fieldErrors.productsIncomplete) && (
                  <p className="text-[12px] text-[#dc2626] mt-1.5 px-1">
                    {fieldErrors.productsEmpty || fieldErrors.productsIncomplete}
                  </p>
                )}
              </div>

              {/* Terms & Attachments side by side */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                {/* Terms & Conditions */}
                <div className="rounded-[10px] border border-[#e5e7eb] bg-white p-4 sm:p-5">
                  <label className="block text-[13px] font-medium text-[#111827] mb-2">
                    Terms & Conditions
                  </label>
                  <div>
                    {terms.map((t, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between py-1.5 border-b border-[#f3f4f6]"
                      >
                        <span className="text-[13px] text-[#111827]">{t}</span>
                        <button
                          type="button"
                          onClick={() => removeTerm(i)}
                          className="text-[#9ca3af] hover:text-[#dc2626] transition-colors flex-shrink-0 ml-2"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ))}
                    <div className="flex items-center gap-1 mt-2">
                      <input
                        type="text"
                        value={termInput}
                        onChange={(e) => setTermInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            addTerm();
                          }
                        }}
                        placeholder="+ Add term"
                        className="w-full h-8 border border-[#e5e7eb] rounded-[6px] px-3 text-[13px] text-[#111827] outline-none focus:ring-2 focus:ring-[#0d9488] focus:border-[#0d9488]"
                      />
                      {termInput.trim() && (
                        <button
                          type="button"
                          onClick={addTerm}
                          className="text-[#0d9488] hover:text-[#0f766e] transition-colors flex-shrink-0"
                        >
                          <Plus size={16} />
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Attachments */}
                <div className="rounded-[10px] border border-[#e5e7eb] bg-white p-4 sm:p-5">
                  <label className="block text-[13px] font-medium text-[#111827] mb-2">
                    Attachments
                  </label>
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  <div className="flex flex-wrap gap-2 items-center">
                    {files.map((file, idx) => (
                      <div
                        key={`${file.id}-${idx}`}
                        className="flex items-center gap-1.5 bg-[#f3f4f6] rounded px-2 py-1"
                      >
                        <Paperclip size={12} className="text-[#6b7280]" />
                        <span className="text-[12px] text-[#111827]">
                          {file.name}
                        </span>
                        <button
                          type="button"
                          onClick={() => removeFile(idx)}
                          className="text-[#9ca3af] hover:text-[#dc2626] transition-colors ml-0.5"
                        >
                          <X size={12} />
                        </button>
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isUploading}
                      className="flex items-center gap-1 text-[13px] font-medium text-[#0d9488] hover:text-[#0f766e] transition-colors disabled:opacity-50"
                    >
                      {isUploading ? (
                        <Loader2 size={14} className="animate-spin" />
                      ) : (
                        <Plus size={14} />
                      )}
                      {isUploading ? "Uploading..." : "Attach"}
                    </button>
                    <span className="text-[11px] text-[#9ca3af]">Max 10MB per file</span>
                  </div>
                  {fileUploadError && (
                    <p className="text-[12px] text-[#dc2626] mt-1">{fileUploadError}</p>
                  )}
                </div>
              </div>

          {/* ── Bottom action bar ─────────────────────────────────────── */}
          <div className="flex items-center justify-end gap-2 mt-3 pt-3 pb-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const base = orderType === "sales" ? "/sales-orders" : "/purchase-orders";
                router.push(isEditMode && editId ? `${base}/${editId}` : base);
              }}
              disabled={submitting}
              className="h-8 text-[13px]"
            >
              Cancel
            </Button>
            {isEditMode && (originalStatus.current === "issued" || originalStatus.current === "confirmed") ? (
              <Button
                size="sm"
                onClick={() => handleSubmit()}
                disabled={submitting}
                className="h-8 text-[13px] bg-[#0d9488] hover:bg-[#0f766e] text-white"
              >
                {submitting ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
                ) : null}
                Save
              </Button>
            ) : (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleSubmit("draft")}
                  disabled={submitting}
                  className="h-8 text-[13px]"
                >
                  {submitting ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
                  ) : null}
                  Save as Draft
                </Button>
                <Button
                  size="sm"
                  onClick={() => handleSubmit("issued")}
                  disabled={submitting}
                  className="h-8 text-[13px] bg-[#0d9488] hover:bg-[#0f766e] text-white"
                >
                  {submitting ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
                  ) : null}
                  {isEditMode ? "Save & Issue" : "Create & Issue"}
                </Button>
              </>
            )}
          </div>
        </div>
      </div>

      <QuickCreateProductModal
        open={createProductForRowId !== null}
        onClose={() => setCreateProductForRowId(null)}
        onCreated={handleProductCreated}
        initialName={createProductInitialName}
      />

      {settings && (
        <PONumberSettingsDialog
          open={poNumberSettingsOpen}
          onClose={() => setPoNumberSettingsOpen(false)}
          orderType={orderType}
          settings={settings}
          onSave={handlePONumberSettingsSave}
        />
      )}
    </div>
  );
}
