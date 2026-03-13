"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { categoriesService } from "@/services/categories";

interface CategoryFormProps {
  mode: "create" | "edit";
  categoryId?: string;
  initialValues?: { name: string };
}

export function CategoryForm({ mode, categoryId, initialValues }: CategoryFormProps) {
  const router = useRouter();
  const isEdit = mode === "edit";

  const [name, setName] = useState(initialValues?.name ?? "");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit() {
    if (!name.trim()) {
      setError("Category name is required");
      return;
    }
    if (isSubmitting) return;
    setError("");

    setIsSubmitting(true);
    try {
      if (isEdit && categoryId) {
        await categoriesService.update(categoryId, { name: name.trim() });
        toast.success("Category updated successfully");
      } else {
        await categoriesService.create({ name: name.trim() });
        toast.success("Category created successfully");
      }
      router.push("/categories");
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ??
        `Failed to ${isEdit ? "update" : "create"} category`;
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="flex flex-1 flex-col">
      {/* Header */}
      <div className="flex h-[55px] flex-shrink-0 items-center border-b border-[#e5e7eb] bg-white px-6">
        {isEdit && (
          <button
            onClick={() => router.push("/categories")}
            className="mr-3 rounded p-1 text-gray-500 transition-colors hover:bg-gray-100 hover:text-[#0F1720]"
            aria-label="Back to categories"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
        )}
        <span className="text-[18px] font-semibold text-[#111827]">
          {isEdit ? "Edit Category" : "Create Category"}
        </span>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-auto bg-[#f9fafb]">
        <div className="mx-auto max-w-[600px] p-6">
          <div className="rounded-[10px] border border-[#e5e7eb] bg-white px-6 py-5">
            <div className="flex flex-col gap-5">
              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Category Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="Enter category name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className={`w-full border ${
                    error ? "border-[#dc2626]" : "border-gray-300"
                  } rounded-md px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#0d9488] focus:border-[#0d9488]`}
                />
                {error && (
                  <p className="text-[12px] text-[#dc2626] mt-1">{error}</p>
                )}
              </div>
            </div>

            {/* Action buttons */}
            <div className="mt-8 flex justify-end gap-2 border-t border-gray-200 pt-4">
              <Button
                variant="outline"
                onClick={() => router.push("/categories")}
                disabled={isSubmitting}
                className="border-gray-200 text-gray-600 hover:text-[#0F1720]"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="bg-[#0d9488] hover:bg-[#0f766e] text-white"
              >
                {isSubmitting && (
                  <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                )}
                {isEdit ? "Update Category" : "Create Category"}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
