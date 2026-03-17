"use client";

import { useAuth } from "@/contexts/AuthContext";

interface RequirePermissionProps {
  permission?: string;
  permissions?: string[];
  mode?: "any" | "all";
  children: React.ReactNode;
}

export function RequirePermission({
  permission,
  permissions,
  mode = "any",
  children,
}: RequirePermissionProps) {
  const { hasPermission, hasAnyPermission, isLoading } = useAuth();

  if (isLoading) return null;

  const allPerms = [
    ...(permission ? [permission] : []),
    ...(permissions ?? []),
  ];

  if (allPerms.length === 0) return <>{children}</>;

  const hasAccess =
    mode === "all"
      ? allPerms.every((p) => hasPermission(p))
      : allPerms.some((p) => hasPermission(p));

  if (!hasAccess) return null;

  return <>{children}</>;
}
