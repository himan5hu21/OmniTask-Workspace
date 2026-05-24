"use client";

import { useParams } from "next/navigation";
import {
  useMarkAllOrganizationNotificationsRead,
  useMarkNotificationRead,
  useOrganizationNotifications,
  type NotificationItem,
} from "@/api/notifications";
import { NotificationList } from "@/components/notifications/notification-list";

export default function OrganizationNotificationsPage() {
  const params = useParams();
  const orgId = params.id as string;
  const { items } = useOrganizationNotifications(orgId, {}, { enabled: !!orgId });
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllOrganizationNotificationsRead(orgId);

  return (
    <NotificationList
      title="Workspace Notifications"
      description="Assignments and mentions scoped to this workspace."
      items={items}
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
