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

export const usersService = {
  list: (params: { page: number; limit: number; status: "active" | "inactive" }) =>
    apiClient.get<UsersResponse>("/users", { params }),
  deactivate: (id: string) => apiClient.delete(`/users/${id}`),
};
