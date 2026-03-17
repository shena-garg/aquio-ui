"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Search } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import {
  categoriesService,
  type Category,
  type SubCategory,
} from "@/services/categories";
import { organizationSettingsService } from "@/services/organization-settings";
import type { Product } from "@/services/products";
import type { ProductEditState } from "@/app/(dashboard)/products/[id]/page";

// ---------------------------------------------------------------------------
// UOM list
// ---------------------------------------------------------------------------

const UOM_LIST = [
  "Kilogram", "Gram", "Milligram", "Metric Ton", "Ton", "Tonne",
  "Ounce", "Pound", "Kilometer", "Meter", "Centimeter", "Millimeter",
  "Micrometer", "Nanometer", "Foot", "Yard", "Inch",
  "Square Meter", "Square Centimeter", "Square Millimeter",
  "Square Foot", "Square Inch",
  "Cubic Meter", "Cubic Centimeter", "Cubic Inch", "Cubic Foot", "Cubic Yard",
  "Liter", "Milliliter", "Microliter", "KiloLiter",
  "Gallon", "Quart", "Fluid Ounce", "Barrel",
  "Piece", "Unit", "Each", "Nos", "Pack", "Package",
  "Box", "Carton", "Case", "Dozen", "Pair",
  "Roll", "Bundle", "Bag", "Pallet", "Set", "Bottle", "Drum", "Can",
  "Pouch", "Sachet", "Reel", "Reel Meter", "Rim", "Ream",
  "Sheet", "Stick", "Tube", "Bar", "Tin", "Coil", "Lot", "Batch",
];

// ---------------------------------------------------------------------------
// SearchableSelect
// ---------------------------------------------------------------------------

function SearchableSelect({
  value,
  options,
  onChange,
  placeholder,
  disabled,
}: {
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string, label: string) => void;
  placeholder: string;
  disabled?: boolean;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({});
  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selectedLabel = options.find((o) => o.value === value)?.label ?? "";
  const displayValue = open ? query : selectedLabel;

  const filtered = useMemo(() => {
    if (!query.trim()) return options;
    const q = query.toLowerCase();
    return options.filter((o) => o.label.toLowerCase().includes(q));
  }, [query, options]);

  function updatePosition() {
    if (!inputRef.current) return;
    const rect = inputRef.current.getBoundingClientRect();
    setDropdownStyle({
      position: "fixed",
      top: rect.bottom + 4,
      left: rect.left,
      width: rect.width,
    });
  }

  function handleFocus() {
    if (disabled) return;
    setQuery("");
    updatePosition();
    setOpen(true);
  }

  function handleSelect(opt: { value: string; label: string }) {
    onChange(opt.value, opt.label);
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

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
          value={displayValue}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={handleFocus}
          placeholder={placeholder}
          disabled={disabled}
          className="h-8 w-full rounded-[6px] border border-[#e5e7eb] bg-white pl-8 pr-3 text-[13px] text-[#111827] outline-none transition-colors focus:border-[#0d9488] focus:ring-1 focus:ring-[#0d9488] disabled:opacity-50"
        />
      </div>
      {open && filtered.length > 0 && (
        <div
          style={dropdownStyle}
          className="z-50 max-h-48 overflow-auto rounded-[6px] border border-[#e5e7eb] bg-white py-1 shadow-lg"
        >
          {filtered.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => handleSelect(opt)}
              className={`flex w-full items-center px-3 py-1.5 text-left text-[13px] hover:bg-[#f3f4f6] ${
                opt.value === value ? "bg-[#f0fdfa] text-[#0d9488] font-medium" : "text-[#111827]"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Cells
// ---------------------------------------------------------------------------

function Cell({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1">
      <div className="text-[10px] font-semibold uppercase tracking-[0.8px] text-[#6b7280]">
        {label}
      </div>
      <div className="text-[13px] font-medium text-[#111827]">
        {value || "—"}
      </div>
    </div>
  );
}

function EditCell({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1">
      <div className="text-[10px] font-semibold uppercase tracking-[0.8px] text-[#6b7280]">
        {label}
      </div>
      {children}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface ProductDetailsInfoCardProps {
  product: Product;
  isEditing?: boolean;
  editState?: ProductEditState | null;
  onEditStateChange?: (state: ProductEditState | null) => void;
}

export function ProductDetailsInfoCard({
  product,
  isEditing,
  editState,
  onEditStateChange,
}: ProductDetailsInfoCardProps) {
  // ── Data for edit mode ──
  const { data: categoriesData } = useQuery({
    queryKey: ["categories"],
    queryFn: () => categoriesService.list().then((r) => r.data),
    enabled: !!isEditing,
  });

  const { data: settingsData } = useQuery({
    queryKey: ["organization-settings"],
    queryFn: () => organizationSettingsService.getMyOwn().then((r) => r.data),
    enabled: !!isEditing,
  });

  const categories: Category[] = categoriesData?.categories ?? [];
  const selectedCategory = categories.find((c) => c._id === editState?.categoryId);
  const subCategories: SubCategory[] = selectedCategory?.subCategories ?? [];

  const categoryOptions = categories.map((c) => ({ value: c._id, label: c.name }));
  const subCategoryOptions = subCategories.map((s) => ({ value: s._id, label: s.name }));
  const uomOptions = UOM_LIST.map((u) => ({ value: u, label: u }));
  const gstOptions = (settingsData?.applicableGst ?? []).map((g: number) => ({
    value: String(g),
    label: `${g}%`,
  }));

  function updateField<K extends keyof ProductEditState>(
    key: K,
    value: ProductEditState[K],
  ) {
    if (!editState || !onEditStateChange) return;
    onEditStateChange({ ...editState, [key]: value });
  }

  // ── View mode ──
  if (!isEditing || !editState || !onEditStateChange) {
    return (
      <div className="mx-8 mt-3">
        <div className="rounded-[10px] border border-[#e5e7eb] bg-white px-4 pt-[10px] pb-2">
          <div className="grid grid-cols-3 gap-4">
            <Cell label="Product Code / SKU" value={product.sku} />
            <Cell label="Category" value={product.categoryName} />
            <Cell label="Subcategory" value={product.subCategoryName} />
          </div>
          <div className="grid grid-cols-3 gap-4 border-t border-[#e5e7eb] pt-2 mt-2">
            <Cell label="HSN Code" value={product.hsnCode} />
            <Cell label="GST" value={`${product.gst}%`} />
            <Cell label="Unit of Measurement" value={product.unitOfMeasurement} />
          </div>
        </div>
      </div>
    );
  }

  const inputCls =
    "h-8 w-full rounded-[6px] border border-[#e5e7eb] bg-white px-3 text-[13px] text-[#111827] outline-none focus:border-[#0d9488] focus:ring-1 focus:ring-[#0d9488]";

  // ── Edit mode ──
  return (
    <div className="mx-8 mt-3">
      <div className="rounded-[10px] border border-[#0d9488]/30 bg-white px-4 pt-[10px] pb-3">
        {/* Row 1: Product Name (full width) */}
        <div>
          <EditCell label="Product Name">
            <input
              value={editState.name}
              onChange={(e) => updateField("name", e.target.value)}
              className={inputCls}
            />
          </EditCell>
        </div>

        {/* Row 2: SKU, Category, Subcategory (matches view layout) */}
        <div className="grid grid-cols-3 gap-4 border-t border-[#e5e7eb] pt-3 mt-3">
          <EditCell label="Product Code / SKU">
            <input
              value={editState.sku}
              readOnly
              tabIndex={-1}
              className="h-8 w-full rounded-[6px] border border-[#e5e7eb] bg-[#f3f4f6] px-3 text-[13px] text-[#6b7280] cursor-not-allowed outline-none"
            />
          </EditCell>
          <EditCell label="Category">
            <SearchableSelect
              value={editState.categoryId}
              options={categoryOptions}
              onChange={(v, label) => {
                onEditStateChange({
                  ...editState,
                  categoryId: v,
                  categoryName: label,
                  subCategoryId: "",
                  subCategoryName: "",
                });
              }}
              placeholder="Search category…"
            />
          </EditCell>
          <EditCell label="Subcategory">
            <SearchableSelect
              value={editState.subCategoryId}
              options={subCategoryOptions}
              onChange={(v, label) => {
                onEditStateChange({
                  ...editState,
                  subCategoryId: v,
                  subCategoryName: label,
                });
              }}
              placeholder="Search subcategory…"
              disabled={!editState.categoryId}
            />
          </EditCell>
        </div>

        {/* Row 3: HSN, GST, UOM (matches view layout) */}
        <div className="grid grid-cols-3 gap-4 border-t border-[#e5e7eb] pt-3 mt-3">
          <EditCell label="HSN Code">
            <input
              value={editState.hsnCode}
              onChange={(e) => updateField("hsnCode", e.target.value)}
              className={inputCls}
            />
          </EditCell>
          <EditCell label="GST">
            <SearchableSelect
              value={String(editState.gst)}
              options={gstOptions}
              onChange={(v) => updateField("gst", Number(v))}
              placeholder="Search GST…"
            />
          </EditCell>
          <EditCell label="Unit of Measurement">
            <SearchableSelect
              value={editState.unitOfMeasurement}
              options={uomOptions}
              onChange={(v) => updateField("unitOfMeasurement", v)}
              placeholder="Search UOM…"
            />
          </EditCell>
        </div>
      </div>
    </div>
  );
}
