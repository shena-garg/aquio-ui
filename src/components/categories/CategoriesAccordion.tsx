"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronRight, ChevronDown, MoreHorizontal } from "lucide-react";
import { toast } from "sonner";
import axios from "axios";
import apiClient from "@/lib/api-client";
import type { Category, SubCategory } from "@/services/categories";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

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
  onRefresh,
}: CategoriesAccordionProps) {
  const router = useRouter();
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [itemToDelete, setItemToDelete] = useState<{
    id: string;
    name: string;
    type: "category" | "subcategory";
  } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

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

  async function handleDelete() {
    if (!itemToDelete) return;
    setIsDeleting(true);
    try {
      await apiClient.delete(`/categories/${itemToDelete.id}`);
      toast.success(`${itemToDelete.name} has been deleted`);
      setItemToDelete(null);
      onRefresh();
    } catch (error) {
      const message =
        axios.isAxiosError(error) && error.response?.data?.message
          ? error.response.data.message
          : "Failed to delete";
      toast.error(message);
    } finally {
      setIsDeleting(false);
    }
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
    <>
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
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() =>
                        setItemToDelete({
                          id: category._id,
                          name: category.name,
                          type: "category",
                        })
                      }
                      className="text-[#DC2626] focus:text-[#DC2626]"
                    >
                      Delete Category
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
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
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() =>
                              setItemToDelete({
                                id: sub._id,
                                name: sub.name,
                                type: "subcategory",
                              })
                            }
                            className="text-[#DC2626] focus:text-[#DC2626]"
                          >
                            Delete Subcategory
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  ))}

                  {/* Add Subcategory button */}
                  <button
                    className="w-full text-left text-[#4A51D8] text-sm font-medium pl-10 py-2.5 bg-[#F6F7F8] hover:bg-gray-200 cursor-pointer border-t border-gray-100"
                    onClick={() =>
                      router.push(
                        `/categories/${category._id}/subcategories/new`
                      )
                    }
                  >
                    + Add Subcategory
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Delete confirmation dialog */}
      <AlertDialog
        open={!!itemToDelete}
        onOpenChange={(open) => {
          if (!open) setItemToDelete(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Delete {itemToDelete?.type === "category" ? "Category" : "Subcategory"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {itemToDelete?.name}? This action
              cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-[#DC2626] text-white hover:bg-[#B91C1C]"
            >
              {isDeleting ? "Deleting…" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
