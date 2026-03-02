import apiClient from "@/lib/api-client";

export interface Partner {
  _id: string;
  name: string;
  contactNumber: string;
  countryCode: string;
  taxNumber: string;
  poReminder: boolean;
  status: "active" | "inactive";
  createdAt: string;
}

export interface PartnersResponse {
  vendorCompanies: Partner[];
  totalCount: number;
}

export const partnersService = {
  list: (params: { page: number; limit: number }) =>
    apiClient.get<PartnersResponse>("/vendor-companies", { params }),
};
