"use client";

import { CircleHelp } from "lucide-react";
import { FeaturePlaceholder } from "@/components/layout/feature-placeholder";

export default function HelpPage() {
  return (
    <FeaturePlaceholder
      title="Help"
      description="Help content has not been added yet. This placeholder keeps the route valid until the full experience is ready."
      icon={<CircleHelp className="h-6 w-6" />}
    />
  );
}
