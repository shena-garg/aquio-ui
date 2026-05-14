"use client";

import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import {
  X,
  Sparkles,
  CheckCircle2,
  Clock,
  AlertTriangle,
  XCircle,
  ArrowRight,
  Loader2,
  RefreshCcw,
  Bell,
  Wallet,
  Copy,
  Check,
  Trash2,
  Plus,
  ChevronRight,
  ChevronLeft,
  Heart,
} from "lucide-react";
import { useAqira, type AqiraFormContext } from "@/contexts/AqiraContext";
import { useAuth } from "@/contexts/AuthContext";
import {
  aqiraService,
  type AskResult,
  type AqiraHomeData,
  type AqiraBudgetItem,
  type BudgetStatusResult,
} from "@/services/aqira";
import {
  computePriceSignal,
  priceInsightsService,
  type PriceInsightsLookup,
  type PriceSignal,
  type SupplierComparisonResult,
} from "@/services/price-insights";
import { cn } from "@/lib/utils";
import type { PurchaseOrder } from "@/services/purchase-orders";

// ─── section type ─────────────────────────────────────────────────────────────

type AqiraSection = "health" | "reminders" | "reorders" | "budgets" | "draft" | "ask";

const SECTION_LABELS: Record<AqiraSection, string> = {
  health: "Order Health",
  reminders: "Follow-up Needed",
  reorders: "Reorder Suggestions",
  budgets: "Supplier Budgets",
  draft: "Draft Order",
  ask: "Ask Aqira",
};

// ─── helpers ─────────────────────────────────────────────────────────────────

function toNumber(v: number | { $numberDecimal: string } | undefined): number {
  if (v == null) return 0;
  if (typeof v === "number") return v;
  return parseFloat(v.$numberDecimal) || 0;
}

function fmtAmount(value: number): string {
  if (value >= 10_000_000)
    return `₹${(value / 10_000_000).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Cr`;
  if (value >= 100_000)
    return `₹${(value / 100_000).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} L`;
  return `₹${value.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function fmtDate(iso: string | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function fmtPrice(n: number) {
  return `₹${n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function buildSummary(order: PurchaseOrder, orderType: "purchase" | "sales"): string {
  const party = orderType === "purchase" ? order.supplier?.name : order.buyer?.name;
  const partyLabel = orderType === "purchase" ? "from" : "to";
  const itemCount = order.products?.length ?? 0;
  const totalAmt = toNumber(order.totalAmount);
  const pct = order.receiptCompletionPercentage ?? 0;
  const delay = order.delayDays ?? 0;

  const statusDesc = (() => {
    if (order.status === "cancelled") return "cancelled";
    if (order.status === "draft") return "a draft awaiting confirmation";
    if (order.receiptStatus === "completed") return "fully received — all items delivered";
    if (order.receiptStatus === "force closed") return "force-closed before full receipt";
    if (order.receiptStatus === "partial") {
      if (delay > 0) return `partially received and ${delay} day${delay > 1 ? "s" : ""} overdue`;
      return "partially received — delivery in progress";
    }
    if (delay > 0) return `confirmed but ${delay} day${delay > 1 ? "s" : ""} overdue — no goods received yet`;
    return "confirmed and awaiting delivery";
  })();

  const parts: string[] = [];
  parts.push(
    `This ${orderType === "purchase" ? "purchase order" : "sales order"} for ${itemCount} line item${itemCount !== 1 ? "s" : ""}${party ? ` ${partyLabel} ${party}` : ""} is ${statusDesc}.`
  );
  if (order.status !== "draft" && order.status !== "cancelled" && totalAmt > 0) {
    if (pct > 0 && pct < 100) {
      parts.push(`${fmtAmount((totalAmt * pct) / 100)} of ${fmtAmount(totalAmt)} ${orderType === "purchase" ? "received" : "shipped"} (${pct}%).`);
    } else if (pct === 100) {
      parts.push(`Full value of ${fmtAmount(totalAmt)} ${orderType === "purchase" ? "received" : "shipped"}.`);
    } else {
      parts.push(`Total order value: ${fmtAmount(totalAmt)}.`);
    }
  }
  return parts.join(" ");
}

// ─── order summary ────────────────────────────────────────────────────────────

function StatusBadge({ order }: { order: PurchaseOrder }) {
  const delayed = (order.delayDays ?? 0) > 0;
  if (order.status === "cancelled")
    return <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2 py-0.5 text-[11px] font-medium text-red-600"><XCircle size={10} /> Cancelled</span>;
  if (order.receiptStatus === "completed")
    return <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-600"><CheckCircle2 size={10} /> Completed</span>;
  if (order.receiptStatus === "force closed")
    return <span className="inline-flex items-center gap-1 rounded-full bg-orange-50 px-2 py-0.5 text-[11px] font-medium text-orange-600"><XCircle size={10} /> Force Closed</span>;
  if (delayed)
    return <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2 py-0.5 text-[11px] font-medium text-red-600"><AlertTriangle size={10} /> Overdue {order.delayDays}d</span>;
  if (order.status === "draft")
    return <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-600"><Clock size={10} /> Draft</span>;
  return <span className="inline-flex items-center gap-1 rounded-full bg-teal-50 px-2 py-0.5 text-[11px] font-medium text-teal-600"><Clock size={10} /> Active</span>;
}

function OrderSummary({ order, orderType }: { order: PurchaseOrder; orderType: "purchase" | "sales" }) {
  const pct = order.receiptCompletionPercentage ?? 0;
  const party = orderType === "purchase" ? order.supplier : order.buyer;
  const deliveryLabel = orderType === "purchase" ? "Due Date" : "Ship Date";

  return (
    <div className="flex flex-col gap-4 px-4 py-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-[10px] font-semibold tracking-[0.7px] text-[#9ca3af] uppercase mb-0.5">
            {orderType === "purchase" ? "Purchase Order" : "Sales Order"}
          </p>
          <p className="text-[15px] font-semibold text-[#111827]">{order.poNumber}</p>
        </div>
        <StatusBadge order={order} />
      </div>
      <div className="rounded-lg bg-[#f0fdfa] border border-[#ccfbf1] px-3 py-2.5">
        <p className="text-[12px] text-[#0f766e] leading-relaxed">{buildSummary(order, orderType)}</p>
      </div>
      {order.status !== "draft" && order.status !== "cancelled" && (
        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] text-[#6b7280]">Receipt progress</span>
            <span className="text-[10px] font-semibold text-[#111827]">{pct}%</span>
          </div>
          <div className="h-1.5 w-full rounded-full bg-[#f3f4f6]">
            <div className={cn("h-1.5 rounded-full", pct === 100 ? "bg-emerald-500" : "bg-[#0d9488]")} style={{ width: `${pct}%` }} />
          </div>
        </div>
      )}
      <div>
        <p className="text-[10px] font-semibold tracking-[0.7px] text-[#9ca3af] uppercase mb-2">Key Details</p>
        <div className="flex flex-col gap-1.5">
          {party?.name && (
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-[#6b7280]">{orderType === "purchase" ? "Supplier" : "Buyer"}</span>
              <span className="text-[12px] font-medium text-[#111827] text-right max-w-[55%] truncate">{party.name}</span>
            </div>
          )}
          {order.deliveryDate && (
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-[#6b7280]">{deliveryLabel}</span>
              <span className={cn("text-[12px] font-medium", (order.delayDays ?? 0) > 0 ? "text-red-600" : "text-[#111827]")}>
                {fmtDate(order.deliveryDate)}{(order.delayDays ?? 0) > 0 && ` (${order.delayDays}d late)`}
              </span>
            </div>
          )}
          {order.paymentTerms && (
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-[#6b7280]">Payment Terms</span>
              <span className="text-[12px] font-medium text-[#111827]">{order.paymentTerms}</span>
            </div>
          )}
          {toNumber(order.totalAmount) > 0 && (
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-[#6b7280]">Order Value</span>
              <span className="text-[12px] font-semibold text-[#111827]">{fmtAmount(toNumber(order.totalAmount))}</span>
            </div>
          )}
        </div>
      </div>
      {(order.products?.length ?? 0) > 0 && (
        <div>
          <p className="text-[10px] font-semibold tracking-[0.7px] text-[#9ca3af] uppercase mb-1.5">
            Line Items ({order.products!.length})
          </p>
          {order.products!.map((p, i) => {
            const received = (order.receipts ?? []).reduce((s, r) => {
              const m = r.products.find((rp) => rp.productId === p.product._id && rp.variantId === p.variant._id);
              return s + (m?.deliveredQuantity ?? 0);
            }, 0);
            const done = received >= p.quantity.value;
            return (
              <div key={`${p.product._id}-${i}`} className="flex items-start justify-between gap-2 py-1.5 border-b border-[#f3f4f6] last:border-0">
                <div className="min-w-0">
                  <p className="text-[12px] font-medium text-[#111827] truncate">{p.metadata?.product?.name ?? "Product"}</p>
                  {p.metadata?.variant?.name && <p className="text-[11px] text-[#6b7280] truncate">{p.metadata.variant.name}</p>}
                </div>
                <div className="flex-shrink-0 text-right">
                  <span className={cn("text-[12px] font-medium", done ? "text-emerald-600" : "text-[#111827]")}>{received}/{p.quantity.value}</span>
                  <span className="text-[11px] text-[#6b7280] ml-0.5">{p.quantity.postfix}</span>
                  {done && <CheckCircle2 size={10} className="inline ml-1 text-emerald-500" />}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── ask answer bubble ────────────────────────────────────────────────────────

function AnswerBubble({ result }: { result: AskResult }) {
  return (
    <div className="rounded-lg border border-[#e5e7eb] bg-[#f9fafb] px-3 py-3">
      <div className="flex items-start gap-2 mb-2">
        <Sparkles size={13} className="text-[#0d9488] flex-shrink-0 mt-0.5" strokeWidth={1.75} />
        <p className="text-[12px] text-[#111827] leading-relaxed">{result.answer}</p>
      </div>
      {result.items && result.items.length > 0 && (
        <div className="mt-2 flex flex-col gap-1 pl-5">
          {result.items.map((item, i) => (
            <div key={i} className="flex items-center justify-between gap-2">
              <span className="text-[12px] text-[#374151] truncate">{item.label}</span>
              <div className="flex-shrink-0 text-right">
                <span className="text-[12px] font-semibold text-[#111827]">{item.value}</span>
                {item.sub && <span className="text-[11px] text-[#6b7280] ml-1.5">{item.sub}</span>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── price alerts ─────────────────────────────────────────────────────────────

function pctDiff(entered: number, avg: number) {
  return Math.round(((entered - avg) / avg) * 100);
}

interface AlertRowData {
  productName: string;
  enteredPrice: number;
  signal: PriceSignal;
  data: PriceInsightsLookup;
}

function AlertCard({ row }: { row: AlertRowData }) {
  const avg = row.data.rolling90d?.avgUnitPrice ?? 0;
  const last = row.data.lastFromPartner;
  const samples = row.data.rolling90d?.sampleCount ?? 0;

  if (row.signal === "above_avg") {
    const diff = pctDiff(row.enteredPrice, avg);
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5">
        <div className="flex items-start gap-1.5 mb-1">
          <AlertTriangle size={12} className="text-amber-500 flex-shrink-0 mt-0.5" />
          <p className="text-[12px] font-semibold text-amber-800 truncate">{row.productName}</p>
        </div>
        <p className="text-[12px] text-amber-700 leading-relaxed">
          {fmtPrice(row.enteredPrice)}/unit — <span className="font-semibold">+{diff}%</span> above your 90-day avg of {fmtPrice(avg)}.
        </p>
        {last && <p className="text-[11px] text-amber-600 mt-0.5">Last ordered at {fmtPrice(last.unitPrice)}/unit ({last.daysAgo}d ago)</p>}
        <p className="text-[10px] text-amber-500 mt-0.5">Based on {samples} order{samples !== 1 ? "s" : ""} · 90 days</p>
      </div>
    );
  }

  if (row.signal === "below_avg") {
    const diff = Math.abs(pctDiff(row.enteredPrice, avg));
    return (
      <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2.5">
        <div className="flex items-start gap-1.5 mb-1">
          <CheckCircle2 size={12} className="text-emerald-500 flex-shrink-0 mt-0.5" />
          <p className="text-[12px] font-semibold text-emerald-800 truncate">{row.productName}</p>
        </div>
        <p className="text-[12px] text-emerald-700 leading-relaxed">
          {fmtPrice(row.enteredPrice)}/unit — <span className="font-semibold">{diff}% below</span> your 90-day avg of {fmtPrice(avg)}. Good deal.
        </p>
        <p className="text-[10px] text-emerald-500 mt-0.5">Based on {samples} order{samples !== 1 ? "s" : ""} · 90 days</p>
      </div>
    );
  }

  if (row.signal === "matches_last" && last) {
    return (
      <div className="rounded-lg border border-[#e5e7eb] bg-[#f9fafb] px-3 py-2.5">
        <div className="flex items-start gap-1.5 mb-1">
          <CheckCircle2 size={12} className="text-[#0d9488] flex-shrink-0 mt-0.5" />
          <p className="text-[12px] font-semibold text-[#111827] truncate">{row.productName}</p>
        </div>
        <p className="text-[12px] text-[#374151]">{fmtPrice(row.enteredPrice)}/unit — matches your last order price.</p>
      </div>
    );
  }

  if (row.signal === "first_time_partner") {
    return (
      <div className="rounded-lg border border-blue-100 bg-blue-50 px-3 py-2.5">
        <div className="flex items-start gap-1.5 mb-1">
          <Sparkles size={12} className="text-blue-400 flex-shrink-0 mt-0.5" />
          <p className="text-[12px] font-semibold text-blue-800 truncate">{row.productName}</p>
        </div>
        <p className="text-[12px] text-blue-700">No previous orders with this supplier. Can&apos;t benchmark price.</p>
        {avg > 0 && <p className="text-[11px] text-blue-600 mt-0.5">Market avg (all suppliers): {fmtPrice(avg)}/unit</p>}
      </div>
    );
  }

  return null;
}

function PriceAlertsSection({ formContext }: { formContext: AqiraFormContext }) {
  const qc = useQueryClient();

  if (!formContext.partnerId) {
    return <p className="text-[12px] text-[#9ca3af] text-center py-2">Select a supplier to see price alerts.</p>;
  }

  const alertRows: AlertRowData[] = formContext.rows
    .filter((row) => row.enteredPrice > 0 && row.productId)
    .flatMap((row) => {
      const data = qc.getQueryData<PriceInsightsLookup>([
        "price-insights", row.productId, row.variantId ?? null, formContext.partnerId, formContext.orderType,
      ]);
      if (!data?.enabled || !data?.hasData) return [];
      const signal = computePriceSignal(row.enteredPrice, data);
      if (signal === "none") return [];
      return [{ productName: row.productName, enteredPrice: row.enteredPrice, signal, data }];
    });

  const rowsWithPrice = formContext.rows.filter((r) => r.enteredPrice > 0);

  if (rowsWithPrice.length === 0) {
    return <p className="text-[12px] text-[#9ca3af] text-center py-2">Enter a price to see insights.</p>;
  }

  if (alertRows.length === 0) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-emerald-100 bg-emerald-50 px-3 py-2.5">
        <CheckCircle2 size={14} className="text-emerald-500 flex-shrink-0" />
        <p className="text-[12px] text-emerald-700">All prices look fair based on your order history.</p>
      </div>
    );
  }

  return <div className="flex flex-col gap-2">{alertRows.map((row, i) => <AlertCard key={i} row={row} />)}</div>;
}

// ─── supplier comparison ──────────────────────────────────────────────────────

function SupplierComparisonCard({
  productId, variantId, productName, partnerId, orderType,
}: {
  productId: string; variantId: string | null; productName: string;
  partnerId: string | null; orderType: "purchase" | "sales";
}) {
  const { data, isLoading } = useQuery<SupplierComparisonResult>({
    queryKey: ["supplier-comparison", productId, variantId ?? null, orderType],
    queryFn: () => priceInsightsService.supplierComparison({ productId, variantId, orderType }).then((r) => r.data),
    staleTime: 5 * 60 * 1000,
  });

  if (isLoading) return <div className="h-14 rounded-lg bg-[#f3f4f6] animate-pulse" />;
  if (!data?.enabled || !data?.hasData) return null;

  const sorted = [...data.suppliers].sort((a, b) => a.lastUnitPrice - b.lastUnitPrice);
  const cheapest = sorted[0]?.lastUnitPrice;

  return (
    <div className="rounded-lg border border-[#e5e7eb] overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2 bg-[#f9fafb] border-b border-[#e5e7eb]">
        <p className="text-[12px] font-semibold text-[#111827] truncate">{productName}</p>
        {data.avgUnitPrice != null && <span className="text-[10px] text-[#6b7280] flex-shrink-0 ml-2">avg {fmtPrice(data.avgUnitPrice)}</span>}
      </div>
      <div className="flex flex-col divide-y divide-[#f3f4f6]">
        {sorted.map((s) => {
          const isSelected = !!partnerId && s.partnerId === partnerId;
          const isCheapest = s.lastUnitPrice === cheapest && sorted.length > 1;
          return (
            <div key={s.partnerId} className={cn("flex items-center justify-between px-3 py-2 gap-2", isSelected ? "bg-[#f0fdfa] border-l-[3px] border-l-[#0d9488]" : "bg-white border-l-[3px] border-l-transparent")}>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <p className={cn("text-[12px] truncate", isSelected ? "font-semibold text-[#0d9488]" : "text-[#374151]")}>{s.partnerName}</p>
                  {isCheapest && <span className="flex-shrink-0 rounded-full bg-emerald-100 px-1.5 py-0.5 text-[9px] font-semibold text-emerald-700">lowest</span>}
                </div>
                <p className="text-[10px] text-[#9ca3af]">{s.daysAgo}d ago · {s.lastOrderNumber}</p>
              </div>
              <span className={cn("text-[12px] font-semibold flex-shrink-0", isSelected ? "text-[#0d9488]" : "text-[#111827]")}>{fmtPrice(s.lastUnitPrice)}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function SupplierComparisonSection({ formContext }: { formContext: AqiraFormContext }) {
  const rowsWithProducts = formContext.rows.filter((r) => !!r.productId);
  if (rowsWithProducts.length === 0) {
    return <p className="text-[12px] text-[#9ca3af] text-center py-2">Select a product to compare supplier prices.</p>;
  }
  return (
    <div className="flex flex-col gap-2">
      {rowsWithProducts.map((row) => (
        <SupplierComparisonCard
          key={row.productId + (row.variantId ?? "")}
          productId={row.productId} variantId={row.variantId}
          productName={row.productName} partnerId={formContext.partnerId}
          orderType={formContext.orderType}
        />
      ))}
    </div>
  );
}

// ─── budget warning (form page) ───────────────────────────────────────────────

function BudgetWarningSection({ formContext }: { formContext: AqiraFormContext }) {
  const { data, isLoading } = useQuery<BudgetStatusResult>({
    queryKey: ["budget-status", formContext.partnerId, formContext.orderType],
    queryFn: () => aqiraService.getBudgetStatus(formContext.partnerId!, formContext.orderType).then((r) => r.data.data),
    enabled: !!formContext.partnerId,
    staleTime: 60 * 1000,
  });

  if (!formContext.partnerId || isLoading || !data?.hasBudget) return null;

  const { monthlyLimit, spent, pct, isOver, currency } = data;

  return (
    <div className={cn("rounded-lg border px-3 py-2.5", isOver ? "border-red-200 bg-red-50" : pct >= 80 ? "border-amber-200 bg-amber-50" : "border-[#e5e7eb] bg-[#f9fafb]")}>
      <div className="flex items-center gap-1.5 mb-1.5">
        <Wallet size={12} className={isOver ? "text-red-500" : pct >= 80 ? "text-amber-500" : "text-[#6b7280]"} />
        <p className={cn("text-[12px] font-semibold", isOver ? "text-red-800" : pct >= 80 ? "text-amber-800" : "text-[#374151]")}>
          {isOver ? "Monthly budget exceeded" : pct >= 80 ? "Approaching monthly budget" : "Monthly budget"}
        </p>
      </div>
      <div className="h-1.5 w-full rounded-full bg-white/70 mb-1.5">
        <div className={cn("h-1.5 rounded-full", isOver ? "bg-red-500" : pct >= 80 ? "bg-amber-500" : "bg-[#0d9488]")} style={{ width: `${Math.min(pct, 100)}%` }} />
      </div>
      <div className="flex items-center justify-between">
        <span className={cn("text-[11px]", isOver ? "text-red-700" : pct >= 80 ? "text-amber-700" : "text-[#6b7280]")}>
          {fmtAmount(spent)} spent of {fmtAmount(monthlyLimit!)} ({currency})
        </span>
        <span className={cn("text-[11px] font-semibold", isOver ? "text-red-700" : pct >= 80 ? "text-amber-700" : "text-[#0d9488]")}>{pct}%</span>
      </div>
    </div>
  );
}

// ─── health digest section ────────────────────────────────────────────────────

function HealthSection({ data }: { data: AqiraHomeData["healthDigest"] }) {
  const router = useRouter();
  const { close } = useAqira();

  const items = [
    { label: "Overdue", count: data.overdueCount, icon: <AlertTriangle size={13} />, color: data.overdueCount > 0 ? "text-red-600 bg-red-50" : "text-[#6b7280] bg-[#f3f4f6]", onClick: () => { close(); router.push("/purchase-orders?status=confirmed"); } },
    { label: "Drafts", count: data.draftCount, icon: <Clock size={13} />, color: data.draftCount > 0 ? "text-amber-600 bg-amber-50" : "text-[#6b7280] bg-[#f3f4f6]", onClick: () => { close(); router.push("/purchase-orders?status=draft"); } },
    { label: "Due this week", count: data.dueThisWeekCount, icon: <Bell size={13} />, color: data.dueThisWeekCount > 0 ? "text-blue-600 bg-blue-50" : "text-[#6b7280] bg-[#f3f4f6]", onClick: () => { close(); router.push("/purchase-orders"); } },
  ];

  return (
    <div className="grid grid-cols-3 gap-3">
      {items.map((item) => (
        <button key={item.label} onClick={item.onClick} className="flex flex-col items-center gap-1.5 rounded-lg border border-[#e5e7eb] p-3 hover:bg-[#f9fafb] transition-colors">
          <span className={cn("flex h-8 w-8 items-center justify-center rounded-full", item.color)}>{item.icon}</span>
          <span className="text-[18px] font-bold text-[#111827]">{item.count}</span>
          <span className="text-[10px] text-[#6b7280] text-center leading-tight">{item.label}</span>
        </button>
      ))}
    </div>
  );
}

// ─── follow-up section ────────────────────────────────────────────────────────

function FollowUpCard({ reminder }: { reminder: AqiraHomeData["followUpReminders"][0] }) {
  const router = useRouter();
  const { close } = useAqira();
  const [copied, setCopied] = useState(false);

  const message = `Hi, I wanted to follow up on Purchase Order ${reminder.poNumber} from ${fmtDate(reminder.deliveryDate)}. It was due ${reminder.daysOverdue} day${reminder.daysOverdue !== 1 ? "s" : ""} ago and we haven't received the goods yet. Could you please provide an update on the delivery status? Thank you.`;

  function handleCopy() {
    navigator.clipboard.writeText(message).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); });
  }

  return (
    <div className="rounded-lg border border-red-100 bg-red-50 px-3 py-2.5">
      <div className="flex items-start justify-between gap-2 mb-1">
        <div className="min-w-0">
          <p className="text-[12px] font-semibold text-red-800 truncate">{reminder.poNumber}</p>
          <p className="text-[11px] text-red-600 truncate">{reminder.supplierName}</p>
        </div>
        <span className="flex-shrink-0 rounded-full bg-red-100 px-1.5 py-0.5 text-[10px] font-semibold text-red-700">{reminder.daysOverdue}d overdue</span>
      </div>
      <p className="text-[11px] text-red-600 mb-2">Due: {fmtDate(reminder.deliveryDate)} · No goods received</p>
      <div className="flex gap-1.5">
        <button onClick={() => { close(); router.push(`/purchase-orders/${reminder.orderId}`); }} className="flex-1 flex items-center justify-center gap-1 rounded-md bg-white border border-red-200 px-2 py-1 text-[11px] font-medium text-red-700 hover:bg-red-100 transition-colors">
          <ArrowRight size={10} /> View PO
        </button>
        <button onClick={handleCopy} className="flex items-center justify-center gap-1 rounded-md bg-white border border-red-200 px-2 py-1 text-[11px] font-medium text-red-700 hover:bg-red-100 transition-colors">
          {copied ? <Check size={10} /> : <Copy size={10} />} {copied ? "Copied" : "Copy message"}
        </button>
      </div>
    </div>
  );
}

// ─── reorder section ──────────────────────────────────────────────────────────

function ReorderCard({ suggestion }: { suggestion: AqiraHomeData["reorderSuggestions"][0] }) {
  const { setPendingDraft, close } = useAqira();
  const router = useRouter();

  function handleDraftReorder() {
    setPendingDraft({
      orderType: "purchase",
      supplierId: suggestion.lastSupplierId || null,
      supplierName: suggestion.lastSupplierName || null,
      products: [{ productId: suggestion.productId, productName: suggestion.productName, variantId: null, variantName: "", quantity: suggestion.lastOrderedQty, price: null, uom: suggestion.lastUom, gst: 0 }],
      deliveryDate: null, paymentTerms: null, notes: null,
    });
    close();
    router.push("/purchase-orders/create");
  }

  return (
    <div className="rounded-lg border border-[#e5e7eb] bg-white px-3 py-2.5">
      <div className="flex items-start justify-between gap-2 mb-1">
        <p className="text-[12px] font-semibold text-[#111827] truncate flex-1">{suggestion.productName}</p>
        <span className="flex-shrink-0 rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700">{suggestion.daysOverdue}d overdue</span>
      </div>
      <p className="text-[11px] text-[#6b7280] mb-1">Avg every {suggestion.avgIntervalDays}d · Last: {suggestion.lastSupplierName}</p>
      <p className="text-[11px] text-[#9ca3af] mb-2">{suggestion.daysSinceLastOrder}d since last order</p>
      <button onClick={handleDraftReorder} className="w-full flex items-center justify-center gap-1.5 rounded-md bg-[#0d9488] px-3 py-1.5 text-[11px] font-semibold text-white hover:bg-[#0f766e] transition-colors">
        <RefreshCcw size={10} /> Draft Reorder
      </button>
    </div>
  );
}

// ─── budgets section ──────────────────────────────────────────────────────────

function BudgetsSection() {
  const qc = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);
  const [addId, setAddId] = useState("");
  const [addName, setAddName] = useState("");
  const [addLimit, setAddLimit] = useState("");
  const [addError, setAddError] = useState("");

  const { data: budgetsData, isLoading } = useQuery<AqiraBudgetItem[]>({
    queryKey: ["aqira-budgets"],
    queryFn: () => aqiraService.getBudgets().then((r) => r.data.data),
    staleTime: 60 * 1000,
  });

  const deleteMutation = useMutation({
    mutationFn: (entityId: string) => aqiraService.deleteBudget(entityId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["aqira-budgets"] }),
  });

  const addMutation = useMutation({
    mutationFn: () => aqiraService.setBudget(addId.trim(), addName.trim(), parseFloat(addLimit)),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["aqira-budgets"] }); setShowAdd(false); setAddId(""); setAddName(""); setAddLimit(""); setAddError(""); },
  });

  function handleAdd() {
    if (!addId.trim() || !addName.trim()) { setAddError("Partner ID and name are required."); return; }
    const limit = parseFloat(addLimit);
    if (isNaN(limit) || limit <= 0) { setAddError("Enter a valid monthly limit."); return; }
    setAddError("");
    addMutation.mutate();
  }

  const budgets = budgetsData ?? [];

  return (
    <div className="flex flex-col gap-2">
      {isLoading && <div className="h-12 rounded-lg bg-[#f3f4f6] animate-pulse" />}
      {!isLoading && budgets.length === 0 && !showAdd && (
        <p className="text-[12px] text-[#9ca3af] text-center py-2">No supplier budgets set yet.</p>
      )}
      {budgets.map((b) => (
        <div key={b.entityId} className="rounded-lg border border-[#e5e7eb] px-3 py-2.5">
          <div className="flex items-center justify-between gap-2 mb-1.5">
            <p className={cn("text-[12px] font-semibold truncate", b.isOver ? "text-red-700" : "text-[#111827]")}>{b.entityName}</p>
            <div className="flex items-center gap-1.5 flex-shrink-0">
              {b.isOver && <span className="rounded-full bg-red-100 px-1.5 py-0.5 text-[10px] font-semibold text-red-700">Over</span>}
              <button onClick={() => deleteMutation.mutate(b.entityId)} disabled={deleteMutation.isPending} className="text-[#9ca3af] hover:text-red-500 transition-colors disabled:opacity-50"><Trash2 size={12} /></button>
            </div>
          </div>
          <div className="h-1.5 w-full rounded-full bg-[#f3f4f6] mb-1.5">
            <div className={cn("h-1.5 rounded-full", b.isOver ? "bg-red-500" : b.pct >= 80 ? "bg-amber-500" : "bg-[#0d9488]")} style={{ width: `${Math.min(b.pct, 100)}%` }} />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-[#6b7280]">{fmtAmount(b.spent)} / {fmtAmount(b.monthlyLimit)}</span>
            <span className={cn("text-[11px] font-semibold", b.isOver ? "text-red-600" : b.pct >= 80 ? "text-amber-600" : "text-[#0d9488]")}>{b.pct}%</span>
          </div>
        </div>
      ))}
      {showAdd ? (
        <div className="rounded-lg border border-[#e5e7eb] px-3 py-3 flex flex-col gap-2">
          <p className="text-[11px] font-semibold text-[#374151]">Add supplier budget</p>
          <input value={addId} onChange={(e) => setAddId(e.target.value)} placeholder="Supplier ID (MongoDB _id)" className="rounded border border-[#e5e7eb] px-2 py-1.5 text-[12px] text-[#111827] placeholder:text-[#9ca3af] outline-none focus:border-[#0d9488]" />
          <input value={addName} onChange={(e) => setAddName(e.target.value)} placeholder="Supplier name" className="rounded border border-[#e5e7eb] px-2 py-1.5 text-[12px] text-[#111827] placeholder:text-[#9ca3af] outline-none focus:border-[#0d9488]" />
          <input value={addLimit} onChange={(e) => setAddLimit(e.target.value)} placeholder="Monthly limit (₹)" type="number" min="1" className="rounded border border-[#e5e7eb] px-2 py-1.5 text-[12px] text-[#111827] placeholder:text-[#9ca3af] outline-none focus:border-[#0d9488]" />
          {addError && <p className="text-[11px] text-red-600">{addError}</p>}
          <div className="flex gap-2">
            <button onClick={handleAdd} disabled={addMutation.isPending} className="flex-1 rounded-md bg-[#0d9488] py-1.5 text-[11px] font-semibold text-white hover:bg-[#0f766e] disabled:opacity-50">{addMutation.isPending ? "Saving…" : "Save Budget"}</button>
            <button onClick={() => { setShowAdd(false); setAddError(""); }} className="rounded-md border border-[#e5e7eb] px-3 py-1.5 text-[11px] text-[#6b7280] hover:bg-[#f3f4f6]">Cancel</button>
          </div>
        </div>
      ) : (
        <button onClick={() => setShowAdd(true)} className="flex items-center justify-center gap-1.5 rounded-lg border border-dashed border-[#d1d5db] py-2 text-[12px] text-[#6b7280] hover:border-[#0d9488] hover:text-[#0d9488] transition-colors">
          <Plus size={12} /> Add supplier budget
        </button>
      )}
    </div>
  );
}

// ─── ask input ────────────────────────────────────────────────────────────────

const SUGGESTIONS = [
  "Total spend this month",
  "Top 5 suppliers",
  "Overdue orders",
  "Top products this quarter",
  "Orders by status",
];

function AskInput({ result, onResult }: { result: AskResult | null; onResult: (r: AskResult | null) => void }) {
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function submit(q: string) {
    const trimmed = q.trim();
    if (!trimmed) return;
    setLoading(true);
    setError("");
    onResult(null);
    try {
      const res = await aqiraService.ask(trimmed);
      onResult(res.data.data);
    } catch {
      setError("Couldn't get an answer. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      {!result && (
        <div className="flex flex-wrap gap-1.5">
          {SUGGESTIONS.map((s) => (
            <button key={s} onClick={() => { setQuestion(s); submit(s); }} disabled={loading} className="rounded-full border border-[#e5e7eb] bg-white px-2.5 py-1 text-[11px] text-[#374151] hover:bg-[#f0fdfa] hover:border-[#0d9488] hover:text-[#0d9488] transition-colors disabled:opacity-50">{s}</button>
          ))}
        </div>
      )}
      <div className="flex gap-2">
        <input value={question} onChange={(e) => { setQuestion(e.target.value); setError(""); }} onKeyDown={(e) => { if (e.key === "Enter") submit(question); }} placeholder="Ask anything about your orders…" disabled={loading} className="flex-1 rounded-lg border border-[#e5e7eb] px-3 py-2 text-[12px] text-[#111827] placeholder:text-[#9ca3af] outline-none focus:border-[#0d9488] transition-colors disabled:opacity-50" />
        <button onClick={() => submit(question)} disabled={loading || !question.trim()} className="flex-shrink-0 flex items-center justify-center rounded-lg bg-[#0d9488] px-3 py-2 text-white hover:bg-[#0f766e] disabled:opacity-40 disabled:cursor-not-allowed">
          {loading ? <Loader2 size={14} className="animate-spin" /> : <ArrowRight size={14} />}
        </button>
      </div>
      {error && <p className="text-[11px] text-red-600">{error}</p>}
      {result && <AnswerBubble result={result} />}
      {result && <button onClick={() => { onResult(null); setQuestion(""); }} className="text-[11px] text-[#9ca3af] hover:text-[#6b7280] text-center transition-colors">Ask another question</button>}
    </div>
  );
}

// ─── draft input ──────────────────────────────────────────────────────────────

function DraftInput({
  prompt, setPrompt, orderType, setOrderType,
}: {
  prompt: string; setPrompt: (v: string) => void;
  orderType: "purchase" | "sales"; setOrderType: (v: "purchase" | "sales") => void;
}) {
  const router = useRouter();
  const { setPendingDraft, close } = useAqira();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleDraft() {
    if (!prompt.trim()) return;
    setLoading(true);
    setError("");
    try {
      const res = await aqiraService.draftOrder({ prompt: prompt.trim(), orderType });
      setPendingDraft({ ...res.data.data, orderType });
      close();
      router.push(orderType === "purchase" ? "/purchase-orders/create" : "/sales-orders/create");
    } catch {
      setError("Aqira couldn't process that. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex rounded-lg border border-[#e5e7eb] overflow-hidden">
        {(["purchase", "sales"] as const).map((t, i) => (
          <button key={t} onClick={() => setOrderType(t)} className={cn("flex-1 py-1.5 text-[12px] font-medium transition-colors", i > 0 && "border-l border-[#e5e7eb]", orderType === t ? "bg-[#0d9488] text-white" : "bg-white text-[#6b7280] hover:bg-[#f3f4f6]")}>
            {t === "purchase" ? "Purchase Order" : "Sales Order"}
          </button>
        ))}
      </div>
      <textarea value={prompt} onChange={(e) => { setPrompt(e.target.value); setError(""); }} onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleDraft(); }} placeholder={orderType === "purchase" ? "e.g. 300 filters from AquaTech, delivery by June 30, Net 30" : "e.g. ship 200 units of Widget A to Acme Corp by May 20"} rows={3} disabled={loading} className="w-full resize-none rounded-lg border border-[#e5e7eb] px-3 py-2 text-[12px] text-[#111827] placeholder:text-[#9ca3af] outline-none focus:border-[#0d9488] transition-colors disabled:opacity-50" />
      {error && <p className="text-[11px] text-red-600">{error}</p>}
      <button onClick={handleDraft} disabled={loading || !prompt.trim()} className="flex items-center justify-center gap-1.5 rounded-lg bg-[#0d9488] px-4 py-2 text-[12px] font-semibold text-white hover:bg-[#0f766e] disabled:opacity-50 disabled:cursor-not-allowed">
        {loading ? <><Loader2 size={13} className="animate-spin" /> Drafting…</> : <><Sparkles size={13} /> Draft Order <ArrowRight size={13} /></>}
      </button>
      <p className="text-[10px] text-[#9ca3af] text-center">⌘↵ to submit</p>
    </div>
  );
}

// ─── floating action button ───────────────────────────────────────────────────

function AqiraFAB() {
  const { isOpen, toggle } = useAqira();
  return (
    <button onClick={toggle} aria-label={isOpen ? "Close Aqira" : "Open Aqira"} className={cn("fixed bottom-6 right-6 z-50 flex h-12 w-12 items-center justify-center rounded-full shadow-lg transition-all duration-200 hover:scale-105 active:scale-95 lg:hidden", isOpen ? "bg-[#0f766e]" : "bg-[#0d9488] hover:bg-[#0f766e]")}>
      {isOpen ? <X className="h-5 w-5 text-white" strokeWidth={2} /> : <Sparkles className="h-5 w-5 text-white" strokeWidth={1.75} />}
    </button>
  );
}

// ─── section back header ──────────────────────────────────────────────────────

function SectionBackHeader({ section, onBack }: { section: AqiraSection; onBack: () => void }) {
  return (
    <div className="flex items-center gap-2 px-4 py-3 border-b border-[#f3f4f6]">
      <button onClick={onBack} className="flex items-center gap-1 text-[12px] text-[#0d9488] hover:text-[#0f766e] font-medium transition-colors">
        <ChevronLeft size={14} /> Back
      </button>
      <span className="text-[#d1d5db] text-[12px]">·</span>
      <p className="text-[13px] font-semibold text-[#111827]">{SECTION_LABELS[section]}</p>
    </div>
  );
}

// ─── home menu ────────────────────────────────────────────────────────────────

interface MenuItemProps {
  icon: React.ReactNode;
  iconBg: string;
  label: string;
  sublabel?: string;
  sublabelColor?: string;
  onClick: () => void;
}

function MenuItem({ icon, iconBg, label, sublabel, sublabelColor, onClick }: MenuItemProps) {
  return (
    <button onClick={onClick} className="flex items-center gap-3 px-4 py-3.5 hover:bg-[#f9fafb] transition-colors border-b border-[#f3f4f6] last:border-0 w-full text-left">
      <span className={cn("flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg", iconBg)}>
        {icon}
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-medium text-[#111827]">{label}</p>
        {sublabel && <p className={cn("text-[11px] mt-0.5", sublabelColor ?? "text-[#9ca3af]")}>{sublabel}</p>}
      </div>
      <ChevronRight size={14} className="flex-shrink-0 text-[#d1d5db]" />
    </button>
  );
}

function HomeMenu({
  homeData, homeLoading, firstName, onSelect,
}: {
  homeData: AqiraHomeData | undefined;
  homeLoading: boolean;
  firstName: string;
  onSelect: (s: AqiraSection) => void;
}) {
  const overdueCount = homeData?.healthDigest.overdueCount ?? 0;
  const draftCount = homeData?.healthDigest.draftCount ?? 0;
  const remindersCount = homeData?.followUpReminders.length ?? 0;
  const reordersCount = homeData?.reorderSuggestions.length ?? 0;

  function healthSublabel() {
    if (homeLoading) return "Loading…";
    if (overdueCount > 0) return `${overdueCount} overdue · ${draftCount} draft`;
    if (draftCount > 0) return `${draftCount} draft`;
    return "All clear";
  }

  function countSublabel(count: number, singular: string, plural: string) {
    if (homeLoading) return "Loading…";
    if (count === 0) return "All clear";
    return `${count} ${count === 1 ? singular : plural}`;
  }

  return (
    <div className="flex flex-col">
      {/* Greeting */}
      <div className="flex items-center gap-2.5 px-4 py-4">
        <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-[#f0fdfa]">
          <Sparkles className="h-4 w-4 text-[#0d9488]" strokeWidth={1.5} />
        </div>
        <div>
          <p className="text-[13px] font-semibold text-[#111827]">Hi {firstName}</p>
          <p className="text-[11px] text-[#6b7280]">What would you like to do?</p>
        </div>
      </div>

      <div className="border-t border-[#f3f4f6]" />

      {/* Menu items */}
      <div className="flex flex-col">
        <MenuItem
          icon={<Heart size={15} className={overdueCount > 0 ? "text-red-500" : "text-[#0d9488]"} />}
          iconBg={overdueCount > 0 ? "bg-red-50" : "bg-[#f0fdfa]"}
          label="Order Health"
          sublabel={healthSublabel()}
          sublabelColor={overdueCount > 0 ? "text-red-500" : undefined}
          onClick={() => onSelect("health")}
        />
        <MenuItem
          icon={<Bell size={15} className={remindersCount > 0 ? "text-red-500" : "text-[#6b7280]"} />}
          iconBg={remindersCount > 0 ? "bg-red-50" : "bg-[#f3f4f6]"}
          label="Follow-up Needed"
          sublabel={countSublabel(remindersCount, "reminder", "reminders")}
          sublabelColor={remindersCount > 0 ? "text-red-500" : undefined}
          onClick={() => onSelect("reminders")}
        />
        <MenuItem
          icon={<RefreshCcw size={15} className={reordersCount > 0 ? "text-amber-500" : "text-[#6b7280]"} />}
          iconBg={reordersCount > 0 ? "bg-amber-50" : "bg-[#f3f4f6]"}
          label="Reorder Suggestions"
          sublabel={countSublabel(reordersCount, "product", "products")}
          sublabelColor={reordersCount > 0 ? "text-amber-600" : undefined}
          onClick={() => onSelect("reorders")}
        />
        <MenuItem
          icon={<Wallet size={15} className="text-[#6b7280]" />}
          iconBg="bg-[#f3f4f6]"
          label="Supplier Budgets"
          onClick={() => onSelect("budgets")}
        />
        <MenuItem
          icon={<Sparkles size={15} className="text-[#0d9488]" />}
          iconBg="bg-[#f0fdfa]"
          label="Draft Order"
          sublabel="Create an order from text"
          onClick={() => onSelect("draft")}
        />
        <MenuItem
          icon={<ArrowRight size={15} className="text-[#0d9488]" />}
          iconBg="bg-[#f0fdfa]"
          label="Ask Aqira"
          sublabel="Spend, top suppliers, overdue…"
          onClick={() => onSelect("ask")}
        />
      </div>
    </div>
  );
}

// ─── main panel ──────────────────────────────────────────────────────────────

export function AqiraPanel() {
  const { isOpen, close, formContext } = useAqira();
  const { user } = useAuth();
  const pathname = usePathname();
  const qc = useQueryClient();

  // persistent state across section navigation
  const [activeSection, setActiveSection] = useState<AqiraSection | null>(null);
  const [askResult, setAskResult] = useState<AskResult | null>(null);
  const [draftPrompt, setDraftPrompt] = useState("");
  const [draftOrderType, setDraftOrderType] = useState<"purchase" | "sales">("purchase");

  const poMatch = pathname.match(/^\/purchase-orders\/([^/]+)$/);
  const soMatch = pathname.match(/^\/sales-orders\/([^/]+)$/);
  const orderId = poMatch?.[1] ?? soMatch?.[1] ?? null;
  const orderType: "purchase" | "sales" = soMatch ? "sales" : "purchase";
  const queryKey = orderId ? [soMatch ? "sales-order" : "purchase-order", orderId] : null;
  const order = queryKey ? (qc.getQueryData<PurchaseOrder>(queryKey) ?? null) : null;

  const isFormPage =
    pathname === "/purchase-orders/create" ||
    pathname === "/sales-orders/create" ||
    /^\/purchase-orders\/[^/]+\/edit$/.test(pathname) ||
    /^\/sales-orders\/[^/]+\/edit$/.test(pathname);

  const isHomePage = !isFormPage && !(orderId && order);

  const { data: homeData, isLoading: homeLoading } = useQuery<AqiraHomeData>({
    queryKey: ["aqira-home"],
    queryFn: () => aqiraService.homeData().then((r) => r.data.data),
    staleTime: 2 * 60 * 1000,
    enabled: isHomePage && isOpen,
  });

  const firstName = user?.name?.split(" ")[0] ?? "there";

  function handleClose() {
    close();
    setActiveSection(null);
  }

  function renderHomeBody() {
    if (!activeSection) {
      return (
        <HomeMenu
          homeData={homeData}
          homeLoading={homeLoading}
          firstName={firstName}
          onSelect={setActiveSection}
        />
      );
    }

    return (
      <div className="flex flex-col">
        <SectionBackHeader section={activeSection} onBack={() => setActiveSection(null)} />
        <div className="px-4 py-4 flex flex-col gap-4">
          {activeSection === "health" && homeData && <HealthSection data={homeData.healthDigest} />}
          {activeSection === "health" && !homeData && homeLoading && <div className="h-24 rounded-lg bg-[#f3f4f6] animate-pulse" />}
          {activeSection === "reminders" && (
            homeLoading ? <div className="h-24 rounded-lg bg-[#f3f4f6] animate-pulse" /> :
            (homeData?.followUpReminders.length ?? 0) === 0 ? (
              <div className="flex items-center gap-2 rounded-lg border border-emerald-100 bg-emerald-50 px-3 py-3">
                <CheckCircle2 size={14} className="text-emerald-500 flex-shrink-0" />
                <p className="text-[12px] text-emerald-700">No follow-ups needed — all confirmed orders are on track.</p>
              </div>
            ) : homeData!.followUpReminders.map((r) => <FollowUpCard key={r.orderId} reminder={r} />)
          )}
          {activeSection === "reorders" && (
            homeLoading ? <div className="h-24 rounded-lg bg-[#f3f4f6] animate-pulse" /> :
            (homeData?.reorderSuggestions.length ?? 0) === 0 ? (
              <div className="flex items-center gap-2 rounded-lg border border-emerald-100 bg-emerald-50 px-3 py-3">
                <CheckCircle2 size={14} className="text-emerald-500 flex-shrink-0" />
                <p className="text-[12px] text-emerald-700">No reorder suggestions right now.</p>
              </div>
            ) : homeData!.reorderSuggestions.map((s) => <ReorderCard key={s.productId} suggestion={s} />)
          )}
          {activeSection === "budgets" && <BudgetsSection />}
          {activeSection === "draft" && (
            <DraftInput
              prompt={draftPrompt} setPrompt={setDraftPrompt}
              orderType={draftOrderType} setOrderType={setDraftOrderType}
            />
          )}
          {activeSection === "ask" && <AskInput result={askResult} onResult={setAskResult} />}
        </div>
      </div>
    );
  }

  return (
    <>
      <AqiraFAB />

      {isOpen && (
        <div className="fixed inset-0 z-40 bg-black/30 lg:hidden" onClick={handleClose} />
      )}

      <div className={cn("fixed inset-y-0 right-0 z-50 flex flex-col bg-white border-l border-[#e5e7eb] shadow-xl transition-transform duration-300 ease-in-out", "w-full sm:w-[380px]", isOpen ? "translate-x-0" : "translate-x-full")}>
        {/* Header */}
        <div className="flex h-[56px] flex-shrink-0 items-center justify-between border-b border-[#e5e7eb] px-4">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-[#0d9488]" strokeWidth={1.5} />
            <span className="text-[14px] font-semibold text-[#111827]">Aqira</span>
            <span className="rounded-full bg-[#f0fdfa] px-1.5 py-0.5 text-[10px] font-semibold text-[#0d9488]">BETA</span>
          </div>
          <button onClick={handleClose} className="rounded p-1 text-[#6b7280] hover:bg-[#f3f4f6] hover:text-[#111827] transition-colors" aria-label="Close Aqira">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto">
          {isFormPage ? (
            /* ── Form page view ── */
            <div className="flex flex-col gap-4 px-4 py-4">
              <p className="text-[10px] font-semibold tracking-[0.7px] text-[#9ca3af] uppercase">Price Alerts</p>
              {formContext ? <PriceAlertsSection formContext={formContext} /> : <p className="text-[12px] text-[#9ca3af] text-center py-2">Add products to get started.</p>}
              <div className="border-t border-[#f3f4f6]" />
              <p className="text-[10px] font-semibold tracking-[0.7px] text-[#9ca3af] uppercase">Supplier Comparison</p>
              {formContext ? <SupplierComparisonSection formContext={formContext} /> : <p className="text-[12px] text-[#9ca3af] text-center py-2">Add products to compare.</p>}
              {formContext?.partnerId && (
                <>
                  <div className="border-t border-[#f3f4f6]" />
                  <p className="text-[10px] font-semibold tracking-[0.7px] text-[#9ca3af] uppercase">Budget Status</p>
                  <BudgetWarningSection formContext={formContext} />
                </>
              )}
              <div className="border-t border-[#f3f4f6]" />
              <AskInput result={askResult} onResult={setAskResult} />
            </div>
          ) : orderId && order ? (
            /* ── Order detail view ── */
            <div className="flex flex-col gap-0">
              <OrderSummary order={order} orderType={orderType} />
              <div className="border-t border-[#f3f4f6]" />
              <div className="px-4 py-4 flex flex-col gap-4">
                <div className="flex rounded-lg border border-[#e5e7eb] overflow-hidden">
                  {(["draft", "ask"] as const).map((m, i) => (
                    <button key={m} onClick={() => setActiveSection(m === activeSection ? null : m)} className={cn("flex-1 py-1.5 text-[12px] font-medium transition-colors", i > 0 && "border-l border-[#e5e7eb]", activeSection === m ? "bg-[#0d9488] text-white" : "bg-white text-[#6b7280] hover:bg-[#f3f4f6]")}>
                      {m === "draft" ? "Draft Order" : "Ask Aqira"}
                    </button>
                  ))}
                </div>
                {activeSection === "draft" && <DraftInput prompt={draftPrompt} setPrompt={setDraftPrompt} orderType={draftOrderType} setOrderType={setDraftOrderType} />}
                {activeSection === "ask" && <AskInput result={askResult} onResult={setAskResult} />}
                {!activeSection && <p className="text-[11px] text-[#9ca3af] text-center">Select an option above.</p>}
              </div>
            </div>
          ) : (
            /* ── Home view ── */
            renderHomeBody()
          )}
        </div>

        {/* Footer */}
        <div className="flex-shrink-0 border-t border-[#f3f4f6] px-4 py-2.5 flex items-center justify-center">
          <span className="text-[10px] text-[#d1d5db]">Powered by Aqira AI · Aquio</span>
        </div>
      </div>
    </>
  );
}
