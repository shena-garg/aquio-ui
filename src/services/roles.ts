import apiClient from "@/lib/api-client";

export interface Role {
  _id: string;
  name: string;
  description: string;
  status: string;
}

export const rolesService = {
  list: () => apiClient.get<Role[]>("/roles"),
};
