import apiClient from "@/lib/api-client";

export interface RolePermission {
  entity: string;
  access: "full" | "custom" | "none";
  permissions: string[];
}

export interface Role {
  _id: string;
  name: string;
  description: string;
  status: string;
  organizationId: string | null;
  permissionsPerEntity: RolePermission[];
}

export const rolesService = {
  list: () => apiClient.get<Role[]>("/roles"),
};
