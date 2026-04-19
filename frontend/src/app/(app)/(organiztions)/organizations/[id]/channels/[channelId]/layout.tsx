"use client";

import { useParams } from "next/navigation";

import { ChannelHeader } from "@/components/layout/app-shell-headers";
import { useOrgChannelsQuery } from "@/services/channel.service";

export default function ChannelLayout({ children }: { children: React.ReactNode }) {
  const params = useParams();
  const orgId = params.id as string;
  const channelId = params.channelId as string;
  const { data } = useOrgChannelsQuery(orgId);
  const channels = data?.success ? data.data : [];
  const channel = channels.find((item) => item.id === channelId);

  return (
    <>
      <ChannelHeader
        organizationId={orgId}
        channelId={channelId}
        channelName={channel?.name}
      />
      <div className="min-h-0 flex flex-1 overflow-hidden">{children}</div>
    </>
  );
}
