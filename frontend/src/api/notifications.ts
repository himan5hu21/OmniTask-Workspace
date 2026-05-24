import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/api/api";
import type { ApiSuccess } from "@/types/api";

export type NotificationActor = {
  id: string;
  name: string;
  email: string;
  avatar_url?: string | null;
};

export type NotificationOrganization = {
  id: string;
  name: string;
};

export type NotificationItem = {
  id: string;
  type: "TASK_ASSIGNED" | "TASK_COMMENT_MENTION" | "CHANNEL_MESSAGE_MENTION" | "DIRECT_MESSAGE";
  entityType: "TASK" | "CHANNEL" | "DM";
  entityId: string;
  title: string;
  body: string;
  metadata?: Record<string, unknown> | null;
  isRead: boolean;
  readAt?: string | null;
  createdAt: string;
  href: string;
  actor: NotificationActor | null;
  organization: NotificationOrganization | null;
};

export type NotificationListQuery = {
  page?: number;
  limit?: number;
  unreadOnly?: boolean;
};

export type NotificationListResponse = ApiSuccess<{
  items: NotificationItem[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasMore: boolean;
  };
  unreadCount: number;
}>;

export type NotificationSummaryResponse = ApiSuccess<{
  unreadCount: number;
  organizations: Record<string, number>;
}>;

export type SuccessResponse = ApiSuccess<{ success: boolean }>;

export const notificationKeys = {
  all: ["notifications"] as const,
  list: (query: NotificationListQuery = {}) => [...notificationKeys.all, "list", query] as const,
  orgList: (orgId: string, query: NotificationListQuery = {}) => [...notificationKeys.all, "org", orgId, query] as const,
  summary: () => [...notificationKeys.all, "summary"] as const,
};

export const notificationService = {
  getNotifications: async (query: NotificationListQuery = {}): Promise<NotificationListResponse> => {
    return apiRequest.get<NotificationListResponse>("/notifications", { params: query });
  },
  getOrganizationNotifications: async (orgId: string, query: NotificationListQuery = {}): Promise<NotificationListResponse> => {
    return apiRequest.get<NotificationListResponse>(`/organizations/${orgId}/notifications`, { params: query });
  },
  getSummary: async (): Promise<NotificationSummaryResponse> => {
    return apiRequest.get<NotificationSummaryResponse>("/notifications/summary");
  },
  markRead: async (notificationId: string): Promise<SuccessResponse> => {
    return apiRequest.post<SuccessResponse>(`/notifications/${notificationId}/read`);
  },
  markAllRead: async (): Promise<SuccessResponse> => {
    return apiRequest.post<SuccessResponse>("/notifications/read-all");
  },
  markAllReadForOrganization: async (orgId: string): Promise<SuccessResponse> => {
    return apiRequest.post<SuccessResponse>(`/organizations/${orgId}/notifications/read-all`);
  },
};

export const useNotifications = (query: NotificationListQuery = {}) => {
  const result = useQuery({
    queryKey: notificationKeys.list(query),
    queryFn: () => notificationService.getNotifications(query),
    staleTime: 1000 * 15,
  });

  return {
    ...result,
    items: result.data?.success ? result.data.data.items : [],
    pagination: result.data?.success ? result.data.data.pagination : null,
    unreadCount: result.data?.success ? result.data.data.unreadCount : 0,
  };
};

export const useOrganizationNotifications = (orgId: string, query: NotificationListQuery = {}, options?: { enabled?: boolean }) => {
  const result = useQuery({
    queryKey: notificationKeys.orgList(orgId, query),
    queryFn: () => notificationService.getOrganizationNotifications(orgId, query),
    enabled: (options?.enabled ?? true) && !!orgId,
    staleTime: 1000 * 15,
  });

  return {
    ...result,
    items: result.data?.success ? result.data.data.items : [],
    pagination: result.data?.success ? result.data.data.pagination : null,
    unreadCount: result.data?.success ? result.data.data.unreadCount : 0,
  };
};

export const useNotificationSummary = () => {
  const result = useQuery({
    queryKey: notificationKeys.summary(),
    queryFn: notificationService.getSummary,
    staleTime: 1000 * 15,
  });

  return {
    ...result,
    unreadCount: result.data?.success ? result.data.data.unreadCount : 0,
    organizations: result.data?.success ? result.data.data.organizations : {},
  };
};

export const useMarkNotificationRead = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (notificationId: string) => notificationService.markRead(notificationId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: notificationKeys.all });
    },
  });
};

export const useMarkAllNotificationsRead = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: notificationService.markAllRead,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: notificationKeys.all });
    },
  });
};

export const useMarkAllOrganizationNotificationsRead = (orgId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => notificationService.markAllReadForOrganization(orgId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: notificationKeys.all });
    },
  });
};
