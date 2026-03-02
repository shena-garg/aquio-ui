import apiClient from "@/lib/api-client";

export interface OrganizationSettings {
  _id: string;
  poCancelReasons: string[];
  soCancelReasons: string[];
  paymentTerms: string[];
  soPaymentTerms: string[];
  applicableGst: number[];
  isPOReferenceIDInternal: boolean;
  isSOReferenceIDInternal: boolean;
  generatePOAutomatically: boolean;
  generateSOAutomatically: boolean;
  poPrefix: string;
  poSeparator: string;
  nextPONumber: number;
}

export const organizationSettingsService = {
  getMyOwn: () =>
    apiClient.get<OrganizationSettings>("/organization-settings/my-own"),
};
