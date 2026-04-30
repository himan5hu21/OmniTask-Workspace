import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { apiRequest } from "@/lib/api";
import type { ApiSuccess } from "@/types/api";

// --- TYPES ---

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
  stats?: {
    memberCount: number;
    messageCount: number;
    taskCount: number;
  };
};

export type ChannelMember = {
  id: string;
  email: string;
  name: string;
  avatar_url?: string;
  role: "MANAGER" | "MEMBER";
  user_id: string;
  joined_at: string;
};

export type ChannelResponse = ApiSuccess<Channel>;
export type ChannelListResponse = ApiSuccess<{
  channels: Channel[];
  pagination: PaginationMeta;
  currentUserOrgRole: string;
}>;

export type ChannelMembersResponse = ApiSuccess<{
  members: ChannelMember[];
  pagination: PaginationMeta;
  permissions: ChannelPermissionSet;
  currentUserOrgRole: string;
  currentUserChannelRole: string;
}>;

export type AddChannelMemberInput = {
  user_id?: string;
  email?: string;
  role?: "MANAGER" | "MEMBER";
};

export type UpdateChannelMemberRoleInput = {
  role: "MANAGER" | "MEMBER";
};

export type SuccessResponse = ApiSuccess<{ success: boolean }>;

// --- KEYS ---

export const channelKeys = {
  all: ["channels"] as const,
  lists: () => [...channelKeys.all, "list"] as const,
  byOrg: (orgId: string, query: ChannelListQuery = {}) =>
    [...channelKeys.lists(), "org", orgId, query] as const,
  byId: (channelId: string) => [...channelKeys.all, "detail", channelId] as const,
  members: (channelId: string, query: ChannelMembersQuery = {}) =>
    [...channelKeys.all, "members", channelId, query] as const,
};

// --- SERVICE ---

export const channelService = {
  getOrgChannels: async (orgId: string, query: ChannelListQuery = {}): Promise<ChannelListResponse> => {
    return apiRequest.get<ChannelListResponse>(`/organizations/${orgId}/channels`, { params: query });
  },

  getById: async (channelId: string): Promise<ChannelResponse> => {
    return apiRequest.get<ChannelResponse>(`/channels/${channelId}`);
  },

  getMembers: async (channelId: string, query: ChannelMembersQuery = {}): Promise<ChannelMembersResponse> => {
    const params = {
      ...query,
      role: query.role === "ALL" ? undefined : query.role,
    };
    return apiRequest.get<ChannelMembersResponse>(`/channels/${channelId}/members`, { params });
  },

  create: async (data: CreateChannelInput): Promise<ChannelResponse> => {
    return apiRequest.post<ChannelResponse>("/channels", data);
  },

  update: async (channelId: string, data: UpdateChannelInput): Promise<ChannelResponse> => {
    return apiRequest.patch<ChannelResponse>(`/channels/${channelId}`, data);
  },

  delete: async (channelId: string): Promise<SuccessResponse> => {
    return apiRequest.delete<SuccessResponse>(`/channels/${channelId}`);
  },

  addMember: async (channelId: string, data: AddChannelMemberInput): Promise<SuccessResponse> => {
    return apiRequest.post<SuccessResponse>(`/channels/${channelId}/members`, data);
  },

  updateMemberRole: async (channelId: string, userId: string, data: UpdateChannelMemberRoleInput): Promise<SuccessResponse> => {
    return apiRequest.patch<SuccessResponse>(`/channels/${channelId}/members/${userId}`, data);
  },

  removeMember: async (channelId: string, userId: string): Promise<SuccessResponse> => {
    return apiRequest.delete<SuccessResponse>(`/channels/${channelId}/members/${userId}`);
  },
};

// --- HOOKS ---

export const useOrgChannels = (orgId: string, query: ChannelListQuery = {}) => {
  const queryResult = useQuery({
    queryKey: channelKeys.byOrg(orgId, query),
    queryFn: () => channelService.getOrgChannels(orgId, query),
    enabled: !!orgId,
    staleTime: 1000 * 60,
  });

  return {
    ...queryResult,
    channels: queryResult.data?.success ? queryResult.data.data.channels : [],
    pagination: queryResult.data?.success ? queryResult.data.data.pagination : null,
    currentUserOrgRole: queryResult.data?.success ? queryResult.data.data.currentUserOrgRole : null,
  };
};

export const useChannel = (channelId: string, options?: { enabled?: boolean }) => {
  const query = useQuery({
    queryKey: channelKeys.byId(channelId),
    queryFn: () => channelService.getById(channelId),
    enabled: (options?.enabled ?? true) && !!channelId,
    staleTime: 1000 * 60,
  });

  return {
    ...query,
    channel: query.data?.success ? query.data.data : null,
  };
};

export const useChannelMembers = (channelId: string, query: ChannelMembersQuery = {}) => {
  const queryResult = useQuery({
    queryKey: channelKeys.members(channelId, query),
    queryFn: () => channelService.getMembers(channelId, query),
    enabled: !!channelId,
    staleTime: 1000 * 30,
  });

  return {
    ...queryResult,
    members: queryResult.data?.success ? queryResult.data.data.members : [],
    pagination: queryResult.data?.success ? queryResult.data.data.pagination : null,
    permissions: queryResult.data?.success ? queryResult.data.data.permissions : null,
    currentUserOrgRole: queryResult.data?.success ? queryResult.data.data.currentUserOrgRole : null,
    currentUserChannelRole: queryResult.data?.success ? queryResult.data.data.currentUserChannelRole : null,
  };
};

export const useCreateChannel = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: channelService.create,
    onSuccess: async (data, variables) => {
      await queryClient.invalidateQueries({ queryKey: [...channelKeys.all, "org", variables.org_id] });
    },
  });
};

export const useUpdateChannel = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ channelId, data }: { channelId: string; data: UpdateChannelInput }) =>
      channelService.update(channelId, data),
    onSuccess: async (data, variables) => {
      await queryClient.invalidateQueries({ queryKey: channelKeys.byId(variables.channelId) });
      await queryClient.invalidateQueries({ queryKey: channelKeys.all });
    },
  });
};

export const useDeleteChannel = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: channelService.delete,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: channelKeys.all });
    },
  });
};

export const useAddChannelMember = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ channelId, data }: { channelId: string; data: AddChannelMemberInput }) =>
      channelService.addMember(channelId, data),
    onSuccess: async (data, variables) => {
      await queryClient.invalidateQueries({ queryKey: channelKeys.byId(variables.channelId) });
      await queryClient.invalidateQueries({ queryKey: [...channelKeys.all, "members", variables.channelId] });
    },
  });
};

export const useUpdateChannelMemberRole = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ channelId, userId, data }: { channelId: string; userId: string; data: UpdateChannelMemberRoleInput }) =>
      channelService.updateMemberRole(channelId, userId, data),
    onSuccess: async (data, variables) => {
      await queryClient.invalidateQueries({ queryKey: channelKeys.byId(variables.channelId) });
      await queryClient.invalidateQueries({ queryKey: [...channelKeys.all, "members", variables.channelId] });
    },
  });
};

export const useRemoveChannelMember = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ channelId, userId }: { channelId: string; userId: string }) =>
      channelService.removeMember(channelId, userId),
    onSuccess: async (data, variables) => {
      await queryClient.invalidateQueries({ queryKey: channelKeys.byId(variables.channelId) });
      await queryClient.invalidateQueries({ queryKey: [...channelKeys.all, "members", variables.channelId] });
    },
  });
};

