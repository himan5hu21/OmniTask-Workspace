import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { apiRequest } from "@/api/api";
import type { ApiSuccess } from "@/types/api";

// --- TYPES ---

export type PaginationMeta = {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasMore: boolean;
};

export type OrganizationPermissionSet = {
  canEditSettings: boolean;
  canDeleteOrganization: boolean;
  canInviteMembers: boolean;
  canChangeMemberRoles: boolean;
  canRemoveMembers: boolean;
  canCreateChannels: boolean;
  canManageChannels: boolean;
};

export type OrganizationListQuery = {
  page?: number;
  limit?: number;
  search?: string;
  role?: "OWNER" | "ADMIN" | "MEMBER" | "ALL";
};

export type OrganizationMembersQuery = {
  page?: number;
  limit?: number;
  search?: string;
  role?: "OWNER" | "ADMIN" | "MEMBER" | "ALL";
};

export type CreateOrganizationInput = {
  name: string;
};

export type UpdateOrganizationInput = {
  name?: string;
};

export type Organization = {
  id: string;
  name: string;
  slug: string;
  owner_id: string;
  created_at: string;
  updated_at: string;
  role?: string;
  joined_at?: string;
  stats?: {
    memberCount: number;
    channelCount: number;
    taskCount: number;
  };
  currentUserRole?: "OWNER" | "ADMIN" | "MEMBER" | "GUEST";
};

export type OrganizationMember = {
  id: string;
  email: string;
  name: string;
  avatar_url?: string;
  role: "OWNER" | "ADMIN" | "MEMBER";
  user_id: string;
  joined_at: string;
};

export type OrganizationResponse = ApiSuccess<Organization>;
export type OrganizationsResponse = ApiSuccess<{
  organizations: Organization[];
  pagination: PaginationMeta;
}>;

export type OrganizationMembersResponse = ApiSuccess<{
  members: OrganizationMember[];
  pagination: PaginationMeta;
  currentUserRole: "OWNER" | "ADMIN" | "MEMBER";
  permissions: OrganizationPermissionSet;
}>;

export type AddMemberInput = {
  email: string;
  role?: "ADMIN" | "MEMBER";
};

export type UpdateMemberRoleInput = {
  role: "ADMIN" | "MEMBER";
};

export type SuccessResponse = ApiSuccess<{ success: boolean }>;

// --- KEYS ---

export const organizationKeys = {
  all: ["organizations"] as const,
  lists: () => [...organizationKeys.all, "list"] as const,
  list: (query: OrganizationListQuery = {}) => [...organizationKeys.lists(), query] as const,
  details: () => [...organizationKeys.all, "detail"] as const,
  detail: (orgId: string) => [...organizationKeys.details(), orgId] as const,
  members: (orgId: string, query: OrganizationMembersQuery = {}) =>
    [...organizationKeys.detail(orgId), "members", query] as const,
};

// --- SERVICE ---

export const organizationService = {
  getMyOrganizations: async (query: OrganizationListQuery = {}): Promise<OrganizationsResponse> => {
    return apiRequest.get<OrganizationsResponse>("/organizations", { params: query });
  },

  getById: async (orgId: string): Promise<OrganizationResponse> => {
    return apiRequest.get<OrganizationResponse>(`/organizations/${orgId}`);
  },

  getMembers: async (orgId: string, query: OrganizationMembersQuery = {}): Promise<OrganizationMembersResponse> => {
    const params = {
      ...query,
      role: query.role === "ALL" ? undefined : query.role,
    };
    return apiRequest.get<OrganizationMembersResponse>(`/organizations/${orgId}/members`, { params });
  },

  create: async (data: CreateOrganizationInput): Promise<OrganizationResponse> => {
    return apiRequest.post<OrganizationResponse>("/organizations", data);
  },

  update: async (orgId: string, data: UpdateOrganizationInput): Promise<OrganizationResponse> => {
    return apiRequest.patch<OrganizationResponse>(`/organizations/${orgId}`, data);
  },

  delete: async (orgId: string): Promise<SuccessResponse> => {
    return apiRequest.delete<SuccessResponse>(`/organizations/${orgId}`);
  },

  addMember: async (orgId: string, data: AddMemberInput): Promise<SuccessResponse> => {
    return apiRequest.post<SuccessResponse>(`/organizations/${orgId}/members`, data);
  },

  updateMemberRole: async (orgId: string, userId: string, data: UpdateMemberRoleInput): Promise<SuccessResponse> => {
    return apiRequest.patch<SuccessResponse>(`/organizations/${orgId}/members/${userId}`, data);
  },

  removeMember: async (orgId: string, userId: string): Promise<SuccessResponse> => {
    return apiRequest.delete<SuccessResponse>(`/organizations/${orgId}/members/${userId}`);
  },
};

// --- HOOKS ---

export const useOrganizations = (query: OrganizationListQuery = {}, options?: { enabled?: boolean }) => {
  const queryResult = useQuery({
    queryKey: organizationKeys.list(query),
    queryFn: () => organizationService.getMyOrganizations(query),
    enabled: options?.enabled ?? true,
    staleTime: 1000 * 60,
  });

  return {
    ...queryResult,
    organizations: queryResult.data?.success ? queryResult.data.data.organizations : [],
    pagination: queryResult.data?.success ? queryResult.data.data.pagination : null,
  };
};

export const useOrganization = (orgId: string, options?: { enabled?: boolean }) => {
  const query = useQuery({
    queryKey: organizationKeys.detail(orgId),
    queryFn: () => organizationService.getById(orgId),
    enabled: (options?.enabled ?? true) && !!orgId,
    staleTime: 1000 * 60,
  });

  return {
    ...query,
    organization: query.data?.success ? query.data.data : null,
  };
};

export const useOrganizationMembers = (orgId: string, query: OrganizationMembersQuery = {}) => {
  const queryResult = useQuery({
    queryKey: organizationKeys.members(orgId, query),
    queryFn: () => organizationService.getMembers(orgId, query),
    enabled: !!orgId,
    staleTime: 1000 * 30,
  });

  return {
    ...queryResult,
    members: queryResult.data?.success ? queryResult.data.data.members : [],
    pagination: queryResult.data?.success ? queryResult.data.data.pagination : null,
    currentUserRole: queryResult.data?.success ? queryResult.data.data.currentUserRole : null,
    permissions: queryResult.data?.success ? queryResult.data.data.permissions : null,
  };
};

export const useCreateOrganization = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateOrganizationInput) => organizationService.create(data),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: organizationKeys.all });
    },
  });
};

export const useUpdateOrganization = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ orgId, data }: { orgId: string; data: UpdateOrganizationInput }) =>
      organizationService.update(orgId, data),
    onSuccess: async (data, variables) => {
      await queryClient.invalidateQueries({ queryKey: organizationKeys.all });
      await queryClient.invalidateQueries({ queryKey: organizationKeys.detail(variables.orgId) });
    },
  });
};

export const useDeleteOrganization = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: organizationService.delete,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: organizationKeys.all });
    },
  });
};

export const useAddOrganizationMember = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ orgId, data }: { orgId: string; data: AddMemberInput }) =>
      organizationService.addMember(orgId, data),
    onSuccess: async (data, variables) => {
      await queryClient.invalidateQueries({ queryKey: organizationKeys.detail(variables.orgId) });
      await queryClient.invalidateQueries({ queryKey: [...organizationKeys.all, "members", variables.orgId] });
    },
  });
};

export const useUpdateOrganizationMemberRole = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ orgId, userId, data }: { orgId: string; userId: string; data: UpdateMemberRoleInput }) =>
      organizationService.updateMemberRole(orgId, userId, data),
    onSuccess: async (data, variables) => {
      await queryClient.invalidateQueries({ queryKey: organizationKeys.detail(variables.orgId) });
      await queryClient.invalidateQueries({ queryKey: [...organizationKeys.all, "members", variables.orgId] });
    },
  });
};

export const useRemoveOrganizationMember = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ orgId, userId }: { orgId: string; userId: string }) =>
      organizationService.removeMember(orgId, userId),
    onSuccess: async (data, variables) => {
      await queryClient.invalidateQueries({ queryKey: organizationKeys.detail(variables.orgId) });
      await queryClient.invalidateQueries({ queryKey: [...organizationKeys.all, "members", variables.orgId] });
      await queryClient.invalidateQueries({ queryKey: ["channels"] });
    },
  });
};

