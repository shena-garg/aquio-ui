"use client";

import { ShieldX } from "lucide-react";
import { useRouter } from "next/navigation";

export function AccessDenied() {
  const router = useRouter();

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8">
      <ShieldX className="h-16 w-16 text-gray-300" strokeWidth={1.2} />
      <h1 className="text-xl font-semibold text-[#111827]">Access Denied</h1>
      <p className="text-sm text-gray-500">
        You don&apos;t have permission to access this page.
      </p>
      <button
        onClick={() => router.push("/dashboard")}
        className="mt-2 rounded-lg bg-[#0F1720] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#1a2533]"
      >
        Go to Dashboard
      </button>
    </div>
  );
}
