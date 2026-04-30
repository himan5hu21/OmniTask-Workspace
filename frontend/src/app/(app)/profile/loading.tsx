import { ContentSpinner } from "@/components/loaders/content-spinner";

export default function ProfileLoading() {
  return (
    <ContentSpinner
      title="Opening profile"
      description="Loading your account details."
      className="min-h-screen bg-slate-50"
    />
  );
}

