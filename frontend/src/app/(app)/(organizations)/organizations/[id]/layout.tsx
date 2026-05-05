"use client";

import { Suspense } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuthProfile } from "@/api/auth";
import { useOrganizations } from "@/api/organizations";
import { OrganizationHeader } from "@/components/layout/app-shell-headers";
import { OrbitalLoader } from "@/components/ui/orbital-loader";
import { useIsMounted } from "@/hooks/useIsMounted";
import { AbilityProvider } from "@/components/providers/AbilityProvider";

export default function WorkspaceLayout({ children }: { children: React.ReactNode }) {
  const isMounted = useIsMounted();
  const { isLoading: isLoadingUser } = useAuthProfile();
  const pathname = usePathname();
  const router = useRouter();
  const orgId = pathname.split("/")[2];
  const isChannelRoute = pathname.includes("/channels/");
  const { organizations = [] } = useOrganizations({}, { enabled: !isChannelRoute });
  const organization = organizations.find((org) => org.id === orgId);

  if (!isMounted || isLoadingUser) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <OrbitalLoader size="xl" />
      </div>
    );
  }

  if (isChannelRoute) {
    return <>{children}</>;
  }

  return (
    <AbilityProvider orgRole={organization?.currentUserRole}>
      <OrganizationHeader
        organizationName={organization?.name}
        onSettingsClick={() => router.push(`/organizations/${orgId}`)}
      />
      <div className="h-full min-h-0 flex-1 overflow-y-auto overscroll-contain p-3 lg:p-6">
        <Suspense fallback={
          <div className="flex h-full items-center justify-center min-h-[400px]">
            <OrbitalLoader size="lg" />
          </div>
        }>
          {children}
        </Suspense>
      </div>
    </AbilityProvider>
  );
}
