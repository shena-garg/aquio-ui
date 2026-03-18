"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Download, SlidersHorizontal, Plus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { PageHeader } from "@/components/layout/PageHeader";
import { POTabs } from "@/components/purchase-orders/POTabs";
import { POSearchBar } from "@/components/purchase-orders/POSearchBar";
import { POTable } from "@/components/purchase-orders/POTable";
import { POCustomizePanel } from "@/components/purchase-orders/POCustomizePanel";
import type { ColumnConfig } from "@/components/purchase-orders/POCustomizePanel";
import { purchaseOrdersService } from "@/services/purchase-orders";
import type { POFilterStatus, POActiveFilters, CsvPattern } from "@/services/purchase-orders";
import { RequirePermission } from "@/components/auth/RequirePermission";

// ── Column config ─────────────────────────────────────────────────────────────

const DEFAULT_COLUMNS: ColumnConfig[] = [
  { key: "poNumber",      label: "PO Number",      locked: true  },
  { key: "refId",         label: "Ref. ID",         locked: false },
  { key: "supplier",      label: "Supplier",        locked: false },
  { key: "supplierRef",   label: "Supplier Ref.",   locked: false },
  { key: "issueDate",     label: "Issue Date",      locked: false },
  { key: "delivery",      label: "Delivery",        locked: false },
  { key: "status",        label: "Status",          locked: false },
  { key: "receipt",       label: "Receipt",         locked: false },
  { key: "amount",        label: "Amount",          locked: false },
  { key: "paymentTerms",  label: "Payment Terms",   locked: false },
  { key: "receiptStatus", label: "Receipt Status",  locked: false },
  { key: "totalOrder",    label: "Total Order",     locked: false },
  { key: "pendingOrder",  label: "Pending Order",   locked: false },
];

const DEFAULT_COLUMN_KEYS = DEFAULT_COLUMNS.map((c) => c.key);
const LOCKED_KEYS = DEFAULT_COLUMNS.filter((c) => c.locked).map((c) => c.key);

const PREFS_STORAGE_KEY = "po-column-prefs";

// ── Page ──────────────────────────────────────────────────────────────────────

export default function PurchaseOrdersPage() {
  const router = useRouter();
  const queryClient = useQueryClient();

  // ── Table / filter state ──────────────────────────────────────────────────
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(50);
  const [activeStatus, setActiveStatus] = useState<POFilterStatus | undefined>(undefined);
  const [activeFilters, setActiveFilters] = useState<POActiveFilters>({});

  // ── Column customization state ────────────────────────────────────────────
  const [prefsLoaded, setPrefsLoaded] = useState(false);
  const [visibleColumns, setVisibleColumns] = useState<string[]>(DEFAULT_COLUMN_KEYS);
  const [columnOrder, setColumnOrder] = useState<string[]>(DEFAULT_COLUMN_KEYS);
  const [frozenCount, setFrozenCount] = useState<number>(0);
  const [showCustomize, setShowCustomize] = useState(false);
  const [tableFlash, setTableFlash] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  // Load saved column prefs from localStorage on mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem(PREFS_STORAGE_KEY);
      if (raw) {
        const prefs = JSON.parse(raw);

        if (Array.isArray(prefs.columnOrder)) {
          // Merge: keep saved order, append any new columns at the end
          const saved: string[] = prefs.columnOrder;
          const merged = [
            ...saved.filter((k) => DEFAULT_COLUMN_KEYS.includes(k)),
            ...DEFAULT_COLUMN_KEYS.filter((k) => !saved.includes(k)),
          ];
          setColumnOrder(merged);
        }

        if (Array.isArray(prefs.visibleColumns)) {
          // Always ensure locked columns are visible
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

  // Save column prefs to localStorage whenever they change (skip initial defaults)
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
  const { data, isLoading, isError } = useQuery({
    queryKey: ["purchase-orders", page, limit, activeStatus, activeFilters],
    queryFn: () =>
      purchaseOrdersService
        .list({ page, limit, tabStatus: activeStatus, ...activeFilters })
        .then((res) => res.data),
  });

  useEffect(() => {
    if (isError) {
      toast.error("Failed to load purchase orders. Please try again.");
    }
  }, [isError]);

  // ── Handlers ──────────────────────────────────────────────────────────────

  function handleTabChange(status: POFilterStatus | undefined) {
    setActiveStatus(status);
    setPage(1);
  }

  function handleLimitChange(newLimit: number) {
    setLimit(newLimit);
    setPage(1);
  }

  function handleSearch(params: POActiveFilters) {
    setActiveFilters((prev) => ({ ...prev, ...params }));
    setPage(1);
  }

  function handleReset() {
    setActiveFilters({});
    setPage(1);
  }

  function handleRemoveFilter(key: keyof POActiveFilters) {
    setActiveFilters((prev) => {
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

  async function handleExport(csvPattern: CsvPattern) {
    setIsExporting(true);
    try {
      const statusParam =
        activeStatus === "in_progress"
          ? ["issued", "confirmed"]
          : activeStatus ?? undefined;

      const response = await purchaseOrdersService.exportList({
        csvPattern,
        orderType: "purchase",
        status: statusParam,
        poNumber:            activeFilters.poNumber,
        referenceId:         activeFilters.referenceId,
        supplierReferenceId: activeFilters.supplierReferenceId,
        receiptStatus:       activeFilters.receiptStatus,
        issueDateFrom:       activeFilters.issueDateFrom,
        issueDateTo:         activeFilters.issueDateTo,
        deliveryDateFrom:    activeFilters.deliveryDateFrom,
        deliveryDateTo:      activeFilters.deliveryDateTo,
      });

      const blob = new Blob([response.data], { type: "text/csv" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `purchase-orders-${csvPattern}-${Date.now()}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);

      toast.success("Export downloaded successfully.");
    } catch {
      toast.error("Export failed. Please try again.");
    } finally {
      setIsExporting(false);
    }
  }

  // ── Actions toolbar ───────────────────────────────────────────────────────

  const actions = (
    <>
      <RequirePermission permission="purchase-order.download-csv">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              disabled={isExporting}
              className="h-9 w-9 min-h-[44px] min-w-[44px] sm:h-8 sm:w-auto sm:min-h-0 sm:min-w-0 sm:px-3 sm:gap-1.5 border-gray-200 text-[13px] text-gray-600 hover:text-[#0F1720]"
            >
              {isExporting ? (
                <Loader2 className="h-4 w-4 sm:h-3.5 sm:w-3.5 animate-spin" />
              ) : (
                <Download className="h-4 w-4 sm:h-3.5 sm:w-3.5" />
              )}
              <span className="hidden sm:inline">Export</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem onClick={() => handleExport("basic")}>
              Basic Export
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleExport("comprehensive")}>
              Comprehensive Export
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </RequirePermission>

      <Button
        variant="outline"
        size="sm"
        onClick={() => setShowCustomize(true)}
        className="hidden lg:inline-flex h-8 gap-1.5 border-gray-200 text-[13px] text-gray-600 hover:text-[#0F1720]"
      >
        <SlidersHorizontal className="h-3.5 w-3.5" />
        Customize
      </Button>

      <RequirePermission permission="purchase-order.add">
        <Button
          size="icon"
          onClick={() => router.push("/purchase-orders/create")}
          className="h-9 w-9 min-h-[44px] min-w-[44px] sm:h-8 sm:w-auto sm:min-h-0 sm:min-w-0 sm:px-3 sm:gap-1.5 text-[13px] !bg-[#0d9488] hover:!bg-[#0f766e] text-white"
        >
          <Plus className="h-4 w-4 sm:h-3.5 sm:w-3.5" />
          <span className="hidden sm:inline">New</span>
        </Button>
      </RequirePermission>
    </>
  );

  return (
    <div className="flex flex-1 flex-col">
      <PageHeader
        title="Purchase Orders"
        total={data?.pagination.total ?? 0}
        page={page}
        limit={limit}
        onPageChange={setPage}
        onLimitChange={handleLimitChange}
        actions={actions}
      />

      <POTabs
        activeStatus={activeStatus}
        counts={data?.counts}
        onChange={handleTabChange}
      />

      <POSearchBar
        activeFilters={activeFilters}
        onSearch={handleSearch}
        onReset={handleReset}
        onRemoveFilter={handleRemoveFilter}
      />

      <div className="flex-1 overflow-auto">
        <POTable
          orders={data?.data ?? []}
          isLoading={isLoading}
          visibleColumns={visibleColumns}
          columnOrder={columnOrder}
          frozenCount={frozenCount}
          flash={tableFlash}
          onRefresh={() => queryClient.invalidateQueries({ queryKey: ["purchase-orders"] })}
        />
      </div>

      <POCustomizePanel
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
