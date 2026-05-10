"use client";

import { MessageSquare } from "lucide-react";
import { useParams } from "next/navigation";
import { FeaturePlaceholder } from "@/components/layout/feature-placeholder";

export default function DirectMessagePage() {
  const params = useParams();
  const userId = typeof params.id === "string" ? params.id : "this user";

  return (
    <FeaturePlaceholder
      title="Direct Messages"
      description={`Conversation view for ${userId} is not implemented yet. The route is now present so clicking a DM no longer sends the app to a missing page.`}
      icon={<MessageSquare className="h-6 w-6" />}
    />
  );
}
