"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Sparkles,
  ThumbsDown,
  ThumbsUp,
  History,
  ExternalLink,
  X,
} from "lucide-react";
import {
  priceInsightsService,
  computePriceSignal,
  PriceSignal,
  PriceInsightsHistoryItem,
} from "@/services/price-insights";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

interface PriceInsightsStripProps {
  productId: string | null | undefined;
  variantId: string | null | undefined;
  hasVariants: boolean;
  partnerId: string | null | undefined;
  orderType: "purchase" | "sales";
  enteredPrice: number;
}

// ── Signal pill display config ────────────────────────────────────────────────

const SIGNAL_CONFIG: Record<
  PriceSignal,
  { label: (pct?: number) => string; color: string; border: string } | null
> = {
  above_avg: {
    label: (pct) => `${pct ?? 0}% above 90d avg`,
    color: "bg-amber-100 text-amber-800",
    border: "border-amber-400",
  },
  below_avg: {
    label: (pct) => `${pct ?? 0}% below 90d avg — verify`,
    color: "bg-amber-100 text-amber-800",
    border: "border-amber-400",
  },
  matches_last: {
    label: () => "Matches last price",
    color: "bg-green-100 text-green-800",
    border: "border-green-400",
  },
  first_time_partner: {
    label: () => "First order from this partner for this product",
    color: "bg-gray-100 text-gray-600",
    border: "",
  },
  none: null,
};

// ── Days-ago display ──────────────────────────────────────────────────────────

function formatDaysAgo(daysAgo: number): { text: string; muted: boolean } {
  if (daysAgo <= 90) return { text: `${daysAgo}d ago`, muted: false };
  const months = Math.round(daysAgo / 30);
  return { text: `${months} months ago`, muted: true };
}

// ── Onboarding tooltip ────────────────────────────────────────────────────────

const TOOLTIP_KEY = "price-insights-onboarding-shown";

function useOnboardingTooltip() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const count = parseInt(localStorage.getItem(TOOLTIP_KEY) ?? "0", 10);
    if (count < 3) setVisible(true);
  }, []);

  function dismiss() {
    setVisible(false);
    const count = parseInt(localStorage.getItem(TOOLTIP_KEY) ?? "0", 10);
    localStorage.setItem(TOOLTIP_KEY, String(count + 1));
  }

  return { visible, dismiss };
}

// ── History drawer ────────────────────────────────────────────────────────────

function HistoryDrawer({
  open,
  onClose,
  productId,
  variantId,
  orderType,
}: {
  open: boolean;
  onClose: () => void;
  productId: string;
  variantId?: string;
  orderType: string;
}) {
  const [sortKey, setSortKey] = useState<"orderDate" | "unitPrice">(
    "orderDate"
  );
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const { data, isLoading } = useQuery({
    queryKey: ["price-insights-history", productId, variantId, orderType],
    queryFn: () =>
      priceInsightsService
        .history({ productId, variantId, orderType, limit: 10 })
        .then((r) => r.data),
    enabled: open,
    staleTime: 60_000,
  });

  const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? "";
  const sorted = [...(data ?? [])].sort((a, b) => {
    let aVal: number;
    let bVal: number;
    if (sortKey === "orderDate") {
      aVal = new Date(a.orderDate).getTime();
      bVal = new Date(b.orderDate).getTime();
    } else {
      aVal = a.unitPrice;
      bVal = b.unitPrice;
    }
    return sortDir === "desc" ? bVal - aVal : aVal - bVal;
  });

  function toggleSort(key: "orderDate" | "unitPrice") {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  }

  const sortArrow = (key: typeof sortKey) => {
    if (sortKey !== key) return " ↕";
    return sortDir === "desc" ? " ↓" : " ↑";
  };

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent className="flex flex-col w-full sm:max-w-2xl overflow-hidden">
        <SheetHeader>
          <SheetTitle>Price History</SheetTitle>
          <p className="text-sm text-gray-500">
            {orderType === "purchase" ? "Purchase" : "Sales"} orders for this
            product
          </p>
        </SheetHeader>

        <div className="flex-1 overflow-auto px-6">
          {isLoading ? (
            <div className="text-sm text-gray-500 py-4">Loading...</div>
          ) : !sorted.length ? (
            <div className="text-sm text-gray-500 py-4">No history found.</div>
          ) : (
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b text-left text-xs text-gray-500 font-medium">
                  <th className="py-2 pr-3">Order #</th>
                  <th
                    className="py-2 pr-3 cursor-pointer select-none"
                    onClick={() => toggleSort("orderDate")}
                  >
                    Date{sortArrow("orderDate")}
                  </th>
                  <th className="py-2 pr-3">Partner</th>
                  <th className="py-2 pr-3 text-right">Qty</th>
                  <th
                    className="py-2 pr-3 text-right cursor-pointer select-none"
                    onClick={() => toggleSort("unitPrice")}
                  >
                    Unit Price{sortArrow("unitPrice")}
                  </th>
                  <th className="py-2 text-right">Status</th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((item: PriceInsightsHistoryItem) => (
                  <tr
                    key={item.orderId}
                    className="border-b hover:bg-gray-50 cursor-pointer"
                    onClick={() => {
                      const path =
                        orderType === "purchase"
                          ? `/purchase-orders/${item.orderId}`
                          : `/sales-orders/${item.orderId}`;
                      window.open(path, "_blank");
                    }}
                  >
                    <td className="py-2 pr-3 text-teal-700 font-medium">
                      {item.orderNumber}
                    </td>
                    <td className="py-2 pr-3 text-gray-600">
                      {new Date(item.orderDate).toLocaleDateString("en-IN", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })}
                    </td>
                    <td className="py-2 pr-3 text-gray-700">
                      {item.partnerName}
                    </td>
                    <td className="py-2 pr-3 text-right text-gray-600">
                      {item.quantity} {item.unit}
                    </td>
                    <td className="py-2 pr-3 text-right font-medium">
                      ₹
                      {item.unitPrice.toLocaleString("en-IN", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </td>
                    <td className="py-2 text-right">
                      <span className="text-xs capitalize text-gray-500">
                        {item.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="px-6 pb-4 pt-2 text-xs text-gray-400 border-t mt-auto">
          Showing last 10 orders. Draft and cancelled orders excluded.
        </div>
      </SheetContent>
    </Sheet>
  );
}

// ── Main strip component ──────────────────────────────────────────────────────

export function PriceInsightsStrip({
  productId,
  variantId,
  hasVariants,
  partnerId,
  orderType,
  enteredPrice,
}: PriceInsightsStripProps) {
  const [historyOpen, setHistoryOpen] = useState(false);
  const [feedbackGiven, setFeedbackGiven] = useState<
    "thumbs_up" | "thumbs_down" | null
  >(null);
  const { visible: tooltipVisible, dismiss: dismissTooltip } =
    useOnboardingTooltip();

  // Debounced price for signal computation
  const [debouncedPrice, setDebouncedPrice] = useState(enteredPrice);
  const priceRef = useRef(enteredPrice);
  priceRef.current = enteredPrice;

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedPrice(priceRef.current), 200);
    return () => clearTimeout(timer);
  }, [enteredPrice]);

  // Track price at strip render time for price_changed_after_render telemetry
  const priceAtRender = useRef<number | null>(null);
  const signalAtRender = useRef<PriceSignal>("none");

  const enabled =
    !!productId &&
    !!partnerId &&
    (!hasVariants || !!variantId);

  const { data, isError } = useQuery({
    queryKey: [
      "price-insights",
      productId,
      variantId ?? null,
      partnerId,
      orderType,
    ],
    queryFn: () =>
      priceInsightsService
        .lookup({
          productId: productId!,
          variantId: variantId ?? undefined,
          partnerId: partnerId!,
          orderType,
        })
        .then((r) => r.data),
    enabled,
    staleTime: 2 * 60 * 1000,
  });

  const signal = data?.hasData
    ? computePriceSignal(debouncedPrice, data)
    : "none";

  // Fire strip_rendered telemetry once per data load
  const renderedRef = useRef(false);
  useEffect(() => {
    if (!data?.hasData || renderedRef.current) return;
    renderedRef.current = true;
    priceAtRender.current = enteredPrice;
    signalAtRender.current = signal;
    void priceInsightsService.saveTelemetry("price_insights.strip_rendered", {
      productId,
      variantId: variantId ?? null,
      partnerId,
      orderType,
      signalShown: signal,
      sampleCount: data.rolling90d?.sampleCount ?? 0,
    });
  }, [data?.hasData]);

  // Fire price_changed_after_render on unmount if price changed
  const unmountRef = useRef({ enteredPrice, signal, productId, partnerId, data: data?.rolling90d });
  unmountRef.current = { enteredPrice, signal, productId, partnerId, data: data?.rolling90d };

  useEffect(() => {
    return () => {
      const { enteredPrice: ep, signal: sig, productId: pid, partnerId: par, data: d } = unmountRef.current;
      if (priceAtRender.current !== null && ep !== priceAtRender.current && pid && par) {
        const avg = d?.avgUnitPrice;
        const deltaFromAvgPct = avg && avg > 0
          ? Math.round(((ep - avg) / avg) * 100)
          : null;
        void priceInsightsService.saveTelemetry("price_insights.price_changed_after_render", {
          priceBefore: priceAtRender.current,
          priceAfter: ep,
          signalShown: signalAtRender.current,
          deltaFromAvgPct,
        });
      }
    };
  }, []);

  const handleFeedback = useCallback(
    async (val: "thumbs_up" | "thumbs_down") => {
      setFeedbackGiven(val);
      try {
        await priceInsightsService.saveFeedback({
          signal: val,
          context: {
            productId: productId!,
            variantId: variantId ?? undefined,
            partnerId: partnerId!,
            orderType,
            signalShown: signal,
          },
        });
        void priceInsightsService.saveTelemetry(
          "price_insights.feedback_submitted",
          {
            signal: val,
            signalShown: signal,
            productId,
            variantId: variantId ?? null,
          }
        );
        toast.success("Thanks for the feedback!", { duration: 2000 });
      } catch {
        setFeedbackGiven(null);
      }
    },
    [productId, variantId, partnerId, orderType, signal]
  );

  const handleHistoryOpen = useCallback(() => {
    setHistoryOpen(true);
    void priceInsightsService.saveTelemetry("price_insights.history_opened", {
      productId,
      variantId: variantId ?? null,
      orderType,
    });
  }, [productId, variantId, orderType]);

  // Hide strip conditions
  if (!enabled || !data?.enabled || !data?.hasData || isError) return null;

  const last = data.lastFromPartner;
  const r90 = data.rolling90d!;

  const signalCfg = SIGNAL_CONFIG[signal];

  // Compute percentage for above/below signals
  let signalPct: number | undefined;
  if (signal === "above_avg" && r90.avgUnitPrice > 0) {
    signalPct = Math.round(
      ((debouncedPrice - r90.avgUnitPrice) / r90.avgUnitPrice) * 100
    );
  } else if (signal === "below_avg" && r90.avgUnitPrice > 0) {
    signalPct = Math.round(
      ((r90.avgUnitPrice - debouncedPrice) / r90.avgUnitPrice) * 100
    );
  }

  const showLastPaid = last && last.daysAgo <= 365;

  return (
    <>
      <div className="relative w-full bg-[#f8fafc] dark:bg-[#1e293b] rounded-md px-3 py-2 text-[12px] flex flex-wrap items-center gap-x-3 gap-y-1.5 border border-[#e2e8f0] dark:border-[#334155]">
        {/* Onboarding tooltip */}
        {tooltipVisible && (
          <div className="absolute bottom-full left-0 mb-2 z-50 bg-[#0d9488] text-white rounded-lg px-3 py-2 shadow-lg max-w-xs text-[11px] leading-snug">
            <div className="flex items-start gap-2">
              <span className="flex-1">
                New: pricing context as you create orders. Based on your past
                orders. Tell us what&apos;s useful.
              </span>
              <button
                onClick={dismissTooltip}
                className="flex-shrink-0 opacity-80 hover:opacity-100"
              >
                <X size={12} />
              </button>
            </div>
            <div className="absolute top-full left-4 border-4 border-transparent border-t-[#0d9488]" />
          </div>
        )}

        {/* Left label */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <Sparkles size={12} className="text-[#7c3aed]" />
          <span className="text-[10px] font-semibold tracking-widest text-[#374151] uppercase">
            Price Insights
          </span>
          <span className="px-1.5 py-0.5 rounded-full bg-[#7c3aed]/10 text-[#7c3aed] text-[9px] font-semibold uppercase tracking-wide">
            Beta
          </span>
        </div>

        {/* Vertical separator */}
        <span className="hidden sm:block w-px h-4 bg-[#e2e8f0] dark:bg-[#334155] flex-shrink-0" />

        {/* Last paid */}
        {showLastPaid && (
          <span className="text-[#374151] dark:text-[#cbd5e1] flex-shrink-0">
            Last paid{" "}
            <span className="font-semibold">
              ₹
              {last!.unitPrice.toLocaleString("en-IN", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </span>
            {" · "}
            {(() => {
              const { text, muted } = formatDaysAgo(last!.daysAgo);
              return muted ? (
                <span className="text-[#9ca3af]">{text}</span>
              ) : (
                text
              );
            })()}
            {" · "}
            <a
              href={
                orderType === "purchase"
                  ? `/purchase-orders/${last!.orderId}`
                  : `/sales-orders/${last!.orderId}`
              }
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#0d9488] hover:underline inline-flex items-center gap-0.5"
            >
              {last!.orderNumber}
              <ExternalLink size={9} />
            </a>
          </span>
        )}

        {/* 90d avg */}
        <span className="text-[#374151] dark:text-[#cbd5e1] flex-shrink-0">
          90d avg{" "}
          <span className="font-semibold">
            ₹
            {r90.avgUnitPrice.toLocaleString("en-IN", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </span>
          <span className="text-[#9ca3af]">
            {" "}
            (₹
            {r90.minUnitPrice.toLocaleString("en-IN", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}{" "}
            – ₹
            {r90.maxUnitPrice.toLocaleString("en-IN", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
            )
          </span>
        </span>

        {/* Signal pill */}
        {signalCfg && (
          <span
            className={`px-2 py-0.5 rounded-full text-[10px] font-medium flex-shrink-0 ${signalCfg.color}`}
            title="Based on your organisation's past orders"
          >
            {signalCfg.label(signalPct)}
          </span>
        )}

        {/* Right side actions */}
        <div className="flex items-center gap-2 ml-auto flex-shrink-0">
          <button
            type="button"
            onClick={handleHistoryOpen}
            className="text-[#0d9488] hover:underline text-[11px] flex items-center gap-0.5 whitespace-nowrap"
          >
            <History size={11} />
            View history →
          </button>
          <button
            type="button"
            onClick={() => handleFeedback("thumbs_up")}
            disabled={!!feedbackGiven}
            title="Helpful"
            className={`p-0.5 rounded transition-colors ${
              feedbackGiven === "thumbs_up"
                ? "text-green-600"
                : "text-[#9ca3af] hover:text-green-600"
            } disabled:cursor-default`}
          >
            <ThumbsUp size={12} />
          </button>
          <button
            type="button"
            onClick={() => handleFeedback("thumbs_down")}
            disabled={!!feedbackGiven}
            title="Not helpful"
            className={`p-0.5 rounded transition-colors ${
              feedbackGiven === "thumbs_down"
                ? "text-red-500"
                : "text-[#9ca3af] hover:text-red-500"
            } disabled:cursor-default`}
          >
            <ThumbsDown size={12} />
          </button>
        </div>
      </div>

      {productId && (
        <HistoryDrawer
          open={historyOpen}
          onClose={() => setHistoryOpen(false)}
          productId={productId}
          variantId={variantId ?? undefined}
          orderType={orderType}
        />
      )}
    </>
  );
}
