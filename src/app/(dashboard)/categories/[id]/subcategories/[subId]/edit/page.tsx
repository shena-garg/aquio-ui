"use client";

import { use } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { SubCategoryForm } from "@/components/categories/SubCategoryForm";
import { categoriesService } from "@/services/categories";

export default function EditSubCategoryPage({
  params,
}: {
  params: Promise<{ id: string; subId: string }>;
}) {
  const { id, subId } = use(params);

  const { data: subCategory, isLoading } = useQuery({
    queryKey: ["subcategory", subId],
    queryFn: () =>
      categoriesService.getSubCategoryById(subId).then((r) => r.data),
  });

  if (isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <SubCategoryForm
      mode="edit"
      parentCategoryId={id}
      subCategoryId={subId}
      initialValues={{
        name: subCategory?.name ?? "",
        customAttributes: subCategory?.customAttributes ?? [],
      }}
    />
  );
}
