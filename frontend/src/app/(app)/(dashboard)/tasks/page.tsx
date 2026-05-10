"use client";

import { ClipboardList } from "lucide-react";
import { FeaturePlaceholder } from "@/components/layout/feature-placeholder";

export default function DashboardTasksPage() {
  return (
    <FeaturePlaceholder
      title="My Tasks"
      description="This task workspace is not wired up yet. The route now resolves correctly so navigation stays stable while you build the real page."
      icon={<ClipboardList className="h-6 w-6" />}
    />
  );
}
