import apiClient from "@/lib/api-client";
import type { AqiraDraft } from "@/contexts/AqiraContext";

interface DraftOrderParams {
  prompt: string;
  orderType: "purchase" | "sales";
}

export const aqiraService = {
  draftOrder: (params: DraftOrderParams) =>
    apiClient.post<{ data: AqiraDraft }>("/aqira/draft-order", params),
};
