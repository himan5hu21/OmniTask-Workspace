"use client";

import { Bell } from "lucide-react";
import { FeaturePlaceholder } from "@/components/layout/feature-placeholder";

export default function OrganizationNotificationsPage() {
  return (
    <FeaturePlaceholder
      title="Workspace Notifications"
      description="This organization notifications view is still pending. Keeping the route valid prevents layout state from getting stuck after browser navigation."
      icon={<Bell className="h-6 w-6" />}
    />
  );
}
