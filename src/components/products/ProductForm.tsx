"use client";

import { useEffect, useRef, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Lock,
  Plus,
  X,
  Paperclip,
  Loader2,
  Search,
  Settings,
  ChevronDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import apiClient from "@/lib/api-client";
import {
  categoriesService,
  type Category,
  type SubCategory,
  type CustomAttribute,
} from "@/services/categories";
import { QuickCreateCategoryModal } from "@/components/categories/QuickCreateCategoryModal";
import {
  organizationSettingsService,
  type OrganizationSettings,
} from "@/services/organization-settings";
import { productsService } from "@/services/products";

// ---------------------------------------------------------------------------
// UOM list (from lib/uom.ts keys)
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
// Searchable select component
// ---------------------------------------------------------------------------

function SearchableSelect({
  value,
  options,
  onChange,
  placeholder,
  disabled,
  hasError,
  renderOption,
  onCreateNew,
  createNewLabel,
}: {
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string, label: string) => void;
  placeholder: string;
  disabled?: boolean;
  hasError?: boolean;
  renderOption?: (opt: { value: string; label: string }) => React.ReactNode;
  onCreateNew?: () => void;
  createNewLabel?: string;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({});
  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selectedLabel = options.find((o) => o.value === value)?.label ?? "";

  // Show selected label when not focused
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

  // Reposition on scroll/resize
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
          onChange={(e) => {
            setQuery(e.target.value);
            if (!open) {
              updatePosition();
              setOpen(true);
            }
          }}
          onFocus={handleFocus}
          placeholder={placeholder}
          disabled={disabled}
          className={`w-full h-9 pl-7 pr-7 border rounded-[6px] text-[13px] text-[#111827] outline-none focus:ring-2 focus:ring-[#0d9488] focus:border-[#0d9488] bg-white disabled:opacity-50 disabled:cursor-not-allowed ${
            hasError ? "border-[#dc2626]" : "border-[#e5e7eb]"
          }`}
        />
        <ChevronDown
          size={14}
          className="absolute right-2.5 text-[#9ca3af] pointer-events-none"
        />
      </div>

      {open && (
        <div
          style={dropdownStyle}
          className="z-[9999] bg-white border border-[#e5e7eb] rounded-md shadow-lg max-h-48 overflow-y-auto"
        >
          {filtered.length > 0
            ? filtered.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => handleSelect(opt)}
                  className={`w-full text-left px-3 py-2 text-[13px] hover:bg-[#f3f4f6] ${
                    opt.value === value
                      ? "text-[#0d9488] font-medium bg-[#f0fdfa]"
                      : "text-[#111827]"
                  }`}
                >
                  {renderOption ? renderOption(opt) : opt.label}
                </button>
              ))
            : (
              <div className="px-3 py-2 text-[13px] text-[#9ca3af]">
                No results found
              </div>
            )}
          {onCreateNew && (
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => { setOpen(false); onCreateNew(); }}
              className="w-full text-left px-3 py-2 text-[13px] font-medium text-[#0d9488] hover:bg-[#f0fdfa] border-t border-[#e5e7eb] flex items-center gap-1.5"
            >
              <Plus size={13} /> {createNewLabel ?? "Create New"}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Variant & attribute types — unified table model
// ---------------------------------------------------------------------------

// A shared attribute row (Custom Field + Unit), common across all variants
interface AttributeRow {
  id: string;
  label: string;
  unit: string;
  required: boolean;
  valueType: "text" | "dropdown";
  dropdownOptions: string[]; // parsed from comma-separated values
  fromSubCategory: boolean;
}

// A variant column
interface VariantColumn {
  id: string;
  name: string;
  values: Record<string, string>; // attributeRowId → value
}

function makeAttributeRowFromCustom(attr: CustomAttribute): AttributeRow {
  return {
    id: crypto.randomUUID(),
    label: attr.label,
    unit: attr.unit,
    required: attr.required,
    valueType: attr.valueType,
    dropdownOptions:
      attr.valueType === "dropdown" && attr.values
        ? attr.values.split(",").map((v) => v.trim()).filter(Boolean)
        : [],
    fromSubCategory: true,
  };
}

function makeEmptyAttributeRow(): AttributeRow {
  return {
    id: crypto.randomUUID(),
    label: "",
    unit: "",
    required: false,
    valueType: "text",
    dropdownOptions: [],
    fromSubCategory: false,
  };
}

function makeEmptyVariantColumn(): VariantColumn {
  return {
    id: crypto.randomUUID(),
    name: "",
    values: {},
  };
}

// ---------------------------------------------------------------------------
// Settings inline dialog for SKU configuration
// ---------------------------------------------------------------------------

function SKUSettingsDialog({
  open,
  onClose,
  settings,
  onSave,
}: {
  open: boolean;
  onClose: () => void;
  settings: OrganizationSettings;
  onSave: (updated: Partial<OrganizationSettings>) => Promise<void>;
}) {
  const [autoGenerate, setAutoGenerate] = useState(settings.generateSKUAutomatically);
  const [prefix, setPrefix] = useState(settings.skuPrefix);
  const [separator, setSeparator] = useState(settings.skuSeparator);
  const [nextNumber, setNextNumber] = useState(settings.nextSKUNumber);
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    try {
      await onSave({
        generateSKUAutomatically: autoGenerate,
        skuPrefix: prefix,
        skuSeparator: separator,
        nextSKUNumber: nextNumber,
      });
      onClose();
    } catch {
      toast.error("Failed to save SKU settings");
    } finally {
      setSaving(false);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
      <div className="bg-white rounded-[10px] shadow-xl w-full max-w-[440px] mx-4 sm:mx-auto p-0">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#e5e7eb]">
          <h3 className="text-[15px] font-semibold text-[#111827]">
            Product Code Settings
          </h3>
          <button
            onClick={onClose}
            className="text-[#9ca3af] hover:text-[#6b7280] transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <div className="px-5 py-4">
          {/* Toggle */}
          <div className="flex items-start justify-between gap-4 mb-4">
            <div>
              <p className="text-sm font-medium text-gray-700">
                Auto-generate Product Code
              </p>
              <p className="text-[12px] text-gray-400 mt-0.5">
                Automatically assign a sequential code
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
                  <label className="block text-[12px] font-medium text-gray-500 mb-1">
                    Prefix
                  </label>
                  <input
                    type="text"
                    value={prefix}
                    onChange={(e) => setPrefix(e.target.value)}
                    className="w-full border border-gray-300 rounded-md px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-[#0d9488] focus:border-[#0d9488]"
                  />
                </div>
                <div>
                  <label className="block text-[12px] font-medium text-gray-500 mb-1">
                    Separator
                  </label>
                  <input
                    type="text"
                    value={separator}
                    onChange={(e) => setSeparator(e.target.value)}
                    className="w-full border border-gray-300 rounded-md px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-[#0d9488] focus:border-[#0d9488]"
                  />
                </div>
                <div>
                  <label className="block text-[12px] font-medium text-gray-500 mb-1">
                    Next Number
                  </label>
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

        <div className="flex justify-end gap-2 px-5 py-4 border-t border-[#e5e7eb]">
          <Button variant="outline" size="sm" onClick={onClose} className="h-8 text-[13px]">
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

// ---------------------------------------------------------------------------
// Loading skeleton
// ---------------------------------------------------------------------------

function FullPageSkeleton() {
  return (
    <div className="flex flex-col h-full">
      <div className="flex h-[55px] flex-shrink-0 items-center border-b border-[#e5e7eb] bg-white px-4 sm:px-6">
        <div className="h-5 w-48 rounded bg-gray-200 animate-pulse" />
      </div>
      <div className="flex-1 overflow-auto">
        <div className="mx-4 pt-3 pb-6 space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="rounded-[10px] border border-[#e5e7eb] bg-white p-4 sm:p-6 animate-pulse"
            >
              <div className="h-4 w-32 rounded bg-gray-200 mb-4" />
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                {Array.from({ length: 3 }).map((_, j) => (
                  <div key={j} className="space-y-3">
                    <div className="h-3 w-20 rounded bg-gray-200" />
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
// Main form
// ---------------------------------------------------------------------------

interface ProductFormProps {
  editId?: string;
}

export function ProductForm({ editId }: ProductFormProps) {
  const isEditMode = !!editId;
  const router = useRouter();
  const queryClient = useQueryClient();

  // ── Bootstrap data ──────────────────────────────────────────────────────
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<Category[]>([]);
  const [settings, setSettings] = useState<OrganizationSettings | null>(null);

  useEffect(() => {
    Promise.all([
      categoriesService.list().then((r) => r.data),
      organizationSettingsService.getMyOwn().then((r) => r.data),
    ])
      .then(([catData, settingsData]) => {
        setCategories(catData.categories ?? []);
        setSettings(settingsData);
      })
      .catch(() => {
        toast.error("Failed to load form data. Please try again.");
      })
      .finally(() => setLoading(false));
  }, []);

  // ── Form state ────────────────────────────────────────────────────────
  const [name, setName] = useState("");
  const [unitOfMeasurement, setUnitOfMeasurement] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [subCategoryId, setSubCategoryId] = useState("");
  const [createCategoryModal, setCreateCategoryModal] = useState<
    { mode: "category" } | { mode: "subcategory"; parentId: string; parentName: string } | null
  >(null);
  const [addGstOpen, setAddGstOpen] = useState(false);
  const [newGstValue, setNewGstValue] = useState("");
  const [addingGst, setAddingGst] = useState(false);
  const [sku, setSku] = useState("");
  const [hsnCode, setHsnCode] = useState("");
  const [gst, setGst] = useState<string>("");
  const [description, setDescription] = useState("");
  const [terms, setTerms] = useState<string[]>([]);
  const [termInput, setTermInput] = useState("");
  const [files, setFiles] = useState<{ id: string; name: string }[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── SKU settings dialog ─────────────────────────────────────────────
  const [skuSettingsOpen, setSkuSettingsOpen] = useState(false);

  // ── Derived data ────────────────────────────────────────────────────
  const selectedCategory = categories.find((c) => c._id === categoryId);
  const subCategories = selectedCategory?.subCategories ?? [];
  const selectedSubCategory = subCategories.find((sc) => sc._id === subCategoryId);
  const subCategoryAttributes: CustomAttribute[] = selectedSubCategory?.customAttributes ?? [];

  // ── Variants (unified table: shared attribute rows + variant columns) ──
  const [attributeRows, setAttributeRows] = useState<AttributeRow[]>([]);
  const [variantColumns, setVariantColumns] = useState<VariantColumn[]>([]);

  // When subcategory changes, rebuild attribute rows (preserve custom ones)
  useEffect(() => {
    setAttributeRows((prev) => {
      const customRows = prev.filter((r) => !r.fromSubCategory);
      const newSubRows = subCategoryAttributes.map((attr) => {
        // Preserve existing row id if label matches (so variant values stay mapped)
        const existing = prev.find(
          (r) => r.fromSubCategory && r.label === attr.label
        );
        return existing
          ? { ...existing, unit: attr.unit, required: attr.required }
          : makeAttributeRowFromCustom(attr);
      });
      return [...newSubRows, ...customRows];
    });

    // Ensure at least one variant column exists
    setVariantColumns((prev) => (prev.length === 0 ? [makeEmptyVariantColumn()] : prev));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subCategoryId]);

  // ── Validation ──────────────────────────────────────────────────────
  const [attempted, setAttempted] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  interface FieldErrors {
    name?: string;
    unitOfMeasurement?: string;
    categoryId?: string;
    subCategoryId?: string;
    sku?: string;
    hsnCode?: string;
    gst?: string;
    variants?: string;
  }
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  // ── UOM options ─────────────────────────────────────────────────────
  const uomOptions = useMemo(
    () => UOM_LIST.map((u) => ({ value: u, label: u })),
    []
  );

  // ── Category options ────────────────────────────────────────────────
  const categoryOptions = useMemo(
    () =>
      categories
        .filter((c) => c.status === "active")
        .map((c) => ({ value: c._id, label: c.name })),
    [categories]
  );

  // ── Subcategory options ─────────────────────────────────────────────
  const subCategoryOptions = useMemo(
    () => subCategories.map((sc) => ({ value: sc._id, label: sc.name })),
    [subCategories]
  );

  // ── GST options ─────────────────────────────────────────────────────
  const gstOptions = useMemo(() => {
    const rates = [...(settings?.applicableGst ?? [])].sort((a, b) => a - b);
    return rates.map((r) => ({ value: String(r), label: `${r}%` }));
  }, [settings?.applicableGst]);

  // ── Handlers ────────────────────────────────────────────────────────

  function handleCategoryChange(id: string) {
    setCategoryId(id);
    setSubCategoryId("");
    // Reset when category changes
    setAttributeRows([]);
    setVariantColumns([]);
  }

  function handleSubCategoryChange(id: string) {
    setSubCategoryId(id);
  }

  async function handleCategoryCreated(created: { _id: string; name: string }) {
    // Refresh categories list and auto-select the new one
    const catData = await categoriesService.list().then((r) => r.data);
    setCategories(catData.categories ?? []);
    handleCategoryChange(created._id);
  }

  async function handleSubCategoryCreated(created: { _id: string; name: string }) {
    // Refresh categories list and auto-select the new subcategory
    const catData = await categoriesService.list().then((r) => r.data);
    setCategories(catData.categories ?? []);
    setSubCategoryId(created._id);
  }

  async function handleAddGst() {
    const val = parseFloat(newGstValue);
    if (isNaN(val) || val < 0) {
      toast.error("Enter a valid GST percentage");
      return;
    }
    setAddingGst(true);
    try {
      await apiClient.post("/organization-settings/my-own/applicable-gst", { gst: val });
      // Refresh settings to get updated GST list
      const settingsData = await organizationSettingsService.getMyOwn().then((r) => r.data);
      setSettings(settingsData);
      setGst(String(val));
      setAddGstOpen(false);
      setNewGstValue("");
      toast.success(`GST ${val}% added`);
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? "Failed to add GST rate";
      toast.error(message);
    } finally {
      setAddingGst(false);
    }
  }

  // Terms
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

  // Files
  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const fileList = e.target.files;
    if (!fileList || fileList.length === 0) return;

    setIsUploading(true);
    try {
      for (const file of Array.from(fileList)) {
        const formData = new FormData();
        formData.append("file", file);
        const res = await apiClient.post("/files/upload", formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        const uploaded = res.data;
        setFiles((prev) => [
          ...prev,
          {
            id: uploaded.id ?? uploaded._id ?? "",
            name: uploaded.name ?? uploaded.fileName ?? file.name,
          },
        ]);
      }
    } catch {
      toast.error("Failed to upload file");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  function removeFile(idx: number) {
    setFiles((prev) => prev.filter((_, i) => i !== idx));
  }

  // Variant column helpers
  function addVariantColumn() {
    setVariantColumns((prev) => [...prev, makeEmptyVariantColumn()]);
  }

  function removeVariantColumn(id: string) {
    setVariantColumns((prev) => prev.filter((v) => v.id !== id));
  }

  function updateVariantName(id: string, newName: string) {
    setVariantColumns((prev) =>
      prev.map((v) => (v.id === id ? { ...v, name: newName } : v))
    );
  }

  function updateVariantValue(variantId: string, attrRowId: string, value: string) {
    setVariantColumns((prev) =>
      prev.map((v) =>
        v.id === variantId
          ? { ...v, values: { ...v.values, [attrRowId]: value } }
          : v
      )
    );
  }

  // Attribute row helpers
  function addCustomAttributeRow() {
    setAttributeRows((prev) => [...prev, makeEmptyAttributeRow()]);
  }

  function removeAttributeRow(id: string) {
    setAttributeRows((prev) => prev.filter((r) => r.id !== id));
    // Clean up values from all variant columns
    setVariantColumns((prev) =>
      prev.map((v) => {
        const { [id]: _, ...rest } = v.values;
        return { ...v, values: rest };
      })
    );
  }

  function updateAttributeRow(id: string, patch: Partial<AttributeRow>) {
    setAttributeRows((prev) =>
      prev.map((r) => (r.id === id ? { ...r, ...patch } : r))
    );
  }

  // SKU settings save
  async function handleSKUSettingsSave(updated: Partial<OrganizationSettings>) {
    await organizationSettingsService.update(updated);
    // Refresh settings
    const res = await organizationSettingsService.getMyOwn();
    setSettings(res.data);
    toast.success("SKU settings updated");
  }

  // ── Submit ──────────────────────────────────────────────────────────
  async function handleSubmit() {
    setAttempted(true);
    setSubmitError("");

    const errors: FieldErrors = {};

    if (!name.trim()) errors.name = "Product name is required.";
    if (!unitOfMeasurement) errors.unitOfMeasurement = "Unit of measurement is required.";
    if (!categoryId) errors.categoryId = "Category is required.";
    if (!subCategoryId) errors.subCategoryId = "Subcategory is required.";
    if (!settings?.generateSKUAutomatically && !sku.trim()) {
      errors.sku = "Product code is required.";
    }
    if (!hsnCode.trim()) errors.hsnCode = "HSN code is required.";
    if (!gst) errors.gst = "GST is required.";

    // Build effective variants — auto-create "Default" if none provided
    let effectiveVariants = variantColumns.filter((v) => v.name.trim());
    if (effectiveVariants.length === 0) {
      // Auto-create a Default variant using existing columns (if any) or empty
      const fallback = variantColumns.length > 0 ? variantColumns[0] : makeEmptyVariantColumn();
      effectiveVariants = [{ ...fallback, name: "Default" }];
    }

    // Check required attributes have values in all variants
    const requiredRows = attributeRows.filter((r) => r.required);
    const hasIncompleteAttrs = effectiveVariants.some((v) =>
      requiredRows.some((r) => !v.values[r.id]?.trim())
    );
    if (hasIncompleteAttrs) {
      errors.variants = "Required attributes must have values for all variants.";
    }

    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setSubmitting(true);
    try {
      const payload = {
        name: name.trim(),
        unitOfMeasurement,
        categoryId,
        subCategoryId,
        hsnCode: hsnCode.trim(),
        gst: parseFloat(gst),
        description: description.trim() || undefined,
        termsOfConditions: terms.length > 0 ? terms : undefined,
        files: files.length > 0 ? files.map((f) => ({ id: f.id, name: f.name })) : undefined,
        variants: effectiveVariants.map((v) => ({
          name: v.name.trim() || "Default",
          customAttributes: attributeRows
            .filter((r) => r.label.trim())
            .map((r) => ({
              label: r.label.trim(),
              unit: r.unit.trim(),
              value: (v.values[r.id] ?? "").trim() || undefined,
            })),
        })),
      };

      const { data: created } = await productsService.create(payload);
      toast.success("Product created successfully.");
      await queryClient.invalidateQueries({ queryKey: ["products"] });
      router.push(`/products/${created._id}`);
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? "Failed to create product. Please try again.";
      setSubmitError(message);
    } finally {
      setSubmitting(false);
    }
  }

  // ── Render ──────────────────────────────────────────────────────────

  if (loading) return <FullPageSkeleton />;

  return (
    <div className="flex flex-col h-full">
      {/* ── Sticky top bar ──────────────────────────────────────────── */}
      <div className="flex h-[55px] flex-shrink-0 items-center justify-between border-b border-[#e5e7eb] bg-white px-4 sm:px-6 sticky top-0 z-10">
        <span className="text-[16px] sm:text-[18px] font-semibold text-[#111827]">
          {isEditMode ? "Edit Product" : "New Product"}
        </span>
      </div>

      {/* ── Error banner ──────────────────────────────────────────── */}
      {(submitError || Object.keys(fieldErrors).length > 0) && (
        <div className="flex items-start justify-between bg-[#fef2f2] border-b border-[#fecaca] px-4 sm:px-6 py-2.5">
          <div className="flex flex-col gap-0.5">
            {submitError && (
              <span className="text-[13px] text-[#b91c1c]">{submitError}</span>
            )}
            {Object.values(fieldErrors).map((msg, i) => (
              <span key={i} className="text-[13px] text-[#b91c1c]">
                {msg}
              </span>
            ))}
          </div>
          <button
            type="button"
            onClick={() => {
              setSubmitError("");
              setFieldErrors({});
              setAttempted(false);
            }}
            className="text-[#b91c1c] hover:text-[#991b1b] flex-shrink-0 mt-0.5"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* ── Scrollable content ──────────────────────────────────────── */}
      <div className="flex-1 overflow-auto">
        <div className="mx-4 pt-3 pb-6">
          {/* ── Product Details card ──────────────────────────────── */}
          <div className="rounded-[10px] border border-[#e5e7eb] bg-white px-3 sm:px-4 pt-[10px] pb-4 mb-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Product Name */}
              <div>
                <label className="block text-[13px] font-medium text-[#111827] mb-1.5">
                  Product Name <span className="text-[#dc2626]">*</span>
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter product name"
                  className={`w-full h-9 border rounded-[6px] px-3 text-[13px] text-[#111827] outline-none focus:ring-2 focus:ring-[#0d9488] focus:border-[#0d9488] ${
                    attempted && fieldErrors.name
                      ? "border-[#dc2626]"
                      : "border-[#e5e7eb]"
                  }`}
                />
              </div>

              {/* Unit of Measurement */}
              <div>
                <label className="block text-[13px] font-medium text-[#111827] mb-1.5">
                  Unit of Measurement <span className="text-[#dc2626]">*</span>
                </label>
                <SearchableSelect
                  value={unitOfMeasurement}
                  options={uomOptions}
                  onChange={(val) => setUnitOfMeasurement(val)}
                  placeholder="Search unit..."
                  hasError={attempted && !!fieldErrors.unitOfMeasurement}
                />
              </div>

              {/* Category */}
              <div>
                <label className="block text-[13px] font-medium text-[#111827] mb-1.5">
                  Category <span className="text-[#dc2626]">*</span>
                </label>
                <SearchableSelect
                  value={categoryId}
                  options={categoryOptions}
                  onChange={(val) => handleCategoryChange(val)}
                  placeholder="Search category..."
                  hasError={attempted && !!fieldErrors.categoryId}
                  onCreateNew={() => setCreateCategoryModal({ mode: "category" })}
                  createNewLabel="Create New Category"
                />
              </div>

              {/* Subcategory */}
              <div>
                <label className="block text-[13px] font-medium text-[#111827] mb-1.5">
                  Subcategory <span className="text-[#dc2626]">*</span>
                </label>
                <SearchableSelect
                  value={subCategoryId}
                  options={subCategoryOptions}
                  onChange={(val) => handleSubCategoryChange(val)}
                  placeholder={categoryId ? "Search subcategory..." : "Select a category first"}
                  disabled={!categoryId}
                  hasError={attempted && !!fieldErrors.subCategoryId}
                  onCreateNew={categoryId ? () => setCreateCategoryModal({
                    mode: "subcategory",
                    parentId: categoryId,
                    parentName: selectedCategory?.name ?? "",
                  }) : undefined}
                  createNewLabel="Create New Subcategory"
                />
              </div>

              {/* Product Code / SKU */}
              <div>
                <label className="block text-[13px] font-medium text-[#111827] mb-1.5">
                  Product Code / SKU{" "}
                  {!settings?.generateSKUAutomatically && (
                    <span className="text-[#dc2626]">*</span>
                  )}
                </label>
                {settings?.generateSKUAutomatically ? (
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-2 flex-1 h-9 border border-[#e5e7eb] rounded-[6px] px-3 bg-[#f9fafb] text-[13px] text-[#9ca3af]">
                      <Lock className="h-3.5 w-3.5" />
                      {settings.skuPrefix}{settings.skuSeparator}{settings.nextSKUNumber}
                    </div>
                    <button
                      type="button"
                      onClick={() => setSkuSettingsOpen(true)}
                      className="flex-shrink-0 p-2 text-[#9ca3af] hover:text-[#0d9488] transition-colors rounded hover:bg-[#f0fdfa]"
                      title="SKU Settings"
                    >
                      <Settings className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={sku}
                      onChange={(e) => setSku(e.target.value)}
                      placeholder="Enter product code"
                      className={`flex-1 h-9 border rounded-[6px] px-3 text-[13px] text-[#111827] outline-none focus:ring-2 focus:ring-[#0d9488] focus:border-[#0d9488] ${
                        attempted && fieldErrors.sku
                          ? "border-[#dc2626]"
                          : "border-[#e5e7eb]"
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setSkuSettingsOpen(true)}
                      className="flex-shrink-0 p-2 text-[#9ca3af] hover:text-[#0d9488] transition-colors rounded hover:bg-[#f0fdfa]"
                      title="SKU Settings"
                    >
                      <Settings className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </div>

              {/* HSN Code */}
              <div>
                <label className="block text-[13px] font-medium text-[#111827] mb-1.5">
                  HSN Code / Tax Code <span className="text-[#dc2626]">*</span>
                </label>
                <input
                  type="text"
                  value={hsnCode}
                  onChange={(e) => setHsnCode(e.target.value)}
                  placeholder="Enter HSN code"
                  className={`w-full h-9 border rounded-[6px] px-3 text-[13px] text-[#111827] outline-none focus:ring-2 focus:ring-[#0d9488] focus:border-[#0d9488] ${
                    attempted && fieldErrors.hsnCode
                      ? "border-[#dc2626]"
                      : "border-[#e5e7eb]"
                  }`}
                />
              </div>

              {/* GST */}
              <div>
                <label className="block text-[13px] font-medium text-[#111827] mb-1.5">
                  GST <span className="text-[#dc2626]">*</span>
                </label>
                <SearchableSelect
                  value={gst}
                  options={gstOptions}
                  onChange={(val) => setGst(val)}
                  placeholder="Search GST rate..."
                  hasError={attempted && !!fieldErrors.gst}
                  onCreateNew={() => setAddGstOpen(true)}
                  createNewLabel="Add New GST Rate"
                />
              </div>

              {/* Description — spans 2 columns */}
              <div className="sm:col-span-2">
                <label className="block text-[13px] font-medium text-[#111827] mb-1.5">
                  Description
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Add product description..."
                  rows={3}
                  className="w-full border border-[#e5e7eb] rounded-[6px] px-3 py-2 text-[13px] text-[#111827] resize-none outline-none focus:ring-2 focus:ring-[#0d9488] focus:border-[#0d9488]"
                />
              </div>
            </div>
          </div>

          {/* ── Variants & Attributes (unified table) ─────────────── */}
          <div className="rounded-[10px] border border-[#e5e7eb] bg-white overflow-hidden mb-3">
            {attempted && fieldErrors.variants && (
              <div className="px-4 py-2 bg-[#fef2f2] border-b border-[#fecaca]">
                <span className="text-[12px] text-[#b91c1c]">{fieldErrors.variants}</span>
              </div>
            )}

            {variantColumns.length === 0 && attributeRows.length === 0 ? (
              <div className="px-4 py-8 text-center">
                <p className="text-[13px] text-[#9ca3af] mb-3">
                  {subCategoryId
                    ? "Add your first variant to get started"
                    : "Select a subcategory to see custom attributes, then add variants"}
                </p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addVariantColumn}
                  className="h-8 text-[13px] text-[#0d9488] border-[#0d9488] hover:bg-[#f0fdfa]"
                >
                  <Plus className="h-3.5 w-3.5 mr-1" />
                  Add Variant
                </Button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm" style={{ minWidth: Math.max(500, 260 + variantColumns.length * 200 + 52) }}>
                  <thead>
                    {/* Row 1: Variant name headers */}
                    <tr className="border-b border-[#e5e7eb]">
                      {/* Fixed left zone — spans Custom Field + Unit */}
                      <th
                        colSpan={2}
                        className="h-[52px] px-4 text-left align-bottom pb-2 bg-[#fafafa] border-r-2 border-[#e5e7eb]"
                        style={{ width: 260 }}
                      >
                        <span className="text-[13px] font-semibold text-[#111827]">
                          Variants & Attributes
                        </span>
                      </th>

                      {/* Variant columns */}
                      {variantColumns.map((vc, i) => (
                        <th
                          key={vc.id}
                          className={`h-[52px] px-3 bg-white align-top pt-1.5 ${
                            i > 0 ? "border-l border-[#f3f4f6]" : ""
                          }`}
                          style={{ minWidth: 200 }}
                        >
                          <div className="flex items-center justify-between mb-0.5">
                            <span className="text-[11px] font-medium text-[#9ca3af] uppercase tracking-wide">
                              Variant {i + 1}
                            </span>
                            <button
                              type="button"
                              onClick={() => removeVariantColumn(vc.id)}
                              className="p-0.5 text-[#d1d5db] hover:text-[#dc2626] transition-colors rounded"
                              title="Remove variant"
                            >
                              <X size={13} />
                            </button>
                          </div>
                          <input
                            type="text"
                            value={vc.name}
                            onChange={(e) => updateVariantName(vc.id, e.target.value)}
                            placeholder="Enter name..."
                            className={`w-full border border-transparent outline-none bg-transparent rounded-[4px] text-[13px] font-medium text-[#111827] px-1.5 py-1 focus:bg-[#f0fdfa] focus:border-[#0d9488] ${
                              attempted && !vc.name.trim() ? "!border-[#dc2626] bg-[#fef2f2]" : "hover:border-[#e5e7eb]"
                            }`}
                          />
                        </th>
                      ))}

                      {/* + Add Variant column */}
                      <th className="h-[52px] px-2 bg-white align-middle border-l border-[#f3f4f6]" style={{ width: 52 }}>
                        <button
                          type="button"
                          onClick={addVariantColumn}
                          className="flex items-center justify-center w-8 h-8 rounded-[6px] border border-dashed border-[#d1d5db] text-[#9ca3af] hover:border-[#0d9488] hover:text-[#0d9488] hover:bg-[#f0fdfa] transition-colors"
                          title="Add Variant"
                        >
                          <Plus size={16} />
                        </button>
                      </th>
                    </tr>

                    {/* Row 2: Column sub-headers */}
                    <tr className="border-b border-[#e5e7eb] bg-[#fafafa]">
                      <th className="h-8 px-4 text-left text-[12px] font-medium text-[#6b7280] border-r-2 border-[#e5e7eb]" style={{ width: 160 }}>
                        Custom Field
                      </th>
                      <th className="h-8 px-3 text-left text-[12px] font-medium text-[#6b7280] border-r-2 border-[#e5e7eb]" style={{ width: 100 }}>
                        Unit
                      </th>
                      {variantColumns.map((vc, i) => (
                        <th
                          key={vc.id}
                          className={`h-8 px-3 text-left text-[12px] font-medium text-[#6b7280] bg-white ${
                            i > 0 ? "border-l border-[#f3f4f6]" : ""
                          }`}
                          style={{ minWidth: 200 }}
                        >
                          Value
                        </th>
                      ))}
                      <th className="h-8 bg-white border-l border-[#f3f4f6]" style={{ width: 52 }} />
                    </tr>
                  </thead>

                  <tbody>
                    {attributeRows.map((row) => (
                      <tr
                        key={row.id}
                        className="border-b border-[#f3f4f6] group hover:bg-[#fafbfc] transition-colors"
                      >
                        {/* Custom Field (label) */}
                        <td className="h-10 px-2 border-r-2 border-[#e5e7eb] bg-[#fafafa]/50" style={{ width: 160 }}>
                          <div className="flex items-center gap-1">
                            {!row.fromSubCategory ? (
                              <button
                                type="button"
                                onClick={() => removeAttributeRow(row.id)}
                                className="flex-shrink-0 p-0.5 text-transparent group-hover:text-[#9ca3af] hover:!text-[#dc2626] transition-colors"
                              >
                                <X size={12} />
                              </button>
                            ) : (
                              <span className="w-[16px] flex-shrink-0" />
                            )}
                            <input
                              type="text"
                              value={row.label}
                              onChange={(e) =>
                                updateAttributeRow(row.id, { label: e.target.value })
                              }
                              disabled={row.fromSubCategory}
                              placeholder="Field name"
                              className="w-full border-0 outline-none bg-transparent focus:bg-[#f0fdfa] rounded px-1 py-1 text-[13px] text-[#111827] disabled:opacity-80 disabled:cursor-default"
                            />
                            {row.required && (
                              <span className="text-[#dc2626] text-[13px] flex-shrink-0 mr-1">*</span>
                            )}
                          </div>
                        </td>

                        {/* Unit */}
                        <td className="h-10 px-2 border-r-2 border-[#e5e7eb] bg-[#fafafa]/50" style={{ width: 100 }}>
                          <input
                            type="text"
                            value={row.unit}
                            onChange={(e) =>
                              updateAttributeRow(row.id, { unit: e.target.value })
                            }
                            disabled={row.fromSubCategory}
                            placeholder="—"
                            className="w-full border-0 outline-none bg-transparent focus:bg-[#f0fdfa] rounded px-1 py-1 text-[13px] text-[#6b7280] disabled:opacity-80 disabled:cursor-default"
                          />
                        </td>

                        {/* Value cells — one per variant column */}
                        {variantColumns.map((vc, i) => {
                          const val = vc.values[row.id] ?? "";
                          const valueMissing = attempted && row.required && !val.trim();

                          return (
                            <td
                              key={vc.id}
                              className={`h-10 px-1 ${i > 0 ? "border-l border-[#f3f4f6]" : ""}`}
                            >
                              {row.valueType === "dropdown" && row.dropdownOptions.length > 0 ? (
                                <select
                                  value={val}
                                  onChange={(e) =>
                                    updateVariantValue(vc.id, row.id, e.target.value)
                                  }
                                  className={`w-full h-8 border border-transparent outline-none bg-transparent focus:bg-[#f0fdfa] focus:border-[#0d9488] rounded-[4px] px-2 py-1 text-[13px] text-[#111827] cursor-pointer hover:border-[#e5e7eb] ${
                                    valueMissing ? "!border-[#dc2626] bg-[#fef2f2]" : ""
                                  }`}
                                >
                                  <option value="">Select...</option>
                                  {row.dropdownOptions.map((opt) => (
                                    <option key={opt} value={opt}>
                                      {opt}
                                    </option>
                                  ))}
                                </select>
                              ) : (
                                <input
                                  type="text"
                                  value={val}
                                  onChange={(e) =>
                                    updateVariantValue(vc.id, row.id, e.target.value)
                                  }
                                  placeholder="Enter value"
                                  className={`w-full h-8 border border-transparent outline-none bg-transparent focus:bg-[#f0fdfa] focus:border-[#0d9488] rounded-[4px] px-2 py-1 text-[13px] text-[#111827] hover:border-[#e5e7eb] ${
                                    valueMissing ? "!border-[#dc2626] bg-[#fef2f2]" : ""
                                  }`}
                                />
                              )}
                            </td>
                          );
                        })}

                        {/* Spacer for + column */}
                        <td className="h-10 border-l border-[#f3f4f6]" style={{ width: 52 }} />
                      </tr>
                    ))}

                    {/* + Add Custom Field row */}
                    <tr>
                      <td colSpan={2} className="px-4 py-2.5 border-r-2 border-[#e5e7eb] bg-[#fafafa]/50">
                        <button
                          type="button"
                          onClick={addCustomAttributeRow}
                          className="flex items-center gap-1 text-[12px] font-medium text-[#0d9488] hover:text-[#0f766e] transition-colors"
                        >
                          <Plus className="h-3 w-3" />
                          Add Custom Field
                        </button>
                      </td>
                      <td colSpan={variantColumns.length + 1} />
                    </tr>
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* ── Terms & Attachments side by side ──────────────────── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-3">
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
                <span className="text-[11px] text-[#9ca3af]">
                  Max 10MB per file
                </span>
              </div>
            </div>
          </div>

          {/* ── Bottom action bar ──────────────────────────────────── */}
          <div className="flex items-center justify-end gap-2 mt-3 pt-3 pb-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push("/products")}
              disabled={submitting}
              className="h-8 text-[13px]"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleSubmit}
              disabled={submitting}
              className="h-8 text-[13px] bg-[#0d9488] hover:bg-[#0f766e] text-white"
            >
              {submitting && (
                <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
              )}
              {isEditMode ? "Update Product" : "Create Product"}
            </Button>
          </div>
        </div>
      </div>

      {/* ── SKU Settings Dialog ─────────────────────────────────────── */}
      {settings && (
        <SKUSettingsDialog
          open={skuSettingsOpen}
          onClose={() => setSkuSettingsOpen(false)}
          settings={settings}
          onSave={handleSKUSettingsSave}
        />
      )}

      {/* Quick Create Category / Subcategory Modal */}
      <QuickCreateCategoryModal
        open={!!createCategoryModal}
        onClose={() => setCreateCategoryModal(null)}
        mode={createCategoryModal?.mode ?? "category"}
        parentCategoryId={createCategoryModal?.mode === "subcategory" ? createCategoryModal.parentId : undefined}
        parentCategoryName={createCategoryModal?.mode === "subcategory" ? createCategoryModal.parentName : undefined}
        onCreated={(created) => {
          if (createCategoryModal?.mode === "subcategory") {
            handleSubCategoryCreated(created);
          } else {
            handleCategoryCreated(created);
          }
        }}
      />

      {/* Add GST Rate Modal */}
      <Dialog open={addGstOpen} onOpenChange={(v) => { if (!v) { setAddGstOpen(false); setNewGstValue(""); } }}>
        <DialogContent showCloseButton={false} className="max-w-[360px] p-0 gap-0">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
            <DialogTitle className="text-base font-semibold text-gray-900">
              Add GST Rate
            </DialogTitle>
            <button onClick={() => { setAddGstOpen(false); setNewGstValue(""); }} className="text-gray-400 hover:text-gray-600">
              <X size={18} />
            </button>
          </div>
          <div className="px-5 py-5">
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              GST Percentage <span className="text-red-500">*</span>
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                step="0.01"
                min="0"
                placeholder="e.g. 18"
                value={newGstValue}
                onChange={(e) => setNewGstValue(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAddGst()}
                autoFocus
                className="flex-1 border border-gray-300 rounded-md px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#0d9488] focus:border-[#0d9488]"
              />
              <span className="text-sm text-gray-500">%</span>
            </div>
          </div>
          <div className="flex justify-end gap-2 px-5 py-4 border-t border-gray-200">
            <Button variant="outline" onClick={() => { setAddGstOpen(false); setNewGstValue(""); }} disabled={addingGst} className="border-gray-200 text-gray-600">
              Cancel
            </Button>
            <Button onClick={handleAddGst} disabled={addingGst || !newGstValue.trim()} className="bg-[#0d9488] hover:bg-[#0f766e] text-white">
              {addingGst && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
              Add
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
