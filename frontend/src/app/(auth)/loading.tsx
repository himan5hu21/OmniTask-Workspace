import { ContentSpinner } from "@/components/loaders/content-spinner";

export default function AuthLoading() {
  return (
    <ContentSpinner
      title="Preparing authentication"
      description="Loading the sign in and registration flow."
      className="min-h-screen bg-slate-50"
    />
  );
}
