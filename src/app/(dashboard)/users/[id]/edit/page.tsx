"use client";

import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { usersService } from "@/services/users";
import { UserForm } from "@/components/users/UserForm";

function EditSkeleton() {
  return (
    <div className="flex flex-1 flex-col">
      <div className="flex h-[55px] flex-shrink-0 items-center border-b border-[#e5e7eb] bg-white px-6">
        <div className="h-5 w-32 rounded bg-gray-200 animate-pulse" />
      </div>
      <div className="flex-1 bg-[#f9fafb] p-6">
        <div className="mx-auto grid max-w-[1100px] grid-cols-2 gap-6">
          <div className="rounded-[10px] border border-[#e5e7eb] bg-white px-6 py-5">
            <div className="flex flex-col gap-5">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i}>
                  <div className="h-3.5 w-24 rounded bg-gray-200 animate-pulse mb-2" />
                  <div className="h-[38px] w-full rounded-md bg-gray-200 animate-pulse" />
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-[10px] border border-[#e5e7eb] bg-white px-5 py-5 h-fit">
            <div className="h-4 w-32 rounded bg-gray-200 animate-pulse mb-4" />
            <div className="h-3.5 w-56 rounded bg-gray-200 animate-pulse" />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function EditUserPage() {
  const { id } = useParams<{ id: string }>();

  const { data: user, isLoading, isError } = useQuery({
    queryKey: ["user", id],
    queryFn: () => usersService.getById(id).then((r) => r.data),
    enabled: !!id,
  });

  if (isLoading) return <EditSkeleton />;

  if (isError || !user) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <p className="text-sm text-gray-500">Failed to load user.</p>
      </div>
    );
  }

  return (
    <UserForm
      mode="edit"
      userId={user._id}
      initialValues={{
        name: user.name,
        phoneNumber: user.phoneNumber,
        email: user.email,
        roleId: user.roleId,
      }}
    />
  );
}
