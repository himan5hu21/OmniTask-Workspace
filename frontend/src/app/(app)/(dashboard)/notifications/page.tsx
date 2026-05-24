"use client";

import {
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  useNotifications,
  type NotificationItem,
} from "@/api/notifications";
import { NotificationList } from "@/components/notifications/notification-list";

export default function DashboardNotificationsPage() {
  const { items } = useNotifications();
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();

  return (
    <NotificationList
      title="Notifications"
      description="Assignments and mentions across all your workspaces."
      items={items}
      showOrganization
      isMarkingAll={markAllRead.isPending}
      onMarkRead={(notification: NotificationItem) => {
        markRead.mutate(notification.id);
      }}
      onMarkAllRead={() => {
        markAllRead.mutate();
      }}
    />
  );
}
