"use client";

import { useMemo, useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ChevronDown, ChevronUp, MapPin, Settings, LayoutGrid, Store, Package,
  Check, ChevronRight, Loader2, Plus,
} from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, ComposedChart, Line,
} from "recharts";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/layout/PageHeader";
import { dashboardService } from "@/services/dashboard";
import { organizationService, OnboardingStatus } from "@/services/organization";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";
import { Button } from "@/components/ui/button";
import { HelpTooltip } from "@/components/ui/HelpTooltip";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { QuickCreateCategoryModal } from "@/components/categories/QuickCreateCategoryModal";
import { QuickCreateLocationModal } from "@/components/locations/QuickCreateLocationModal";
import { QuickCreateProductModal } from "@/components/products/QuickCreateProductModal";
import { QuickConfigureSettingsModal } from "@/components/settings/QuickConfigureSettingsModal";
import { QuickCreatePartnerModal } from "@/components/partners/QuickCreatePartnerModal";

/* ── Period options ──────────────────────────────────────────────────────── */

const PERIOD_OPTIONS = [
  { label: "This Month", value: "this_month" },
  { label: "This Quarter", value: "this_quarter" },
  { label: "Last 30 Days", value: "last_30_days" },
  { label: "Last 12 Months", value: "last_12_months" },
] as const;

type PeriodValue = (typeof PERIOD_OPTIONS)[number]["value"];

function computeDateRange(period: PeriodValue): { fromDate: string; toDate: string } {
  const today = new Date();
  const fmt = (d: Date) => d.toISOString().slice(0, 10);
  switch (period) {
    case "this_month":
      return { fromDate: fmt(new Date(today.getFullYear(), today.getMonth(), 1)), toDate: fmt(today) };
    case "this_quarter": {
      const q = Math.floor(today.getMonth() / 3);
      return { fromDate: fmt(new Date(today.getFullYear(), q * 3, 1)), toDate: fmt(today) };
    }
    case "last_30_days":
      return { fromDate: fmt(new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000)), toDate: fmt(today) };
    case "last_12_months":
    default:
      return {
        fromDate: fmt(new Date(today.getFullYear() - 1, today.getMonth(), today.getDate())),
        toDate: fmt(today),
      };
  }
}

function formatDisplayDate(dateStr: string): string {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

/* ── Trend helpers ───────────────────────────────────────────────────────── */

function formatTrend(
  trendObj: { trend?: string; pct?: number } | null | undefined,
  upColor: string,
  downColor: string,
): { text: string; colorClass: string } | null {
  if (!trendObj || trendObj.pct == null) return null;
  const pct = trendObj.pct;
  const abs = Math.abs(pct);
  const isUp = pct > 0;
  const arrow = isUp ? "↑" : "↓";
  const color = isUp ? upColor : downColor;
  if (abs > 500) return { text: `${arrow} New`, colorClass: color };
  return { text: `${arrow} ${abs.toFixed(1)}%`, colorClass: color };
}

/* ── Currency formatter ──────────────────────────────────────────────────── */

function formatCrore(value: number): string {
  if (value >= 10000000) return `₹${(value / 10000000).toFixed(2)} Cr`;
  if (value >= 100000) return `₹${(value / 100000).toFixed(2)} L`;
  return `₹${value.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/* ── Types ───────────────────────────────────────────────────────────────── */

interface OverdueItem {
  id: string;
  orderNumber: string;
  counterpartyName: string;
  delayDays: number;
}

interface OverdueBreakdown {
  po: { watch: OverdueItem[]; warning: OverdueItem[]; critical: OverdueItem[] };
  so: { watch: OverdueItem[]; warning: OverdueItem[]; critical: OverdueItem[] };
}

/* ── Tabs ────────────────────────────────────────────────────────────────── */

const TABS = [
  { id: "overview", label: "Overview" },
  { id: "buying", label: "Buying" },
  { id: "selling", label: "Selling" },
  { id: "full", label: "Old View" },
] as const;
type TabId = (typeof TABS)[number]["id"];

/* ── Shared styles ───────────────────────────────────────────────────────── */

const selectCls =
  "border border-[#e5e7eb] rounded-lg px-3 py-1.5 text-[13px] text-[#111827] bg-white focus:outline-none focus:ring-1 focus:ring-[#0d9488]";

const thCls = "text-[10px] font-semibold uppercase tracking-[0.8px] text-[#6b7280] pb-2";

/* ── Page ─────────────────────────────────────────────────────────────────── */

export default function DashboardPage() {
  const [selectedTab, setSelectedTab] = useState<TabId>("overview");
  const [selectedPeriod, setSelectedPeriod] = useState<PeriodValue>("last_12_months");
  const [alertsExpanded, setAlertsExpanded] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);
  const prevIsComplete = useRef<boolean | undefined>(undefined);

  const { fromDate, toDate } = useMemo(() => computeDateRange(selectedPeriod), [selectedPeriod]);

  const { data: onboarding, isLoading: onboardingLoading } = useQuery({
    queryKey: ["onboarding-status"],
    queryFn: () => organizationService.getOnboardingStatus().then((r) => r.data),
    staleTime: 0,
    refetchOnWindowFocus: true,
  });

  useEffect(() => {
    if (!onboarding) return;
    if (prevIsComplete.current === false && onboarding.isComplete) setShowCelebration(true);
    prevIsComplete.current = onboarding.isComplete;
  }, [onboarding]);

  const { data, isLoading } = useQuery({
    queryKey: ["dashboard-overview", fromDate, toDate],
    queryFn: () => dashboardService.getOverview({ fromDate, toDate }),
    enabled: !!onboarding?.isComplete,
    staleTime: 2 * 60 * 1000,
  });

  const kpis = data?.kpis;
  const trends = kpis?.trends;
  const hasData = data && kpis;

  // Auto-expand alerts when there are critical or warning alerts
  useEffect(() => {
    if (!data?.alerts) return;
    const hasUrgent = data.alerts.some(
      (a: { level: string }) => a.level === "critical" || a.level === "warning",
    );
    if (hasUrgent) setAlertsExpanded(true);
  }, [data?.alerts]);

  if (onboardingLoading) {
    return (
      <>
        <PageHeader title="Dashboard" />
        <div className="flex flex-1 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-[#0d9488]" />
        </div>
      </>
    );
  }

  if (onboarding && !onboarding.isComplete) {
    return (
      <>
        <PageHeader title="Dashboard" />
        <OnboardingChecklist onboarding={onboarding} />
      </>
    );
  }

  if (showCelebration) {
    return (
      <>
        <PageHeader title="Dashboard" />
        <div className="flex flex-1 flex-col items-center justify-center bg-[#f9fafb] px-4 text-center">
          <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-[#0d9488]/10">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#0d9488]">
              <Check className="h-7 w-7 text-white stroke-[2.5]" />
            </div>
          </div>
          <h1 className="text-[22px] font-bold text-[#111827] mb-2">You&apos;re all set!</h1>
          <p className="text-[14px] text-gray-500 max-w-[340px] mb-8">
            Your workspace is configured. Ready to create your first order?
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            <Link
              href="/purchase-orders/create"
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#0d9488] hover:bg-[#0f766e] px-5 py-2.5 text-[14px] font-medium text-white transition-colors"
            >
              New Purchase Order
            </Link>
            <Link
              href="/sales-orders/create"
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 px-5 py-2.5 text-[14px] font-medium text-[#111827] transition-colors"
            >
              New Sales Order
            </Link>
          </div>
          <button
            onClick={() => setShowCelebration(false)}
            className="mt-6 text-[13px] text-gray-400 hover:text-gray-600 transition-colors"
          >
            Go to dashboard →
          </button>
        </div>
      </>
    );
  }

  return (
    <>
      <PageHeader title="Dashboard" />

      {/* Period selector + Quick actions + Tab nav */}
      <div className="sticky top-0 lg:top-0 z-10 bg-white border-b border-[#e5e7eb]">
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 sm:px-8 pt-3 pb-2">
          {/* Period controls */}
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <label className="text-[12px] text-[#6b7280]">Period</label>
              <select
                className={selectCls}
                value={selectedPeriod}
                onChange={(e) => setSelectedPeriod(e.target.value as PeriodValue)}
              >
                {PERIOD_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-[#6b7280] uppercase tracking-[0.6px] font-medium">From</span>
              <input
                type="text"
                value={formatDisplayDate(fromDate)}
                disabled
                className="bg-[#f9fafb] border border-[#e5e7eb] text-[#6b7280] rounded px-2 sm:px-3 py-1.5 text-[12px] sm:text-sm cursor-not-allowed w-24 sm:w-28 text-center"
              />
              <span className="text-[11px] text-[#6b7280] uppercase tracking-[0.6px] font-medium">To</span>
              <input
                type="text"
                value={formatDisplayDate(toDate)}
                disabled
                className="bg-[#f9fafb] border border-[#e5e7eb] text-[#6b7280] rounded px-2 sm:px-3 py-1.5 text-[12px] sm:text-sm cursor-not-allowed w-24 sm:w-28 text-center"
              />
            </div>
          </div>

          {/* Quick actions */}
          <div className="flex items-center gap-2">
            <Link
              href="/purchase-orders/create"
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#0d9488] hover:bg-[#0f766e] px-3 py-1.5 text-[12px] font-medium text-white transition-colors"
            >
              <Plus className="h-3.5 w-3.5" />
              New PO
            </Link>
            <Link
              href="/sales-orders/create"
              className="inline-flex items-center gap-1.5 rounded-lg border border-[#e5e7eb] bg-white hover:bg-[#f9fafb] px-3 py-1.5 text-[12px] font-medium text-[#111827] transition-colors"
            >
              <Plus className="h-3.5 w-3.5" />
              New SO
            </Link>
          </div>
        </div>

        {/* Tab nav */}
        <div className="flex gap-1 px-4 sm:px-8">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setSelectedTab(tab.id)}
              className={cn(
                "px-4 py-2 text-[13px] font-medium border-b-2 transition-colors",
                selectedTab === tab.id
                  ? "border-[#0d9488] text-[#0d9488]"
                  : "border-transparent text-[#6b7280] hover:text-[#111827]",
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <ErrorBoundary>
        <div className="flex-1 overflow-auto">
          {isLoading ? (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mx-4 sm:mx-8 mt-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="animate-pulse bg-[#f3f4f6] rounded-lg h-24" />
              ))}
            </div>
          ) : !hasData ? (
            <div className="flex items-center justify-center h-64">
              <p className="text-sm text-[#6b7280]">No data found for the selected period.</p>
            </div>
          ) : (
            <div className="mx-4 sm:mx-8 mt-4 pb-8 space-y-4">
              {selectedTab === "overview" && (
                <OverviewTab
                  kpis={kpis}
                  trends={trends}
                  alerts={data.alerts ?? []}
                  alertsExpanded={alertsExpanded}
                  onToggleAlerts={() => setAlertsExpanded((v) => !v)}
                  overdueOrders={data.overdueOrders}
                  spendRevenueHistory={data.spendRevenueHistory ?? []}
                />
              )}
              {selectedTab === "buying" && (
                <BuyingTab
                  kpis={kpis}
                  trends={trends}
                  overdueOrders={data.overdueOrders}
                  spendRevenueHistory={data.spendRevenueHistory ?? []}
                  topSuppliers={data.topSuppliers ?? []}
                  topProducts={data.topProducts}
                />
              )}
              {selectedTab === "selling" && (
                <SellingTab
                  kpis={kpis}
                  trends={trends}
                  overdueOrders={data.overdueOrders}
                  spendRevenueHistory={data.spendRevenueHistory ?? []}
                  topBuyers={data.topBuyers ?? []}
                  topProducts={data.topProducts}
                />
              )}
              {selectedTab === "full" && (
                <FullViewTab
                  kpis={kpis}
                  trends={trends}
                  alerts={data.alerts ?? []}
                  alertsExpanded={alertsExpanded}
                  onToggleAlerts={() => setAlertsExpanded((v) => !v)}
                  spendRevenueHistory={data.spendRevenueHistory ?? []}
                  recentActivity={data.recentActivity ?? []}
                  topProducts={data.topProducts}
                  topSuppliers={data.topSuppliers ?? []}
                  topBuyers={data.topBuyers ?? []}
                />
              )}
            </div>
          )}
        </div>
      </ErrorBoundary>
    </>
  );
}

/* ── Overview Tab ────────────────────────────────────────────────────────── */

function OverviewTab({
  kpis,
  trends,
  alerts,
  alertsExpanded,
  onToggleAlerts,
  overdueOrders,
  spendRevenueHistory,
}: {
  kpis: Record<string, number>;
  trends: Record<string, { trend?: string; pct?: number }>;
  alerts: { level: AlertLevel; message: string; linkType?: string }[];
  alertsExpanded: boolean;
  onToggleAlerts: () => void;
  overdueOrders: OverdueBreakdown;
  spendRevenueHistory: { month: string; spend: number; revenue: number; marginPct?: number }[];
}) {
  const hasBothSides = (kpis.totalSpend ?? 0) > 0 && (kpis.totalRevenue ?? 0) > 0;

  return (
    <>
      {/* KPI row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <KpiCard
          label="Total Spend"
          value={formatCrore(kpis.totalSpend ?? 0)}
          valueColor="text-[#111827]"
          trend={formatTrend(trends?.spend, "text-[#d97706]", "text-[#059669]")}
        />
        <KpiCard
          label="Total Revenue"
          value={formatCrore(kpis.totalRevenue ?? 0)}
          valueColor="text-[#111827]"
          trend={formatTrend(trends?.revenue, "text-[#059669]", "text-[#dc2626]")}
        />
        <KpiCard
          label="Gross Margin"
          value={hasBothSides ? `${(kpis.grossMarginPct ?? 0).toFixed(1)}%` : "—"}
          valueColor={
            !hasBothSides ? "text-[#9ca3af]"
            : (kpis.grossMarginPct ?? 0) >= 15 ? "text-[#059669]"
            : (kpis.grossMarginPct ?? 0) >= 5 ? "text-[#d97706]"
            : "text-[#dc2626]"
          }
          trend={hasBothSides ? formatTrend(trends?.margin, "text-[#059669]", "text-[#dc2626]") : null}
          tooltip={!hasBothSides ? "Gross margin is only shown when both purchase and sales activity exist in this period." : undefined}
        />
        <KpiCard
          label="Fulfillment Rate"
          value={`${Math.min(kpis.fulfillmentRate ?? 0, 100).toFixed(1)}%`}
          valueColor={
            (kpis.fulfillmentRate ?? 0) >= 95 ? "text-[#059669]"
            : (kpis.fulfillmentRate ?? 0) >= 80 ? "text-[#d97706]"
            : "text-[#dc2626]"
          }
          trend={formatTrend(trends?.fulfillment, "text-[#059669]", "text-[#dc2626]")}
        />
      </div>

      {/* Overdue widget */}
      {overdueOrders && <OverdueWidget overdueOrders={overdueOrders} />}

      {/* Alerts */}
      <SmartAlertsPanel alerts={alerts} expanded={alertsExpanded} onToggle={onToggleAlerts} />

      {/* Combined chart */}
      <SpendRevenueMarginChart history={spendRevenueHistory} hasBothSides={hasBothSides} />
    </>
  );
}

/* ── Buying Tab ──────────────────────────────────────────────────────────── */

function BuyingTab({
  kpis,
  trends,
  overdueOrders,
  spendRevenueHistory,
  topSuppliers,
  topProducts,
}: {
  kpis: Record<string, number>;
  trends: Record<string, { trend?: string; pct?: number }>;
  overdueOrders: OverdueBreakdown;
  spendRevenueHistory: { month: string; spend: number; revenue: number; marginPct?: number }[];
  topSuppliers: {
    supplierId: string; supplierName: string; totalSpend: number;
    poCount: number; fulfillmentRate?: number | null; priceTrend?: string; priceTrendPct?: number;
  }[];
  topProducts?: {
    topBySpend?: { productId: string; variantId: string; name: string; spend: number; poCount: number }[];
    topByRevenue?: { productId: string; variantId: string; name: string; revenue: number; soCount: number }[];
  };
}) {
  const overduePOTotal =
    (overdueOrders?.po.watch.length ?? 0) +
    (overdueOrders?.po.warning.length ?? 0) +
    (overdueOrders?.po.critical.length ?? 0);

  return (
    <>
      {/* KPI row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <KpiCard
          label="Total Spend"
          value={formatCrore(kpis.totalSpend ?? 0)}
          valueColor="text-[#111827]"
          trend={formatTrend(trends?.spend, "text-[#d97706]", "text-[#059669]")}
        />
        <KpiCard
          label="Open Purchase Orders"
          value={String(kpis.openPOCount ?? 0)}
          valueColor={(kpis.openPOCount ?? 0) > 10 ? "text-[#d97706]" : "text-[#111827]"}
          subValue={formatCrore(kpis.openPOValue ?? 0)}
        />
        <KpiCard
          label="Overdue POs"
          value={String(overduePOTotal)}
          valueColor={overduePOTotal > 0 ? "text-[#dc2626]" : "text-[#059669]"}
        />
        <KpiCard
          label="Fulfillment Rate"
          value={`${Math.min(kpis.fulfillmentRate ?? 0, 100).toFixed(1)}%`}
          valueColor={
            (kpis.fulfillmentRate ?? 0) >= 95 ? "text-[#059669]"
            : (kpis.fulfillmentRate ?? 0) >= 80 ? "text-[#d97706]"
            : "text-[#dc2626]"
          }
          trend={formatTrend(trends?.fulfillment, "text-[#059669]", "text-[#dc2626]")}
        />
      </div>

      {/* Overdue POs widget */}
      {overdueOrders && (
        <OverdueWidget overdueOrders={overdueOrders} filterType="po" />
      )}

      {/* Spend trend chart */}
      <SingleMetricChart
        history={spendRevenueHistory}
        dataKey="spend"
        label="Monthly Spend"
        subtitle="Purchase order spend by month"
        color="#f97316"
      />

      {/* Top Suppliers */}
      {topSuppliers.length > 0 && (
        <div className="border border-[#e5e7eb] rounded-lg bg-white p-3 sm:p-4">
          <div className="text-sm font-semibold text-[#111827] mb-3">Top Suppliers</div>
          <div className="overflow-x-auto">
            <table className="w-full table-fixed min-w-[420px]">
              <colgroup>
                <col /><col className="w-24" /><col className="w-20" /><col className="w-24" />
              </colgroup>
              <thead>
                <tr className="border-b border-[#f3f4f6]">
                  <th className={cn(thCls, "text-left")}>Supplier</th>
                  <th className={cn(thCls, "text-right")}>Spend</th>
                  <th className={cn(thCls, "text-right")}>Fulfillment</th>
                  <th className={cn(thCls, "text-right")}>Price Trend</th>
                </tr>
              </thead>
              <tbody>
                {topSuppliers.map((s, i) => (
                  <tr key={s.supplierId + i} className="border-b border-[#f3f4f6] last:border-0">
                    <td className="py-2 text-sm text-[#111827] break-words text-left align-top">{s.supplierName}</td>
                    <td className="py-2 text-sm font-medium text-[#111827] text-right align-top">{formatCrore(s.totalSpend)}</td>
                    <td className="py-2 text-right align-top"><FulfillmentCell rate={s.fulfillmentRate} /></td>
                    <td className="py-2 text-right align-top"><PriceTrendBadge trend={s.priceTrend} pct={s.priceTrendPct} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Top Products by Spend */}
      {(topProducts?.topBySpend ?? []).length > 0 && (
        <div className="border border-[#e5e7eb] rounded-lg bg-white p-3 sm:p-4">
          <div className="text-sm font-semibold text-[#111827] mb-3">Top Products by Spend</div>
          <div className="overflow-x-auto">
            <table className="w-full table-fixed min-w-[400px]">
              <colgroup><col className="w-6" /><col /><col className="w-20" /><col className="w-24" /></colgroup>
              <thead>
                <tr className="border-b border-[#f3f4f6]">
                  <th className={cn(thCls, "text-left")}>#</th>
                  <th className={cn(thCls, "text-left")}>Product</th>
                  <th className={cn(thCls, "text-right")}>PO Count</th>
                  <th className={cn(thCls, "text-right")}>Total Spend</th>
                </tr>
              </thead>
              <tbody>
                {(topProducts?.topBySpend ?? []).map((item, i) => (
                  <tr key={item.productId + i} className="border-b border-[#f3f4f6] last:border-0">
                    <td className="py-2 text-xs text-[#9ca3af] text-left align-top">{i + 1}</td>
                    <td className="py-2 text-left align-top">
                      <Link href={`/products/${item.productId}`} className="text-sm text-[#111827] break-words hover:underline">{item.name}</Link>
                    </td>
                    <td className="py-2 text-sm text-[#6b7280] text-right align-top">{item.poCount}</td>
                    <td className="py-2 text-sm font-medium text-[#111827] text-right align-top">{formatCrore(item.spend)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  );
}

/* ── Selling Tab ─────────────────────────────────────────────────────────── */

function SellingTab({
  kpis,
  trends,
  overdueOrders,
  spendRevenueHistory,
  topBuyers,
  topProducts,
}: {
  kpis: Record<string, number>;
  trends: Record<string, { trend?: string; pct?: number }>;
  overdueOrders: OverdueBreakdown;
  spendRevenueHistory: { month: string; spend: number; revenue: number; marginPct?: number }[];
  topBuyers: {
    buyerId: string; buyerName: string; totalRevenue: number;
    soCount: number; fulfillmentRate?: number | null; priceTrend?: string; priceTrendPct?: number;
  }[];
  topProducts?: {
    topBySpend?: { productId: string; variantId: string; name: string; spend: number; poCount: number }[];
    topByRevenue?: { productId: string; variantId: string; name: string; revenue: number; soCount: number }[];
  };
}) {
  const overdueSOTotal =
    (overdueOrders?.so.watch.length ?? 0) +
    (overdueOrders?.so.warning.length ?? 0) +
    (overdueOrders?.so.critical.length ?? 0);

  return (
    <>
      {/* KPI row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <KpiCard
          label="Total Revenue"
          value={formatCrore(kpis.totalRevenue ?? 0)}
          valueColor="text-[#111827]"
          trend={formatTrend(trends?.revenue, "text-[#059669]", "text-[#dc2626]")}
        />
        <KpiCard
          label="Open Sales Orders"
          value={String(kpis.openSOCount ?? 0)}
          valueColor="text-[#111827]"
          subValue={formatCrore(kpis.openSOValue ?? 0)}
        />
        <KpiCard
          label="Overdue SOs"
          value={String(overdueSOTotal)}
          valueColor={overdueSOTotal > 0 ? "text-[#dc2626]" : "text-[#059669]"}
        />
        <KpiCard
          label="Total SO Count"
          value={String(kpis.soCount ?? 0)}
          valueColor="text-[#111827]"
        />
      </div>

      {/* Overdue SOs widget */}
      {overdueOrders && (
        <OverdueWidget overdueOrders={overdueOrders} filterType="so" />
      )}

      {/* Revenue trend chart */}
      <SingleMetricChart
        history={spendRevenueHistory}
        dataKey="revenue"
        label="Monthly Revenue"
        subtitle="Sales order revenue by month"
        color="#0d9488"
      />

      {/* Top Buyers */}
      {topBuyers.length > 0 && (
        <div className="border border-[#e5e7eb] rounded-lg bg-white p-3 sm:p-4">
          <div className="text-sm font-semibold text-[#111827] mb-3">Top Buyers</div>
          <div className="overflow-x-auto">
            <table className="w-full table-fixed min-w-[420px]">
              <colgroup>
                <col /><col className="w-24" /><col className="w-20" /><col className="w-24" />
              </colgroup>
              <thead>
                <tr className="border-b border-[#f3f4f6]">
                  <th className={cn(thCls, "text-left")}>Buyer</th>
                  <th className={cn(thCls, "text-right")}>Revenue</th>
                  <th className={cn(thCls, "text-right")}>Fulfillment</th>
                  <th className={cn(thCls, "text-right")}>Price Trend</th>
                </tr>
              </thead>
              <tbody>
                {topBuyers.map((b, i) => (
                  <tr key={b.buyerId + i} className="border-b border-[#f3f4f6] last:border-0">
                    <td className="py-2 text-sm text-[#111827] break-words text-left align-top">{b.buyerName}</td>
                    <td className="py-2 text-sm font-medium text-[#059669] text-right align-top">{formatCrore(b.totalRevenue)}</td>
                    <td className="py-2 text-right align-top"><FulfillmentCell rate={b.fulfillmentRate} /></td>
                    <td className="py-2 text-right align-top"><PriceTrendBadge trend={b.priceTrend} pct={b.priceTrendPct} flipColors /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Top Products by Revenue */}
      {(topProducts?.topByRevenue ?? []).length > 0 && (
        <div className="border border-[#e5e7eb] rounded-lg bg-white p-3 sm:p-4">
          <div className="text-sm font-semibold text-[#111827] mb-3">Top Products by Revenue</div>
          <div className="overflow-x-auto">
            <table className="w-full table-fixed min-w-[400px]">
              <colgroup><col className="w-6" /><col /><col className="w-20" /><col className="w-24" /></colgroup>
              <thead>
                <tr className="border-b border-[#f3f4f6]">
                  <th className={cn(thCls, "text-left")}>#</th>
                  <th className={cn(thCls, "text-left")}>Product</th>
                  <th className={cn(thCls, "text-right")}>SO Count</th>
                  <th className={cn(thCls, "text-right")}>Total Revenue</th>
                </tr>
              </thead>
              <tbody>
                {(topProducts?.topByRevenue ?? []).map((item, i) => (
                  <tr key={item.productId + i} className="border-b border-[#f3f4f6] last:border-0">
                    <td className="py-2 text-xs text-[#9ca3af] text-left align-top">{i + 1}</td>
                    <td className="py-2 text-left align-top">
                      <Link href={`/products/${item.productId}`} className="text-sm text-[#111827] break-words hover:underline">{item.name}</Link>
                    </td>
                    <td className="py-2 text-sm text-[#6b7280] text-right align-top">{item.soCount}</td>
                    <td className="py-2 text-sm font-medium text-[#059669] text-right align-top">{formatCrore(item.revenue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  );
}

/* ── Full View Tab ───────────────────────────────────────────────────────── */

function FullViewTab({
  kpis,
  trends,
  alerts,
  alertsExpanded,
  onToggleAlerts,
  spendRevenueHistory,
  recentActivity,
  topProducts,
  topSuppliers,
  topBuyers,
}: {
  kpis: Record<string, number>;
  trends: Record<string, { trend?: string; pct?: number }>;
  alerts: { level: AlertLevel; message: string; linkType?: string }[];
  alertsExpanded: boolean;
  onToggleAlerts: () => void;
  spendRevenueHistory: { month: string; spend: number; revenue: number; marginPct?: number }[];
  recentActivity: {
    orderId: string; orderNumber: string; orderType: "purchase" | "sales";
    status: string; receiptStatus: string; issueDate: string;
    counterpartyName: string; productCount: number;
  }[];
  topProducts?: {
    topBySpend?: { productId: string; variantId: string; name: string; spend: number; poCount: number }[];
    topByRevenue?: { productId: string; variantId: string; name: string; revenue: number; soCount: number }[];
  };
  topSuppliers: {
    supplierId: string; supplierName: string; totalSpend: number;
    poCount: number; fulfillmentRate?: number | null; priceTrend?: string; priceTrendPct?: number;
  }[];
  topBuyers: {
    buyerId: string; buyerName: string; totalRevenue: number;
    soCount: number; fulfillmentRate?: number | null; priceTrend?: string; priceTrendPct?: number;
  }[];
}) {
  return (
    <>
      {/* 6 KPI cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
        <KpiCard label="Total Spend" value={formatCrore(kpis.totalSpend ?? 0)} valueColor="text-[#111827]" trend={formatTrend(trends?.spend, "text-[#d97706]", "text-[#059669]")} />
        <KpiCard label="Total Revenue" value={formatCrore(kpis.totalRevenue ?? 0)} valueColor="text-[#111827]" trend={formatTrend(trends?.revenue, "text-[#059669]", "text-[#dc2626]")} />
        <KpiCard
          label="Avg Gross Margin"
          value={`${(kpis.grossMarginPct ?? 0).toFixed(1)}%`}
          valueColor={
            (kpis.grossMarginPct ?? 0) >= 15 ? "text-[#059669]"
            : (kpis.grossMarginPct ?? 0) >= 5 ? "text-[#d97706]"
            : "text-[#dc2626]"
          }
          trend={formatTrend(trends?.margin, "text-[#059669]", "text-[#dc2626]")}
        />
        <KpiCard label="Open Purchase Orders" value={String(kpis.openPOCount ?? 0)} valueColor={(kpis.openPOCount ?? 0) > 10 ? "text-[#d97706]" : "text-[#111827]"} subValue={formatCrore(kpis.openPOValue ?? 0)} />
        <KpiCard label="Open Sales Orders" value={String(kpis.openSOCount ?? 0)} valueColor="text-[#111827]" subValue={formatCrore(kpis.openSOValue ?? 0)} />
        <KpiCard
          label="Fulfillment Rate"
          value={`${Math.min(kpis.fulfillmentRate ?? 0, 100).toFixed(1)}%`}
          valueColor={
            (kpis.fulfillmentRate ?? 0) >= 95 ? "text-[#059669]"
            : (kpis.fulfillmentRate ?? 0) >= 80 ? "text-[#d97706]"
            : "text-[#dc2626]"
          }
          trend={formatTrend(trends?.fulfillment, "text-[#059669]", "text-[#dc2626]")}
        />
      </div>

      <SmartAlertsPanel alerts={alerts} expanded={alertsExpanded} onToggle={onToggleAlerts} />
      <SpendRevenueChart history={spendRevenueHistory} />
      <RecentActivityFeed activities={recentActivity} />
      <TopProductsSection topProducts={topProducts} />
      <TopPartiesSection topSuppliers={topSuppliers} topBuyers={topBuyers} />
    </>
  );
}

/* ── KPI Card ────────────────────────────────────────────────────────────── */

function KpiCard({
  label,
  value,
  valueColor,
  subValue,
  trend,
  tooltip,
}: {
  label: string;
  value: string;
  valueColor: string;
  subValue?: string;
  trend?: { text: string; colorClass: string } | null;
  tooltip?: string;
}) {
  return (
    <div className="border border-[#e5e7eb] rounded-lg bg-white p-3 sm:p-4">
      <div className="flex items-center gap-1">
        <div className="font-semibold uppercase text-[#6b7280] text-[10px] tracking-[0.8px]">{label}</div>
        {tooltip && <HelpTooltip content={tooltip} maxWidth={220} side="top" />}
      </div>
      <div className={cn("text-xl sm:text-2xl font-bold mt-1", valueColor)}>{value}</div>
      {subValue && <div className="text-xs text-[#6b7280] mt-0.5">{subValue}</div>}
      {trend && (
        <div className="flex items-center gap-1 mt-1">
          <span className={cn("text-xs font-medium", trend.colorClass)}>{trend.text}</span>
          <span className="text-[10px] text-[#9ca3af]">vs prev period</span>
        </div>
      )}
    </div>
  );
}

/* ── Overdue Widget ──────────────────────────────────────────────────────── */

function OverdueWidget({
  overdueOrders,
  filterType,
}: {
  overdueOrders: OverdueBreakdown;
  filterType?: "po" | "so";
}) {
  const showPO = !filterType || filterType === "po";
  const showSO = !filterType || filterType === "so";

  const poTotal = overdueOrders.po.watch.length + overdueOrders.po.warning.length + overdueOrders.po.critical.length;
  const soTotal = overdueOrders.so.watch.length + overdueOrders.so.warning.length + overdueOrders.so.critical.length;

  if (poTotal === 0 && soTotal === 0) {
    return (
      <div className="border border-[#e5e7eb] rounded-lg bg-white px-4 py-3 flex items-center gap-2">
        <span className="text-sm font-semibold text-[#111827]">Overdue Orders</span>
        <span className="text-[12px] text-[#059669] font-medium">✓ All orders on track</span>
      </div>
    );
  }

  return (
    <div className="border border-[#e5e7eb] rounded-lg bg-white p-4">
      <div className="text-sm font-semibold text-[#111827] mb-3">Overdue Orders</div>
      <div className="flex flex-col gap-3">
        {showPO && (
          <OverdueRow
            label="Purchase Orders"
            items={overdueOrders.po}
            orderType="purchase"
          />
        )}
        {showSO && (
          <OverdueRow
            label="Sales Orders"
            items={overdueOrders.so}
            orderType="sales"
          />
        )}
      </div>
    </div>
  );
}

function OverdueRow({
  label,
  items,
  orderType,
}: {
  label: string;
  items: { watch: OverdueItem[]; warning: OverdueItem[]; critical: OverdueItem[] };
  orderType: "purchase" | "sales";
}) {
  const total = items.watch.length + items.warning.length + items.critical.length;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-[13px] text-[#6b7280] w-32 flex-shrink-0">{label}</span>
      {total === 0 ? (
        <span className="text-[12px] text-[#059669] font-medium">✓ All on track</span>
      ) : (
        <div className="flex items-center gap-2 flex-wrap">
          {items.watch.length > 0 && (
            <OverduePill items={items.watch} severity="watch" orderType={orderType} />
          )}
          {items.warning.length > 0 && (
            <OverduePill items={items.warning} severity="warning" orderType={orderType} />
          )}
          {items.critical.length > 0 && (
            <OverduePill items={items.critical} severity="critical" orderType={orderType} />
          )}
        </div>
      )}
    </div>
  );
}

const OVERDUE_STYLES = {
  watch:    { bg: "bg-[#fffbeb]", text: "text-[#d97706]", border: "border-[#fde68a]", label: "Watch" },
  warning:  { bg: "bg-[#fff7ed]", text: "text-[#ea580c]", border: "border-[#fed7aa]", label: "Warning" },
  critical: { bg: "bg-[#fef2f2]", text: "text-[#dc2626]", border: "border-[#fecaca]", label: "Critical" },
};

function OverduePill({
  items,
  severity,
  orderType,
}: {
  items: OverdueItem[];
  severity: "watch" | "warning" | "critical";
  orderType: "purchase" | "sales";
}) {
  const style = OVERDUE_STYLES[severity];
  const basePath = orderType === "purchase" ? "/purchase-orders" : "/sales-orders";

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          className={cn(
            "inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold border transition-opacity hover:opacity-80",
            style.bg, style.text, style.border,
          )}
        >
          {style.label}
          <span className="inline-flex items-center justify-center h-4 min-w-[16px] rounded-full bg-white/60 px-1 text-[10px]">
            {items.length}
          </span>
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-0" align="start" side="bottom">
        <div className={cn("px-3 py-2 border-b border-[#f3f4f6]", style.bg)}>
          <span className={cn("text-[12px] font-semibold", style.text)}>
            {style.label} — {items.length} order{items.length !== 1 ? "s" : ""}
          </span>
          <p className="text-[11px] text-[#6b7280] mt-0.5">
            {severity === "watch" ? "1–2 days overdue"
              : severity === "warning" ? "3–6 days overdue"
              : "7+ days overdue"}
          </p>
        </div>
        <div className="max-h-52 overflow-y-auto">
          {items.map((item) => (
            <Link
              key={item.id}
              href={`${basePath}/${item.id}`}
              className="flex items-center justify-between px-3 py-2.5 hover:bg-[#f9fafb] border-b border-[#f9fafb] last:border-0 transition-colors"
            >
              <div className="min-w-0 mr-3">
                <p className="text-[12px] font-medium text-[#111827] truncate">{item.orderNumber}</p>
                <p className="text-[11px] text-[#6b7280] truncate">{item.counterpartyName}</p>
              </div>
              <span className={cn("text-[11px] font-semibold flex-shrink-0", style.text)}>
                {item.delayDays}d
              </span>
            </Link>
          ))}
        </div>
        <div className="px-3 py-2 border-t border-[#f3f4f6]">
          <Link href={basePath} className="text-[12px] text-[#0d9488] font-medium hover:underline">
            View all {orderType === "purchase" ? "purchase" : "sales"} orders →
          </Link>
        </div>
      </PopoverContent>
    </Popover>
  );
}

/* ── Spend vs Revenue + Margin chart (Overview) ──────────────────────────── */

function SpendRevenueMarginChart({
  history,
  hasBothSides,
}: {
  history: { month: string; spend: number; revenue: number; marginPct?: number }[];
  hasBothSides: boolean;
}) {
  const filtered = history.filter((h) => h.spend > 0 || h.revenue > 0);
  if (filtered.length === 0) return null;

  return (
    <div className="border border-[#e5e7eb] rounded-lg bg-white p-3 sm:p-4">
      <div className="text-sm font-semibold text-[#111827]">Spend vs Revenue</div>
      <div className="text-xs text-[#6b7280] mb-3">
        Monthly comparison{hasBothSides ? " with gross margin %" : ""}
      </div>
      <div className="h-[240px] sm:h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={filtered}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
            <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#6b7280" }} axisLine={{ stroke: "#e5e7eb" }} tickLine={false} />
            <YAxis
              yAxisId="left"
              tick={{ fontSize: 11, fill: "#6b7280" }}
              axisLine={{ stroke: "#e5e7eb" }}
              tickLine={false}
              tickFormatter={(v: number) => {
                if (v >= 10000000) return `₹${(v / 10000000).toFixed(0)}Cr`;
                if (v >= 100000) return `₹${(v / 100000).toFixed(0)}L`;
                return `₹${v}`;
              }}
            />
            {hasBothSides && (
              <YAxis
                yAxisId="right"
                orientation="right"
                tick={{ fontSize: 11, fill: "#6b7280" }}
                axisLine={{ stroke: "#e5e7eb" }}
                tickLine={false}
                tickFormatter={(v: number) => `${v.toFixed(0)}%`}
              />
            )}
            <Tooltip
              contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e5e7eb" }}
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              formatter={((value: number, name: string) => {
                if (name === "marginPct") return [`${value.toFixed(1)}%`, "Gross Margin"];
                if (name === "spend") return [formatCrore(value), "Total Spend"];
                return [formatCrore(value), "Total Revenue"];
              }) as any}
            />
            <Legend
              iconSize={10}
              wrapperStyle={{ fontSize: 11 }}
              formatter={(v: string) =>
                v === "spend" ? "Total Spend" : v === "revenue" ? "Total Revenue" : "Gross Margin %"
              }
            />
            <Bar yAxisId="left" dataKey="spend" name="spend" fill="#f97316" radius={[3, 3, 0, 0]} />
            <Bar yAxisId="left" dataKey="revenue" name="revenue" fill="#0d9488" radius={[3, 3, 0, 0]} />
            {hasBothSides && (
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="marginPct"
                name="marginPct"
                stroke="#6366f1"
                strokeWidth={2}
                dot={{ r: 3, fill: "#6366f1" }}
                activeDot={{ r: 5 }}
              />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

/* ── Single-metric trend chart (Buying / Selling tabs) ───────────────────── */

function SingleMetricChart({
  history,
  dataKey,
  label,
  subtitle,
  color,
}: {
  history: { month: string; spend: number; revenue: number }[];
  dataKey: "spend" | "revenue";
  label: string;
  subtitle: string;
  color: string;
}) {
  const filtered = history.filter((h) => (h[dataKey] ?? 0) > 0);
  if (filtered.length === 0) return null;

  return (
    <div className="border border-[#e5e7eb] rounded-lg bg-white p-3 sm:p-4">
      <div className="text-sm font-semibold text-[#111827]">{label}</div>
      <div className="text-xs text-[#6b7280] mb-3">{subtitle}</div>
      <div className="h-[220px] sm:h-[280px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={filtered}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
            <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#6b7280" }} axisLine={{ stroke: "#e5e7eb" }} tickLine={false} />
            <YAxis
              tick={{ fontSize: 11, fill: "#6b7280" }}
              axisLine={{ stroke: "#e5e7eb" }}
              tickLine={false}
              tickFormatter={(v: number) => {
                if (v >= 10000000) return `₹${(v / 10000000).toFixed(0)}Cr`;
                if (v >= 100000) return `₹${(v / 100000).toFixed(0)}L`;
                return `₹${v}`;
              }}
            />
            <Tooltip
              contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e5e7eb" }}
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              formatter={((value: number) => [formatCrore(value), label]) as any}
            />
            <Bar dataKey={dataKey} name={dataKey} fill={color} radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

/* ── Smart Alerts Panel ──────────────────────────────────────────────────── */

type AlertLevel = "critical" | "warning" | "positive" | "info";

const ALERT_STYLES: Record<AlertLevel, { bg: string; text: string; dot: string; label: string }> = {
  critical: { bg: "bg-[#fef2f2]", text: "text-[#dc2626]", dot: "bg-[#dc2626]", label: "critical" },
  warning:  { bg: "bg-[#fffbeb]", text: "text-[#d97706]", dot: "bg-[#d97706]", label: "warning" },
  positive: { bg: "bg-[#f0fdf4]", text: "text-[#059669]", dot: "bg-[#059669]", label: "positive" },
  info:     { bg: "bg-[#eff6ff]", text: "text-[#2563eb]", dot: "bg-[#2563eb]", label: "info" },
};

function SmartAlertsPanel({
  alerts,
  expanded,
  onToggle,
}: {
  alerts: { level: AlertLevel; message: string; linkType?: string }[];
  expanded: boolean;
  onToggle: () => void;
}) {
  if (alerts.length === 0) return null;

  const counts = alerts.reduce<Partial<Record<AlertLevel, number>>>((acc, a) => {
    acc[a.level] = (acc[a.level] ?? 0) + 1;
    return acc;
  }, {});

  const levelOrder: AlertLevel[] = ["critical", "warning", "positive", "info"];
  const Chevron = expanded ? ChevronUp : ChevronDown;

  return (
    <div className="border border-[#e5e7eb] rounded-lg bg-white overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 cursor-pointer" onClick={onToggle}>
        <div className="flex items-center gap-3">
          <span className="text-sm font-semibold text-[#111827]">Alerts & Insights</span>
          <div className="flex items-center gap-2">
            {levelOrder.filter((lvl) => (counts[lvl] ?? 0) > 0).map((lvl) => {
              const style = ALERT_STYLES[lvl];
              return (
                <span key={lvl} className={cn("inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold", style.bg, style.text)}>
                  {counts[lvl]}
                </span>
              );
            })}
          </div>
        </div>
        <Chevron className="h-4 w-4 text-[#9ca3af]" />
      </div>
      {expanded && (
        <div className="border-t border-[#e5e7eb]">
          {alerts.map((alert, i) => {
            const style = ALERT_STYLES[alert.level] ?? ALERT_STYLES.info;
            return (
              <div key={i} className="flex items-start gap-3 px-4 py-3 border-b border-[#f3f4f6] last:border-b-0">
                <span className={cn("w-2 h-2 rounded-full mt-1.5 flex-shrink-0", style.dot)} />
                <span className="text-sm text-[#374151] flex-1">{alert.message}</span>
                {alert.linkType === "purchase-orders" && (
                  <Link href="/purchase-orders" className="text-xs text-[#0d9488] font-medium whitespace-nowrap hover:underline">→ View</Link>
                )}
                {alert.linkType === "sales-orders" && (
                  <Link href="/sales-orders" className="text-xs text-[#0d9488] font-medium whitespace-nowrap hover:underline">→ View</Link>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ── Spend vs Revenue Chart (Full View) ──────────────────────────────────── */

function SpendRevenueChart({
  history,
}: {
  history: { month: string; spend: number; revenue: number; marginPct?: number }[];
}) {
  const filtered = history.filter((h) => h.spend > 0 || h.revenue > 0);
  if (filtered.length === 0) return null;

  return (
    <div className="border border-[#e5e7eb] rounded-lg bg-white p-3 sm:p-4">
      <div className="text-sm font-semibold text-[#111827]">Spend vs Revenue</div>
      <div className="text-xs text-[#6b7280] mb-3">Monthly comparison for the selected period</div>
      <div className="h-[240px] sm:h-[320px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={filtered}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
            <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#6b7280" }} axisLine={{ stroke: "#e5e7eb" }} tickLine={false} />
            <YAxis
              tick={{ fontSize: 11, fill: "#6b7280" }}
              axisLine={{ stroke: "#e5e7eb" }}
              tickLine={false}
              tickFormatter={(value: number) => {
                if (value >= 10000000) return `₹${(value / 10000000).toFixed(0)}Cr`;
                if (value >= 100000) return `₹${(value / 100000).toFixed(0)}L`;
                return `₹${value}`;
              }}
            />
            <Tooltip
              contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e5e7eb" }}
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              formatter={((value: number, name: string) => [
                formatCrore(value),
                name === "spend" ? "Total Spend" : "Total Revenue",
              ]) as any}
            />
            <Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} formatter={(v: string) => v === "spend" ? "Total Spend" : "Total Revenue"} />
            <Bar dataKey="spend" name="spend" fill="#f97316" radius={[3, 3, 0, 0]} />
            <Bar dataKey="revenue" name="revenue" fill="#0d9488" radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

/* ── Recent Activity Feed ────────────────────────────────────────────────── */

function RecentActivityFeed({
  activities,
}: {
  activities: {
    orderId: string; orderNumber: string; orderType: "purchase" | "sales";
    status: string; receiptStatus: string; issueDate: string;
    counterpartyName: string; productCount: number;
  }[];
}) {
  if (activities.length === 0) return null;

  return (
    <div className="border border-[#e5e7eb] rounded-lg bg-white p-4">
      <div className="text-sm font-semibold text-[#111827] mb-3">Recent Activity</div>
      <div>
        {activities.map((item, i) => {
          const isPO = item.orderType === "purchase";
          const href = isPO ? `/purchase-orders/${item.orderId}` : `/sales-orders/${item.orderId}`;
          const badge = isPO
            ? { label: "PO", bg: "bg-[#eff6ff]", text: "text-[#2563eb]" }
            : { label: "SO", bg: "bg-[#f0fdf4]", text: "text-[#059669]" };

          return (
            <Link
              key={item.orderId + i}
              href={href}
              className={cn("block sm:flex sm:items-center sm:gap-4 py-3 hover:bg-[#f9fafb] -mx-4 px-4 transition-colors", i < activities.length - 1 && "border-b border-[#f3f4f6]")}
            >
              <div className="sm:hidden">
                <div className="flex items-center gap-2 mb-1">
                  <span className={cn("text-[10px] font-semibold px-2 py-0.5 rounded flex-shrink-0", badge.bg, badge.text)}>{badge.label}</span>
                  <span className="text-sm font-medium text-[#111827] truncate">{item.orderNumber}</span>
                  <span className="text-xs text-[#9ca3af] ml-auto whitespace-nowrap">{formatDisplayDate(item.issueDate)}</span>
                </div>
                <div className="flex items-center justify-between pl-7">
                  <span className="text-[13px] text-[#6b7280] truncate">{item.counterpartyName}</span>
                  <span className="text-[12px] text-[#9ca3af] whitespace-nowrap ml-2">{item.productCount} {item.productCount === 1 ? "product" : "products"}</span>
                </div>
              </div>
              <span className={cn("hidden sm:inline-flex text-[10px] font-semibold px-2 py-0.5 rounded flex-shrink-0", badge.bg, badge.text)}>{badge.label}</span>
              <span className="hidden sm:inline text-sm font-medium text-[#111827] min-w-0 truncate">{item.orderNumber}</span>
              <span className="hidden sm:inline text-sm text-[#6b7280] min-w-0 truncate">{item.counterpartyName}</span>
              <span className="hidden sm:inline text-xs text-[#9ca3af] whitespace-nowrap">{item.productCount} {item.productCount === 1 ? "product" : "products"}</span>
              <span className="hidden sm:inline text-xs text-[#9ca3af] whitespace-nowrap ml-auto">{formatDisplayDate(item.issueDate)}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

/* ── Top Products ────────────────────────────────────────────────────────── */

function TopProductsSection({
  topProducts,
}: {
  topProducts?: {
    topBySpend?: { productId: string; variantId: string; name: string; spend: number; poCount: number }[];
    topByRevenue?: { productId: string; variantId: string; name: string; revenue: number; soCount: number }[];
  };
}) {
  const bySpend = topProducts?.topBySpend ?? [];
  const byRevenue = topProducts?.topByRevenue ?? [];
  if (bySpend.length === 0 && byRevenue.length === 0) return null;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
      <div className="border border-[#e5e7eb] rounded-lg bg-white p-3 sm:p-4">
        <div className="text-sm font-semibold text-[#111827] mb-3">Top Products by Spend</div>
        {bySpend.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full table-fixed min-w-[400px]">
              <colgroup><col className="w-6" /><col /><col className="w-20" /><col className="w-24" /></colgroup>
              <thead>
                <tr className="border-b border-[#f3f4f6]">
                  <th className={cn(thCls, "text-left")}>#</th>
                  <th className={cn(thCls, "text-left")}>Product</th>
                  <th className={cn(thCls, "text-right")}>PO Count</th>
                  <th className={cn(thCls, "text-right")}>Total Spend</th>
                </tr>
              </thead>
              <tbody>
                {bySpend.map((item, i) => (
                  <tr key={item.productId + i} className="border-b border-[#f3f4f6] last:border-0">
                    <td className="py-2 text-xs text-[#9ca3af] text-left align-top">{i + 1}</td>
                    <td className="py-2 text-left align-top">
                      <Link href={`/products/${item.productId}`} className="text-sm text-[#111827] break-words hover:underline">{item.name}</Link>
                    </td>
                    <td className="py-2 text-sm text-[#6b7280] text-right align-top">{item.poCount}</td>
                    <td className="py-2 text-sm font-medium text-[#111827] text-right align-top">{formatCrore(item.spend)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <div className="border border-[#e5e7eb] rounded-lg bg-white p-3 sm:p-4">
        <div className="text-sm font-semibold text-[#111827] mb-3">Top Products by Revenue</div>
        {byRevenue.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full table-fixed min-w-[400px]">
              <colgroup><col className="w-6" /><col /><col className="w-20" /><col className="w-24" /></colgroup>
              <thead>
                <tr className="border-b border-[#f3f4f6]">
                  <th className={cn(thCls, "text-left")}>#</th>
                  <th className={cn(thCls, "text-left")}>Product</th>
                  <th className={cn(thCls, "text-right")}>SO Count</th>
                  <th className={cn(thCls, "text-right")}>Total Revenue</th>
                </tr>
              </thead>
              <tbody>
                {byRevenue.map((item, i) => (
                  <tr key={item.productId + i} className="border-b border-[#f3f4f6] last:border-0">
                    <td className="py-2 text-xs text-[#9ca3af] text-left align-top">{i + 1}</td>
                    <td className="py-2 text-left align-top">
                      <Link href={`/products/${item.productId}`} className="text-sm text-[#111827] break-words hover:underline">{item.name}</Link>
                    </td>
                    <td className="py-2 text-sm text-[#6b7280] text-right align-top">{item.soCount}</td>
                    <td className="py-2 text-sm font-medium text-[#059669] text-right align-top">{formatCrore(item.revenue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Top Parties (Full View) ─────────────────────────────────────────────── */

function PriceTrendBadge({ trend, pct, flipColors }: { trend?: string; pct?: number; flipColors?: boolean }) {
  if (!trend) return <span className="text-sm text-[#9ca3af]">—</span>;
  const absPct = Math.abs(pct ?? 0);
  const display = pct != null ? `${absPct.toFixed(1)}%` : "";
  if (trend === "up") {
    const bg = flipColors ? "bg-[#f0fdf4]" : "bg-[#fef2f2]";
    const text = flipColors ? "text-[#059669]" : "text-[#dc2626]";
    return <span className={cn("text-[11px] font-semibold px-2 py-0.5 rounded", bg, text)}>↑ {display}</span>;
  }
  if (trend === "down") {
    const bg = flipColors ? "bg-[#fef2f2]" : "bg-[#f0fdf4]";
    const text = flipColors ? "text-[#dc2626]" : "text-[#059669]";
    return <span className={cn("text-[11px] font-semibold px-2 py-0.5 rounded", bg, text)}>↓ {display}</span>;
  }
  return <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-[#f3f4f6] text-[#6b7280]">→ {display || "Stable"}</span>;
}

function FulfillmentCell({ rate }: { rate?: number | null }) {
  if (rate == null) return <span className="text-sm text-[#9ca3af]">—</span>;
  const capped = Math.min(rate, 100);
  const color = capped >= 95 ? "text-[#059669]" : capped >= 80 ? "text-[#d97706]" : "text-[#dc2626]";
  return <span className={cn("text-sm", color)}>{capped.toFixed(1)}%</span>;
}

function TopPartiesSection({
  topSuppliers,
  topBuyers,
}: {
  topSuppliers: {
    supplierId: string; supplierName: string; totalSpend: number;
    poCount: number; fulfillmentRate?: number | null; priceTrend?: string; priceTrendPct?: number;
  }[];
  topBuyers: {
    buyerId: string; buyerName: string; totalRevenue: number;
    soCount: number; fulfillmentRate?: number | null; priceTrend?: string; priceTrendPct?: number;
  }[];
}) {
  if (topSuppliers.length === 0 && topBuyers.length === 0) return null;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
      <div className="border border-[#e5e7eb] rounded-lg bg-white p-3 sm:p-4">
        <div className="text-sm font-semibold text-[#111827] mb-3">Top Suppliers</div>
        {topSuppliers.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full table-fixed min-w-[420px]">
              <colgroup><col /><col className="w-24" /><col className="w-20" /><col className="w-24" /></colgroup>
              <thead>
                <tr className="border-b border-[#f3f4f6]">
                  <th className={cn(thCls, "text-left")}>Supplier</th>
                  <th className={cn(thCls, "text-right")}>Spend</th>
                  <th className={cn(thCls, "text-right")}>Fulfillment</th>
                  <th className={cn(thCls, "text-right")}>Price Trend</th>
                </tr>
              </thead>
              <tbody>
                {topSuppliers.map((s, i) => (
                  <tr key={s.supplierId + i} className="border-b border-[#f3f4f6] last:border-0">
                    <td className="py-2 text-sm text-[#111827] break-words text-left align-top">{s.supplierName}</td>
                    <td className="py-2 text-sm font-medium text-[#111827] text-right align-top">{formatCrore(s.totalSpend)}</td>
                    <td className="py-2 text-right align-top"><FulfillmentCell rate={s.fulfillmentRate} /></td>
                    <td className="py-2 text-right align-top"><PriceTrendBadge trend={s.priceTrend} pct={s.priceTrendPct} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <div className="border border-[#e5e7eb] rounded-lg bg-white p-3 sm:p-4">
        <div className="text-sm font-semibold text-[#111827] mb-3">Top Buyers</div>
        {topBuyers.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full table-fixed min-w-[420px]">
              <colgroup><col /><col className="w-24" /><col className="w-20" /><col className="w-24" /></colgroup>
              <thead>
                <tr className="border-b border-[#f3f4f6]">
                  <th className={cn(thCls, "text-left")}>Buyer</th>
                  <th className={cn(thCls, "text-right")}>Revenue</th>
                  <th className={cn(thCls, "text-right")}>Fulfillment</th>
                  <th className={cn(thCls, "text-right")}>Price Trend</th>
                </tr>
              </thead>
              <tbody>
                {topBuyers.map((b, i) => (
                  <tr key={b.buyerId + i} className="border-b border-[#f3f4f6] last:border-0">
                    <td className="py-2 text-sm text-[#111827] break-words text-left align-top">{b.buyerName}</td>
                    <td className="py-2 text-sm font-medium text-[#059669] text-right align-top">{formatCrore(b.totalRevenue)}</td>
                    <td className="py-2 text-right align-top"><FulfillmentCell rate={b.fulfillmentRate} /></td>
                    <td className="py-2 text-right align-top"><PriceTrendBadge trend={b.priceTrend} pct={b.priceTrendPct} flipColors /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Onboarding Checklist ────────────────────────────────────────────────── */

const ICON_CLS = "h-5 w-5 text-[#0d9488]";

const ONBOARDING_STEPS = [
  { id: "location" as const, title: "Add Your First Location", description: "Where does your business operate?", tooltip: "Locations represent your warehouses, offices, or stores. They're used as delivery and dispatch addresses on orders.", icon: <MapPin className={ICON_CLS} />, href: "/locations/create", cta: "Add Location" },
  { id: "settings" as const, title: "Configure Order Settings", description: "Set payment terms, PO numbering, and GST rates", tooltip: "Define the payment terms, cancellation reasons, auto-numbering format, and applicable GST rates used across all your orders.", icon: <Settings className={ICON_CLS} />, href: "/settings", cta: "Configure Settings" },
  { id: "category" as const, title: "Create a Product Category", description: "Organize your products into categories", tooltip: "Categories are required before you can add products. They help group your catalog and filter orders by product type.", icon: <LayoutGrid className={ICON_CLS} />, href: "/categories", cta: "Add Category" },
  { id: "partner" as const, title: "Add Your First Partner", description: "Who do you buy from or sell to?", tooltip: "Partners are the vendors you purchase from or customers you sell to. A partner must exist before you can create a purchase or sales order.", icon: <Store className={ICON_CLS} />, href: "/partners/new", cta: "Add Partner" },
  { id: "product" as const, title: "Create Your First Product", description: "Add a product with variants to your catalog", tooltip: "Products represent the items you buy and sell. Each product can have multiple variants (size, colour, etc.) with individual pricing and SKUs.", icon: <Package className={ICON_CLS} />, href: "/products/new", cta: "Add Product" },
];

function OnboardingChecklist({ onboarding }: { onboarding: OnboardingStatus }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [categoryModalOpen, setCategoryModalOpen] = useState(false);
  const [locationModalOpen, setLocationModalOpen] = useState(false);
  const [productModalOpen, setProductModalOpen] = useState(false);
  const [settingsModalOpen, setSettingsModalOpen] = useState(false);
  const [partnerModalOpen, setPartnerModalOpen] = useState(false);

  const completedCount = Object.values(onboarding.steps).filter(Boolean).length;
  const totalSteps = ONBOARDING_STEPS.length;
  const progressPct = Math.round((completedCount / totalSteps) * 100);

  return (
    <div className="flex-1 overflow-auto bg-[#f9fafb]">
      <div className="mx-auto max-w-[640px] p-4 sm:p-6">
        <div className="mb-5">
          <h2 className="text-[18px] font-semibold text-[#111827]">Welcome! Let&apos;s set up your account</h2>
          <p className="text-[13px] text-[#6b7280] mt-1">Complete these steps to start creating purchase and sales orders.</p>
        </div>
        <div className="rounded-[10px] border border-[#e5e7eb] bg-white px-4 sm:px-6 py-5 mb-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[14px] font-semibold text-[#111827]">Setup Progress</span>
            <span className="text-[13px] font-medium text-[#6b7280]">{completedCount} of {totalSteps} complete</span>
          </div>
          <div className="w-full h-2 bg-[#f3f4f6] rounded-full overflow-hidden">
            <div className="h-full bg-[#0d9488] rounded-full transition-all duration-500" style={{ width: `${progressPct}%` }} />
          </div>
        </div>
        <div className="rounded-[10px] border border-[#e5e7eb] bg-white overflow-hidden">
          {ONBOARDING_STEPS.map((step, i) => {
            const isDone = onboarding.steps[step.id];
            const isLast = i === ONBOARDING_STEPS.length - 1;
            return (
              <div key={step.id} className={`flex items-center gap-4 px-4 sm:px-6 py-4 ${!isLast ? "border-b border-[#f3f4f6]" : ""} ${isDone ? "opacity-60" : ""}`}>
                <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${isDone ? "bg-[#059669]/10" : "bg-[#f0fdfa]"}`}>
                  {isDone ? <Check className="h-5 w-5 text-[#059669]" /> : step.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className={`text-[14px] font-medium ${isDone ? "text-[#6b7280] line-through" : "text-[#111827]"}`}>{step.title}</p>
                    {!isDone && <HelpTooltip content={step.tooltip} maxWidth={260} side="right" />}
                  </div>
                  <p className="text-[12px] text-[#9ca3af] mt-0.5">{step.description}</p>
                </div>
                {isDone ? (
                  <span className="text-[12px] font-medium text-[#059669] flex-shrink-0">Done</span>
                ) : (
                  <Button
                    size="sm"
                    onClick={() => {
                      if (step.id === "category") setCategoryModalOpen(true);
                      else if (step.id === "location") setLocationModalOpen(true);
                      else if (step.id === "product") setProductModalOpen(true);
                      else if (step.id === "settings") setSettingsModalOpen(true);
                      else if (step.id === "partner") setPartnerModalOpen(true);
                    }}
                    className="flex-shrink-0 h-8 px-3 text-[12px] bg-[#0d9488] hover:bg-[#0f766e] text-white gap-1"
                  >
                    {step.cta}
                    <ChevronRight className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <QuickCreateCategoryModal open={categoryModalOpen} onClose={() => setCategoryModalOpen(false)} mode="category" onCreated={() => { setCategoryModalOpen(false); queryClient.invalidateQueries({ queryKey: ["onboarding-status"] }); }} />
      <QuickCreateLocationModal open={locationModalOpen} onClose={() => setLocationModalOpen(false)} onCreated={() => { setLocationModalOpen(false); queryClient.invalidateQueries({ queryKey: ["onboarding-status"] }); }} />
      <QuickCreateProductModal open={productModalOpen} onClose={() => setProductModalOpen(false)} onCreated={() => { setProductModalOpen(false); queryClient.invalidateQueries({ queryKey: ["onboarding-status"] }); }} />
      <QuickConfigureSettingsModal open={settingsModalOpen} onClose={() => setSettingsModalOpen(false)} onSaved={() => { setSettingsModalOpen(false); queryClient.invalidateQueries({ queryKey: ["onboarding-status"] }); }} />
      <QuickCreatePartnerModal open={partnerModalOpen} onClose={() => setPartnerModalOpen(false)} onCreated={() => { setPartnerModalOpen(false); queryClient.invalidateQueries({ queryKey: ["onboarding-status"] }); }} />

      {/* suppress router unused warning */}
      <span className="hidden">{router && ""}</span>
    </div>
  );
}
