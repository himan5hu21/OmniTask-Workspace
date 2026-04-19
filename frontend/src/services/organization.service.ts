// src/services/organization.service.ts
"use client";

import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationOptions,
} from "@tanstack/react-query";

import { api } from "@/lib/api";
import type { ApiSuccess } from "@/types/api";

export type CreateOrganizationInput = {
  name: string;
};

export type UpdateOrganizationInput = {
  name?: string;
};

export type Organization = {
  id: string;
  name: string;
  owner_id: string;
  created_at: string;
  updated_at: string;
  role?: 'OWNER' | 'ADMIN' | 'MEMBER';
  is_owner?: boolean;
  joined_at?: string;
};

export type OrganizationMember = {
  id: string;
  user_id: string;
  organization_id: string;
  role: 'OWNER' | 'ADMIN' | 'MEMBER';
  joined_at: string;
  user: {
    id: string;
    name: string;
    email: string;
  };
};

export type AddMemberInput = {
  email: string;
  role: 'ADMIN' | 'MEMBER';
};

export type UpdateMemberRoleInput = {
  role: 'OWNER' | 'ADMIN' | 'MEMBER';
};

export type OrganizationsResponse = ApiSuccess<Organization[]>;
export type OrganizationResponse = ApiSuccess<Organization>;
export type OrganizationWithMembersResponse = ApiSuccess<Organization & { members: OrganizationMember[] }>;
export type SuccessResponse = ApiSuccess<{ success: boolean }>;

export const organizationKeys = {
  all: ["organizations"] as const,
  list: () => [...organizationKeys.all, "list"] as const,
  detail: (id: string) => [...organizationKeys.all, "detail", id] as const,
};

// Organization CRUD
export async function getMyOrganizations(): Promise<OrganizationsResponse> {
  const response = await api.get<OrganizationsResponse>("/organizations");
  return response.data;
}

export async function getOrganizationById(orgId: string): Promise<OrganizationWithMembersResponse> {
  const response = await api.get<OrganizationWithMembersResponse>(`/organizations/${orgId}`);
  return response.data;
}

export async function createOrganization(
  data: CreateOrganizationInput
): Promise<OrganizationResponse> {
  const response = await api.post<OrganizationResponse>("/organizations", data);
  return response.data;
}

export async function updateOrganization(
  orgId: string,
  data: UpdateOrganizationInput
): Promise<OrganizationResponse> {
  const response = await api.patch<OrganizationResponse>(`/organizations/${orgId}`, data);
  return response.data;
}

export async function deleteOrganization(orgId: string): Promise<SuccessResponse> {
  const response = await api.delete<SuccessResponse>(`/organizations/${orgId}`);
  return response.data;
}

// Organization Members
export async function addOrganizationMember(
  orgId: string,
  data: AddMemberInput
): Promise<SuccessResponse> {
  const response = await api.post<SuccessResponse>(`/organizations/${orgId}/members`, data);
  return response.data;
}

export async function updateOrganizationMemberRole(
  orgId: string,
  userId: string,
  data: UpdateMemberRoleInput
): Promise<SuccessResponse> {
  const response = await api.patch<SuccessResponse>(`/organizations/${orgId}/members/${userId}`, data);
  return response.data;
}

export async function removeOrganizationMember(
  orgId: string,
  userId: string
): Promise<SuccessResponse> {
  const response = await api.delete<SuccessResponse>(`/organizations/${orgId}/members/${userId}`);
  return response.data;
}

// Query Hooks
export function useOrganizationsQuery(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: organizationKeys.list(),
    queryFn: getMyOrganizations,
    enabled: options?.enabled ?? true,
    staleTime: 1000 * 60 * 5, // 5 min cache
  });
}

export function useOrganizationQuery(orgId: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: organizationKeys.detail(orgId),
    queryFn: () => getOrganizationById(orgId),
    enabled: (options?.enabled ?? true) && !!orgId,
    staleTime: 1000 * 60 * 5, // 5 min cache
  });
}

// Mutation Hooks
export function useCreateOrganizationMutation(
  options?: UseMutationOptions<OrganizationResponse, unknown, CreateOrganizationInput>
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateOrganizationInput) => createOrganization(data),
    ...options,
    onSuccess: async (data, variables, onMutateResult, context) => {
      await queryClient.invalidateQueries({ queryKey: organizationKeys.list() });
      await options?.onSuccess?.(data, variables, onMutateResult, context);
    },
  });
}

export function useUpdateOrganizationMutation(
  options?: UseMutationOptions<OrganizationResponse, unknown, { orgId: string; data: UpdateOrganizationInput }>
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ orgId, data }: { orgId: string; data: UpdateOrganizationInput }) =>
      updateOrganization(orgId, data),
    ...options,
    onSuccess: async (data, variables, onMutateResult, context) => {
      await queryClient.invalidateQueries({ queryKey: organizationKeys.list() });
      await queryClient.invalidateQueries({ queryKey: organizationKeys.detail(variables.orgId) });
      await options?.onSuccess?.(data, variables, onMutateResult, context);
    },
  });
}

export function useDeleteOrganizationMutation(
  options?: UseMutationOptions<SuccessResponse, unknown, string>
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (orgId: string) => deleteOrganization(orgId),
    ...options,
    onSuccess: async (data, variables, onMutateResult, context) => {
      await queryClient.invalidateQueries({ queryKey: organizationKeys.list() });
      await options?.onSuccess?.(data, variables, onMutateResult, context);
    },
  });
}

export function useAddOrganizationMemberMutation(
  options?: UseMutationOptions<SuccessResponse, unknown, { orgId: string; data: AddMemberInput }>
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ orgId, data }: { orgId: string; data: AddMemberInput }) =>
      addOrganizationMember(orgId, data),
    ...options,
    onSuccess: async (data, variables, onMutateResult, context) => {
      await queryClient.invalidateQueries({ queryKey: organizationKeys.detail(variables.orgId) });
      await options?.onSuccess?.(data, variables, onMutateResult, context);
    },
  });
}

export function useUpdateOrganizationMemberRoleMutation(
  options?: UseMutationOptions<SuccessResponse, unknown, { orgId: string; userId: string; data: UpdateMemberRoleInput }>
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ orgId, userId, data }: { orgId: string; userId: string; data: UpdateMemberRoleInput }) =>
      updateOrganizationMemberRole(orgId, userId, data),
    ...options,
    onSuccess: async (data, variables, onMutateResult, context) => {
      await queryClient.invalidateQueries({ queryKey: organizationKeys.detail(variables.orgId) });
      await options?.onSuccess?.(data, variables, onMutateResult, context);
    },
  });
}

export function useRemoveOrganizationMemberMutation(
  options?: UseMutationOptions<SuccessResponse, unknown, { orgId: string; userId: string }>
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ orgId, userId }: { orgId: string; userId: string }) =>
      removeOrganizationMember(orgId, userId),
    ...options,
    onSuccess: async (data, variables, onMutateResult, context) => {
      await queryClient.invalidateQueries({ queryKey: organizationKeys.detail(variables.orgId) });
      await options?.onSuccess?.(data, variables, onMutateResult, context);
    },
  });
}
