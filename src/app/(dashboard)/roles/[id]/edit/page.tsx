"use client";

import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { rolesService } from "@/services/roles";
import { RoleForm } from "@/components/roles/RoleForm";

function EditSkeleton() {
  return (
    <div className="flex flex-1 flex-col">
      <div className="flex h-[55px] flex-shrink-0 items-center border-b border-[#e5e7eb] bg-white px-6">
        <div className="h-5 w-32 rounded bg-gray-200 animate-pulse" />
      </div>
      <div className="flex-1 bg-[#f9fafb] p-6">
        <div className="mx-auto max-w-[800px]">
          <div className="rounded-[10px] border border-[#e5e7eb] bg-white px-6 py-5 mb-6">
            <div className="flex flex-col gap-5">
              {Array.from({ length: 2 }).map((_, i) => (
                <div key={i}>
                  <div className="h-3.5 w-24 rounded bg-gray-200 animate-pulse mb-2" />
                  <div className="h-[38px] w-full rounded-md bg-gray-200 animate-pulse" />
                </div>
              ))}
            </div>
          </div>
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-[10px] border border-[#e5e7eb] bg-white mb-4 h-14 animate-pulse" />
          ))}
        </div>
      </div>
    </div>
  );
}

export default function EditRolePage() {
  const { id } = useParams<{ id: string }>();

  const { data: role, isLoading, isError } = useQuery({
    queryKey: ["role", id],
    queryFn: () => rolesService.getById(id).then((r) => r.data),
    enabled: !!id,
  });

  if (isLoading) return <EditSkeleton />;

  if (isError || !role) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <p className="text-sm text-gray-500">Failed to load role.</p>
      </div>
    );
  }

  return (
    <RoleForm
      mode="edit"
      roleId={role._id}
      initialValues={{
        name: role.name,
        description: role.description,
        permissionsPerEntity: role.permissionsPerEntity,
      }}
    />
  );
}
