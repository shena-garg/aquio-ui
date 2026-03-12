import apiClient from "@/lib/api-client";

export interface User {
  _id: string;
  name: string;
  email: string;
  phoneNumber: string;
  countryCode: string;
  roleId: string;
  status: "active" | "inactive";
  createdAt: string;
}

export interface UsersResponse {
  users: User[];
  totalCount: number;
}

export interface CreateUserPayload {
  name: string;
  phoneNumber: string;
  countryCode: string;
  email: string;
  roleId: string;
}

export const usersService = {
  list: (params: { page: number; limit: number; status: "active" | "inactive" }) =>
    apiClient.get<UsersResponse>("/users", { params }),
  getById: (id: string) => apiClient.get<User>(`/users/${id}`),
  create: (payload: CreateUserPayload) => apiClient.post("/users", payload),
  update: (id: string, payload: Partial<CreateUserPayload>) =>
    apiClient.patch(`/users/${id}`, payload),
  deactivate: (id: string) => apiClient.delete(`/users/${id}`),
};
