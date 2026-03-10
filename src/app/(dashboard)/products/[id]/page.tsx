"use client";

import { useParams, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { useEffect } from "react";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { productsService } from "@/services/products";
import { ProductDetailsHeader } from "@/components/products/details/ProductDetailsHeader";
import { ProductDetailsInfoCard } from "@/components/products/details/ProductDetailsInfoCard";
import { ProductDetailsTabs } from "@/components/products/details/ProductDetailsTabs";

function FullPageSkeleton() {
  return (
    <div className="flex flex-col h-full gap-0 animate-pulse">
      {/* Header skeleton */}
      <div className="flex items-center justify-between px-6 h-[55px] border-b border-[#e5e7eb]">
        <div className="flex items-center gap-3">
          <div className="h-5 w-48 rounded bg-gray-200" />
          <div className="h-5 w-16 rounded bg-gray-200" />
        </div>
        <div className="flex gap-2">
          <div className="h-8 w-16 rounded bg-gray-200" />
          <div className="h-8 w-8 rounded bg-gray-200" />
        </div>
      </div>

      {/* Info card skeleton */}
      <div className="mx-8 mt-3 rounded-[10px] border border-[#f3f4f6] px-4 pt-[10px] pb-2">
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

      {/* Tabs skeleton */}
      <div className="flex gap-4 border-b border-[#e5e7eb] px-6 py-3">
        <div className="h-4 w-20 rounded bg-gray-200" />
        <div className="h-4 w-20 rounded bg-gray-200" />
        <div className="h-4 w-20 rounded bg-gray-200" />
        <div className="h-4 w-20 rounded bg-gray-200" />
      </div>
      <div className="flex-1 p-6 flex flex-col gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-10 w-full rounded bg-gray-200" />
        ))}
      </div>
    </div>
  );
}

export default function ProductDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

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
      <ProductDetailsHeader product={product} />
      <ProductDetailsInfoCard product={product} />
      <ProductDetailsTabs product={product} />
    </div>
  );
}
