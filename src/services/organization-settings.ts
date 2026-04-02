import apiClient from "@/lib/api-client";

export interface OrganizationSettings {
  _id: string;
  organizationId: string;
  // Purchase Order
  poCancelReasons: string[];
  paymentTerms: string[];
  isPOReferenceIDInternal: boolean;
  generatePOAutomatically: boolean;
  poPrefix: string;
  poSeparator: string;
  nextPONumber: number;
  // Sales Order
  soCancelReasons: string[];
  soPaymentTerms: string[];
  isSOReferenceIDInternal: boolean;
  generateSOAutomatically: boolean;
  soPrefix: string;
  soSeparator: string;
  nextSONumber: number;
  // Product
  applicableGst: number[];
  generateSKUAutomatically: boolean;
  skuPrefix: string;
  skuSeparator: string;
  nextSKUNumber: number;
  // Meta
  logo?: { id: string; name: string };
  createdAt: string;
  updatedAt: string;
}

export const organizationSettingsService = {
  getMyOwn: () =>
    apiClient.get<OrganizationSettings>("/organization-settings/my-own"),
  update: (payload: Partial<OrganizationSettings>) =>
    apiClient.put<OrganizationSettings>(
      "/organization-settings/my-own",
      payload
    ),
  addPOCancelReason: (reason: string) =>
    apiClient.post<OrganizationSettings>(
      "/organization-settings/my-own/po-cancel-reason",
      { reason }
    ),
  addSOCancelReason: (reason: string) =>
    apiClient.post<OrganizationSettings>(
      "/organization-settings/my-own/so-cancel-reason",
      { reason }
    ),
  addPaymentTerm: (term: string) =>
    apiClient.post<OrganizationSettings>(
      "/organization-settings/my-own/payment-terms",
      { term }
    ),
  addSOPaymentTerm: (term: string) =>
    apiClient.post<OrganizationSettings>(
      "/organization-settings/my-own/so-payment-terms",
      { term }
    ),
};
