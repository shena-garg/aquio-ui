"use client";

import { use } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { CategoryForm } from "@/components/categories/CategoryForm";
import { categoriesService } from "@/services/categories";

export default function EditCategoryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);

  const { data: category, isLoading } = useQuery({
    queryKey: ["category", id],
    queryFn: () => categoriesService.getById(id).then((r) => r.data),
  });

  if (isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <CategoryForm
      mode="edit"
      categoryId={id}
      initialValues={{ name: category?.name ?? "" }}
    />
  );
}
