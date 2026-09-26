"use client";

import { Settings } from "lucide-react";
import { FeaturePlaceholder } from "@/components/layout/feature-placeholder";

export default function SettingsPage() {
  return (
    <FeaturePlaceholder
      title="Settings"
      description="Settings UI is still pending. The page exists now so navigation and browser back/forward stay predictable."
      icon={<Settings className="h-6 w-6" />}
    />
  );
}
