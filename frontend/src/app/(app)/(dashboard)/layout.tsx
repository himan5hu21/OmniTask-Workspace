import { DashboardHeader } from "@/components/layout/app-shell-headers";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <DashboardHeader />
      <div className="h-full min-h-0 flex-1 overflow-y-auto overscroll-contain p-6 lg:p-10">
        {children}
      </div>
    </>
  );
}
