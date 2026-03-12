"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ChevronDown, ChevronUp } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/layout/PageHeader";
import { dashboardService } from "@/services/dashboard";

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
      return {
        fromDate: fmt(new Date(today.getFullYear(), today.getMonth(), 1)),
        toDate: fmt(today),
      };
    case "this_quarter": {
      const q = Math.floor(today.getMonth() / 3);
      return {
        fromDate: fmt(new Date(today.getFullYear(), q * 3, 1)),
        toDate: fmt(today),
      };
    }
    case "last_30_days":
      return {
        fromDate: fmt(new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000)),
        toDate: fmt(today),
      };
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
  return new Date(dateStr).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
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

  if (abs > 500) {
    return { text: `${arrow} New`, colorClass: color };
  }
  return { text: `${arrow} ${abs.toFixed(1)}%`, colorClass: color };
}

/* ── Currency formatter ──────────────────────────────────────────────────── */

function formatCrore(value: number): string {
  if (value >= 10000000) return `₹${(value / 10000000).toFixed(2)} Cr`;
  if (value >= 100000) return `₹${(value / 100000).toFixed(2)} L`;
  return `₹${value.toLocaleString("en-IN")}`;
}

/* ── Page ─────────────────────────────────────────────────────────────────── */

const selectCls =
  "border border-[#e5e7eb] rounded-lg px-3 py-1.5 text-[13px] text-[#111827] bg-white focus:outline-none focus:ring-1 focus:ring-[#0d9488]";

export default function DashboardPage() {
  const [selectedPeriod, setSelectedPeriod] = useState<PeriodValue>("last_12_months");
  const [alertsExpanded, setAlertsExpanded] = useState(false);

  const { fromDate, toDate } = useMemo(
    () => computeDateRange(selectedPeriod),
    [selectedPeriod],
  );

  const { data, isLoading } = useQuery({
    queryKey: ["dashboard-overview", fromDate, toDate],
    queryFn: () => dashboardService.getOverview({ fromDate, toDate }),
    enabled: !!fromDate && !!toDate,
  });

  const kpis = data?.kpis;
  const trends = kpis?.trends;
  const hasData = data && kpis;

  return (
    <>
      <PageHeader title="Dashboard" />

      <div className="flex-1 overflow-auto">
        {/* Period selector bar */}
        <div className="flex items-center gap-6 px-8 py-4">
          <div className="flex items-center gap-2">
            <label className="text-[12px] text-[#6b7280]">Period</label>
            <select
              className={selectCls}
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value as PeriodValue)}
            >
              {PERIOD_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[11px] text-[#6b7280] uppercase tracking-[0.6px] font-medium">
              From
            </span>
            <input
              type="text"
              value={formatDisplayDate(fromDate)}
              disabled
              className="bg-[#f9fafb] border border-[#e5e7eb] text-[#6b7280] rounded px-3 py-1.5 text-sm cursor-not-allowed w-28 text-center"
            />
            <span className="text-[11px] text-[#6b7280] uppercase tracking-[0.6px] font-medium">
              To
            </span>
            <input
              type="text"
              value={formatDisplayDate(toDate)}
              disabled
              className="bg-[#f9fafb] border border-[#e5e7eb] text-[#6b7280] rounded px-3 py-1.5 text-sm cursor-not-allowed w-28 text-center"
            />
          </div>
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="grid grid-cols-6 gap-4 mx-8">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="animate-pulse bg-[#f3f4f6] rounded-lg h-24"
              />
            ))}
          </div>
        ) : !hasData ? (
          <div className="flex items-center justify-center h-64">
            <p className="text-sm text-[#6b7280]">
              No data found for the selected period.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-6 gap-4 mx-8">
            {/* Card 1 — Total Spend */}
            <KpiCard
              label="Total Spend"
              value={formatCrore(kpis.totalSpend ?? 0)}
              valueColor="text-[#111827]"
              trend={formatTrend(trends?.spend, "text-[#d97706]", "text-[#059669]")}
            />

            {/* Card 2 — Total Revenue */}
            <KpiCard
              label="Total Revenue"
              value={formatCrore(kpis.totalRevenue ?? 0)}
              valueColor="text-[#111827]"
              trend={formatTrend(trends?.revenue, "text-[#059669]", "text-[#dc2626]")}
            />

            {/* Card 3 — Avg Gross Margin */}
            <KpiCard
              label="Avg Gross Margin"
              value={`${(kpis.grossMarginPct ?? 0).toFixed(1)}%`}
              valueColor={
                (kpis.grossMarginPct ?? 0) >= 15
                  ? "text-[#059669]"
                  : (kpis.grossMarginPct ?? 0) >= 5
                    ? "text-[#d97706]"
                    : "text-[#dc2626]"
              }
              trend={formatTrend(trends?.margin, "text-[#059669]", "text-[#dc2626]")}
            />

            {/* Card 4 — Open Purchase Orders */}
            <KpiCard
              label="Open Purchase Orders"

              value={String(kpis.openPOCount ?? 0)}
              valueColor={
                (kpis.openPOCount ?? 0) > 10 ? "text-[#d97706]" : "text-[#111827]"
              }
              subValue={formatCrore(kpis.openPOValue ?? 0)}
            />

            {/* Card 5 — Open Sales Orders */}
            <KpiCard
              label="Open Sales Orders"

              value={String(kpis.openSOCount ?? 0)}
              valueColor="text-[#111827]"
              subValue={formatCrore(kpis.openSOValue ?? 0)}
            />

            {/* Card 6 — Fulfillment Rate */}
            <KpiCard
              label="Fulfillment Rate"
              value={`${Math.min(kpis.fulfillmentRate ?? 0, 100).toFixed(1)}%`}
              valueColor={
                (kpis.fulfillmentRate ?? 0) >= 95
                  ? "text-[#059669]"
                  : (kpis.fulfillmentRate ?? 0) >= 80
                    ? "text-[#d97706]"
                    : "text-[#dc2626]"
              }
              trend={formatTrend(trends?.fulfillment, "text-[#059669]", "text-[#dc2626]")}
            />
          </div>
        )}

        {/* Sections below KPI cards — only render when data is loaded */}
        {hasData && (
          <div className="mx-8 mt-4 pb-8 space-y-4">
            {/* Section 1 — Smart Alerts Panel */}
            <SmartAlertsPanel
              alerts={data.alerts ?? []}
              expanded={alertsExpanded}
              onToggle={() => setAlertsExpanded((v) => !v)}
            />

            {/* Section 2 — Spend vs Revenue Chart */}
            <SpendRevenueChart history={data.spendRevenueHistory ?? []} />

            {/* Section 3 — Recent Activity Feed */}
            <RecentActivityFeed activities={data.recentActivity ?? []} />

            {/* Section 4 — Top Products */}
            <TopProductsSection topProducts={data.topProducts} />

            {/* Section 5 — Top Suppliers & Top Buyers */}
            <TopPartiesSection
              topSuppliers={data.topSuppliers ?? []}
              topBuyers={data.topBuyers ?? []}
            />
          </div>
        )}
      </div>
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
}: {
  label: string;
  value: string;
  valueColor: string;
  subValue?: string;
  trend?: { text: string; colorClass: string } | null;
}) {
  return (
    <div className="border border-[#e5e7eb] rounded-lg bg-white p-4">
      <div
        className="font-semibold uppercase text-[#6b7280] text-[10px] tracking-[0.8px]"
      >
        {label}
      </div>
      <div className={cn("text-2xl font-bold mt-1", valueColor)}>{value}</div>
      {subValue && (
        <div className="text-xs text-[#6b7280] mt-0.5">{subValue}</div>
      )}
      {trend && (
        <div className="flex items-center gap-1 mt-1">
          <span className={cn("text-xs font-medium", trend.colorClass)}>
            {trend.text}
          </span>
          <span className="text-[10px] text-[#9ca3af]">vs prev period</span>
        </div>
      )}
    </div>
  );
}

/* ── Smart Alerts Panel ──────────────────────────────────────────────────── */

type AlertLevel = "critical" | "warning" | "positive" | "info";

const ALERT_STYLES: Record<
  AlertLevel,
  { bg: string; text: string; dot: string; label: string }
> = {
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
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-3 cursor-pointer"
        onClick={onToggle}
      >
        <div className="flex items-center gap-3">
          <span className="text-sm font-semibold text-[#111827]">
            ⚡ Business Intelligence
          </span>
          <div className="flex items-center gap-2">
            {levelOrder
              .filter((lvl) => (counts[lvl] ?? 0) > 0)
              .map((lvl) => {
                const style = ALERT_STYLES[lvl];
                return (
                  <span
                    key={lvl}
                    className={cn(
                      "inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold",
                      style.bg,
                      style.text,
                    )}
                  >
                    {counts[lvl]}
                  </span>
                );
              })}
          </div>
        </div>
        <Chevron className="h-4 w-4 text-[#9ca3af]" />
      </div>

      {/* Alert rows */}
      {expanded && (
        <div className="border-t border-[#e5e7eb]">
          {alerts.map((alert, i) => {
            const style = ALERT_STYLES[alert.level] ?? ALERT_STYLES.info;
            return (
              <div
                key={i}
                className="flex items-start gap-3 px-4 py-3 border-b border-[#f3f4f6] last:border-b-0"
              >
                <span
                  className={cn("w-2 h-2 rounded-full mt-1.5 flex-shrink-0", style.dot)}
                />
                <span className="text-sm text-[#374151] flex-1">
                  {alert.message}
                </span>
                {alert.linkType === "purchase-orders" && (
                  <Link
                    href="/purchase-orders"
                    className="text-xs text-[#0d9488] font-medium whitespace-nowrap hover:underline"
                  >
                    → View
                  </Link>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ── Spend vs Revenue Chart ──────────────────────────────────────────────── */

function SpendRevenueChart({
  history,
}: {
  history: { month: string; spend: number; revenue: number; marginPct?: number }[];
}) {
  const filtered = history.filter((h) => h.spend > 0 || h.revenue > 0);

  if (filtered.length === 0) return null;

  return (
    <div className="border border-[#e5e7eb] rounded-lg bg-white p-4">
      <div className="text-sm font-semibold text-[#111827]">
        Spend vs Revenue
      </div>
      <div className="text-xs text-[#6b7280] mb-3">
        Monthly comparison for the selected period
      </div>
      <div className="h-[320px]">
        <ResponsiveContainer width="100%" height={320}>
          <BarChart data={filtered}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
            <XAxis
              dataKey="month"
              tick={{ fontSize: 11, fill: "#6b7280" }}
              axisLine={{ stroke: "#e5e7eb" }}
              tickLine={false}
            />
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
              contentStyle={{
                fontSize: 12,
                borderRadius: 8,
                border: "1px solid #e5e7eb",
              }}
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              formatter={((value: number, name: string) => [
                formatCrore(value),
                name === "spend" ? "Total Spend" : "Total Revenue",
              ]) as any}
            />
            <Legend
              iconSize={10}
              wrapperStyle={{ fontSize: 11 }}
              formatter={(value: string) =>
                value === "spend" ? "Total Spend" : "Total Revenue"
              }
            />
            <Bar
              dataKey="spend"
              name="spend"
              fill="#f97316"
              radius={[3, 3, 0, 0]}
            />
            <Bar
              dataKey="revenue"
              name="revenue"
              fill="#0d9488"
              radius={[3, 3, 0, 0]}
            />
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
    orderId: string;
    orderNumber: string;
    orderType: "purchase" | "sales";
    status: string;
    receiptStatus: string;
    issueDate: string;
    counterpartyName: string;
    productCount: number;
  }[];
}) {
  if (activities.length === 0) return null;

  return (
    <div className="border border-[#e5e7eb] rounded-lg bg-white p-4">
      <div className="text-sm font-semibold text-[#111827] mb-3">
        Recent Activity
      </div>
      <div>
        {activities.map((item, i) => {
          const isPO = item.orderType === "purchase";
          const href = isPO
            ? `/purchase-orders/${item.orderId}`
            : `/sales-orders/${item.orderId}`;
          const badge = isPO
            ? { label: "PO", bg: "bg-[#eff6ff]", text: "text-[#2563eb]" }
            : { label: "SO", bg: "bg-[#f0fdf4]", text: "text-[#059669]" };

          return (
            <Link
              key={item.orderId + i}
              href={href}
              className={cn(
                "flex items-center gap-4 py-3 hover:bg-[#f9fafb] -mx-4 px-4 transition-colors",
                i < activities.length - 1 && "border-b border-[#f3f4f6]",
              )}
            >
              <span
                className={cn(
                  "text-[10px] font-semibold px-2 py-0.5 rounded flex-shrink-0",
                  badge.bg,
                  badge.text,
                )}
              >
                {badge.label}
              </span>
              <span className="text-sm font-medium text-[#111827] min-w-0 truncate">
                {item.orderNumber}
              </span>
              <span className="text-sm text-[#6b7280] min-w-0 truncate">
                {item.counterpartyName}
              </span>
              <span className="text-xs text-[#9ca3af] whitespace-nowrap">
                {item.productCount} {item.productCount === 1 ? "product" : "products"}
              </span>
              <span className="text-xs text-[#9ca3af] whitespace-nowrap ml-auto">
                {formatDisplayDate(item.issueDate)}
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

/* ── Section 4 — Top Products ──────────────────────────────────────────── */

const thCls =
  "text-[10px] font-semibold uppercase tracking-[0.8px] text-[#6b7280] pb-2";

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
    <div className="grid grid-cols-2 gap-4 mb-4">
      {/* Left — Top Products by Spend */}
      <div className="border border-[#e5e7eb] rounded-lg bg-white p-4">
        <div className="text-sm font-semibold text-[#111827] mb-3">
          Top Products by Spend
        </div>
        {bySpend.length > 0 && (
          <table className="w-full table-fixed">
            <colgroup>
              <col className="w-6" />
              <col />
              <col className="w-20" />
              <col className="w-24" />
            </colgroup>
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
                    <Link href={`/products/${item.productId}`} className="text-sm text-[#111827] break-words hover:underline">
                      {item.name}
                    </Link>
                  </td>
                  <td className="py-2 text-sm text-[#6b7280] text-right align-top">{item.poCount}</td>
                  <td className="py-2 text-sm font-medium text-[#111827] text-right align-top">{formatCrore(item.spend)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Right — Top Products by Revenue */}
      <div className="border border-[#e5e7eb] rounded-lg bg-white p-4">
        <div className="text-sm font-semibold text-[#111827] mb-3">
          Top Products by Revenue
        </div>
        {byRevenue.length > 0 && (
          <table className="w-full table-fixed">
            <colgroup>
              <col className="w-6" />
              <col />
              <col className="w-20" />
              <col className="w-24" />
            </colgroup>
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
                    <Link href={`/products/${item.productId}`} className="text-sm text-[#111827] break-words hover:underline">
                      {item.name}
                    </Link>
                  </td>
                  <td className="py-2 text-sm text-[#6b7280] text-right align-top">{item.soCount}</td>
                  <td className="py-2 text-sm font-medium text-[#059669] text-right align-top">{formatCrore(item.revenue)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

/* ── Section 5 — Top Suppliers & Top Buyers ────────────────────────────── */

function PriceTrendBadge({
  trend,
  pct,
  flipColors,
}: {
  trend?: string;
  pct?: number;
  flipColors?: boolean;
}) {
  if (!trend) return <span className="text-sm text-[#9ca3af]">—</span>;

  const absPct = Math.abs(pct ?? 0);
  const display = pct != null ? `${absPct.toFixed(1)}%` : "";

  if (trend === "up") {
    const bg = flipColors ? "bg-[#f0fdf4]" : "bg-[#fef2f2]";
    const text = flipColors ? "text-[#059669]" : "text-[#dc2626]";
    return (
      <span className={cn("text-[11px] font-semibold px-2 py-0.5 rounded", bg, text)}>
        ↑ {display}
      </span>
    );
  }
  if (trend === "down") {
    const bg = flipColors ? "bg-[#fef2f2]" : "bg-[#f0fdf4]";
    const text = flipColors ? "text-[#dc2626]" : "text-[#059669]";
    return (
      <span className={cn("text-[11px] font-semibold px-2 py-0.5 rounded", bg, text)}>
        ↓ {display}
      </span>
    );
  }
  return (
    <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-[#f3f4f6] text-[#6b7280]">
      → {display || "Stable"}
    </span>
  );
}

function FulfillmentCell({ rate }: { rate?: number | null }) {
  if (rate == null) return <span className="text-sm text-[#9ca3af]">—</span>;
  const capped = Math.min(rate, 100);
  const color =
    capped >= 95
      ? "text-[#059669]"
      : capped >= 80
        ? "text-[#d97706]"
        : "text-[#dc2626]";
  return <span className={cn("text-sm", color)}>{capped.toFixed(1)}%</span>;
}

function TopPartiesSection({
  topSuppliers,
  topBuyers,
}: {
  topSuppliers: {
    supplierId: string;
    supplierName: string;
    totalSpend: number;
    poCount: number;
    fulfillmentRate?: number | null;
    priceTrend?: string;
    priceTrendPct?: number;
  }[];
  topBuyers: {
    buyerId: string;
    buyerName: string;
    totalRevenue: number;
    soCount: number;
    fulfillmentRate?: number | null;
    priceTrend?: string;
    priceTrendPct?: number;
  }[];
}) {
  if (topSuppliers.length === 0 && topBuyers.length === 0) return null;

  return (
    <div className="grid grid-cols-2 gap-4 mb-4">
      {/* Left — Top Suppliers */}
      <div className="border border-[#e5e7eb] rounded-lg bg-white p-4">
        <div className="text-sm font-semibold text-[#111827] mb-3">
          Top Suppliers
        </div>
        {topSuppliers.length > 0 && (
          <table className="w-full table-fixed">
            <colgroup>
              <col />
              <col className="w-24" />
              <col className="w-20" />
              <col className="w-24" />
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
                  <td className="py-2 text-sm text-[#111827] break-words text-left align-top">
                    {s.supplierName}
                  </td>
                  <td className="py-2 text-sm font-medium text-[#111827] text-right align-top">
                    {formatCrore(s.totalSpend)}
                  </td>
                  <td className="py-2 text-right align-top">
                    <FulfillmentCell rate={s.fulfillmentRate} />
                  </td>
                  <td className="py-2 text-right align-top">
                    <PriceTrendBadge trend={s.priceTrend} pct={s.priceTrendPct} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Right — Top Buyers */}
      <div className="border border-[#e5e7eb] rounded-lg bg-white p-4">
        <div className="text-sm font-semibold text-[#111827] mb-3">
          Top Buyers
        </div>
        {topBuyers.length > 0 && (
          <table className="w-full table-fixed">
            <colgroup>
              <col />
              <col className="w-24" />
              <col className="w-20" />
              <col className="w-24" />
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
                  <td className="py-2 text-sm text-[#111827] break-words text-left align-top">
                    {b.buyerName}
                  </td>
                  <td className="py-2 text-sm font-medium text-[#059669] text-right align-top">
                    {formatCrore(b.totalRevenue)}
                  </td>
                  <td className="py-2 text-right align-top">
                    <FulfillmentCell rate={b.fulfillmentRate} />
                  </td>
                  <td className="py-2 text-right align-top">
                    <PriceTrendBadge
                      trend={b.priceTrend}
                      pct={b.priceTrendPct}
                      flipColors
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
