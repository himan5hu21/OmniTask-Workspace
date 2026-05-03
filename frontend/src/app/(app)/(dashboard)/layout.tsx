import { Suspense } from "react";
import { DashboardHeader } from "@/components/layout/app-shell-headers";
import { ScrollArea } from "@/components/ui/scroll-area";
import { OrbitalLoader } from "@/components/ui/orbital-loader";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <DashboardHeader />
      <ScrollArea className="h-full min-h-0 flex-1 px-4 lg:px-8">
        <Suspense fallback={
          <div className="flex h-full min-h-[400px] items-center justify-center">
            <OrbitalLoader size="lg" />
          </div>
        }>
          {children}
        </Suspense>
      </ScrollArea>
    </>
  );
}

