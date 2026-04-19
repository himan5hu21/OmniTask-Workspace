"use client";

import { usePathname, useParams } from "next/navigation";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { useAuthProfile } from "@/services/auth.service";
import { useOrganizations, useOrganization } from "@/hooks/api/useOrganizations";
import { useOrgChannelsQuery } from "@/services/channel.service";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const params = useParams();
  const { user } = useAuthProfile();
  
  // Detect if we're in organization context
  const isOrganizationContext = pathname.startsWith('/organizations/') && !!params.id;
  const orgId = isOrganizationContext ? params.id as string : undefined;

  const { organizations = [] } = useOrganizations({
    enabled: isOrganizationContext,
  });
  
  // Fetch organization data if in organization context
  const { data: channelsData, isLoading: isLoadingChannels } = useOrgChannelsQuery(orgId || '');
  const { organization: orgWithMembers } = useOrganization(orgId || '', {
    enabled: isOrganizationContext,
  });
  
  const channels = channelsData?.success ? channelsData.data : [];
  const organization = organizations.find(org => org.id === orgId);
  
  // Get current user's role in the organization
  const currentUserMember = orgWithMembers?.members?.find((member) => member.user_id === user?.id);
  const userRole = currentUserMember?.role;
  
  // Check if user can add channels (ADMIN or OWNER)
  const canAddChannels = userRole === 'ADMIN' || userRole === 'OWNER';

  return (
    <SidebarProvider className="h-svh overflow-hidden bg-sidebar">
      <AppSidebar 
        mode={isOrganizationContext ? 'organization' : 'dashboard'}
        organizationId={orgId}
        organizationName={organization?.name}
        channels={channels}
        isLoadingChannels={isLoadingChannels}
        canAddChannels={canAddChannels}
        onAddChannel={() => {/* TODO: Implement add channel */}}
        className="border-r-0!"
      />
      <SidebarInset className="m-2 ml-1 flex min-h-0 flex-col overflow-hidden rounded-lg border">
        <main className="flex flex-col min-h-0 flex-1 overflow-hidden w-full">
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
