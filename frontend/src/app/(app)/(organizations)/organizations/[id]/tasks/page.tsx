"use client";

import { ClipboardList } from "lucide-react";
import { FeaturePlaceholder } from "@/components/layout/feature-placeholder";

export default function OrganizationTasksPage() {
  return (
    <FeaturePlaceholder
      title="Workspace Tasks"
      description="This organization task view has not been built yet. The route exists now so navigating here and going back will not leave the shared workspace UI in a broken loading state."
      icon={<ClipboardList className="h-6 w-6" />}
    />
  );
}
