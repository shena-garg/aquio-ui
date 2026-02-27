import apiClient from "@/lib/api-client";

export interface LoginPayload {
  email: string;
  password: string;
}

export interface AuthResponse {
  token: string;
  user: {
    id: string;
    name: string;
    email: string;
  };
}

export const authService = {
  login: (data: LoginPayload) =>
    apiClient.post<AuthResponse>("/auth/login", data),
  logout: () => apiClient.post("/auth/logout"),
  me: () => apiClient.get<AuthResponse["user"]>("/auth/me"),
};