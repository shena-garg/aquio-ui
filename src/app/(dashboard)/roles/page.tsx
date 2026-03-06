"use client";

import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/layout/PageHeader";
import { RolesTable } from "@/components/roles/RolesTable";
import { rolesService } from "@/services/roles";

export default function RolesPage() {
  const router = useRouter();

  const { data: roles, isLoading } = useQuery({
    queryKey: ["roles"],
    queryFn: () => rolesService.list().then((r) => r.data),
  });

  const actions = (
    <Button
      size="sm"
      onClick={() => router.push("/roles/new")}
      className="h-8 gap-1.5 text-[13px] !bg-[#0d9488] hover:!bg-[#0f766e] text-white"
    >
      <Plus className="h-3.5 w-3.5" />
      Add Role
    </Button>
  );

  return (
    <div className="flex flex-1 flex-col">
      <PageHeader title="Roles" actions={actions} />

      <div className="flex-1 overflow-auto">
        <RolesTable roles={roles ?? []} isLoading={isLoading} />
      </div>
    </div>
  );
}
