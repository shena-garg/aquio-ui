"use client";

import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import {
  X,
  Sparkles,
  CheckCircle2,
  Clock,
  AlertTriangle,
  XCircle,
  ArrowRight,
  Loader2,
} from "lucide-react";
import { useAqira } from "@/contexts/AqiraContext";
import { useAuth } from "@/contexts/AuthContext";
import { aqiraService } from "@/services/aqira";
import { cn } from "@/lib/utils";
import type { PurchaseOrder } from "@/services/purchase-orders";

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
      const received = (totalAmt * pct) / 100;
      parts.push(`${fmtAmount(received)} of ${fmtAmount(totalAmt)} worth of goods ${orderType === "purchase" ? "received" : "shipped"} (${pct}%).`);
    } else if (pct === 100) {
      parts.push(`Full value of ${fmtAmount(totalAmt)} ${orderType === "purchase" ? "received" : "shipped"}.`);
    } else {
      parts.push(`Total order value: ${fmtAmount(totalAmt)}.`);
    }
  }

  return parts.join(" ");
}

// ─── order summary sub-components ────────────────────────────────────────────

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

function ProgressBar({ pct }: { pct: number }) {
  return (
    <div className="mt-1">
      <div className="flex items-center justify-between mb-1">
        <span className="text-[10px] text-[#6b7280]">Receipt progress</span>
        <span className="text-[10px] font-semibold text-[#111827]">{pct}%</span>
      </div>
      <div className="h-1.5 w-full rounded-full bg-[#f3f4f6]">
        <div
          className={cn(
            "h-1.5 rounded-full transition-all",
            pct === 100 ? "bg-emerald-500" : pct > 0 ? "bg-[#0d9488]" : "bg-[#e5e7eb]"
          )}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function LineItemRow({ product, receipts }: {
  product: NonNullable<PurchaseOrder["products"]>[number];
  receipts: PurchaseOrder["receipts"];
}) {
  const productId = product.product._id;
  const variantId = product.variant._id;
  const ordered = product.quantity.value;
  const received = (receipts ?? []).reduce((sum, r) => {
    const match = r.products.find((p) => p.productId === productId && p.variantId === variantId);
    return sum + (match?.deliveredQuantity ?? 0);
  }, 0);
  const done = received >= ordered;
  const name = product.metadata?.product?.name ?? "Product";
  const variant = product.metadata?.variant?.name;
  const uom = product.quantity.postfix;

  return (
    <div className="flex items-start justify-between gap-2 py-1.5 border-b border-[#f3f4f6] last:border-0">
      <div className="min-w-0">
        <p className="text-[12px] font-medium text-[#111827] truncate">{name}</p>
        {variant && <p className="text-[11px] text-[#6b7280] truncate">{variant}</p>}
      </div>
      <div className="flex-shrink-0 text-right">
        <span className={cn("text-[12px] font-medium", done ? "text-emerald-600" : "text-[#111827]")}>
          {received}/{ordered}
        </span>
        <span className="text-[11px] text-[#6b7280] ml-0.5">{uom}</span>
        {done && <CheckCircle2 size={10} className="inline ml-1 text-emerald-500" />}
      </div>
    </div>
  );
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
        <p className="text-[12px] text-[#0f766e] leading-relaxed">
          {buildSummary(order, orderType)}
        </p>
      </div>

      {order.status !== "draft" && order.status !== "cancelled" && (
        <ProgressBar pct={pct} />
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
                {fmtDate(order.deliveryDate)}
                {(order.delayDays ?? 0) > 0 && ` (${order.delayDays}d late)`}
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
          <div>
            {order.products!.map((p, i) => (
              <LineItemRow
                key={`${p.product._id}-${p.variant._id}-${i}`}
                product={p}
                receipts={order.receipts}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── draft input ──────────────────────────────────────────────────────────────

function DraftInput() {
  const router = useRouter();
  const { setPendingDraft, close } = useAqira();
  const [orderType, setOrderType] = useState<"purchase" | "sales">("purchase");
  const [prompt, setPrompt] = useState("");
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
      setError("Aqira couldn't process that request. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-[10px] font-semibold tracking-[0.7px] text-[#9ca3af] uppercase">Draft a new order</p>

      {/* Order type toggle */}
      <div className="flex rounded-lg border border-[#e5e7eb] overflow-hidden">
        <button
          onClick={() => setOrderType("purchase")}
          className={cn(
            "flex-1 py-1.5 text-[12px] font-medium transition-colors",
            orderType === "purchase"
              ? "bg-[#0d9488] text-white"
              : "bg-white text-[#6b7280] hover:bg-[#f3f4f6]"
          )}
        >
          Purchase Order
        </button>
        <button
          onClick={() => setOrderType("sales")}
          className={cn(
            "flex-1 py-1.5 text-[12px] font-medium transition-colors border-l border-[#e5e7eb]",
            orderType === "sales"
              ? "bg-[#0d9488] text-white"
              : "bg-white text-[#6b7280] hover:bg-[#f3f4f6]"
          )}
        >
          Sales Order
        </button>
      </div>

      {/* Text input */}
      <textarea
        value={prompt}
        onChange={(e) => { setPrompt(e.target.value); setError(""); }}
        onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleDraft(); }}
        placeholder={
          orderType === "purchase"
            ? "e.g. 300 Aquaguard filters from AquaTech, delivery by June 30, Net 30 payment"
            : "e.g. ship 200 units of Widget A to Acme Corp by May 20"
        }
        rows={3}
        disabled={loading}
        className="w-full resize-none rounded-lg border border-[#e5e7eb] px-3 py-2 text-[12px] text-[#111827] placeholder:text-[#9ca3af] outline-none focus:border-[#0d9488] transition-colors disabled:opacity-50"
      />

      {error && (
        <p className="text-[11px] text-red-600">{error}</p>
      )}

      <button
        onClick={handleDraft}
        disabled={loading || !prompt.trim()}
        className="flex items-center justify-center gap-1.5 rounded-lg bg-[#0d9488] px-4 py-2 text-[12px] font-semibold text-white transition-colors hover:bg-[#0f766e] disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? (
          <>
            <Loader2 size={13} className="animate-spin" />
            Drafting…
          </>
        ) : (
          <>
            <Sparkles size={13} />
            Draft Order
            <ArrowRight size={13} />
          </>
        )}
      </button>

      <p className="text-[10px] text-[#9ca3af] text-center">⌘↵ to submit</p>
    </div>
  );
}

// ─── home state ───────────────────────────────────────────────────────────────

function HomeState() {
  const { user } = useAuth();
  const firstName = user?.name?.split(" ")[0] ?? "there";

  return (
    <div className="flex flex-col gap-6 px-4 py-4">
      {/* Greeting */}
      <div className="flex flex-col items-center text-center gap-2 pt-2">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#f0fdfa]">
          <Sparkles className="h-5 w-5 text-[#0d9488]" strokeWidth={1.5} />
        </div>
        <div>
          <p className="text-[13px] font-semibold text-[#111827]">Hi {firstName}, I&apos;m Aqira</p>
          <p className="text-[11px] text-[#6b7280] mt-0.5">
            I summarize orders and draft new ones from plain text.
          </p>
        </div>
      </div>

      <div className="border-t border-[#f3f4f6]" />

      {/* Draft input */}
      <DraftInput />

      <div className="border-t border-[#f3f4f6]" />

      {/* Order summaries hint */}
      <div className="flex flex-col items-center text-center gap-1">
        <p className="text-[11px] font-medium text-[#6b7280]">Order summaries</p>
        <p className="text-[11px] text-[#9ca3af]">
          Open any purchase order or sales order to see an instant AI summary.
        </p>
      </div>
    </div>
  );
}

// ─── floating action button ───────────────────────────────────────────────────

function AqiraFAB() {
  const { isOpen, toggle } = useAqira();
  return (
    <button
      onClick={toggle}
      aria-label={isOpen ? "Close Aqira" : "Open Aqira"}
      className={cn(
        "fixed bottom-6 right-6 z-50 flex h-12 w-12 items-center justify-center rounded-full shadow-lg transition-all duration-200",
        "hover:scale-105 active:scale-95",
        isOpen
          ? "bg-[#0f766e] shadow-[#0d9488]/30 shadow-lg"
          : "bg-[#0d9488] shadow-[#0d9488]/25 shadow-lg hover:bg-[#0f766e]"
      )}
    >
      {isOpen ? (
        <X className="h-5 w-5 text-white" strokeWidth={2} />
      ) : (
        <Sparkles className="h-5 w-5 text-white" strokeWidth={1.75} />
      )}
    </button>
  );
}

// ─── main panel ──────────────────────────────────────────────────────────────

export function AqiraPanel() {
  const { isOpen, close } = useAqira();
  const pathname = usePathname();
  const qc = useQueryClient();

  const poMatch = pathname.match(/^\/purchase-orders\/([^/]+)$/);
  const soMatch = pathname.match(/^\/sales-orders\/([^/]+)$/);
  const orderId = poMatch?.[1] ?? soMatch?.[1] ?? null;
  const orderType: "purchase" | "sales" = soMatch ? "sales" : "purchase";
  const queryKey = orderId
    ? [soMatch ? "sales-order" : "purchase-order", orderId]
    : null;

  const order = queryKey ? (qc.getQueryData<PurchaseOrder>(queryKey) ?? null) : null;

  return (
    <>
      <AqiraFAB />

      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/30 lg:hidden"
          onClick={close}
        />
      )}

      <div
        className={cn(
          "fixed inset-y-0 right-0 z-50 flex flex-col bg-white border-l border-[#e5e7eb] shadow-xl transition-transform duration-300 ease-in-out",
          "w-full sm:w-[380px]",
          isOpen ? "translate-x-0" : "translate-x-full"
        )}
      >
        {/* Header */}
        <div className="flex h-[56px] flex-shrink-0 items-center justify-between border-b border-[#e5e7eb] px-4">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-[#0d9488]" strokeWidth={1.5} />
            <span className="text-[14px] font-semibold text-[#111827]">Aqira</span>
            <span className="rounded-full bg-[#f0fdfa] px-1.5 py-0.5 text-[10px] font-semibold text-[#0d9488]">BETA</span>
          </div>
          <button
            onClick={close}
            className="rounded p-1 text-[#6b7280] hover:bg-[#f3f4f6] hover:text-[#111827] transition-colors"
            aria-label="Close Aqira"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto">
          {orderId && order ? (
            <>
              <OrderSummary order={order} orderType={orderType} />
              <div className="border-t border-[#f3f4f6] mx-4" />
              <div className="px-4 py-4">
                <DraftInput />
              </div>
            </>
          ) : orderId && !order ? (
            <div className="flex flex-col items-center justify-center h-32 px-6 text-center">
              <p className="text-[12px] text-[#6b7280]">Loading order details…</p>
            </div>
          ) : (
            <HomeState />
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
