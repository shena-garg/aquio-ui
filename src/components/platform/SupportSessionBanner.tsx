"use client";

import { useRouter } from "next/navigation";
import { ShieldAlert, LogOut } from "lucide-react";
import { authService } from "@/services/auth";

interface SupportSessionBannerProps {
  orgName?: string;
}

export function SupportSessionBanner({ orgName }: SupportSessionBannerProps) {
  const router = useRouter();

  async function handleExit() {
    // Logout the support B2B session
    try {
      await authService.logout();
    } catch {
      // ignore
    }

    // Clear B2B session
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    localStorage.removeItem("user");

    // Restore platform admin session
    const stashedToken = localStorage.getItem("platformAccessToken_stash");
    const stashedRefresh = localStorage.getItem("platformRefreshToken_stash");
    const stashedAdmin = localStorage.getItem("platformAdmin_stash");

    if (stashedToken) {
      localStorage.setItem("platformAccessToken", stashedToken);
      localStorage.removeItem("platformAccessToken_stash");
    }
    if (stashedRefresh) {
      localStorage.setItem("platformRefreshToken", stashedRefresh);
      localStorage.removeItem("platformRefreshToken_stash");
    }
    if (stashedAdmin) {
      localStorage.setItem("platformAdmin", stashedAdmin);
      localStorage.removeItem("platformAdmin_stash");
    }

    router.push("/platform/orgs");
  }

  return (
    <div className="fixed top-0 left-0 right-0 z-[200] bg-amber-500 text-white px-4 py-2 flex items-center justify-between text-sm font-medium shadow-md">
      <div className="flex items-center gap-2">
        <ShieldAlert size={16} className="flex-shrink-0" />
        <span>
          Support session active
          {orgName ? ` — viewing as ${orgName}` : ""}
        </span>
      </div>
      <button
        onClick={handleExit}
        className="flex items-center gap-1.5 bg-amber-600 hover:bg-amber-700 px-3 py-1 rounded text-xs font-semibold transition-colors"
      >
        <LogOut size={13} />
        Exit Session
      </button>
    </div>
  );
}
