"use client";

import { useAuth } from "@/contexts/AuthContext";

export function usePermissions() {
  const {
    hasPermission,
    hasAnyPermission,
    hasEntityAccess,
    isLoading,
    user,
    role,
  } = useAuth();

  return {
    hasPermission,
    hasAnyPermission,
    hasEntityAccess,
    isLoading,
    user,
    role,
  };
}
