// src/services/channel.service.ts
"use client";

import {
  useQuery,
} from "@tanstack/react-query";

import { api } from "@/lib/api";
import type { ApiSuccess } from "@/types/api";

export type Channel = {
  id: string;
  name: string;
  org_id: string;
  created_at: string;
  updated_at: string;
};

export type ChannelsResponse = ApiSuccess<Channel[]>;

export const channelKeys = {
  all: ["channels"] as const,
  byOrg: (orgId: string) => [...channelKeys.all, "org", orgId] as const,
};

export async function getOrgChannels(orgId: string): Promise<ChannelsResponse> {
  const response = await api.get<ChannelsResponse>(`/organizations/${orgId}/channels`);
  return response.data;
}

export function useOrgChannelsQuery(orgId: string) {
  return useQuery({
    queryKey: channelKeys.byOrg(orgId),
    queryFn: () => getOrgChannels(orgId),
    enabled: !!orgId,
  });
}
