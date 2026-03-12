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
};
