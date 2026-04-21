import apiClient from "@/lib/api-client";

export interface PartnerLocation {
  _id: string;
  name: string;
  gstNumber?: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  zip: string;
  country: string;
  isDefault: boolean;
}

export interface Partner {
  _id: string;
  name: string;
  contactNumber: string;
  countryCode: string;
  taxNumber?: string;
  poReminder: boolean;
  status: "active" | "inactive";
  createdAt: string;
  locations?: PartnerLocation[];
}

export interface PartnersResponse {
  vendorCompanies: Partner[];
  totalCount: number;
}

export interface CreatePartnerPayload {
  name: string;
  taxNumber?: string;
  countryCode?: string;
  contactNumber: string;
  address: {
    name: string;
    gstNumber?: string;
    addressLine1: string;
    addressLine2?: string;
    city: string;
    state: string;
    country: string;
    zip: string;
  };
  primaryContact?: {
    name: string;
    email: string;
    countryCode?: string;
    phoneNumber: string;
  };
  poReminder?: boolean;
}

export const partnersService = {
  list: (params: { page: number; limit: number }) =>
    apiClient.get<PartnersResponse>("/vendor-companies", { params }),
  getById: (id: string) =>
    apiClient.get<Partner>(`/vendor-companies/${id}`),
  create: (payload: CreatePartnerPayload) =>
    apiClient.post<Partner>("/vendor-companies", payload),
  update: (id: string, payload: Partial<CreatePartnerPayload>) =>
    apiClient.patch<Partner>(`/vendor-companies/${id}`, payload),
  addLocation: (partnerId: string, payload: {
    name: string; gstNumber?: string; addressLine1: string;
    addressLine2?: string; city: string; state: string;
    country: string; zip: string; isDefault?: boolean;
  }) => apiClient.post<Partner>(`/vendor-companies/${partnerId}/locations`, payload),
  delete: (id: string) =>
    apiClient.delete(`/vendor-companies/${id}`),
};
