"use client";

import { useEffect, useMemo, useState } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowLeft, Clock, Loader2, MoreHorizontal, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";
import { CustomSelect } from "@/components/ui/CustomSelect";
import { usersService } from "@/services/users";
import { rolesService } from "@/services/roles";
import { DeactivateUserModal } from "@/components/users/DeactivateUserModal";
import { SimpleActivityTimeline } from "@/components/activity/SimpleActivityTimeline";
import {
  getEntityActivityLog,
  getUserActivityLog,
  getUsers,
} from "@/services/activity";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/layout/PageHeader";

// ---------------------------------------------------------------------------
// Skeleton
// ---------------------------------------------------------------------------

function PageSkeleton() {
  return (
    <div className="flex flex-col h-full animate-pulse">
      <div className="flex items-center justify-between px-4 sm:px-6 h-[55px] border-b border-[#e5e7eb]">
        <div className="flex items-center gap-3">
          <div className="h-5 w-40 rounded bg-gray-200" />
          <div className="h-5 w-14 rounded bg-gray-200" />
        </div>
        <div className="flex gap-2">
          <div className="h-8 w-16 rounded bg-gray-200" />
          <div className="h-8 w-8 rounded bg-gray-200" />
        </div>
      </div>
      <div className="mx-4 sm:mx-8 mt-3 rounded-[10px] border border-[#f3f4f6] px-4 py-3">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex flex-col gap-1">
              <div className="h-3 w-16 rounded bg-gray-200" />
              <div className="h-4 w-24 rounded bg-gray-200" />
            </div>
          ))}
        </div>
      </div>
      <div className="flex gap-4 border-b border-[#e5e7eb] px-6 py-3 mt-2">
        <div className="h-4 w-20 rounded bg-gray-200" />
        <div className="h-4 w-28 rounded bg-gray-200" />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Info card
// ---------------------------------------------------------------------------

interface EditState {
  name: string;
  countryCode: string;
  phoneNumber: string;
  roleId: string;
}

interface InfoCardProps {
  user: Awaited<ReturnType<typeof usersService.getById>>["data"];
  roleName: string;
  isEditing: boolean;
  editState: EditState | null;
  onEditStateChange: (s: EditState) => void;
  roleOptions: { value: string; label: string }[];
}

function Cell({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1">
      <div className="text-[10px] font-semibold uppercase tracking-[0.8px] text-[#6b7280]">
        {label}
      </div>
      <div className="text-[13px] font-medium text-[#111827]">{value || "—"}</div>
    </div>
  );
}

function EditCell({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <div className="text-[10px] font-semibold uppercase tracking-[0.8px] text-[#6b7280]">
        {label}
      </div>
      {children}
    </div>
  );
}

const inputCls =
  "h-8 w-full rounded-[6px] border border-[#e5e7eb] bg-white px-3 text-[13px] text-[#111827] outline-none focus:border-[#0d9488] focus:ring-1 focus:ring-[#0d9488]";

function UserInfoCard({ user, roleName, isEditing, editState, onEditStateChange, roleOptions }: InfoCardProps) {
  const memberSince = new Date(user.createdAt).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  function update<K extends keyof EditState>(key: K, value: EditState[K]) {
    if (!editState) return;
    onEditStateChange({ ...editState, [key]: value });
  }

  if (!isEditing || !editState) {
    return (
      <div className="mx-4 sm:mx-8 mt-3">
        <div className="rounded-[10px] border border-[#e5e7eb] bg-white px-4 pt-[10px] pb-3">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <Cell label="Email" value={user.email} />
            <Cell
              label="Phone"
              value={
                user.countryCode && user.phoneNumber
                  ? `${user.countryCode} ${user.phoneNumber}`
                  : user.phoneNumber || ""
              }
            />
            <Cell label="Role" value={roleName} />
            <Cell label="Member Since" value={memberSince} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-4 sm:mx-8 mt-3">
      <div className="rounded-[10px] border border-[#0d9488]/30 bg-white px-4 pt-[10px] pb-4">
        {/* Name full width */}
        <EditCell label="Name">
          <input
            value={editState.name}
            onChange={(e) => update("name", e.target.value)}
            className={inputCls}
          />
        </EditCell>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 border-t border-[#e5e7eb] pt-3 mt-3">
          <EditCell label="Country Code">
            <input
              value={editState.countryCode}
              onChange={(e) => update("countryCode", e.target.value)}
              className={inputCls}
              placeholder="+91"
            />
          </EditCell>
          <EditCell label="Phone Number">
            <input
              value={editState.phoneNumber}
              onChange={(e) => update("phoneNumber", e.target.value)}
              className={inputCls}
            />
          </EditCell>
          <EditCell label="Role">
            <div className="h-8">
              <CustomSelect
                value={editState.roleId}
                onChange={(v) => update("roleId", v)}
                options={roleOptions}
                placeholder="Select role"
                className="h-8"
              />
            </div>
          </EditCell>
          <EditCell label="Email">
            <input
              value={user.email}
              disabled
              className={cn(inputCls, "cursor-not-allowed opacity-50")}
            />
          </EditCell>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Activity tabs content
// ---------------------------------------------------------------------------

type ActivityTab = "activity" | "own-activity";

function ActivityContent({
  userId,
  activeTab,
  roleMap,
}: {
  userId: string;
  activeTab: ActivityTab;
  roleMap: Record<string, string>;
}) {
  const {
    data: onUserData,
    fetchNextPage: fetchMoreOnUser,
    hasNextPage: hasMoreOnUser,
    isFetchingNextPage: loadingMoreOnUser,
    isLoading: loadingOn,
    refetch: refetchOn,
  } = useInfiniteQuery({
    queryKey: ["activity", "user", userId],
    queryFn: ({ pageParam }) => getEntityActivityLog("user", userId, pageParam as number),
    initialPageParam: 1,
    getNextPageParam: (last) => {
      const loaded = last.page * last.limit;
      return loaded < last.total ? last.page + 1 : undefined;
    },
    staleTime: 0,
    enabled: activeTab === "activity",
  });

  const {
    data: byUserData,
    fetchNextPage: fetchMoreByUser,
    hasNextPage: hasMoreByUser,
    isFetchingNextPage: loadingMoreByUser,
    isLoading: loadingBy,
    refetch: refetchBy,
  } = useInfiniteQuery({
    queryKey: ["activity", "by-user", userId],
    queryFn: ({ pageParam }) => getUserActivityLog(userId, pageParam as number),
    initialPageParam: 1,
    getNextPageParam: (last) => {
      const loaded = last.page * last.limit;
      return loaded < last.total ? last.page + 1 : undefined;
    },
    staleTime: 0,
    enabled: activeTab === "own-activity",
  });

  const { data: users = [], isLoading: loadingUsers } = useQuery({
    queryKey: ["audit-users"],
    queryFn: getUsers,
    staleTime: 5 * 60 * 1000,
  });

  const isLoading =
    (activeTab === "activity" ? loadingOn : loadingBy) || loadingUsers;

  const events = activeTab === "activity"
    ? (onUserData?.pages.flatMap((p) => p.items) ?? [])
    : (byUserData?.pages.flatMap((p) => p.items) ?? []);
  const hasMore = activeTab === "activity" ? hasMoreOnUser : hasMoreByUser;
  const isLoadingMore = activeTab === "activity" ? loadingMoreOnUser : loadingMoreByUser;
  const fetchMore = activeTab === "activity" ? fetchMoreOnUser : fetchMoreByUser;
  const refetch = activeTab === "activity" ? refetchOn : refetchBy;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-1.5 text-[12px] text-[#9ca3af]">
          <Clock size={12} />
          <span>Activity may take up to a minute to appear after changes</span>
        </div>
        <button
          onClick={() => refetch()}
          disabled={isLoading}
          className="flex items-center gap-1.5 text-[12px] text-[#6b7280] hover:text-[#111827] disabled:opacity-40 transition-colors"
        >
          <RefreshCw size={12} className={isLoading ? "animate-spin" : ""} />
          Refresh
        </button>
      </div>
      {isLoading ? (
        <div className="flex justify-center py-10">
          <Loader2 className="animate-spin text-gray-400" size={20} />
        </div>
      ) : (
        <SimpleActivityTimeline
          events={events}
          users={users}
          showEntityType={activeTab === "own-activity"}
          roleMap={roleMap}
          hasMore={hasMore}
          onLoadMore={fetchMore}
          isLoadingMore={isLoadingMore}
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function UserDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<ActivityTab>("activity");
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editState, setEditState] = useState<EditState | null>(null);
  const [editError, setEditError] = useState("");
  const [deactivateOpen, setDeactivateOpen] = useState(false);

  const { data: user, isLoading, isError } = useQuery({
    queryKey: ["user", id],
    queryFn: () => usersService.getById(id).then((r) => r.data),
    enabled: !!id,
    staleTime: 2 * 60 * 1000,
  });

  const { data: roles = [] } = useQuery({
    queryKey: ["roles"],
    queryFn: () => rolesService.list().then((r) => r.data),
    staleTime: 10 * 60 * 1000,
  });

  useEffect(() => {
    if (isError) toast.error("Failed to load user.");
  }, [isError]);

  const roleOptions = roles.map((r) => ({ value: r._id, label: r.name }));
  const roleName = roles.find((r) => r._id === user?.roleId)?.name ?? "—";
  const roleMap = useMemo(
    () => Object.fromEntries(roles.map((r) => [r._id, r.name])),
    [roles]
  );

  function handleEditStart() {
    if (!user) return;
    setEditState({
      name: user.name,
      countryCode: user.countryCode,
      phoneNumber: user.phoneNumber,
      roleId: user.roleId,
    });
    setEditError("");
    setIsEditing(true);
  }

  function handleEditCancel() {
    setIsEditing(false);
    setEditState(null);
    setEditError("");
  }

  async function handleSave() {
    if (!user || !editState) return;
    if (!editState.name.trim()) {
      setEditError("Name is required.");
      return;
    }
    setEditError("");
    setIsSaving(true);
    try {
      await usersService.update(user._id, {
        name: editState.name.trim(),
        countryCode: editState.countryCode.trim(),
        phoneNumber: editState.phoneNumber.trim(),
        roleId: editState.roleId,
      });
      toast.success("User updated successfully.");
      queryClient.invalidateQueries({ queryKey: ["user", id] });
      queryClient.invalidateQueries({ queryKey: ["users"] });
      setIsEditing(false);
      setEditState(null);
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? "Failed to update user.";
      setEditError(message);
    } finally {
      setIsSaving(false);
    }
  }

  if (isLoading) {
    return (
      <div className="flex flex-col h-full overflow-auto">
        <PageSkeleton />
      </div>
    );
  }

  if (isError || !user) {
    return (
      <div className="flex flex-col h-full items-center justify-center gap-4">
        <p className="text-[15px] text-gray-600">
          {isError ? "Something went wrong loading this user." : "User not found."}
        </p>
        <Button
          variant="outline"
          size="sm"
          onClick={() => router.back()}
          className="h-8 gap-1.5 text-[13px]"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Go Back
        </Button>
      </div>
    );
  }

  const statusBadge = (
    <span
      className={`inline-flex items-center rounded-[6px] px-2 h-6 text-[12px] font-medium ${
        user.status === "active"
          ? "bg-[#d1fae5] text-[#065f46]"
          : "bg-[#f3f4f6] text-[#374151]"
      }`}
    >
      {user.status === "active" ? "Active" : "Inactive"}
    </span>
  );

  const headerActions = isEditing ? (
    <div className="flex items-center gap-2">
      <Button
        variant="outline"
        className="h-9 px-3.5 rounded-[6px] text-[13px] font-medium"
        onClick={handleEditCancel}
        disabled={isSaving}
      >
        Cancel
      </Button>
      <Button
        className="h-9 px-3.5 rounded-[6px] text-[13px] font-medium bg-[#0F1720] text-white hover:bg-[#1a2533]"
        onClick={handleSave}
        disabled={isSaving}
      >
        {isSaving ? (
          <>
            <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
            Saving…
          </>
        ) : (
          "Save"
        )}
      </Button>
    </div>
  ) : (
    <div className="flex items-center gap-2">
      {user.status === "active" && (
        <Button
          variant="outline"
          className="h-9 px-3.5 rounded-[6px] text-[13px] font-medium"
          onClick={handleEditStart}
        >
          Edit
        </Button>
      )}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className="h-9 w-9 rounded-[6px] p-0">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-44">
          {user.status === "active" && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => setDeactivateOpen(true)}
                className="text-[#DC2626] focus:text-[#DC2626]"
              >
                Deactivate User
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );

  const tabs: { key: ActivityTab; label: string }[] = [
    { key: "activity", label: "Activity" },
    { key: "own-activity", label: "Own Activity" },
  ];

  return (
    <div className="flex flex-col h-full">
      <ErrorBoundary>
        <PageHeader title={user.name} left={statusBadge} right={headerActions} />

        {editError && (
          <p className="px-6 py-2 text-[13px] text-[#dc2626] bg-red-50 border-b border-red-100">
            {editError}
          </p>
        )}

        <UserInfoCard
          user={user}
          roleName={roleName}
          isEditing={isEditing}
          editState={editState}
          onEditStateChange={setEditState}
          roleOptions={roleOptions}
        />

        {/* Tab bar */}
        <div className="flex overflow-x-auto border-b border-[#e5e7eb] bg-white px-4 sm:px-6 mt-2">
          {tabs.map((tab) => {
            const isActive = tab.key === activeTab;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={cn(
                  "flex items-center gap-1.5 border-b-2 px-4 py-3 text-[14px] font-medium transition-colors whitespace-nowrap",
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
        <div className="flex-1 overflow-auto px-4 sm:px-8 py-4">
          <ActivityContent userId={id} activeTab={activeTab} roleMap={roleMap} />
        </div>

        <DeactivateUserModal
          isOpen={deactivateOpen}
          onClose={() => setDeactivateOpen(false)}
          onSuccess={() => {
            setDeactivateOpen(false);
            queryClient.invalidateQueries({ queryKey: ["user", id] });
            queryClient.invalidateQueries({ queryKey: ["users"] });
          }}
          userId={user._id}
          userName={user.name}
        />
      </ErrorBoundary>
    </div>
  );
}
