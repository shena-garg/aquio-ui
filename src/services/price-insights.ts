import apiClient from "@/lib/api-client";

export interface PriceInsightsLookup {
  enabled: boolean;
  hasData: boolean;
  baseUnit?: string;
  currency?: string;
  isFirstTimeWithPartner?: boolean;
  lastFromPartner?: {
    unitPrice: number;
    orderId: string;
    orderNumber: string;
    daysAgo: number;
  } | null;
  rolling90d?: {
    avgUnitPrice: number;
    minUnitPrice: number;
    maxUnitPrice: number;
    sampleCount: number;
  } | null;
}

export interface PriceInsightsHistoryItem {
  orderId: string;
  orderNumber: string;
  orderDate: string;
  partnerId: string;
  partnerName: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  status: string;
}

export type PriceSignal =
  | "above_avg"
  | "below_avg"
  | "matches_last"
  | "first_time_partner"
  | "none";

export const priceInsightsService = {
  lookup: (params: {
    productId: string;
    variantId?: string;
    partnerId: string;
    orderType: string;
  }) =>
    apiClient.get<PriceInsightsLookup>("/price-insights/lookup", { params }),

  history: (params: {
    productId: string;
    variantId?: string;
    orderType: string;
    limit?: number;
  }) =>
    apiClient.get<PriceInsightsHistoryItem[]>("/price-insights/history", {
      params,
    }),

  saveFeedback: (payload: {
    signal: "thumbs_up" | "thumbs_down";
    context: {
      productId: string;
      variantId?: string;
      partnerId: string;
      orderType: string;
      signalShown: PriceSignal;
    };
  }) => apiClient.post("/price-insights/feedback", payload),

  saveTelemetry: (event: string, properties: Record<string, unknown>) =>
    apiClient
      .post("/price-insights/telemetry", { event, properties })
      .catch(() => {
        // fire-and-forget; silently ignore failures
      }),
};

export function computePriceSignal(
  enteredPrice: number,
  data: PriceInsightsLookup
): PriceSignal {
  if (!data.hasData || !data.rolling90d) return "none";

  const avg = data.rolling90d.avgUnitPrice;
  const last = data.lastFromPartner?.unitPrice;

  if (last !== undefined && enteredPrice >= last * 1.1 && enteredPrice >= avg * 1.05) {
    return "above_avg";
  }
  if (enteredPrice <= avg * 0.9) {
    return "below_avg";
  }
  if (last !== undefined && Math.abs(enteredPrice - last) / last < 0.005) {
    return "matches_last";
  }
  if (data.isFirstTimeWithPartner) {
    return "first_time_partner";
  }
  return "none";
}
