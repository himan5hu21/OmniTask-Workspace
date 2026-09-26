import { DashboardHeader } from "@/components/layout/app-shell-headers";
import { ScrollArea } from "@/components/ui/scroll-area";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <DashboardHeader />
      <ScrollArea className="h-full min-h-0 flex-1 px-4 lg:px-8">
        {children}
      </ScrollArea>
    </>
  );
}

