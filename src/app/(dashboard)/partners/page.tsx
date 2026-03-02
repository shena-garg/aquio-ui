"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/layout/PageHeader";
import { PartnersTable } from "@/components/partners/PartnersTable";
import { partnersService } from "@/services/partners";

export default function PartnersPage() {
  const router = useRouter();
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(50);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["partners", page, limit],
    queryFn: () =>
      partnersService.list({ page, limit }).then((res) => res.data),
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
    <Button
      size="sm"
      onClick={() => router.push("/partners/new")}
      className="h-8 gap-1.5 text-[13px] !bg-[#4A51D8] hover:!bg-[#3941C8] text-white"
    >
      <Plus className="h-3.5 w-3.5" />
      Add Partner
    </Button>
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

      <div className="flex-1 overflow-auto">
        <PartnersTable
          partners={data?.vendorCompanies ?? []}
          isLoading={isLoading}
        />
      </div>
    </div>
  );
}
