"use client";

import { Sidebar } from "@/components/layout/Sidebar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#f9fafb]">
      <Sidebar />
      <div className="ml-[240px] flex min-h-screen flex-col">
        {children}
      </div>
    </div>
  );
}
