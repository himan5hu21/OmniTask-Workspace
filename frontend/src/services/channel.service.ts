"use client";

import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationOptions,
} from "@tanstack/react-query";

import { api } from "@/lib/api";
import type { ApiSuccess } from "@/types/api";

export type ChannelPermissionSet = {
  canEditChannel: boolean;
  canDeleteChannel: boolean;
  canAddMembers: boolean;
  canRemoveMembers: boolean;
  canChangeMemberRoles: boolean;
  canPromoteManagers: boolean;
};

export type PaginationMeta = {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasMore: boolean;
};

export type ChannelListQuery = {
  page?: number;
  limit?: number;
  search?: string;
  membership?: "ALL" | "JOINED" | "MANAGED";
};

export type ChannelMembersQuery = {
  page?: number;
  limit?: number;
  search?: string;
  role?: "MANAGER" | "MEMBER" | "ALL";
};

export type CreateChannelInput = {
  name: string;
  org_id: string;
};

export type UpdateChannelInput = {
  name?: string;
};

export type Channel = {
  id: string;
  name: string;
  org_id: string;
  created_at: string;
  updated_at: string;
  isDefault?: boolean;
  currentUserChannelRole?: "MANAGER" | "MEMBER" | null;
  memberCount?: number;
  messageCount?: number;
  permissions?: ChannelPermissionSet;
};

export type ChannelMember = {
  id: string;
  channel_id: string;
  user_id: string;
  role: "MANAGER" | "MEMBER";
  joined_at: string;
  user: {
    id: string;
    name: string;
    email: string;
  };
};

export type ChannelWithMeta = Channel & {
  currentUserOrgRole?: "OWNER" | "ADMIN" | "MEMBER" | null;
  permissions: ChannelPermissionSet;
  stats: {
    memberCount: number;
    messageCount: number;
    taskCount: number;
  };
};

export type AddChannelMemberInput = {
  user_id: string;
  role?: "MANAGER" | "MEMBER";
};

export type UpdateChannelMemberRoleInput = {
  role: "MANAGER" | "MEMBER";
};

export type ChannelListResponse = ApiSuccess<{
  channels: Channel[];
  pagination: PaginationMeta;
  currentUserOrgRole: "OWNER" | "ADMIN" | "MEMBER";
}>;

export type ChannelResponse = ApiSuccess<ChannelWithMeta>;

export type ChannelMembersResponse = ApiSuccess<{
  members: ChannelMember[];
  pagination: PaginationMeta;
  currentUserOrgRole: "OWNER" | "ADMIN" | "MEMBER" | null;
  currentUserChannelRole: "MANAGER" | "MEMBER" | null;
  permissions: ChannelPermissionSet;
}>;

export type SuccessResponse = ApiSuccess<{ success: boolean }>;

export const channelKeys = {
  all: ["channels"] as const,
  byOrg: (orgId: string, query: ChannelListQuery = {}) =>
    [...channelKeys.all, "org", orgId, query] as const,
  byId: (id: string) => [...channelKeys.all, "detail", id] as const,
  members: (id: string, query: ChannelMembersQuery = {}) =>
    [...channelKeys.all, "members", id, query] as const,
};

export async function getOrgChannels(
  orgId: string,
  query: ChannelListQuery = {}
): Promise<ChannelListResponse> {
  const response = await api.get<ChannelListResponse>(`/organizations/${orgId}/channels`, {
    params: query,
  });
  return response.data;
}

export async function getChannelById(channelId: string): Promise<ChannelResponse> {
  const response = await api.get<ChannelResponse>(`/channels/${channelId}`);
  return response.data;
}

export async function getChannelMembers(
  channelId: string,
  query: ChannelMembersQuery = {}
): Promise<ChannelMembersResponse> {
  const params = {
    ...query,
    role: query.role === "ALL" ? undefined : query.role,
  };
  const response = await api.get<ChannelMembersResponse>(`/channels/${channelId}/members`, {
    params,
  });
  return response.data;
}

export async function createChannel(data: CreateChannelInput): Promise<ChannelResponse> {
  const response = await api.post<ChannelResponse>("/channels", data);
  return response.data;
}

export async function updateChannel(
  channelId: string,
  data: UpdateChannelInput
): Promise<ChannelResponse> {
  const response = await api.patch<ChannelResponse>(`/channels/${channelId}`, data);
  return response.data;
}

export async function deleteChannel(channelId: string): Promise<SuccessResponse> {
  const response = await api.delete<SuccessResponse>(`/channels/${channelId}`);
  return response.data;
}

export async function addChannelMember(
  channelId: string,
  data: AddChannelMemberInput
): Promise<SuccessResponse> {
  const response = await api.post<SuccessResponse>(`/channels/${channelId}/members`, data);
  return response.data;
}

export async function updateChannelMemberRole(
  channelId: string,
  userId: string,
  data: UpdateChannelMemberRoleInput
): Promise<SuccessResponse> {
  const response = await api.patch<SuccessResponse>(`/channels/${channelId}/members/${userId}`, data);
  return response.data;
}

export async function removeChannelMember(
  channelId: string,
  userId: string
): Promise<SuccessResponse> {
  const response = await api.delete<SuccessResponse>(`/channels/${channelId}/members/${userId}`);
  return response.data;
}

export function useOrgChannelsQuery(orgId: string, query: ChannelListQuery = {}) {
  return useQuery({
    queryKey: channelKeys.byOrg(orgId, query),
    queryFn: () => getOrgChannels(orgId, query),
    enabled: !!orgId,
    staleTime: 1000 * 60,
  });
}

export function useChannelQuery(channelId: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: channelKeys.byId(channelId),
    queryFn: () => getChannelById(channelId),
    enabled: (options?.enabled ?? true) && !!channelId,
    staleTime: 1000 * 60,
  });
}

export function useChannelMembersQuery(channelId: string, query: ChannelMembersQuery = {}) {
  return useQuery({
    queryKey: channelKeys.members(channelId, query),
    queryFn: () => getChannelMembers(channelId, query),
    enabled: !!channelId,
    staleTime: 1000 * 30,
  });
}

export function useCreateChannelMutation(
  options?: UseMutationOptions<ChannelResponse, unknown, CreateChannelInput>
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateChannelInput) => createChannel(data),
    ...options,
    onSuccess: async (data, variables, onMutateResult, context) => {
      await queryClient.invalidateQueries({ queryKey: [...channelKeys.all, "org", variables.org_id] });
      await options?.onSuccess?.(data, variables, onMutateResult, context);
    },
  });
}

export function useUpdateChannelMutation(
  options?: UseMutationOptions<ChannelResponse, unknown, { channelId: string; data: UpdateChannelInput }>
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ channelId, data }: { channelId: string; data: UpdateChannelInput }) =>
      updateChannel(channelId, data),
    ...options,
    onSuccess: async (data, variables, onMutateResult, context) => {
      await queryClient.invalidateQueries({ queryKey: channelKeys.byId(variables.channelId) });
      await queryClient.invalidateQueries({ queryKey: channelKeys.all });
      await options?.onSuccess?.(data, variables, onMutateResult, context);
    },
  });
}

export function useDeleteChannelMutation(
  options?: UseMutationOptions<SuccessResponse, unknown, string>
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (channelId: string) => deleteChannel(channelId),
    ...options,
    onSuccess: async (data, variables, onMutateResult, context) => {
      await queryClient.invalidateQueries({ queryKey: channelKeys.all });
      await options?.onSuccess?.(data, variables, onMutateResult, context);
    },
  });
}

export function useAddChannelMemberMutation(
  options?: UseMutationOptions<SuccessResponse, unknown, { channelId: string; data: AddChannelMemberInput }>
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ channelId, data }: { channelId: string; data: AddChannelMemberInput }) =>
      addChannelMember(channelId, data),
    ...options,
    onSuccess: async (data, variables, onMutateResult, context) => {
      await queryClient.invalidateQueries({ queryKey: channelKeys.byId(variables.channelId) });
      await queryClient.invalidateQueries({ queryKey: [...channelKeys.all, "members", variables.channelId] });
      await options?.onSuccess?.(data, variables, onMutateResult, context);
    },
  });
}

export function useUpdateChannelMemberRoleMutation(
  options?: UseMutationOptions<SuccessResponse, unknown, { channelId: string; userId: string; data: UpdateChannelMemberRoleInput }>
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ channelId, userId, data }: { channelId: string; userId: string; data: UpdateChannelMemberRoleInput }) =>
      updateChannelMemberRole(channelId, userId, data),
    ...options,
    onSuccess: async (data, variables, onMutateResult, context) => {
      await queryClient.invalidateQueries({ queryKey: channelKeys.byId(variables.channelId) });
      await queryClient.invalidateQueries({ queryKey: [...channelKeys.all, "members", variables.channelId] });
      await options?.onSuccess?.(data, variables, onMutateResult, context);
    },
  });
}

export function useRemoveChannelMemberMutation(
  options?: UseMutationOptions<SuccessResponse, unknown, { channelId: string; userId: string }>
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ channelId, userId }: { channelId: string; userId: string }) =>
      removeChannelMember(channelId, userId),
    ...options,
    onSuccess: async (data, variables, onMutateResult, context) => {
      await queryClient.invalidateQueries({ queryKey: channelKeys.byId(variables.channelId) });
      await queryClient.invalidateQueries({ queryKey: [...channelKeys.all, "members", variables.channelId] });
      await options?.onSuccess?.(data, variables, onMutateResult, context);
    },
  });
}
