"use client";

import { Sidebar } from "@/components/layout/Sidebar";
import { AuthProvider } from "@/contexts/AuthContext";
import { RouteGuard } from "@/components/auth/RouteGuard";
import { VerificationBanner } from "@/components/auth/VerificationBanner";
import { SupportSessionBannerWrapper } from "@/components/platform/SupportSessionBannerWrapper";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthProvider>
      <SupportSessionBannerWrapper />
      <div className="min-h-screen bg-[#f9fafb]">
        <Sidebar />
        <div className="relative z-0 pt-[56px] lg:pt-0 lg:ml-[240px] flex min-h-screen flex-col">
          <VerificationBanner />
          <div className="flex-1 min-h-0 flex flex-col">
            <RouteGuard>{children}</RouteGuard>
          </div>
        </div>
      </div>
    </AuthProvider>
  );
}
