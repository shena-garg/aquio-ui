"use client";

import React, { createContext, useContext, useMemo, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { authService, User } from "@/services/auth";
import { rolesService, Role } from "@/services/roles";

interface AuthContextValue {
  user: User | null;
  role: Role | null;
  permissions: Set<string>;
  isLoading: boolean;
  isAuthenticated: boolean;
  hasPermission: (permission: string) => boolean;
  hasAnyPermission: (permissions: string[]) => boolean;
  hasEntityAccess: (entity: string) => boolean;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

// All possible permissions per entity — must stay in sync with RoleForm ENTITIES
const ALL_PERMISSIONS_BY_ENTITY: Record<string, string[]> = {
  category: ["category.view", "category.add", "category.edit"],
  product: ["product.view", "product.add", "product.edit", "product.archive"],
  vendor: ["vendor.view", "vendor.add", "vendor.edit"],
  "purchase-order": [
    "purchase-order.view", "purchase-order.add", "purchase-order.edit",
    "purchase-order.cancel", "purchase-order.confirm",
    "purchase-order.receipt.add", "purchase-order.receipt.edit",
    "purchase-order.force-close", "purchase-order.undo-force-close",
    "purchase-order.audit-log", "purchase-order.download-csv",
  ],
  "sales-order": [
    "sales-order.view", "sales-order.add", "sales-order.edit",
    "sales-order.cancel", "sales-order.confirm",
    "sales-order.shipment.add", "sales-order.shipment.edit",
    "sales-order.force-close", "sales-order.undo-force-close",
    "sales-order.audit-log", "sales-order.download-csv",
  ],
  "auction-buy": [
    "auction-buy.view", "auction-buy.add", "auction-buy.edit",
    "auction-buy.view-bids", "auction-buy.reject-bid",
    "auction-buy.create-counter-offer", "auction-buy.revoke-counter-offer",
    "auction-buy.accept-bid", "auction-buy.create-po",
  ],
  "auction-sale": [
    "auction-sale.view", "auction-sale.add", "auction-sale.edit",
    "auction-sale.view-bids", "auction-sale.reject-bid",
    "auction-sale.create-counter-offer", "auction-sale.revoke-counter-offer",
    "auction-sale.accept-bid", "auction-sale.create-po",
  ],
  notification: ["notification.view", "notification.send"],
};

function flattenPermissions(role: Role): Set<string> {
  const perms = new Set<string>();
  for (const entity of role.permissionsPerEntity) {
    if (entity.access === "none") continue;

    if (entity.access === "full") {
      // Expand "full" to all known permissions for this entity
      const allPerms = ALL_PERMISSIONS_BY_ENTITY[entity.entity];
      if (allPerms) {
        for (const p of allPerms) perms.add(p);
      }
      // Also add any permissions the backend sent (in case it does populate them)
      for (const p of entity.permissions) perms.add(p);
    } else {
      for (const p of entity.permissions) {
        perms.add(p);
      }
    }
  }
  return perms;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const queryClient = useQueryClient();

  const {
    data: user,
    isLoading: isUserLoading,
  } = useQuery({
    queryKey: ["auth", "me"],
    queryFn: () => authService.me().then((r) => r.data),
    staleTime: Infinity,
    gcTime: Infinity,
    retry: false,
  });

  const {
    data: role,
    isLoading: isRoleLoading,
  } = useQuery({
    queryKey: ["auth", "role", user?.roleId],
    queryFn: () => rolesService.getById(user!.roleId!).then((r) => r.data),
    enabled: !!user?.roleId,
    staleTime: Infinity,
    gcTime: Infinity,
    retry: false,
  });

  const permissions = useMemo(() => {
    if (!role) return new Set<string>();
    return flattenPermissions(role);
  }, [role]);

  const hasPermission = useCallback(
    (permission: string) => permissions.has(permission),
    [permissions]
  );

  const hasAnyPermission = useCallback(
    (perms: string[]) => perms.some((p) => permissions.has(p)),
    [permissions]
  );

  const hasEntityAccess = useCallback(
    (entity: string) => {
      const entityPerms = role?.permissionsPerEntity.find(
        (e) => e.entity === entity
      );
      if (!entityPerms) return false;
      return entityPerms.access !== "none";
    },
    [role]
  );

  const logout = useCallback(() => {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("user");
    queryClient.clear();
    router.push("/login");
  }, [queryClient, router]);

  const isLoading = isUserLoading || (!!user?.roleId && isRoleLoading);

  const value: AuthContextValue = useMemo(
    () => ({
      user: user ?? null,
      role: role ?? null,
      permissions,
      isLoading,
      isAuthenticated: !!user,
      hasPermission,
      hasAnyPermission,
      hasEntityAccess,
      logout,
    }),
    [user, role, permissions, isLoading, hasPermission, hasAnyPermission, hasEntityAccess, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
