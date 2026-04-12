import { ContentSpinner } from "@/components/loaders/content-spinner";

export default function OrganizationLoading() {
  return (
    <div className="fixed inset-0 z-50 flex h-screen bg-slate-50 overflow-hidden">
      <div className="hidden w-72 border-r border-slate-200/60 bg-white/80 backdrop-blur-xl lg:block" />
      <div className="flex-1">
        <ContentSpinner
          title="Opening workspace"
          description="Loading channels, chat context, and organization data."
          className="h-full min-h-screen"
        />
      </div>
    </div>
  );
}
