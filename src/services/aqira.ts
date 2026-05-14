import apiClient from "@/lib/api-client";
import type { AqiraDraft } from "@/contexts/AqiraContext";

interface DraftOrderParams {
  prompt: string;
  orderType: "purchase" | "sales";
}

export interface AskResultItem {
  label: string;
  value: string;
  sub?: string;
}

export interface AskResult {
  answer: string;
  items?: AskResultItem[];
}

export interface AqiraHealthDigest {
  overdueCount: number;
  draftCount: number;
  dueThisWeekCount: number;
}

export interface AqiraFollowUpReminder {
  orderId: string;
  poNumber: string;
  supplierName: string;
  deliveryDate: string;
  daysOverdue: number;
  orderValue: number;
}

export interface AqiraReorderSuggestion {
  productId: string;
  productName: string;
  avgIntervalDays: number;
  daysSinceLastOrder: number;
  daysOverdue: number;
  lastSupplierId: string;
  lastSupplierName: string;
  lastOrderedQty: number;
  lastUom: string;
}

export interface AqiraHomeData {
  healthDigest: AqiraHealthDigest;
  followUpReminders: AqiraFollowUpReminder[];
  reorderSuggestions: AqiraReorderSuggestion[];
}

export interface AqiraBudgetItem {
  entityId: string;
  entityName: string;
  monthlyLimit: number;
  currency: string;
  spent: number;
  remaining: number;
  pct: number;
  isOver: boolean;
}

export interface BudgetStatusResult {
  hasBudget: boolean;
  monthlyLimit: number | null;
  currency: string;
  spent: number;
  remaining: number;
  pct: number;
  isOver: boolean;
}

export const aqiraService = {
  draftOrder: (params: DraftOrderParams) =>
    apiClient.post<{ data: AqiraDraft }>("/aqira/draft-order", params),

  ask: (question: string) =>
    apiClient.post<{ data: AskResult }>("/aqira/ask", { question }),

  homeData: () =>
    apiClient.get<{ data: AqiraHomeData }>("/aqira/home"),

  getBudgets: () =>
    apiClient.get<{ data: AqiraBudgetItem[] }>("/aqira/budgets"),

  setBudget: (entityId: string, entityName: string, monthlyLimit: number) =>
    apiClient.post<{ data: { success: boolean } }>("/aqira/budgets", { entityId, entityName, monthlyLimit }),

  deleteBudget: (entityId: string) =>
    apiClient.delete<{ data: { success: boolean } }>(`/aqira/budgets/${entityId}`),

  getBudgetStatus: (partnerId: string, orderType: string) =>
    apiClient.get<{ data: BudgetStatusResult }>("/aqira/budget-status", { params: { partnerId, orderType } }),
};
