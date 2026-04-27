"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Clock, Loader2 } from "lucide-react";
import { usersService } from "@/services/users";
import { UserForm } from "@/components/users/UserForm";
import { SimpleActivityTimeline } from "@/components/activity/SimpleActivityTimeline";
import { getEntityActivityLog, getUserActivityLog, getUsers } from "@/services/activity";
import { cn } from "@/lib/utils";

type TabKey = "details" | "activity";

function EditSkeleton() {
  return (
    <div className="flex flex-1 flex-col">
      <div className="flex h-[55px] flex-shrink-0 items-center border-b border-[#e5e7eb] bg-white px-4 sm:px-6">
        <div className="h-5 w-32 rounded bg-gray-200 animate-pulse" />
      </div>
      <div className="flex-1 bg-[#f9fafb] p-4 sm:p-6">
        <div className="mx-auto grid max-w-[1100px] grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="rounded-[10px] border border-[#e5e7eb] bg-white px-3 sm:px-6 py-4 sm:py-5">
            <div className="flex flex-col gap-5">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i}>
                  <div className="h-3.5 w-24 rounded bg-gray-200 animate-pulse mb-2" />
                  <div className="h-[38px] w-full rounded-md bg-gray-200 animate-pulse" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ActivitySection({ userId }: { userId: string }) {
  const { data: byUserEvents = [], isLoading: loadingByUser } = useQuery({
    queryKey: ["activity", "by-user", userId],
    queryFn: () => getUserActivityLog(userId),
    staleTime: 2 * 60 * 1000,
  });

  const { data: onUserEvents = [], isLoading: loadingOnUser } = useQuery({
    queryKey: ["activity", "user", userId],
    queryFn: () => getEntityActivityLog("user", userId),
    staleTime: 2 * 60 * 1000,
  });

  const { data: users = [], isLoading: loadingUsers } = useQuery({
    queryKey: ["audit-users"],
    queryFn: getUsers,
    staleTime: 5 * 60 * 1000,
  });

  const loading = loadingByUser || loadingOnUser || loadingUsers;

  if (loading) {
    return (
      <div className="flex justify-center py-10">
        <Loader2 className="animate-spin text-gray-400" size={20} />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 max-w-[1100px] mx-auto">
      {/* Actions performed by this user */}
      <div>
        <h3 className="text-[13px] font-semibold text-[#374151] mb-4 flex items-center gap-2">
          <Clock size={14} className="text-[#0d9488]" />
          Actions by this user
        </h3>
        {byUserEvents.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-[#6b7280]">
            <Clock size={28} className="mb-2 opacity-30" />
            <p className="text-[13px]">No actions recorded yet</p>
          </div>
        ) : (
          <SimpleActivityTimeline
            events={byUserEvents}
            users={users}
            showEntityType
          />
        )}
      </div>

      {/* Actions performed on this user */}
      <div>
        <h3 className="text-[13px] font-semibold text-[#374151] mb-4 flex items-center gap-2">
          <Clock size={14} className="text-[#6b7280]" />
          Actions on this user
        </h3>
        {onUserEvents.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-[#6b7280]">
            <Clock size={28} className="mb-2 opacity-30" />
            <p className="text-[13px]">No activity recorded yet</p>
          </div>
        ) : (
          <SimpleActivityTimeline events={onUserEvents} users={users} />
        )}
      </div>
    </div>
  );
}

export default function EditUserPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabKey>("details");

  const { data: user, isLoading, isError } = useQuery({
    queryKey: ["user", id],
    queryFn: () => usersService.getById(id).then((r) => r.data),
    enabled: !!id,
    staleTime: 2 * 60 * 1000,
  });

  if (isLoading) return <EditSkeleton />;

  if (isError || !user) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <p className="text-sm text-gray-500">Failed to load user.</p>
      </div>
    );
  }

  const tabs: { key: TabKey; label: string }[] = [
    { key: "details", label: "Details" },
    { key: "activity", label: "Activity" },
  ];

  return (
    <div className="flex flex-1 flex-col">
      {/* Header */}
      <div className="flex h-[55px] flex-shrink-0 items-center border-b border-[#e5e7eb] bg-white px-4 sm:px-6">
        <button
          onClick={() => router.push("/users")}
          className="mr-3 rounded p-1 text-gray-500 transition-colors hover:bg-gray-100 hover:text-[#0F1720]"
          aria-label="Back to users"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <span className="text-[16px] sm:text-[18px] font-semibold text-[#111827]">
          Edit User
        </span>
      </div>

      {/* Tab bar */}
      <div className="flex border-b border-[#e5e7eb] bg-white px-4 sm:px-6">
        {tabs.map((tab) => {
          const isActive = tab.key === activeTab;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                "border-b-2 px-4 py-3 text-[14px] font-medium transition-colors whitespace-nowrap",
                isActive
                  ? "border-[#0d9488] text-[#111827]"
                  : "border-transparent text-[#6b7280] hover:text-[#111827]",
              )}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      {activeTab === "details" ? (
        <UserForm
          mode="edit"
          userId={user._id}
          headerless
          initialValues={{
            name: user.name,
            phoneNumber: user.phoneNumber,
            email: user.email,
            roleId: user.roleId,
          }}
        />
      ) : (
        <div className="flex-1 overflow-auto bg-[#f9fafb] p-4 sm:p-6">
          <ActivitySection userId={id} />
        </div>
      )}
    </div>
  );
}
