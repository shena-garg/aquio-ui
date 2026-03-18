"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/layout/PageHeader";
import { CategoriesAccordion } from "@/components/categories/CategoriesAccordion";
import { RequirePermission } from "@/components/auth/RequirePermission";
import { categoriesService } from "@/services/categories";

export default function CategoriesPage() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data, isLoading, isError } = useQuery({
    queryKey: ["categories"],
    queryFn: () => categoriesService.list().then((res) => res.data),
  });

  useEffect(() => {
    if (isError) {
      toast.error("Failed to load categories. Please try again.");
    }
  }, [isError]);

  function handleRefresh() {
    queryClient.invalidateQueries({ queryKey: ["categories"] });
  }

  const actions = (
    <RequirePermission permission="category.add">
      <Button
        size="icon"
        onClick={() => router.push("/categories/new")}
        className="h-9 w-9 min-h-[44px] min-w-[44px] sm:h-8 sm:w-auto sm:min-h-0 sm:min-w-0 sm:px-3 sm:gap-1.5 text-[13px] !bg-[#0d9488] hover:!bg-[#0f766e] text-white"
      >
        <Plus className="h-4 w-4 sm:h-3.5 sm:w-3.5" />
        <span className="hidden sm:inline">Add Category</span>
      </Button>
    </RequirePermission>
  );

  return (
    <div className="flex flex-1 flex-col">
      <PageHeader title="Categories" actions={actions} />

      <div className="flex-1 overflow-auto">
        <CategoriesAccordion
          categories={data?.categories ?? []}
          isLoading={isLoading}
          onRefresh={handleRefresh}
        />
      </div>
    </div>
  );
}
