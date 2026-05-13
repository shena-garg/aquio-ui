"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Building2, Users, LogOut } from "lucide-react";
import { platformService } from "@/services/platform";

const NAV_ITEMS = [
  { href: "/platform/orgs", label: "Organisations", icon: Building2 },
  { href: "/platform/admins", label: "Platform Admins", icon: Users },
];

export function PlatformSidebar() {
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    try {
      await platformService.logout();
    } catch {
      // ignore
    }
    localStorage.removeItem("platformAccessToken");
    localStorage.removeItem("platformRefreshToken");
    localStorage.removeItem("platformAdmin");
    router.push("/platform/login");
  }

  return (
    <aside className="fixed top-0 left-0 h-full w-[220px] bg-indigo-900 text-white flex flex-col z-50">
      {/* Brand */}
      <div className="flex items-center gap-2 px-5 py-5 border-b border-indigo-800">
        <div className="w-6 h-6 flex-shrink-0">
          <img src="/logo.png" alt="Aquio" className="w-full h-full object-contain brightness-0 invert" />
        </div>
        <span className="font-bold text-base tracking-wide">Aquio</span>
        <span className="text-[10px] font-semibold bg-indigo-500 px-1.5 py-0.5 rounded uppercase tracking-wide">
          Platform
        </span>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 flex flex-col gap-1">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                active
                  ? "bg-indigo-700 text-white"
                  : "text-indigo-200 hover:bg-indigo-800 hover:text-white"
              }`}
            >
              <Icon size={16} />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* Logout */}
      <div className="px-3 pb-5">
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-indigo-200 hover:bg-indigo-800 hover:text-white transition-colors"
        >
          <LogOut size={16} />
          Sign out
        </button>
      </div>
    </aside>
  );
}
