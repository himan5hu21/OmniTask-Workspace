"use client";

import { useParams } from "next/navigation";

import { ChannelHeader } from "@/components/layout/app-shell-headers";
import { useOrgChannels, useChannelMembers } from "@/api/channels";
import { AbilityProvider } from "@/components/providers/AbilityProvider";
import { useOrganization } from "@/api/organizations";

export default function ChannelLayout({ children }: { children: React.ReactNode }) {
  const params = useParams();
  const orgId = params.id as string;
  const channelId = params.channelId as string;
  const { channels } = useOrgChannels(orgId, { page: 1, limit: 50 });
  const { organization } = useOrganization(orgId);
  const { currentUserChannelRole } = useChannelMembers(channelId);
  
  const channel = channels.find((item) => item.id === channelId);
  const orgRole = organization?.currentUserRole;

  return (
    <AbilityProvider orgRole={orgRole} channelRole={currentUserChannelRole}>
      <ChannelHeader
        organizationId={orgId}
        channelId={channelId}
        channelName={channel?.name}
      />
      <div className="min-h-0 flex flex-1 overflow-hidden">{children}</div>
    </AbilityProvider>
  );
}
