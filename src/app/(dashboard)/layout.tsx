"use client";

import { Sidebar } from "@/components/layout/Sidebar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#F6F7F8]">
      <Sidebar />
      <div className="ml-[220px] flex min-h-screen flex-col">
        {children}
      </div>
    </div>
  );
}
