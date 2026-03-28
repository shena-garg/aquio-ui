"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/layout/PageHeader";
import { PartnersTable } from "@/components/partners/PartnersTable";
import { RequirePermission } from "@/components/auth/RequirePermission";
import { partnersService } from "@/services/partners";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";

export default function PartnersPage() {
  const router = useRouter();
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(50);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["partners", page, limit],
    queryFn: () =>
      partnersService.list({ page, limit }).then((res) => res.data),
    staleTime: 2 * 60 * 1000, // 2 minutes
  });

  useEffect(() => {
    if (isError) {
      toast.error("Failed to load partners. Please try again.");
    }
  }, [isError]);

  function handleLimitChange(newLimit: number) {
    setLimit(newLimit);
    setPage(1);
  }

  const actions = (
    <RequirePermission permission="vendor.add">
      <Button
        size="icon"
        onClick={() => router.push("/partners/new")}
        className="h-9 w-9 min-h-[44px] min-w-[44px] sm:h-8 sm:w-auto sm:min-h-0 sm:min-w-0 sm:px-3 sm:gap-1.5 text-[13px] !bg-[#0d9488] hover:!bg-[#0f766e] text-white"
      >
        <Plus className="h-4 w-4 sm:h-3.5 sm:w-3.5" />
        <span className="hidden sm:inline">Add Partner</span>
      </Button>
    </RequirePermission>
  );

  return (
    <div className="flex flex-1 flex-col">
      <PageHeader
        title="Partners"
        total={data?.totalCount ?? 0}
        page={page}
        limit={limit}
        onPageChange={setPage}
        onLimitChange={handleLimitChange}
        actions={actions}
      />

      <ErrorBoundary>
        <div className="flex-1 overflow-auto">
          <PartnersTable
            partners={data?.vendorCompanies ?? []}
            isLoading={isLoading}
          />
        </div>
      </ErrorBoundary>
    </div>
  );
}
