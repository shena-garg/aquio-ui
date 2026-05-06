"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { Bell, CheckCheck, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import {
  notificationsService,
  AppNotification,
  notificationEntityUrl,
} from "@/services/notifications";

const LIMIT = 20;

const ENTITY_ICON: Record<string, string> = {
  purchase_order: "📋",
  receipt: "📋",
  item: "📋",
  product: "📦",
  partner: "🏢",
  user: "👤",
  category: "🗂",
  location: "📍",
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

function NotificationRow({
  notification,
  onRead,
}: {
  notification: AppNotification;
  onRead: (id: string) => void;
}) {
  const router = useRouter();
  const icon = ENTITY_ICON[notification.entityType] ?? "🔔";

  const handleClick = () => {
    if (!notification.read) onRead(notification._id);
    router.push(notificationEntityUrl(notification.entityType, notification.entityId));
  };

  return (
    <button
      onClick={handleClick}
      className={cn(
        "w-full text-left flex items-start gap-3 px-4 py-3 border-b border-[#f3f4f6] transition-colors hover:bg-[#f9fafb] last:border-b-0",
        !notification.read && "bg-[#f0fdfa]"
      )}
    >
      <div className="mt-2 flex-shrink-0 w-2">
        {!notification.read && <div className="h-2 w-2 rounded-full bg-[#0d9488]" />}
      </div>
      <span className="flex-shrink-0 text-[18px] mt-0.5">{icon}</span>
      <div className="flex-1 min-w-0">
        <p className={cn("text-[13px] text-[#111827]", !notification.read && "font-semibold")}>
          {notification.title}
        </p>
        {notification.performedBy && (
          <p className="text-[12px] text-[#6b7280] mt-0.5">by {notification.performedBy}</p>
        )}
        <p className="text-[11px] text-[#9ca3af] mt-0.5">{timeAgo(notification.occurredAt)}</p>
      </div>
    </button>
  );
}

export default function NotificationsPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [allLoaded, setAllLoaded] = useState<AppNotification[]>([]);

  const { isLoading, isFetching } = useQuery({
    queryKey: ["notifications", page],
    queryFn: async () => {
      const res = await notificationsService.list(page, LIMIT);
      const incoming = res.data.data;
      if (page === 1) {
        setAllLoaded(incoming);
      } else {
        setAllLoaded((prev) => [...prev, ...incoming]);
      }
      return res.data;
    },
    staleTime: 0,
    refetchInterval: page === 1 ? 30_000 : false,
  });

  const { data: latestMeta } = useQuery({
    queryKey: ["notifications", 1],
    queryFn: () => notificationsService.list(1, LIMIT).then((r) => r.data),
    staleTime: 0,
    enabled: false,
  });

  const { data: unreadRes } = useQuery({
    queryKey: ["notifications-unread-count"],
    queryFn: () => notificationsService.unreadCount().then((r) => r.data.data.count),
    staleTime: 0,
    refetchInterval: 30_000,
  });

  const markReadMutation = useMutation({
    mutationFn: notificationsService.markRead,
    onSuccess: () => {
      setAllLoaded((prev) => prev.map((n) =>
        n._id === markReadMutation.variables ? { ...n, read: true } : n
      ));
      void queryClient.invalidateQueries({ queryKey: ["notifications-unread-count"] });
    },
  });

  const markAllReadMutation = useMutation({
    mutationFn: notificationsService.markAllRead,
    onSuccess: () => {
      setAllLoaded((prev) => prev.map((n) => ({ ...n, read: true })));
      void queryClient.invalidateQueries({ queryKey: ["notifications-unread-count"] });
    },
  });

  const unreadCount = unreadRes ?? 0;
  const total = latestMeta?.pagination.total ?? 0;
  const hasMore = allLoaded.length < total;

  return (
    <div className="flex flex-1 flex-col">
      <PageHeader
        title="Notifications"
        actions={
          unreadCount > 0 ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => markAllReadMutation.mutate()}
              disabled={markAllReadMutation.isPending}
              className="flex items-center gap-1.5 text-[13px]"
            >
              <CheckCheck className="h-4 w-4" />
              Mark all as read
            </Button>
          ) : undefined
        }
      />

      <div className="flex-1 overflow-auto bg-[#f9fafb]">
        <div className="mx-auto max-w-[720px] py-4 px-4 sm:px-6">
          <div className="bg-white rounded-lg border border-[#e5e7eb] overflow-hidden">
            {isLoading && page === 1 ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
              </div>
            ) : allLoaded.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3">
                <Bell className="h-10 w-10 text-gray-300" strokeWidth={1.5} />
                <p className="text-[14px] text-[#6b7280]">No notifications yet</p>
              </div>
            ) : (
              <>
                {allLoaded.map((n) => (
                  <NotificationRow
                    key={n._id}
                    notification={n}
                    onRead={(id) => markReadMutation.mutate(id)}
                  />
                ))}
                {hasMore && (
                  <div className="flex justify-center py-3 border-t border-[#f3f4f6]">
                    <button
                      onClick={() => setPage((p) => p + 1)}
                      disabled={isFetching}
                      className="text-[13px] text-[#0d9488] font-medium hover:underline disabled:opacity-50"
                    >
                      {isFetching ? "Loading…" : "Load more"}
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
