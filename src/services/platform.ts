import platformApiClient from "@/lib/platform-api-client";
import axios from "axios";

export interface PlatformAdmin {
  _id: string;
  name: string;
  email: string;
  status: "active" | "inactive";
  createdAt: string;
}

export interface OrgRow {
  _id: string;
  name: string;
  status: string;
  createdAt: string;
  userCount: number;
  primaryAdminEmail: string | null;
  primaryAdminName: string | null;
  supportUserExists: boolean;
  supportUserActive: boolean;
}

export const platformService = {
  login: (data: { email: string; password: string }) =>
    axios.post<{ accessToken: string; refreshToken: string; admin: { id: string; name: string; email: string } }>(
      `${process.env.NEXT_PUBLIC_API_BASE_URL}/platform/auth/login`,
      data,
    ),

  logout: () => platformApiClient.post("/platform/auth/logout"),

  forgotPassword: (email: string) =>
    axios.post(`${process.env.NEXT_PUBLIC_API_BASE_URL}/platform/auth/forgot-password`, { email }),

  setPassword: (data: { email: string; code: string; newPassword: string }) =>
    axios.post(`${process.env.NEXT_PUBLIC_API_BASE_URL}/platform/auth/set-password`, data),

  listOrgs: () => platformApiClient.get<{ data: OrgRow[] }>("/platform/orgs"),

  generateSupportToken: (orgId: string) =>
    platformApiClient.post<{ token: string }>(`/platform/orgs/${orgId}/support-token`),

  useSupportToken: (token: string) =>
    axios.post<{
      accessToken: string;
      refreshToken: string;
      user: { id: string; name: string; email: string; roleId: string | null; organizationId: string; isOrgSupport: boolean };
    }>(`${process.env.NEXT_PUBLIC_API_BASE_URL}/platform/support-session/use`, { token }),

  listAdmins: () => platformApiClient.get<{ data: PlatformAdmin[] }>("/platform/admins"),

  createAdmin: (data: { name: string; email: string; password: string }) =>
    platformApiClient.post<{ data: PlatformAdmin }>("/platform/admins", data),

  setAdminStatus: (id: string, status: "active" | "inactive") =>
    platformApiClient.patch(`/platform/admins/${id}/status`, { status }),
};
