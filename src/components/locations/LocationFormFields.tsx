"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Loader2, MapPin, Search } from "lucide-react";
import { HelpTooltip } from "@/components/ui/HelpTooltip";

// ── GST helpers ───────────────────────────────────────────────────────────────

export const GST_STATE_CODES: Record<string, string> = {
  "01": "Jammu & Kashmir", "02": "Himachal Pradesh", "03": "Punjab",
  "04": "Chandigarh", "05": "Uttarakhand", "06": "Haryana",
  "07": "Delhi", "08": "Rajasthan", "09": "Uttar Pradesh",
  "10": "Bihar", "11": "Sikkim", "12": "Arunachal Pradesh",
  "13": "Nagaland", "14": "Manipur", "15": "Mizoram",
  "16": "Tripura", "17": "Meghalaya", "18": "Assam",
  "19": "West Bengal", "20": "Jharkhand", "21": "Odisha",
  "22": "Chattisgarh", "23": "Madhya Pradesh", "24": "Gujarat",
  "26": "Dadra & Nagar Haveli and Daman & Diu", "27": "Maharashtra",
  "28": "Andhra Pradesh", "29": "Karnataka", "30": "Goa",
  "31": "Lakshadweep", "32": "Kerala", "33": "Tamil Nadu",
  "34": "Puducherry", "35": "Andaman & Nicobar Islands",
  "36": "Telangana", "37": "Andhra Pradesh (New)", "38": "Ladakh",
  "97": "Other Territory",
};

const GST_REGEX = /^\d{2}[A-Z]{5}\d{4}[A-Z]\d[A-Z\d][A-Z\d]$/;

export function validateGst(gst: string): { valid: boolean; state?: string; error?: string } {
  const cleaned = gst.trim().toUpperCase();
  if (!cleaned) return { valid: true };
  if (cleaned.length !== 15) return { valid: false, error: "GST must be 15 characters" };
  if (!GST_REGEX.test(cleaned)) return { valid: false, error: "Invalid GST format" };
  const stateCode = cleaned.substring(0, 2);
  const stateName = GST_STATE_CODES[stateCode];
  if (!stateName) return { valid: false, error: `Invalid state code: ${stateCode}` };
  return { valid: true, state: stateName };
}

// ── Countries ─────────────────────────────────────────────────────────────────

interface CountryEntry {
  name: string;
  pattern?: RegExp;
  hint: string;
}

export const COUNTRIES: CountryEntry[] = [
  { name: "India",           pattern: /^\d{6}$/,                    hint: "6-digit pin code (e.g. 400001)" },
  { name: "United States",   pattern: /^\d{5}(-\d{4})?$/,           hint: "5-digit zip code (e.g. 10001)" },
  { name: "United Kingdom",  pattern: /^[A-Z]{1,2}\d[A-Z\d]?\s?\d[A-Z]{2}$/i, hint: "UK postcode (e.g. SW1A 1AA)" },
  { name: "United Arab Emirates", hint: "Postal code (optional)" },
  { name: "Canada",          pattern: /^[A-Z]\d[A-Z]\s?\d[A-Z]\d$/i, hint: "Postal code (e.g. K1A 0B1)" },
  { name: "Australia",       pattern: /^\d{4}$/,                    hint: "4-digit postcode (e.g. 2000)" },
  { name: "Singapore",       pattern: /^\d{6}$/,                    hint: "6-digit postal code (e.g. 018960)" },
  { name: "Germany",         pattern: /^\d{5}$/,                    hint: "5-digit PLZ (e.g. 10115)" },
  { name: "France",          pattern: /^\d{5}$/,                    hint: "5-digit postal code (e.g. 75001)" },
  { name: "China",           pattern: /^\d{6}$/,                    hint: "6-digit postal code" },
  { name: "Japan",           pattern: /^\d{3}-?\d{4}$/,             hint: "7-digit postal code (e.g. 100-0001)" },
  { name: "South Korea",     pattern: /^\d{5}$/,                    hint: "5-digit postal code" },
  { name: "Malaysia",        pattern: /^\d{5}$/,                    hint: "5-digit postcode" },
  { name: "Indonesia",       pattern: /^\d{5}$/,                    hint: "5-digit postal code" },
  { name: "Thailand",        pattern: /^\d{5}$/,                    hint: "5-digit postal code" },
  { name: "Saudi Arabia",    pattern: /^\d{5}$/,                    hint: "5-digit postal code" },
  { name: "Bangladesh",      pattern: /^\d{4}$/,                    hint: "4-digit postal code" },
  { name: "Sri Lanka",       pattern: /^\d{5}$/,                    hint: "5-digit postal code" },
  { name: "Nepal",           pattern: /^\d{5}$/,                    hint: "5-digit postal code" },
  { name: "Pakistan",        pattern: /^\d{5}$/,                    hint: "5-digit postal code" },
  { name: "Vietnam",         pattern: /^\d{6}$/,                    hint: "6-digit postal code" },
  { name: "Philippines",     pattern: /^\d{4}$/,                    hint: "4-digit postal code" },
  { name: "Netherlands",     pattern: /^\d{4}\s?[A-Z]{2}$/i,        hint: "Postal code (e.g. 1234 AB)" },
  { name: "Italy",           pattern: /^\d{5}$/,                    hint: "5-digit postal code" },
  { name: "Spain",           pattern: /^\d{5}$/,                    hint: "5-digit postal code" },
  { name: "Brazil",          pattern: /^\d{5}-?\d{3}$/,             hint: "CEP (e.g. 01310-100)" },
  { name: "Mexico",          pattern: /^\d{5}$/,                    hint: "5-digit postal code" },
  { name: "South Africa",    pattern: /^\d{4}$/,                    hint: "4-digit postal code" },
  { name: "New Zealand",     pattern: /^\d{4}$/,                    hint: "4-digit postal code" },
  { name: "Switzerland",     pattern: /^\d{4}$/,                    hint: "4-digit postal code" },
  { name: "Sweden",          pattern: /^\d{5}$/,                    hint: "5-digit postal code" },
  { name: "Nigeria",         pattern: /^\d{6}$/,                    hint: "6-digit postal code" },
  { name: "Kenya",           pattern: /^\d{5}$/,                    hint: "5-digit postal code" },
  { name: "Other",           hint: "Enter postal code" },
];

export function getZipValidation(
  zip: string,
  countryName: string,
): { hint: string; error?: string } {
  const entry = COUNTRIES.find(
    (c) => c.name.toLowerCase() === countryName.trim().toLowerCase(),
  );
  const hint = entry?.hint ?? "Enter postal code";
  if (!zip.trim()) return { hint };
  if (entry?.pattern && !entry.pattern.test(zip.trim())) {
    return { hint, error: `Invalid format — expected: ${hint}` };
  }
  return { hint };
}

// ── India states (derived from GST codes so auto-fill values always match) ────

export const INDIA_STATES: string[] = [
  ...new Set(Object.values(GST_STATE_CODES)),
].sort();

// ── Country searchable select ──────────────────────────────────────────────────

export function CountrySelect({
  value,
  onChange,
  hasError,
}: {
  value: string;
  onChange: (name: string) => void;
  hasError?: boolean;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({});
  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const displayValue = open ? query : value;

  const filtered = useMemo(() => {
    if (!query.trim()) return COUNTRIES;
    const q = query.toLowerCase();
    return COUNTRIES.filter((c) => c.name.toLowerCase().includes(q));
  }, [query]);

  function updatePosition() {
    if (!inputRef.current) return;
    const rect = inputRef.current.getBoundingClientRect();
    setDropdownStyle({
      position: "fixed",
      top: rect.bottom + 4,
      left: rect.left,
      width: rect.width,
      zIndex: 9999,
    });
  }

  function handleFocus() {
    setQuery("");
    updatePosition();
    setOpen(true);
  }

  function handleSelect(name: string) {
    onChange(name);
    setQuery("");
    setOpen(false);
    inputRef.current?.blur();
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

  return (
    <div ref={wrapperRef}>
      <div className="relative flex items-center">
        <Search size={13} className="absolute left-2.5 text-gray-400 pointer-events-none" />
        <input
          ref={inputRef}
          type="text"
          value={displayValue}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={handleFocus}
          placeholder="Select country"
          className={`w-full border ${hasError ? "border-[#dc2626]" : "border-gray-300"} rounded-md pl-8 pr-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#0d9488] focus:border-[#0d9488]`}
        />
      </div>
      {open && filtered.length > 0 && (
        <div
          style={dropdownStyle}
          className="max-h-48 overflow-auto rounded-md border border-gray-200 bg-white py-1 shadow-lg"
        >
          {filtered.map((c) => (
            <button
              key={c.name}
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => handleSelect(c.name)}
              className={`flex w-full items-center px-3 py-1.5 text-left text-sm hover:bg-gray-50 ${
                c.name === value ? "bg-[#f0fdfa] text-[#0d9488] font-medium" : "text-gray-900"
              }`}
            >
              {c.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── State searchable select (India only) ─────────────────────────────────────

export function StateSelect({
  value,
  onChange,
  hasError,
}: {
  value: string;
  onChange: (name: string) => void;
  hasError?: boolean;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({});
  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const displayValue = open ? query : value;

  const filtered = useMemo(() => {
    if (!query.trim()) return INDIA_STATES;
    const q = query.toLowerCase();
    return INDIA_STATES.filter((s) => s.toLowerCase().includes(q));
  }, [query]);

  function updatePosition() {
    if (!inputRef.current) return;
    const rect = inputRef.current.getBoundingClientRect();
    setDropdownStyle({
      position: "fixed",
      top: rect.bottom + 4,
      left: rect.left,
      width: rect.width,
      zIndex: 9999,
    });
  }

  function handleFocus() {
    setQuery("");
    updatePosition();
    setOpen(true);
  }

  function handleSelect(name: string) {
    onChange(name);
    setQuery("");
    setOpen(false);
    inputRef.current?.blur();
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

  return (
    <div ref={wrapperRef}>
      <div className="relative flex items-center">
        <Search size={13} className="absolute left-2.5 text-gray-400 pointer-events-none" />
        <input
          ref={inputRef}
          type="text"
          value={displayValue}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={handleFocus}
          placeholder="Select state"
          className={`w-full border ${hasError ? "border-[#dc2626]" : "border-gray-300"} rounded-md pl-8 pr-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#0d9488] focus:border-[#0d9488]`}
        />
      </div>
      {open && filtered.length > 0 && (
        <div
          style={dropdownStyle}
          className="max-h-48 overflow-auto rounded-md border border-gray-200 bg-white py-1 shadow-lg"
        >
          {filtered.map((s) => (
            <button
              key={s}
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => handleSelect(s)}
              className={`flex w-full items-center px-3 py-1.5 text-left text-sm hover:bg-gray-50 ${
                s === value ? "bg-[#f0fdfa] text-[#0d9488] font-medium" : "text-gray-900"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Pincode lookup ────────────────────────────────────────────────────────────

async function lookupPinCode(
  pin: string,
): Promise<{ city: string; state: string; country: string } | null> {
  if (!/^\d{6}$/.test(pin)) return null;
  try {
    const res = await fetch(`https://api.postalpincode.in/pincode/${pin}`);
    const data = await res.json();
    if (data?.[0]?.Status === "Success" && data[0].PostOffice?.length > 0) {
      const po = data[0].PostOffice[0];
      return {
        city: po.District ?? po.Division ?? "",
        state: po.State ?? "",
        country: po.Country ?? "India",
      };
    }
  } catch { /* silently fail */ }
  return null;
}

// ── Types ─────────────────────────────────────────────────────────────────────

export interface LocationValues {
  name: string;
  gstNumber: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  state: string;
  country: string;
  zip: string;
  isDefault: boolean;
}

export interface LocationFieldErrors {
  name?: string;
  addressLine1?: string;
  city?: string;
  state?: string;
  zip?: string;
  country?: string;
}

export const EMPTY_LOCATION: LocationValues = {
  name: "",
  gstNumber: "",
  addressLine1: "",
  addressLine2: "",
  city: "",
  state: "",
  country: "India",
  zip: "",
  isDefault: false,
};

interface Props {
  values: LocationValues;
  onChange: (updates: Partial<LocationValues>) => void;
  errors?: LocationFieldErrors;
  gstError: string;
  onGstError: (error: string) => void;
  showIsDefault?: boolean;
  nameLabel?: string;
  namePlaceholder?: string;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function LocationFormFields({
  values,
  onChange,
  errors = {},
  gstError,
  onGstError,
  showIsDefault = false,
  nameLabel = "Location Name",
  namePlaceholder = "e.g. Mumbai Warehouse",
}: Props) {
  const [pinLooking, setPinLooking] = useState(false);

  const zipValidation = getZipValidation(values.zip, values.country);

  const handleZipChange = useCallback(
    async (value: string) => {
      onChange({ zip: value });
      // Only auto-lookup for India (6-digit pin)
      if (/^\d{6}$/.test(value) && values.country === "India") {
        setPinLooking(true);
        const result = await lookupPinCode(value);
        setPinLooking(false);
        if (result) {
          onChange({
            city: values.city || result.city,
            state: values.state || result.state,
          });
        }
      }
    },
    [onChange, values.city, values.state, values.country],
  );

  function handleGstChange(value: string) {
    const upper = value.toUpperCase();
    onChange({ gstNumber: upper });
    if (!upper.trim()) { onGstError(""); return; }
    if (upper.length === 15) {
      const result = validateGst(upper);
      if (!result.valid) {
        onGstError(result.error ?? "Invalid GST");
      } else {
        onGstError("");
        if (result.state && !values.state) onChange({ state: result.state });
        if (!values.country) onChange({ country: "India" });
      }
    } else if (upper.length > 15) {
      onGstError("GST must be 15 characters");
    } else {
      onGstError("");
    }
  }

  const inp = (error?: string) =>
    `w-full border ${
      error ? "border-[#dc2626]" : "border-gray-300"
    } rounded-md px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#0d9488] focus:border-[#0d9488]`;

  return (
    <div className="space-y-4">
      {/* Name + GST */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            {nameLabel} <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            placeholder={namePlaceholder}
            value={values.name}
            onChange={(e) => onChange({ name: e.target.value })}
            className={inp(errors.name)}
          />
          {errors.name && (
            <p className="text-[12px] text-[#dc2626] mt-1">{errors.name}</p>
          )}
        </div>
        <div>
          <div className="flex items-center gap-1.5 mb-1.5">
            <label className="text-sm font-medium text-gray-700">GST Number</label>
            <HelpTooltip
              content="15-character GSTIN. Format: 2-digit state code + 10-digit PAN + 3 chars. e.g. 27AAAAA0000A1Z5. Auto-fills the State field."
              maxWidth={240}
            />
          </div>
          <input
            type="text"
            placeholder="e.g. 27AAAAA0000A1Z5"
            maxLength={15}
            value={values.gstNumber}
            onChange={(e) => handleGstChange(e.target.value)}
            className={inp(gstError || undefined)}
          />
          {gstError ? (
            <p className="text-[12px] text-[#dc2626] mt-1">{gstError}</p>
          ) : values.gstNumber.length === 15 && !gstError ? (
            <p className="text-[11px] text-[#059669] mt-1">
              ✓ Valid GST — {GST_STATE_CODES[values.gstNumber.substring(0, 2)] ?? ""}
            </p>
          ) : (
            <p className="text-[11px] text-gray-400 mt-1">
              15-character GST — auto-fills state from code
            </p>
          )}
        </div>
      </div>

      {/* Address lines */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">
          Address Line 1 <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          placeholder="Street address"
          value={values.addressLine1}
          onChange={(e) => onChange({ addressLine1: e.target.value })}
          className={inp(errors.addressLine1)}
        />
        {errors.addressLine1 && (
          <p className="text-[12px] text-[#dc2626] mt-1">{errors.addressLine1}</p>
        )}
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">
          Address Line 2
        </label>
        <input
          type="text"
          placeholder="Apt, floor, building (optional)"
          value={values.addressLine2}
          onChange={(e) => onChange({ addressLine2: e.target.value })}
          className={inp()}
        />
      </div>

      {/* Country + Pin */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Country <span className="text-red-500">*</span>
          </label>
          <CountrySelect
            value={values.country}
            onChange={(name) => onChange({ country: name })}
            hasError={!!errors.country}
          />
          {errors.country && (
            <p className="text-[12px] text-[#dc2626] mt-1">{errors.country}</p>
          )}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Pin / Zip Code <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <input
              type="text"
              placeholder={zipValidation.hint.split(" (")[0]}
              value={values.zip}
              onChange={(e) => handleZipChange(e.target.value)}
              className={inp(errors.zip || zipValidation.error)}
            />
            {pinLooking && (
              <div className="absolute right-2.5 top-1/2 -translate-y-1/2">
                <Loader2 className="h-4 w-4 animate-spin text-[#0d9488]" />
              </div>
            )}
          </div>
          {errors.zip ? (
            <p className="text-[12px] text-[#dc2626] mt-1">{errors.zip}</p>
          ) : zipValidation.error ? (
            <p className="text-[12px] text-[#dc2626] mt-1">{zipValidation.error}</p>
          ) : (
            <p className="text-[11px] text-gray-400 mt-1 flex items-center gap-1">
              <MapPin size={10} /> {zipValidation.hint}
              {values.country === "India" && " — auto-fills city & state"}
            </p>
          )}
        </div>
      </div>

      {/* City / State */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            City <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            placeholder="City"
            value={values.city}
            onChange={(e) => onChange({ city: e.target.value })}
            className={inp(errors.city)}
          />
          {errors.city && (
            <p className="text-[12px] text-[#dc2626] mt-1">{errors.city}</p>
          )}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            State <span className="text-red-500">*</span>
          </label>
          {values.country === "India" ? (
            <StateSelect
              value={values.state}
              onChange={(name) => onChange({ state: name })}
              hasError={!!errors.state}
            />
          ) : (
            <input
              type="text"
              placeholder="State / Province"
              value={values.state}
              onChange={(e) => onChange({ state: e.target.value })}
              className={inp(errors.state)}
            />
          )}
          {errors.state && (
            <p className="text-[12px] text-[#dc2626] mt-1">{errors.state}</p>
          )}
        </div>
      </div>

      {/* Default toggle */}
      {showIsDefault && (
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onChange({ isDefault: !values.isDefault })}
            className={`flex h-5 w-5 items-center justify-center rounded border-2 transition-colors ${
              values.isDefault
                ? "border-[#0d9488] bg-[#0d9488]"
                : "border-gray-300 bg-white hover:border-[#0d9488]"
            }`}
          >
            {values.isDefault && (
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                <path
                  d="M1.5 5.5L3.5 7.5L8.5 2.5"
                  stroke="white"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            )}
          </button>
          <label
            className="text-sm text-gray-700 cursor-pointer select-none"
            onClick={() => onChange({ isDefault: !values.isDefault })}
          >
            Set as default location
          </label>
        </div>
      )}
    </div>
  );
}
