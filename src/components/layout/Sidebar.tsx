"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
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
} from "lucide-react";
import { cn } from "@/lib/utils";

const navSections = [
  {
    label: "SOURCING",
    items: [
      { label: "Buy", href: "/buy", icon: ShoppingCart },
      { label: "Sell", href: "/sell", icon: Store },
    ],
  },
  {
    label: "ORDERS",
    items: [
      { label: "Purchase Orders", href: "/purchase-orders", icon: ClipboardList },
      { label: "Sales Orders", href: "/sales-orders", icon: FileCheck2 },
    ],
  },
  {
    label: "CATALOG",
    items: [
      { label: "Products", href: "/products", icon: Package },
      { label: "Categories", href: "/categories", icon: LayoutGrid },
      { label: "Partners", href: "/partners", icon: Building2 },
    ],
  },
  {
    label: "ORGANIZATION",
    items: [
      { label: "Locations", href: "/locations", icon: MapPin },
      { label: "Users", href: "/users", icon: Users },
      { label: "Roles", href: "/roles", icon: ShieldCheck },
      { label: "Settings", href: "/settings", icon: Settings },
    ],
  },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed inset-y-0 left-0 z-30 flex w-[220px] flex-col bg-white border-r border-gray-200">

      {/* Logo */}
      <div className="flex h-[56px] flex-shrink-0 items-center gap-2.5 border-b border-gray-100 px-5">
        <div className="h-7 w-7 flex-shrink-0">
          <img src="/logo.png" alt="Aquio logo" className="h-full w-full object-contain" />
        </div>
        <span className="text-[18px] font-extrabold tracking-[0.06em] text-[#0F1720]">
          Aquio
        </span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4">
        {navSections.map((section) => (
          <div key={section.label} className="mb-5 last:mb-0">
            <p className="mb-1 px-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-gray-400">
              {section.label}
            </p>
            <ul className="space-y-0.5">
              {section.items.map((item) => {
                const isActive =
                  pathname === item.href || pathname.startsWith(item.href + "/");
                const Icon = item.icon;
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={cn(
                        "flex items-center gap-2.5 rounded-md px-2.5 py-[7px] text-[13px] font-medium transition-colors",
                        isActive
                          ? "bg-[#4A51D8] text-white"
                          : "text-[#374151] hover:bg-gray-100 hover:text-[#0F1720]"
                      )}
                    >
                      <Icon
                        className={cn(
                          "h-[15px] w-[15px] flex-shrink-0",
                          isActive ? "text-white" : "text-gray-400"
                        )}
                      />
                      {item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* Ask Liora */}
      <div className="flex-shrink-0 border-t border-gray-100 p-3">
        <Link
          href="/ask-liora"
          className={cn(
            "flex w-full items-center gap-2.5 rounded-md px-2.5 py-[7px] text-[13px] font-medium transition-colors",
            pathname === "/ask-liora"
              ? "bg-[#4A51D8] text-white"
              : "text-[#374151] hover:bg-gray-100 hover:text-[#0F1720]"
          )}
        >
          <Sparkles
            className={cn(
              "h-[15px] w-[15px] flex-shrink-0",
              pathname === "/ask-liora" ? "text-white" : "text-gray-400"
            )}
          />
          Ask Liora
        </Link>
      </div>

    </aside>
  );
}
