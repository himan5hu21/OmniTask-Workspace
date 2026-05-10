"use client";

import { Bell } from "lucide-react";
import { FeaturePlaceholder } from "@/components/layout/feature-placeholder";

export default function DashboardNotificationsPage() {
  return (
    <FeaturePlaceholder
      title="Notifications"
      description="Notifications are not implemented yet. This placeholder prevents the sidebar link from dropping the app into a missing-route state."
      icon={<Bell className="h-6 w-6" />}
    />
  );
}
