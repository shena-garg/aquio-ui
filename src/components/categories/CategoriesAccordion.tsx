"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronRight, ChevronDown, MoreHorizontal } from "lucide-react";
import type { Category, SubCategory } from "@/services/categories";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { RequirePermission } from "@/components/auth/RequirePermission";

// ── Skeleton row ──────────────────────────────────────────────────────────────

const SKELETON_WIDTHS = ["w-48", "w-36", "w-56", "w-40", "w-44"];

function SkeletonRow({ width }: { width: string }) {
  return (
    <div className="flex items-center px-4 py-3 animate-pulse border-b border-gray-200 last:border-b-0">
      <div className="h-4 w-4 rounded bg-gray-200 mr-3" />
      <div className={`h-3.5 ${width} rounded bg-gray-200`} />
    </div>
  );
}

// ── Props ────────────────────────────────────────────────────────────────────

interface CategoriesAccordionProps {
  categories: Category[];
  isLoading: boolean;
  onRefresh: () => void;
}

// ── Main component ──────────────────────────────────────────────────────────

export function CategoriesAccordion({
  categories,
  isLoading,
}: CategoriesAccordionProps) {
  const router = useRouter();
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  function toggleExpand(id: string) {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  // ── Loading state ──────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="bg-white">
        {SKELETON_WIDTHS.map((w, i) => (
          <SkeletonRow key={i} width={w} />
        ))}
      </div>
    );
  }

  // ── Empty state ────────────────────────────────────────────────────────────

  if (categories.length === 0) {
    return (
      <div className="flex h-32 items-center justify-center bg-white text-[13px] text-gray-400">
        No categories found
      </div>
    );
  }

  // ── Accordion list ─────────────────────────────────────────────────────────

  return (
    <div className="bg-white">
      {categories.map((category) => {
        const isExpanded = expandedIds.has(category._id);
        const subCount = category.subCategories?.length ?? 0;

        return (
          <div key={category._id} className="border-b border-gray-200">
            {/* Parent category row */}
            <div
              className="flex items-center px-4 py-3 cursor-pointer hover:bg-gray-50"
              onClick={() => toggleExpand(category._id)}
            >
              {/* Chevron */}
              {isExpanded ? (
                <ChevronDown className="h-4 w-4 text-gray-400 flex-shrink-0" />
              ) : (
                <ChevronRight className="h-4 w-4 text-gray-400 flex-shrink-0" />
              )}

              {/* Category name + subcategory count */}
              <span className="ml-2 text-[13px] font-semibold text-gray-900">
                {category.name}
              </span>
              {subCount > 0 && (
                <span className="ml-2 text-sm text-gray-500">
                  · {subCount} subcategor{subCount === 1 ? "y" : "ies"}
                </span>
              )}

              {/* Spacer */}
              <div className="flex-1" />

              {/* Three-dot menu */}
              <RequirePermission permission="category.edit">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      className="rounded p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-[#0F1720]"
                      aria-label="More actions"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <MoreHorizontal className="h-[15px] w-[15px]" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuItem
                      onClick={() =>
                        router.push(`/categories/${category._id}/edit`)
                      }
                    >
                      Edit Category
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </RequirePermission>
            </div>

            {/* Expanded subcategories */}
            {isExpanded && (
              <div className="bg-[#F6F7F8]">
                {category.subCategories?.map((sub: SubCategory) => (
                  <div
                    key={sub._id}
                    className="flex items-center pl-10 pr-4 py-2.5 border-t border-gray-100 bg-[#F6F7F8]"
                  >
                    {/* Indent indicator */}
                    <span className="text-gray-300 mr-2">–</span>

                    {/* Subcategory name */}
                    <span className="text-[13px] text-gray-700">
                      {sub.name}
                    </span>

                    {/* Spacer */}
                    <div className="flex-1" />

                    {/* Three-dot menu */}
                    <RequirePermission permission="category.edit">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button
                            className="rounded p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-[#0F1720]"
                            aria-label="More actions"
                          >
                            <MoreHorizontal className="h-[15px] w-[15px]" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                          <DropdownMenuItem
                            onClick={() =>
                              router.push(
                                `/categories/${category._id}/subcategories/${sub._id}/edit`
                              )
                            }
                          >
                            Edit Subcategory
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </RequirePermission>
                  </div>
                ))}

                {/* Add Subcategory button */}
                <RequirePermission permission="category.add">
                  <button
                    className="w-full text-left text-[#0d9488] text-sm font-medium pl-10 py-2.5 bg-[#F6F7F8] hover:bg-gray-200 cursor-pointer border-t border-gray-100"
                    onClick={() =>
                      router.push(
                        `/categories/${category._id}/subcategories/new`
                      )
                    }
                  >
                    + Add Subcategory
                  </button>
                </RequirePermission>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
