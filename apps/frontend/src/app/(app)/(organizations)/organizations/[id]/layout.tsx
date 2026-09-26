"use client";

import { useMemo, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuthProfile } from "@/api/auth";
import { useOrganizations } from "@/api/organizations";
import { OrganizationHeader } from "@/components/layout/app-shell-headers";
import { useIsMounted } from "@/hooks/useIsMounted";
import { AbilityProvider } from "@/components/providers/AbilityProvider";
import { useUIStore } from "@/store/ui.store";
import Spinner from "@/components/Loading";

export default function WorkspaceLayout({ children }: { children: React.ReactNode }) {
  const isMounted = useIsMounted();
  const router = useRouter();
  const { isLoading: isLoadingUser } = useAuthProfile();
  const pathname = usePathname();
  
  const orgId = pathname ? pathname.split("/")[2] : "";
  const isChannelRoute = pathname ? pathname.includes("/channels/") : false;
  
  const { openOrgSettings } = useUIStore();
  const { organizations = [], isSuccess: isOrgsSuccess } = useOrganizations({}, { enabled: isMounted });
  
  const organization = useMemo(() => {
    if (!isMounted || !orgId) return null;
    return organizations.find((org) => org.id === orgId);
  }, [isMounted, organizations, orgId]);

  // Redirect to dashboard if the user is loaded but is not a member of this organization (applies to channel routes too)
  useEffect(() => {
    if (isMounted && isOrgsSuccess && orgId) {
      const hasAccess = organizations.some((org) => org.id === orgId);
      if (!hasAccess) {
        router.replace("/dashboard");
      }
    }
  }, [isMounted, isOrgsSuccess, orgId, organizations, router]);

  if (!isMounted || isLoadingUser) {
    return <Spinner />
  }

  if (isChannelRoute) {
    return <>{children}</>;
  }

  return (
    <AbilityProvider orgRole={organization?.currentUserRole}>
      <OrganizationHeader
        organizationName={organization?.name}
        onSettingsClick={openOrgSettings}
      />
      <div className="h-full min-h-0 flex-1 overflow-y-auto overscroll-contain">
          {children}
      </div>
    </AbilityProvider>
  );
}
