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
  ChevronDown,
  LogOut,
  User,
  Menu,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/contexts/AuthContext";
import type { LucideIcon } from "lucide-react";

interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  permission?: string;
}

interface NavSection {
  label: string;
  items: NavItem[];
}

const navSections: NavSection[] = [
  {
    label: "Sourcing",
    items: [
      { label: "Buy", href: "/buy", icon: ShoppingCart, permission: "auction-buy.view" },
      { label: "Sell", href: "/sell", icon: Store, permission: "auction-sale.view" },
    ],
  },
  {
    label: "Orders",
    items: [
      { label: "Purchase Orders", href: "/purchase-orders", icon: ClipboardList, permission: "purchase-order.view" },
      { label: "Sales Orders", href: "/sales-orders", icon: FileCheck2, permission: "sales-order.view" },
    ],
  },
  {
    label: "Catalog",
    items: [
      { label: "Products", href: "/products", icon: Package, permission: "product.view" },
      { label: "Categories", href: "/categories", icon: LayoutGrid, permission: "category.view" },
      { label: "Partners", href: "/partners", icon: Building2, permission: "vendor.view" },
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
  const { user, hasPermission, isLoading, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  // Close drawer on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  // Lock body scroll when drawer is open
  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = "hidden";
      return () => { document.body.style.overflow = ""; };
    }
  }, [mobileOpen]);

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(href + "/");

  const sidebarContent = (
    <>
      {/* Logo */}
      <div className="flex h-[56px] flex-shrink-0 items-center justify-between border-b border-black px-5">
        <div className="flex items-center gap-[10px]">
          <div className="h-6 w-6 flex-shrink-0">
            <img src="/logo.png" alt="Aquio logo" className="h-full w-full object-contain" />
          </div>
          <span className="text-[16px] font-semibold text-white">
            Aquio
          </span>
        </div>
        {/* Close button – mobile only */}
        <button
          onClick={() => setMobileOpen(false)}
          className="lg:hidden rounded p-1 text-[#e5e7eb] hover:bg-[#1f2937] hover:text-white"
          aria-label="Close menu"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Scrollable nav area */}
      <nav className="flex-1 overflow-y-auto">
        <div className="flex flex-col gap-px px-2 pt-2 pb-4">

          {/* Dashboard – standalone top item */}
          <div className="py-1">
            <Link
              href="/dashboard"
              onClick={() => setMobileOpen(false)}
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
          {navSections.map((section) => {
            const visibleItems = section.items.filter(
              (item) => !item.permission || isLoading || hasPermission(item.permission)
            );

            if (visibleItems.length === 0) return null;

            return (
              <Fragment key={section.label}>
                <div className="px-3 pt-3 pb-1.5">
                  <span className="text-[11px] font-semibold tracking-[0.55px] text-[#9ca3af]">
                    {section.label}
                  </span>
                </div>

                {visibleItems.map((item) => {
                  const active = isActive(item.href);
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setMobileOpen(false)}
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
            );
          })}
        </div>
      </nav>

      {/* Bottom section – pinned, never scrolls */}
      <div className="flex-shrink-0">
        {/* Divider */}
        <div className="border-t border-[#e5e7eb]" />

        {/* User bar */}
        <div className="flex h-[50px] items-center justify-between px-5">
          <div className="flex items-center gap-2 min-w-0">
            <User className="h-4 w-4 flex-shrink-0 text-[#e5e7eb]" strokeWidth={1.5} />
            <span className="text-[13px] font-semibold text-[#e5e7eb] truncate">
              {user?.name || "—"}
            </span>
          </div>
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
              <DropdownMenuItem onClick={() => { setMobileOpen(false); router.push("/profile"); }}>
                <User className="h-4 w-4 mr-2" />
                My Profile
              </DropdownMenuItem>
              <DropdownMenuItem onClick={logout}>
                <LogOut className="h-4 w-4 mr-2" />
                Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </>
  );

  return (
    <>
      {/* Mobile top bar */}
      <div className="fixed top-0 left-0 right-0 z-40 flex h-[56px] items-center justify-between border-b border-[#e5e7eb] bg-[#111827] px-4 lg:hidden">
        <div className="flex items-center gap-[10px]">
          <div className="h-6 w-6 flex-shrink-0">
            <img src="/logo.png" alt="Aquio logo" className="h-full w-full object-contain" />
          </div>
          <span className="text-[16px] font-semibold text-white">
            Aquio
          </span>
        </div>
        <button
          onClick={() => setMobileOpen(true)}
          className="rounded p-1.5 text-[#e5e7eb] hover:bg-[#1f2937] hover:text-white"
          aria-label="Open menu"
        >
          <Menu className="h-5 w-5" />
        </button>
      </div>

      {/* Backdrop – mobile only */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar panel */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-[240px] flex-col bg-[#111827] border-r border-[#e5e7eb] transition-transform duration-200 ease-in-out",
          // Desktop: always visible
          "lg:translate-x-0 lg:z-30",
          // Mobile: slide in/out
          mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        {sidebarContent}
      </aside>
    </>
  );
}
