import apiClient from "@/lib/api-client";

export interface Organization {
  name: string;
  email: string;
  taxNumber: string;
  phoneNumber: string;
  countryCode: string;
}

export interface OnboardingStatus {
  isComplete: boolean;
  completedAt: string | null;
  steps: {
    location: boolean;
    settings: boolean;
    category: boolean;
    partner: boolean;
    product: boolean;
  };
}

export const organizationService = {
  get: () => apiClient.get<Organization>("/organizations/my-own"),
  update: (payload: Partial<Organization>) =>
    apiClient.patch("/organizations/my-own", payload),
  getOnboardingStatus: () =>
    apiClient.get<OnboardingStatus>("/organizations/onboarding-status"),
};
