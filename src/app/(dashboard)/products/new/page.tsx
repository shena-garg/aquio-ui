"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { ProductForm } from "@/components/products/ProductForm";
import { productsService } from "@/services/products";

function CreateProductContent() {
  const searchParams = useSearchParams();
  const duplicateFromId = searchParams.get("duplicateFrom");

  const { data: sourceProduct, isLoading } = useQuery({
    queryKey: ["product", duplicateFromId],
    queryFn: () => productsService.getById(duplicateFromId!),
    enabled: !!duplicateFromId,
    staleTime: 5 * 60 * 1000,
  });

  if (duplicateFromId && isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
      </div>
    );
  }

  return <ProductForm initialData={sourceProduct} />;
}

export default function CreateProductPage() {
  return (
    <Suspense fallback={
      <div className="flex flex-1 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
      </div>
    }>
      <CreateProductContent />
    </Suspense>
  );
}
