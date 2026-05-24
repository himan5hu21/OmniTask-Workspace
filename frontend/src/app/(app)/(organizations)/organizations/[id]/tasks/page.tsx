"use client";

import { useParams } from "next/navigation";
import { MyTasksView } from "@/components/tasks/MyTasksView";

export default function OrganizationTasksPage() {
  const params = useParams();
  const orgId = params.id as string;

  return <MyTasksView orgId={orgId} title="Workspace Tasks" />;
}
