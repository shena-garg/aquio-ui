import apiClient from "@/lib/api-client";

export interface LoginPayload {
  email: string;
  password: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
}

export interface AuthResponse {
  accessToken: string;
  user: User;
}

export const authService = {
  login: (data: LoginPayload) =>
    apiClient.post<AuthResponse>("/users/login", data),
  me: () => apiClient.get<User>("/users/my-own"),
};