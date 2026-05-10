"use client";

import { usePathname, useParams, useRouter } from "next/navigation";
import { Suspense } from "react";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { useAuthProfile } from "@/api/auth";
import { useOrganizations, useOrganization } from "@/api/organizations";
import { useOrgChannels } from "@/api/channels";
import { OrbitalLoader } from "@/components/ui/orbital-loader";
import { AbilityProvider } from "@/components/providers/AbilityProvider";
import OrganizationSettingsModal from "@/components/organizations/organization-settings-modal";

// Layout for the main app area

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const params = useParams();
  const router = useRouter();
  useAuthProfile();
  
  // Detect if we're in organization context
  const pathSegments = pathname.split('/');
  const isOrganizationContext = pathSegments[1] === 'organizations' && !!pathSegments[2];
  const orgId = isOrganizationContext ? pathSegments[2] : undefined;

  const { organizations = [], isLoading: isLoadingOrgs } = useOrganizations({}, {
    enabled: isOrganizationContext,
  });
  
  // Fetch organization data if in organization context
  const { channels, isLoading: isLoadingChannels } = useOrgChannels(orgId || "", { page: 1, limit: 50 });
  const { organization, isLoading: isLoadingOrg } = useOrganization(orgId || '', {
    enabled: isOrganizationContext,
  });

  const sidebarOrganization = organizations.find(org => org.id === orgId);
  const userRole = organization?.currentUserRole;
  
  // Check if user can add channels (ADMIN or OWNER)
  const canAddChannels = userRole === 'ADMIN' || userRole === 'OWNER';

  return (
    <AbilityProvider orgRole={userRole}>
      <SidebarProvider 
        className="h-svh overflow-hidden bg-sidebar"
        style={{ 
          "--sidebar-width": isOrganizationContext ? "20rem" : "16rem",
        } as React.CSSProperties}
      >
        <AppSidebar 
          mode={isOrganizationContext ? 'organization' : 'dashboard'}
          organizationId={orgId}
          organizationName={sidebarOrganization?.name || organization?.name}
          channels={channels}
          isLoadingOrg={isLoadingOrg || isLoadingOrgs}
          isLoadingChannels={isLoadingChannels}
          isLoadingDMs={false} // Currently dummy data, set to false
          canAddChannels={canAddChannels}
          onAddChannel={() => orgId && router.push(`/organizations/${orgId}`)}
          className="border-r-0!"
        />
        <SidebarInset className="m-2 ml-1 flex min-h-0 flex-col overflow-hidden rounded-lg border">
          <main className="flex flex-col min-h-0 flex-1 overflow-hidden">
            {children}
          </main>
        </SidebarInset>
      </SidebarProvider>
      <OrganizationSettingsModal />
    </AbilityProvider>
  );
}
