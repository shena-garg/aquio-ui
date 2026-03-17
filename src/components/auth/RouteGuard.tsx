"use client";

import { usePathname } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { getRequiredPermissions } from "@/lib/route-permissions";
import { AccessDenied } from "./AccessDenied";

export function RouteGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { isLoading, isAuthenticated, user, hasAnyPermission } = useAuth();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  // Users without a roleId can only access /dashboard and /profile
  const noRoleAllowed = ["/dashboard", "/profile"];
  if (!user?.roleId) {
    const isAllowed = noRoleAllowed.some(
      (p) => pathname === p || pathname.startsWith(p + "/")
    );
    if (!isAllowed) {
      return <AccessDenied />;
    }
    return <>{children}</>;
  }

  // Check route-level permissions
  const required = getRequiredPermissions(pathname);
  if (required.length > 0 && !hasAnyPermission(required)) {
    return <AccessDenied />;
  }

  return <>{children}</>;
}
