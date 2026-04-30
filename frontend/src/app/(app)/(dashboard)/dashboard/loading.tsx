import { ContentSpinner } from "@/components/loaders/content-spinner";

export default function DashboardLoading() {
  return (
    <ContentSpinner
      title="Opening dashboard"
      description="Loading your organizations and workspace data."
      className="min-h-screen bg-slate-50"
    />
  );
}

