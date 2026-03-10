import apiClient from "@/lib/api-client";

export const dashboardService = {
  getOverview: async (params: { fromDate: string; toDate: string }) => {
    const response = await apiClient.get(
      "/purchase-orders/analytics/dashboard",
      { params },
    );
    return response.data;
  },
};
