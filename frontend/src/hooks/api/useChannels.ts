import {
  useOrgChannelsQuery,
  useChannelQuery,
  useCreateChannelMutation,
  useUpdateChannelMutation,
  useDeleteChannelMutation,
  useAddChannelMemberMutation,
  useUpdateChannelMemberRoleMutation,
  useRemoveChannelMemberMutation,
  useChannelMembersQuery,
} from "@/services/channel.service";
import type { UseMutationOptions } from "@tanstack/react-query";
import type {
  AddChannelMemberInput,
  ChannelListQuery,
  ChannelMembersQuery,
  ChannelResponse,
  CreateChannelInput,
  SuccessResponse,
  UpdateChannelInput,
  UpdateChannelMemberRoleInput,
} from "@/services/channel.service";

export const useOrgChannels = (orgId: string, query: ChannelListQuery = {}) => {
  const queryResult = useOrgChannelsQuery(orgId, query);

  return {
    ...queryResult,
    channels: queryResult.data?.success ? queryResult.data.data.channels : [],
    pagination: queryResult.data?.success ? queryResult.data.data.pagination : null,
    currentUserOrgRole: queryResult.data?.success ? queryResult.data.data.currentUserOrgRole : null,
  };
};

export const useChannel = (channelId: string, options?: { enabled?: boolean }) => {
  const query = useChannelQuery(channelId, options);

  return {
    ...query,
    channel: query.data?.success ? query.data.data : null,
  };
};

export const useChannelMembers = (channelId: string, query: ChannelMembersQuery = {}) => {
  const queryResult = useChannelMembersQuery(channelId, query);

  return {
    ...queryResult,
    members: queryResult.data?.success ? queryResult.data.data.members : [],
    pagination: queryResult.data?.success ? queryResult.data.data.pagination : null,
    permissions: queryResult.data?.success ? queryResult.data.data.permissions : null,
    currentUserOrgRole: queryResult.data?.success ? queryResult.data.data.currentUserOrgRole : null,
    currentUserChannelRole: queryResult.data?.success ? queryResult.data.data.currentUserChannelRole : null,
  };
};

export const useCreateChannel = (
  options?: UseMutationOptions<ChannelResponse, unknown, CreateChannelInput>
) => useCreateChannelMutation(options);

export const useUpdateChannel = (
  options?: UseMutationOptions<ChannelResponse, unknown, { channelId: string; data: UpdateChannelInput }>
) => useUpdateChannelMutation(options);

export const useDeleteChannel = (
  options?: UseMutationOptions<SuccessResponse, unknown, string>
) => useDeleteChannelMutation(options);

export const useAddChannelMember = (
  options?: UseMutationOptions<SuccessResponse, unknown, { channelId: string; data: AddChannelMemberInput }>
) => useAddChannelMemberMutation(options);

export const useUpdateChannelMemberRole = (
  options?: UseMutationOptions<SuccessResponse, unknown, { channelId: string; userId: string; data: UpdateChannelMemberRoleInput }>
) => useUpdateChannelMemberRoleMutation(options);

export const useRemoveChannelMember = (
  options?: UseMutationOptions<SuccessResponse, unknown, { channelId: string; userId: string }>
) => useRemoveChannelMemberMutation(options);
