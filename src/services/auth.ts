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
}

export interface AuthResponse {
  accessToken: string;
  user: User;
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
};