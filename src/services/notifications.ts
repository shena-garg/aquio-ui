import apiClient from "@/lib/api-client";

export interface AppNotification {
  _id: string;
  userId: string;
  organizationId: string;
  type: string;
  title: string;
  entityType: string;
  entityId: string;
  performedBy?: string;
  read: boolean;
  readAt?: string;
  occurredAt: string;
  createdAt: string;
}

export interface NotificationsResponse {
  data: AppNotification[];
  pagination: { total: number; page: number; limit: number };
  unreadCount: number;
}

export const notificationsService = {
  list: (page = 1, limit = 20) =>
    apiClient.get<NotificationsResponse>("/notifications", { params: { page, limit } }),

  unreadCount: () =>
    apiClient.get<{ data: { count: number } }>("/notifications/unread-count"),

  markRead: (id: string) =>
    apiClient.patch(`/notifications/${id}/read`, {}),

  markAllRead: () =>
    apiClient.patch("/notifications/mark-all-read", {}),
};

export function notificationEntityUrl(entityType: string, entityId: string): string {
  switch (entityType) {
    case "purchase_order": return `/purchase-orders/${entityId}`;
    case "receipt":        return `/purchase-orders/${entityId}`;
    case "item":           return `/purchase-orders/${entityId}`;
    case "product":        return `/products/${entityId}`;
    case "partner":        return `/partners/${entityId}`;
    case "user":           return `/users`;
    case "category":       return `/categories`;
    case "location":       return `/locations`;
    default:               return `/dashboard`;
  }
}
