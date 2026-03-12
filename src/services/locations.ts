import apiClient from "@/lib/api-client";

export interface Location {
  _id: string;
  name: string;
  gstNumber: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  state: string;
  zip: string;
  country: string;
  status: "active" | "inactive";
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface LocationsResponse {
  locations: Location[];
  totalCount: number;
}

export interface CreateLocationPayload {
  name: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  state: string;
  zip: string;
  country: string;
  gstNumber: string;
  isDefault: boolean;
}

export const locationsService = {
  list: (params: { page: number; limit: number }) =>
    apiClient.get<LocationsResponse>("/locations", { params }),
  getById: (id: string) => apiClient.get<Location>(`/locations/${id}`),
  create: (payload: CreateLocationPayload) =>
    apiClient.post("/locations", payload),
  update: (id: string, payload: Partial<Omit<Location, "_id" | "createdAt" | "updatedAt" | "status">>) =>
    apiClient.patch(`/locations/${id}`, payload),
};
