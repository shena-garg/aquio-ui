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

export const aqiraService = {
  draftOrder: (params: DraftOrderParams) =>
    apiClient.post<{ data: AqiraDraft }>("/aqira/draft-order", params),

  ask: (question: string) =>
    apiClient.post<{ data: AskResult }>("/aqira/ask", { question }),
};
