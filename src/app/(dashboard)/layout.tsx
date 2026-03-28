"use client";

import { Sidebar } from "@/components/layout/Sidebar";
import { AuthProvider } from "@/contexts/AuthContext";
import { RouteGuard } from "@/components/auth/RouteGuard";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthProvider>
      <div className="min-h-screen bg-[#f9fafb]">
        <Sidebar />
        <div className="relative z-0 pt-[56px] lg:pt-0 lg:ml-[240px] flex h-screen flex-col overflow-hidden">
          <RouteGuard>
            <div className="flex flex-1 flex-col min-h-0">
              {children}
            </div>
          </RouteGuard>
        </div>
      </div>
    </AuthProvider>
  );
}
