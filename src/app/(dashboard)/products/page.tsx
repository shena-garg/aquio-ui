"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { SlidersHorizontal, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/layout/PageHeader";
import { ProductsTable } from "@/components/products/ProductsTable";
import { ProductsCustomizePanel } from "@/components/products/ProductsCustomizePanel";
import type { ColumnConfig } from "@/components/products/ProductsCustomizePanel";
import { productsService } from "@/services/products";
import { categoriesService } from "@/services/categories";
import { RequirePermission } from "@/components/auth/RequirePermission";
import type { Category } from "@/services/categories";

// ── Column config ─────────────────────────────────────────────────────────────

const DEFAULT_COLUMNS: ColumnConfig[] = [
  { key: "sku",             label: "Product Code", locked: false },
  { key: "name",            label: "Product Name", locked: true  },
  { key: "categoryName",    label: "Category",     locked: false },
  { key: "subCategoryName", label: "Subcategory",  locked: false },
  { key: "gst",             label: "GST",          locked: false },
  { key: "unitOfMeasurement", label: "Unit",       locked: false },
  { key: "hsnCode",         label: "HSN Code",     locked: false },
  { key: "variants",        label: "Variants",     locked: false },
];

const DEFAULT_COLUMN_KEYS = DEFAULT_COLUMNS.map((c) => c.key);
const LOCKED_KEYS = DEFAULT_COLUMNS.filter((c) => c.locked).map((c) => c.key);

const PREFS_STORAGE_KEY = "products-column-prefs";

// ── Search field types ────────────────────────────────────────────────────────

type FieldKey = "sku" | "name" | "categoryId" | "subCategoryId";

interface SearchParams {
  sku?: string;
  name?: string;
  categoryId?: string;
  subCategoryId?: string;
}

const CHIP_LABELS: Record<keyof SearchParams, string> = {
  sku: "Product Code",
  name: "Product Name",
  categoryId: "Category",
  subCategoryId: "Subcategory",
};

const SELECT_INPUT_CLASS =
  "h-8 cursor-pointer rounded-md border border-gray-200 bg-white px-2.5 text-[13px] text-[#0F1720] outline-none focus:border-[#0d9488]";

// ── Page ──────────────────────────────────────────────────────────────────────

export default function ProductsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();

  // ── Table / filter state ──────────────────────────────────────────────────
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(50);
  const [activeTab, setActiveTab] = useState<"active" | "inactive">("active");
  const [searchParams, setSearchParams] = useState<SearchParams>({});

  // ── Search bar local state ────────────────────────────────────────────────
  const [selectedField, setSelectedField] = useState<FieldKey>("sku");
  const [inputValue, setInputValue] = useState("");

  // ── Column customization state ────────────────────────────────────────────
  const [prefsLoaded, setPrefsLoaded] = useState(false);
  const [visibleColumns, setVisibleColumns] = useState<string[]>(DEFAULT_COLUMN_KEYS);
  const [columnOrder, setColumnOrder] = useState<string[]>(DEFAULT_COLUMN_KEYS);
  const [frozenCount, setFrozenCount] = useState<number>(0);
  const [showCustomize, setShowCustomize] = useState(false);
  const [tableFlash, setTableFlash] = useState(false);

  // Load saved column prefs from localStorage on mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem(PREFS_STORAGE_KEY);
      if (raw) {
        const prefs = JSON.parse(raw);

        if (Array.isArray(prefs.columnOrder)) {
          const saved: string[] = prefs.columnOrder;
          const merged = [
            ...saved.filter((k) => DEFAULT_COLUMN_KEYS.includes(k)),
            ...DEFAULT_COLUMN_KEYS.filter((k) => !saved.includes(k)),
          ];
          setColumnOrder(merged);
        }

        if (Array.isArray(prefs.visibleColumns)) {
          const saved: string[] = prefs.visibleColumns;
          const merged = [...new Set([
            ...saved.filter((k) => DEFAULT_COLUMN_KEYS.includes(k)),
            ...LOCKED_KEYS,
          ])];
          setVisibleColumns(merged);
        }

        if (typeof prefs.frozenCount === "number") {
          setFrozenCount(Math.min(4, Math.max(0, prefs.frozenCount)));
        }
      }
    } catch {
      // ignore malformed prefs
    }
    setPrefsLoaded(true);
  }, []);

  // Save column prefs to localStorage whenever they change
  useEffect(() => {
    if (!prefsLoaded) return;
    try {
      localStorage.setItem(
        PREFS_STORAGE_KEY,
        JSON.stringify({ visibleColumns, columnOrder, frozenCount }),
      );
    } catch {
      // ignore storage errors
    }
  }, [prefsLoaded, visibleColumns, columnOrder, frozenCount]);

  // ── Data fetching ─────────────────────────────────────────────────────────

  const { data: categoriesData } = useQuery({
    queryKey: ["categories"],
    queryFn: () => categoriesService.list().then((r) => r.data),
    staleTime: 10 * 60 * 1000,
  });

  const categories: Category[] = categoriesData?.categories ?? [];

  const { data, isLoading, isError } = useQuery({
    queryKey: ["products", page, limit, activeTab, searchParams],
    queryFn: () =>
      productsService
        .list({ page, limit, status: activeTab, ...searchParams })
        .then((r) => r.data),
  });

  useEffect(() => {
    if (isError) {
      toast.error("Failed to load products. Please try again.");
    }
  }, [isError]);

  // ── Subcategories logic ───────────────────────────────────────────────────

  const allSubCategories = useMemo(() => {
    if (selectedField !== "subCategoryId") return [];

    // If a category is already selected as a search filter, show only its subcategories
    const selectedCategoryId = searchParams.categoryId || inputValue;

    // Check if we are currently filtering by categoryId OR if the user chose a category in the input
    if (searchParams.categoryId) {
      const cat = categories.find((c) => c._id === searchParams.categoryId);
      return cat?.subCategories ?? [];
    }

    // Otherwise show all subcategories flat
    return categories.flatMap((c) => c.subCategories);
  }, [categories, searchParams.categoryId, selectedField, inputValue]);

  // ── Handlers ──────────────────────────────────────────────────────────────

  function handleTabChange(tab: "active" | "inactive") {
    setActiveTab(tab);
    setPage(1);
  }

  function handleLimitChange(newLimit: number) {
    setLimit(newLimit);
    setPage(1);
  }

  function handleFieldChange(key: FieldKey) {
    setSelectedField(key);
    setInputValue("");
  }

  const isSearchDisabled = !inputValue;

  function handleSearch() {
    if (isSearchDisabled) return;
    setSearchParams((prev) => ({ ...prev, [selectedField]: inputValue }));
    setPage(1);
    setSelectedField("sku");
    setInputValue("");
  }

  function handleReset() {
    setSearchParams({});
    setSelectedField("sku");
    setInputValue("");
    setPage(1);
  }

  function handleRemoveFilter(key: keyof SearchParams) {
    setSearchParams((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
    setPage(1);
  }

  function handleVisibilityChange(key: string, visible: boolean) {
    setVisibleColumns((prev) =>
      visible ? [...prev, key] : prev.filter((k) => k !== key),
    );
  }

  function handleReorder(newOrder: string[]) {
    setColumnOrder(newOrder);
  }

  function handleFrozenCountChange(count: number) {
    setFrozenCount(count);
  }

  function handleColumnChange() {
    setTableFlash(true);
    setTimeout(() => setTableFlash(false), 600);
    toast.success("Table updated", {
      description: "Your column preferences have been saved",
      duration: 2000,
    });
  }

  // ── Chip display helpers ──────────────────────────────────────────────────

  function getChipLabel(key: keyof SearchParams, value: string): string {
    if (key === "categoryId") {
      const cat = categories.find((c) => c._id === value);
      return `Category: ${cat?.name ?? value}`;
    }
    if (key === "subCategoryId") {
      const sub = categories.flatMap((c) => c.subCategories).find((s) => s._id === value);
      return `Subcategory: ${sub?.name ?? value}`;
    }
    return `${CHIP_LABELS[key]}: ${value}`;
  }

  const activeEntries = (
    Object.entries(searchParams) as [keyof SearchParams, string][]
  ).filter(([, v]) => Boolean(v));

  const hasFilters = activeEntries.length > 0;

  // ── Actions toolbar ─────────────────────────────────────────────────────

  const actions = (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setShowCustomize(true)}
        className="h-8 gap-1.5 border-gray-200 text-[13px] text-gray-600 hover:text-[#0F1720]"
      >
        <SlidersHorizontal className="h-3.5 w-3.5" />
        Customize
      </Button>

      <RequirePermission permission="product.add">
        <Button
          size="sm"
          onClick={() => router.push("/products/new")}
          className="h-8 gap-1.5 text-[13px] !bg-[#0d9488] hover:!bg-[#0f766e] text-white"
        >
          <Plus className="h-3.5 w-3.5" />
          Add Product
        </Button>
      </RequirePermission>
    </>
  );

  return (
    <div className="flex flex-1 flex-col">
      <PageHeader
        title="Products"
        total={data?.totalCount ?? 0}
        page={page}
        limit={limit}
        onPageChange={setPage}
        onLimitChange={handleLimitChange}
        actions={actions}
      />

      {/* ── Tabs ─────────────────────────────────────────────────────────── */}
      <div className="flex border-b border-gray-200 bg-white px-6">
        {(["active", "inactive"] as const).map((tab) => {
          const isActive = tab === activeTab;
          return (
            <button
              key={tab}
              onClick={() => handleTabChange(tab)}
              className={cn(
                "flex items-center gap-1.5 border-b-2 px-4 py-3 text-[13px] font-medium transition-colors whitespace-nowrap",
                isActive
                  ? "border-[#0d9488] text-[#0d9488]"
                  : "border-transparent text-gray-500 hover:text-[#0F1720]",
              )}
            >
              {tab === "active" ? "Active" : "Archived"}
            </button>
          );
        })}
      </div>

      {/* ── Search bar ───────────────────────────────────────────────────── */}
      <div className="bg-white">
        <div className="flex flex-wrap items-center gap-2 px-6 py-3">
          {/* Field selector */}
          <select
            value={selectedField}
            onChange={(e) => handleFieldChange(e.target.value as FieldKey)}
            className={SELECT_INPUT_CLASS}
          >
            <option value="sku">Product Code</option>
            <option value="name">Product Name</option>
            <option value="categoryId">Category</option>
            <option value="subCategoryId">Subcategory</option>
          </select>

          {/* Text input for sku / name */}
          {(selectedField === "sku" || selectedField === "name") && (
            <Input
              type="text"
              placeholder={`Search by ${selectedField === "sku" ? "Product Code" : "Product Name"}…`}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              className="h-8 w-56 border-gray-200 text-[13px] shadow-none focus-visible:border-[#0d9488] focus-visible:ring-[#0d9488]/20"
            />
          )}

          {/* Category dropdown */}
          {selectedField === "categoryId" && (
            <select
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              className={SELECT_INPUT_CLASS}
            >
              <option value="">Select Category…</option>
              {categories.map((cat) => (
                <option key={cat._id} value={cat._id}>{cat.name}</option>
              ))}
            </select>
          )}

          {/* Subcategory dropdown */}
          {selectedField === "subCategoryId" && (
            <select
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              className={SELECT_INPUT_CLASS}
            >
              <option value="">Select Subcategory…</option>
              {allSubCategories.map((sub) => (
                <option key={sub._id} value={sub._id}>{sub.name}</option>
              ))}
            </select>
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
                {getChipLabel(key, value)}
                <button
                  onClick={() => handleRemoveFilter(key)}
                  className="ml-0.5 rounded-full hover:text-[#0f766e]"
                  aria-label={`Remove ${key} filter`}
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}

            {activeEntries.length > 1 && (
              <button
                onClick={handleReset}
                className="text-xs text-gray-400 underline hover:text-red-500"
              >
                Clear All
              </button>
            )}
          </div>
        )}
      </div>

      {/* ── Table ────────────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-auto">
        <ProductsTable
          products={data?.products ?? []}
          isLoading={isLoading}
          activeTab={activeTab}
          onRefresh={() => queryClient.invalidateQueries({ queryKey: ["products"] })}
          visibleColumns={visibleColumns}
          columnOrder={columnOrder}
          frozenCount={frozenCount}
        />
      </div>

      <ProductsCustomizePanel
        open={showCustomize}
        onClose={() => setShowCustomize(false)}
        columns={DEFAULT_COLUMNS}
        visibleColumns={visibleColumns}
        columnOrder={columnOrder}
        frozenCount={frozenCount}
        onVisibilityChange={handleVisibilityChange}
        onReorder={handleReorder}
        onFrozenCountChange={handleFrozenCountChange}
        onColumnChange={handleColumnChange}
      />
    </div>
  );
}
