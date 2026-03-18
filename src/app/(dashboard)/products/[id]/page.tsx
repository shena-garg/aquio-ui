"use client";

import { useParams, useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useEffect, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { productsService, type CreateProductPayload } from "@/services/products";
import { ProductDetailsHeader } from "@/components/products/details/ProductDetailsHeader";
import { ProductDetailsInfoCard } from "@/components/products/details/ProductDetailsInfoCard";
import { ProductDetailsExtra } from "@/components/products/details/ProductDetailsExtra";
import { ProductDetailsTabs } from "@/components/products/details/ProductDetailsTabs";

export interface ProductEditState {
  name: string;
  sku: string;
  categoryId: string;
  categoryName: string;
  subCategoryId: string;
  subCategoryName: string;
  hsnCode: string;
  gst: number;
  unitOfMeasurement: string;
  description: string;
  termsOfConditions: string[];
  files: { id: string; name: string }[];
}

function FullPageSkeleton() {
  return (
    <div className="flex flex-col h-full gap-0 animate-pulse">
      <div className="flex items-center justify-between px-4 sm:px-6 h-[55px] border-b border-[#e5e7eb]">
        <div className="flex items-center gap-3">
          <div className="h-5 w-48 rounded bg-gray-200" />
          <div className="h-5 w-16 rounded bg-gray-200" />
        </div>
        <div className="flex gap-2">
          <div className="h-8 w-16 rounded bg-gray-200" />
          <div className="h-8 w-8 rounded bg-gray-200" />
        </div>
      </div>
      <div className="mx-4 sm:mx-8 mt-3 rounded-[10px] border border-[#f3f4f6] px-4 pt-[10px] pb-2">
        {/* Desktop skeleton: 3 cols × 2 rows */}
        <div className="hidden sm:block">
          {[0, 1].map((row) => (
            <div key={row} className={`grid grid-cols-3 gap-4 ${row === 1 ? "border-t border-[#e5e7eb] pt-2 mt-2" : ""}`}>
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex flex-col gap-1">
                  <div className="h-3 w-16 rounded bg-gray-200" />
                  <div className="h-4 w-24 rounded bg-gray-200" />
                </div>
              ))}
            </div>
          ))}
        </div>
        {/* Mobile skeleton: 2 cols × 3 rows */}
        <div className="sm:hidden">
          {[0, 1, 2].map((row) => (
            <div key={row} className={`grid grid-cols-2 gap-4 ${row > 0 ? "border-t border-[#e5e7eb] pt-2 mt-2" : ""}`}>
              {Array.from({ length: 2 }).map((_, i) => (
                <div key={i} className="flex flex-col gap-1">
                  <div className="h-3 w-16 rounded bg-gray-200" />
                  <div className="h-4 w-24 rounded bg-gray-200" />
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
      <div className="flex gap-4 border-b border-[#e5e7eb] px-6 py-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-4 w-20 rounded bg-gray-200" />
        ))}
      </div>
      <div className="flex-1 p-6 flex flex-col gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-10 w-full rounded bg-gray-200" />
        ))}
      </div>
    </div>
  );
}

function buildEditState(product: {
  name: string;
  sku: string;
  categoryId: string;
  categoryName: string;
  subCategoryId: string;
  subCategoryName: string;
  hsnCode: string;
  gst: number;
  unitOfMeasurement: string;
  description?: string;
  termsOfConditions?: string[];
  files?: { id: string; name: string }[];
}): ProductEditState {
  return {
    name: product.name,
    sku: product.sku,
    categoryId: product.categoryId,
    categoryName: product.categoryName,
    subCategoryId: product.subCategoryId,
    subCategoryName: product.subCategoryName,
    hsnCode: product.hsnCode,
    gst: product.gst,
    unitOfMeasurement: product.unitOfMeasurement,
    description: product.description ?? "",
    termsOfConditions: product.termsOfConditions ?? [],
    files: product.files ?? [],
  };
}

export default function ProductDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editState, setEditState] = useState<ProductEditState | null>(null);

  const { data: product, isLoading, isError } = useQuery({
    queryKey: ["product", id],
    queryFn: () => productsService.getById(id),
    enabled: !!id,
  });

  useEffect(() => {
    if (isError) {
      toast.error("Failed to load product. Please try again.");
    }
  }, [isError]);

  function handleEditStart() {
    if (!product) return;
    setEditState(buildEditState(product));
    setIsEditing(true);
  }

  function handleEditCancel() {
    setIsEditing(false);
    setEditState(null);
  }

  async function handleSave() {
    if (!product || !editState) return;

    setIsSaving(true);
    try {
      const payload: CreateProductPayload = {
        name: editState.name.trim(),
        unitOfMeasurement: editState.unitOfMeasurement,
        categoryId: editState.categoryId,
        subCategoryId: editState.subCategoryId,
        hsnCode: editState.hsnCode.trim(),
        gst: editState.gst,
        description: editState.description.trim() || undefined,
        termsOfConditions: editState.termsOfConditions.filter((t) => t.trim()),
        files: editState.files.length > 0 ? editState.files : undefined,
        variants: product.variants.map((v) => ({
          name: v.name,
          customAttributes: v.customAttributes.map((a) => ({
            label: a.label,
            unit: a.unit,
            value: a.value || undefined,
          })),
        })),
      };

      await productsService.update(product._id, payload);
      toast.success("Product updated successfully.");
      queryClient.invalidateQueries({ queryKey: ["product", id] });
      setIsEditing(false);
      setEditState(null);
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? "Failed to update product.";
      toast.error(message);
    } finally {
      setIsSaving(false);
    }
  }

  if (isLoading) {
    return (
      <div className="flex flex-col h-full overflow-auto">
        <FullPageSkeleton />
      </div>
    );
  }

  if (isError || !product) {
    return (
      <div className="flex flex-col h-full items-center justify-center gap-4">
        <p className="text-[15px] text-gray-600">
          {isError ? "Something went wrong loading this product." : "Product not found."}
        </p>
        <Button
          variant="outline"
          size="sm"
          onClick={() => router.back()}
          className="h-8 gap-1.5 text-[13px]"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Go Back
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-auto">
      <ProductDetailsHeader
        product={product}
        isEditing={isEditing}
        isSaving={isSaving}
        onEditStart={handleEditStart}
        onEditCancel={handleEditCancel}
        onSave={handleSave}
      />
      <ProductDetailsInfoCard
        product={product}
        isEditing={isEditing}
        editState={editState}
        onEditStateChange={setEditState}
      />
      <ProductDetailsExtra
        product={product}
        isEditing={isEditing}
        editState={editState}
        onEditStateChange={setEditState}
      />
      <ProductDetailsTabs
        product={product}
      />
    </div>
  );
}
