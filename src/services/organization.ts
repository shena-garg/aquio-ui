import apiClient from "@/lib/api-client";

export interface Organization {
  name: string;
  email: string;
  taxNumber: string;
  phoneNumber: string;
  countryCode: string;
}

export const organizationService = {
  get: () => apiClient.get<Organization>("/organizations/my-own"),
  update: (payload: Organization) =>
    apiClient.patch("/organizations/my-own", payload),
};
