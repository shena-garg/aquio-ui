"use client";

import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/layout/PageHeader";
import { RolesTable } from "@/components/roles/RolesTable";
import { rolesService } from "@/services/roles";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";

export default function RolesPage() {
  const router = useRouter();

  const { data: roles, isLoading } = useQuery({
    queryKey: ["roles"],
    queryFn: () => rolesService.list().then((r) => r.data),
    staleTime: 5 * 60 * 1000, // 5 minutes — roles change infrequently
  });

  const actions = (
    <Button
      size="icon"
      onClick={() => router.push("/roles/create")}
      className="h-9 w-9 min-h-[44px] min-w-[44px] sm:h-8 sm:w-auto sm:min-h-0 sm:min-w-0 sm:px-3 sm:gap-1.5 text-[13px] !bg-[#0d9488] hover:!bg-[#0f766e] text-white"
    >
      <Plus className="h-4 w-4 sm:h-3.5 sm:w-3.5" />
      <span className="hidden sm:inline">Add Role</span>
    </Button>
  );

  return (
    <div className="flex flex-1 flex-col">
      <PageHeader title="Roles" actions={actions} />

      <ErrorBoundary>
        <div className="flex-1 overflow-auto">
          <RolesTable roles={roles ?? []} isLoading={isLoading} />
        </div>
      </ErrorBoundary>
    </div>
  );
}
