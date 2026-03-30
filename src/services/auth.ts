import apiClient from "@/lib/api-client";

export interface LoginPayload {
  email: string;
  password: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  roleId?: string;
  accountVerified?: boolean;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken?: string;
  user: User;
  organization?: { _id: string; name: string };
}

export interface SignupPayload {
  name: string;
  email: string;
  password: string;
  companyName: string;
  phoneNumber?: string;
}

export interface UpdateProfilePayload {
  name: string;
  phoneNumber: string;
  countryCode: string;
}

export interface ChangePasswordPayload {
  oldPassword: string;
  newPassword: string;
}

export const authService = {
  login: (data: LoginPayload) =>
    apiClient.post<AuthResponse>("/users/login", data),
  me: () => apiClient.get<User>("/users/my-own"),
  updateProfile: (payload: UpdateProfilePayload) =>
    apiClient.patch("/users/my-own", payload),
  changePassword: (payload: ChangePasswordPayload) =>
    apiClient.patch("/users/change-password", payload),
  forgotPassword: (email: string) =>
    apiClient.post<{ message: string }>("/users/forgot-password", { email }),
  setPassword: (email: string, code: string, newPassword: string) =>
    apiClient.post<{ message: string }>("/users/set-password", {
      email,
      code,
      newPassword,
    }),
  signup: (data: SignupPayload) =>
    apiClient.post<AuthResponse>("/organizations", data),
  verifyCode: (email: string, code: string) =>
    apiClient.post<User>("/users/verify-code", { email, code }),
  resendVerificationCode: (email: string) =>
    apiClient.post<{ message: string }>("/users/resend-verification-code", { email }),
};