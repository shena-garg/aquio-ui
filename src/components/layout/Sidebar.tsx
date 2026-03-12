"use client";

import { Fragment, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  ShoppingCart,
  Store,
  ClipboardList,
  FileCheck2,
  Package,
  LayoutGrid,
  Building2,
  MapPin,
  Users,
  ShieldCheck,
  Settings,
  Sparkles,
  ChevronDown,
  LogOut,
  User,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const navSections = [
  {
    label: "Sourcing",
    items: [
      { label: "Buy", href: "/buy", icon: ShoppingCart },
      { label: "Sell", href: "/sell", icon: Store },
    ],
  },
  {
    label: "Orders",
    items: [
      { label: "Purchase Orders", href: "/purchase-orders", icon: ClipboardList },
      { label: "Sales Orders", href: "/sales-orders", icon: FileCheck2 },
    ],
  },
  {
    label: "Catalog",
    items: [
      { label: "Products", href: "/products", icon: Package },
      { label: "Categories", href: "/categories", icon: LayoutGrid },
      { label: "Partners", href: "/partners", icon: Building2 },
    ],
  },
  {
    label: "Organization",
    items: [
      { label: "Locations", href: "/locations", icon: MapPin },
      { label: "Users", href: "/users", icon: Users },
      { label: "Roles", href: "/roles", icon: ShieldCheck },
      { label: "Settings", href: "/settings", icon: Settings },
      { label: "Company", href: "/company", icon: Building2 },
    ],
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [userName, setUserName] = useState("");

  useEffect(() => {
    try {
      const stored = localStorage.getItem("user");
      if (stored) {
        const user = JSON.parse(stored);
        setUserName(user.userName ?? user.name ?? "");
      }
    } catch {
      // ignore parse errors
    }
  }, []);

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(href + "/");

  return (
    <aside className="fixed inset-y-0 left-0 z-30 flex w-[240px] flex-col bg-[#111827] border-r border-[#e5e7eb]">

      {/* Logo */}
      <div className="flex h-[56px] flex-shrink-0 items-center gap-[10px] border-b border-black px-5">
        <div className="h-6 w-6 flex-shrink-0">
          <img src="/logo.png" alt="Aquio logo" className="h-full w-full object-contain" />
        </div>
        <span className="text-[16px] font-semibold text-white">
          Aquio
        </span>
      </div>

      {/* Scrollable nav area */}
      <nav className="flex-1 overflow-y-auto">
        <div className="flex flex-col gap-px px-2 pt-2 pb-4">

          {/* Dashboard – standalone top item */}
          <div className="py-1">
            <Link
              href="/dashboard"
              className={cn(
                "flex items-center gap-[10px] border-l-[3px] px-3 py-2 text-[13px] font-medium transition-colors",
                isActive("/dashboard")
                  ? "bg-[#1f2937] border-l-[#0d9488] text-white"
                  : "rounded-[6px] border-l-transparent text-[#e5e7eb] hover:bg-[#1f2937]"
              )}
            >
              <LayoutDashboard
                className={cn(
                  "h-[18px] w-[18px] flex-shrink-0",
                  isActive("/dashboard") ? "text-white" : "text-[#e5e7eb]"
                )}
                strokeWidth={1.5}
              />
              Dashboard
            </Link>
          </div>

          {/* Sections */}
          {navSections.map((section) => (
            <Fragment key={section.label}>
              <div className="px-3 pt-3 pb-1.5">
                <span className="text-[11px] font-semibold tracking-[0.55px] text-[#9ca3af]">
                  {section.label}
                </span>
              </div>

              {section.items.map((item) => {
                const active = isActive(item.href);
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex items-center gap-[10px] border-l-[3px] px-3 py-2 text-[13px] font-medium transition-colors",
                      active
                        ? "bg-[#1f2937] border-l-[#0d9488] text-white"
                        : "rounded-[6px] border-l-transparent text-[#e5e7eb] hover:bg-[#1f2937]"
                    )}
                  >
                    <Icon
                      className={cn(
                        "h-[18px] w-[18px] flex-shrink-0",
                        active ? "text-white" : "text-[#e5e7eb]"
                      )}
                      strokeWidth={1.5}
                    />
                    {item.label}
                  </Link>
                );
              })}
            </Fragment>
          ))}
        </div>
      </nav>

      {/* Bottom section – pinned, never scrolls */}
      <div className="flex-shrink-0">
        {/* Ask Liora */}
        <div className="px-2 pb-2">
          <Link
            href="/ask-liora"
            className={cn(
              "flex items-center gap-[10px] border-l-[3px] px-3 py-2 text-[13px] font-medium transition-colors",
              isActive("/ask-liora")
                ? "bg-[#1f2937] border-l-[#0d9488] text-white"
                : "rounded-[6px] border-l-transparent text-[#e5e7eb] hover:bg-[#1f2937]"
            )}
          >
            <Sparkles
              className={cn(
                "h-[18px] w-[18px] flex-shrink-0",
                isActive("/ask-liora") ? "text-white" : "text-[#e5e7eb]"
              )}
              strokeWidth={1.5}
            />
            Ask Liora
          </Link>
        </div>

        {/* Divider */}
        <div className="mx-4 border-t border-[#e5e7eb]" />

        {/* User bar */}
        <div className="flex h-[50px] items-center justify-between px-5">
          <span className="text-[13px] font-semibold text-[#e5e7eb] truncate">
            {userName || "—"}
          </span>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className="rounded p-1 text-[#e5e7eb] transition-colors hover:bg-[#1f2937] hover:text-white"
                aria-label="User menu"
              >
                <ChevronDown className="h-4 w-4" strokeWidth={1.33} />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" side="top" className="w-44 mb-1">
              <DropdownMenuItem onClick={() => router.push("/profile")}>
                <User className="h-4 w-4 mr-2" />
                My Profile
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => {
                  localStorage.removeItem("accessToken");
                  localStorage.removeItem("user");
                  router.push("/login");
                }}
              >
                <LogOut className="h-4 w-4 mr-2" />
                Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

    </aside>
  );
}
