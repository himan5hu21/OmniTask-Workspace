"use client";

import { usePathname, useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useAuthProfile } from "@/api/auth";
import { useOrganizations } from "@/api/organizations";
import { OrganizationHeader } from "@/components/layout/app-shell-headers";

export default function WorkspaceLayout({ children }: { children: React.ReactNode }) {
  const { isLoading: isLoadingUser } = useAuthProfile();
  const pathname = usePathname();
  const router = useRouter();
  const orgId = pathname.split("/")[2];
  const isChannelRoute = pathname.includes("/channels/");
  const { organizations = [] } = useOrganizations({}, { enabled: !isChannelRoute });
  const organization = organizations.find((org) => org.id === orgId);

  if (isLoadingUser) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (isChannelRoute) {
    return <>{children}</>;
  }

  return (
    <>
      <OrganizationHeader
        organizationName={organization?.name}
        onSettingsClick={() => router.push(`/organizations/${orgId}`)}
      />
      <div className="h-full min-h-0 flex-1 overflow-y-auto overscroll-contain p-3 lg:p-6">
        {children}
      </div>
    </>
  );
}
