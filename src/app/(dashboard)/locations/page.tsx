"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/layout/PageHeader";
import { LocationsTable } from "@/components/locations/LocationsTable";
import { locationsService } from "@/services/locations";

export default function LocationsPage() {
  const router = useRouter();

  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(50);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["locations", page, limit],
    queryFn: () =>
      locationsService.list({ page, limit }).then((res) => res.data),
  });

  useEffect(() => {
    if (isError) {
      toast.error("Failed to load locations. Please try again.");
    }
  }, [isError]);

  function handleLimitChange(newLimit: number) {
    setLimit(newLimit);
    setPage(1);
  }

  const actions = (
    <Button
      size="icon"
      onClick={() => router.push("/locations/create")}
      className="h-9 w-9 min-h-[44px] min-w-[44px] sm:h-8 sm:w-auto sm:min-h-0 sm:min-w-0 sm:px-3 sm:gap-1.5 text-[13px] !bg-[#0d9488] hover:!bg-[#0f766e] text-white"
    >
      <Plus className="h-4 w-4 sm:h-3.5 sm:w-3.5" />
      <span className="hidden sm:inline">Add Location</span>
    </Button>
  );

  return (
    <div className="flex flex-1 flex-col">
      <PageHeader
        title="Locations"
        total={data?.totalCount ?? 0}
        page={page}
        limit={limit}
        onPageChange={setPage}
        onLimitChange={handleLimitChange}
        actions={actions}
      />

      <div className="flex-1 overflow-auto">
        <LocationsTable
          locations={data?.locations ?? []}
          isLoading={isLoading}
          onRefresh={refetch}
        />
      </div>
    </div>
  );
}
