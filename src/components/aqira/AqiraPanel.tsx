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
import { useAqira, type AqiraFormContext } from "@/contexts/AqiraContext";
import { useAuth } from "@/contexts/AuthContext";
import { aqiraService, type AskResult } from "@/services/aqira";
import { computePriceSignal, type PriceInsightsLookup, type PriceSignal } from "@/services/price-insights";
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

function fmtPrice(n: number) {
  return `₹${n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

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
          {fmtPrice(row.enteredPrice)}/unit entered — <span className="font-semibold">+{diff}%</span> above your 90-day avg of {fmtPrice(avg)}.
        </p>
        {last && (
          <p className="text-[11px] text-amber-600 mt-0.5">
            Last ordered at {fmtPrice(last.unitPrice)}/unit ({last.daysAgo}d ago)
          </p>
        )}
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
          {fmtPrice(row.enteredPrice)}/unit — <span className="font-semibold">{diff}% below</span> your 90-day avg of {fmtPrice(avg)}. Looks like a good deal.
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
        <p className="text-[12px] text-[#374151]">
          {fmtPrice(row.enteredPrice)}/unit — matches your last order price.
        </p>
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
        <p className="text-[12px] text-blue-700">
          No previous orders of this product with this supplier. Can&apos;t benchmark price.
        </p>
        {avg > 0 && (
          <p className="text-[11px] text-blue-600 mt-0.5">Market avg (all suppliers): {fmtPrice(avg)}/unit</p>
        )}
      </div>
    );
  }

  return null;
}

function PriceAlertsSection({ formContext }: { formContext: AqiraFormContext }) {
  const qc = useQueryClient();

  const alertRows: AlertRowData[] = formContext.rows
    .filter((row) => row.enteredPrice > 0 && row.productId)
    .flatMap((row) => {
      const data = qc.getQueryData<PriceInsightsLookup>([
        "price-insights",
        row.productId,
        row.variantId ?? null,
        formContext.partnerId,
        formContext.orderType,
      ]);
      if (!data?.enabled || !data?.hasData) return [];
      const signal = computePriceSignal(row.enteredPrice, data);
      if (signal === "none") return [];
      return [{ productName: row.productName, enteredPrice: row.enteredPrice, signal, data }];
    });

  const rowsWithPrice = formContext.rows.filter((r) => r.enteredPrice > 0);

  if (rowsWithPrice.length === 0) {
    return (
      <p className="text-[12px] text-[#9ca3af] text-center py-2">
        Enter a price for a product to see price insights.
      </p>
    );
  }

  if (alertRows.length === 0) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-emerald-100 bg-emerald-50 px-3 py-2.5">
        <CheckCircle2 size={14} className="text-emerald-500 flex-shrink-0" />
        <p className="text-[12px] text-emerald-700">All prices look fair based on your order history.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {alertRows.map((row, i) => <AlertCard key={i} row={row} />)}
    </div>
  );
}

// ─── mode tabs ────────────────────────────────────────────────────────────────

function ModeTabs({ mode, onChange }: { mode: "draft" | "ask"; onChange: (m: "draft" | "ask") => void }) {
  return (
    <div className="flex rounded-lg border border-[#e5e7eb] overflow-hidden">
      {(["draft", "ask"] as const).map((m) => (
        <button
          key={m}
          onClick={() => onChange(m)}
          className={cn(
            "flex-1 py-1.5 text-[12px] font-medium transition-colors",
            m === "ask" && "border-l border-[#e5e7eb]",
            mode === m ? "bg-[#0d9488] text-white" : "bg-white text-[#6b7280] hover:bg-[#f3f4f6]"
          )}
        >
          {m === "draft" ? "Draft Order" : "Ask Aqira"}
        </button>
      ))}
    </div>
  );
}

// ─── draft input ──────────────────────────────────────────────────────────────

const SUGGESTIONS = [
  "Total spend this month",
  "Top 5 suppliers",
  "Overdue orders",
  "Top products this quarter",
  "Orders by status",
];

function AskInput({
  result,
  onResult,
}: {
  result: AskResult | null;
  onResult: (r: AskResult | null) => void;
}) {
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
      {/* Suggestion chips */}
      {!result && (
        <div className="flex flex-wrap gap-1.5">
          {SUGGESTIONS.map((s) => (
            <button
              key={s}
              onClick={() => { setQuestion(s); submit(s); }}
              disabled={loading}
              className="rounded-full border border-[#e5e7eb] bg-white px-2.5 py-1 text-[11px] text-[#374151] hover:bg-[#f0fdfa] hover:border-[#0d9488] hover:text-[#0d9488] transition-colors disabled:opacity-50"
            >
              {s}
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <div className="flex gap-2">
        <input
          value={question}
          onChange={(e) => { setQuestion(e.target.value); setError(""); }}
          onKeyDown={(e) => { if (e.key === "Enter") submit(question); }}
          placeholder="Ask anything about your orders…"
          disabled={loading}
          className="flex-1 rounded-lg border border-[#e5e7eb] px-3 py-2 text-[12px] text-[#111827] placeholder:text-[#9ca3af] outline-none focus:border-[#0d9488] transition-colors disabled:opacity-50"
        />
        <button
          onClick={() => submit(question)}
          disabled={loading || !question.trim()}
          className="flex-shrink-0 flex items-center justify-center rounded-lg bg-[#0d9488] px-3 py-2 text-white transition-colors hover:bg-[#0f766e] disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {loading ? <Loader2 size={14} className="animate-spin" /> : <ArrowRight size={14} />}
        </button>
      </div>

      {error && <p className="text-[11px] text-red-600">{error}</p>}

      {/* Answer */}
      {result && <AnswerBubble result={result} />}
      {result && (
        <button onClick={() => { onResult(null); setQuestion(""); }} className="text-[11px] text-[#9ca3af] hover:text-[#6b7280] text-center transition-colors">
          Ask another question
        </button>
      )}
    </div>
  );
}

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
      setError("Aqira couldn't process that. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex rounded-lg border border-[#e5e7eb] overflow-hidden">
        {(["purchase", "sales"] as const).map((t, i) => (
          <button
            key={t}
            onClick={() => setOrderType(t)}
            className={cn(
              "flex-1 py-1.5 text-[12px] font-medium transition-colors",
              i > 0 && "border-l border-[#e5e7eb]",
              orderType === t ? "bg-[#0d9488] text-white" : "bg-white text-[#6b7280] hover:bg-[#f3f4f6]"
            )}
          >
            {t === "purchase" ? "Purchase Order" : "Sales Order"}
          </button>
        ))}
      </div>
      <textarea
        value={prompt}
        onChange={(e) => { setPrompt(e.target.value); setError(""); }}
        onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleDraft(); }}
        placeholder={
          orderType === "purchase"
            ? "e.g. 300 Aquaguard filters from AquaTech, delivery by June 30, Net 30"
            : "e.g. ship 200 units of Widget A to Acme Corp by May 20"
        }
        rows={3}
        disabled={loading}
        className="w-full resize-none rounded-lg border border-[#e5e7eb] px-3 py-2 text-[12px] text-[#111827] placeholder:text-[#9ca3af] outline-none focus:border-[#0d9488] transition-colors disabled:opacity-50"
      />
      {error && <p className="text-[11px] text-red-600">{error}</p>}
      <button
        onClick={handleDraft}
        disabled={loading || !prompt.trim()}
        className="flex items-center justify-center gap-1.5 rounded-lg bg-[#0d9488] px-4 py-2 text-[12px] font-semibold text-white transition-colors hover:bg-[#0f766e] disabled:opacity-50 disabled:cursor-not-allowed"
      >
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
    <button
      onClick={toggle}
      aria-label={isOpen ? "Close Aqira" : "Open Aqira"}
      className={cn(
        "fixed bottom-6 right-6 z-50 flex h-12 w-12 items-center justify-center rounded-full shadow-lg transition-all duration-200",
        "hover:scale-105 active:scale-95 lg:hidden",
        isOpen ? "bg-[#0f766e]" : "bg-[#0d9488] hover:bg-[#0f766e]"
      )}
    >
      {isOpen ? <X className="h-5 w-5 text-white" strokeWidth={2} /> : <Sparkles className="h-5 w-5 text-white" strokeWidth={1.75} />}
    </button>
  );
}

// ─── main panel ──────────────────────────────────────────────────────────────

export function AqiraPanel() {
  const { isOpen, close, formContext } = useAqira();
  const { user } = useAuth();
  const pathname = usePathname();
  const qc = useQueryClient();

  const [mode, setMode] = useState<"draft" | "ask">("ask");
  const [askResult, setAskResult] = useState<AskResult | null>(null);

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

  const firstName = user?.name?.split(" ")[0] ?? "there";

  return (
    <>
      <AqiraFAB />

      {isOpen && (
        <div className="fixed inset-0 z-40 bg-black/30 lg:hidden" onClick={close} />
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
          <button onClick={close} className="rounded p-1 text-[#6b7280] hover:bg-[#f3f4f6] hover:text-[#111827] transition-colors" aria-label="Close Aqira">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto">
          {isFormPage ? (
            /* ── Form page view (price alerts) ── */
            <div className="flex flex-col gap-4 px-4 py-4">
              <p className="text-[10px] font-semibold tracking-[0.7px] text-[#9ca3af] uppercase">Price Alerts</p>
              {formContext ? (
                <PriceAlertsSection formContext={formContext} />
              ) : (
                <p className="text-[12px] text-[#9ca3af] text-center py-2">
                  Select a supplier and add products to see price insights.
                </p>
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
                <ModeTabs mode={mode} onChange={setMode} />
                {mode === "draft" ? <DraftInput /> : <AskInput result={askResult} onResult={setAskResult} />}
              </div>
            </div>
          ) : (
            /* ── Home view ── */
            <div className="flex flex-col gap-5 px-4 py-4">
              {/* Greeting */}
              <div className="flex items-center gap-2.5 pt-1">
                <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-[#f0fdfa]">
                  <Sparkles className="h-4 w-4 text-[#0d9488]" strokeWidth={1.5} />
                </div>
                <div>
                  <p className="text-[13px] font-semibold text-[#111827]">Hi {firstName}</p>
                  <p className="text-[11px] text-[#6b7280]">How can I help you today?</p>
                </div>
              </div>

              {/* Mode tabs */}
              <ModeTabs mode={mode} onChange={(m) => { setMode(m); if (m === "ask") setAskResult(null); }} />

              {/* Content */}
              {mode === "draft" ? (
                <DraftInput />
              ) : (
                <AskInput result={askResult} onResult={setAskResult} />
              )}

              {/* Order summaries hint */}
              {mode === "ask" && !askResult && (
                <>
                  <div className="border-t border-[#f3f4f6]" />
                  <p className="text-[11px] text-[#9ca3af] text-center">
                    Open a PO or SO for an instant order summary.
                  </p>
                </>
              )}
            </div>
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
