import {
  useOrganizationsQuery,
  useOrganizationQuery,
  useCreateOrganizationMutation,
  useUpdateOrganizationMutation,
  useDeleteOrganizationMutation,
  useAddOrganizationMemberMutation,
  useUpdateOrganizationMemberRoleMutation,
  useRemoveOrganizationMemberMutation,
  useOrganizationMembersQuery,
} from "@/services/organization.service";
import type { UseMutationOptions } from "@tanstack/react-query";
import type {
  AddMemberInput,
  CreateOrganizationInput,
  OrganizationListQuery,
  OrganizationMembersQuery,
  OrganizationResponse,
  SuccessResponse,
  UpdateMemberRoleInput,
  UpdateOrganizationInput,
} from "@/services/organization.service";

export const useOrganizations = (query: OrganizationListQuery = {}, options?: { enabled?: boolean }) => {
  const queryResult = useOrganizationsQuery(query, options);

  return {
    ...queryResult,
    organizations: queryResult.data?.success ? queryResult.data.data.organizations : [],
    pagination: queryResult.data?.success ? queryResult.data.data.pagination : null,
  };
};

export const useOrganization = (orgId: string, options?: { enabled?: boolean }) => {
  const query = useOrganizationQuery(orgId, options);

  return {
    ...query,
    organization: query.data?.success ? query.data.data : null,
  };
};

export const useOrganizationMembers = (orgId: string, query: OrganizationMembersQuery = {}) => {
  const queryResult = useOrganizationMembersQuery(orgId, query);

  return {
    ...queryResult,
    members: queryResult.data?.success ? queryResult.data.data.members : [],
    pagination: queryResult.data?.success ? queryResult.data.data.pagination : null,
    currentUserRole: queryResult.data?.success ? queryResult.data.data.currentUserRole : null,
    permissions: queryResult.data?.success ? queryResult.data.data.permissions : null,
  };
};

export const useCreateOrganization = (
  options?: UseMutationOptions<OrganizationResponse, unknown, CreateOrganizationInput>
) => useCreateOrganizationMutation(options);

export const useUpdateOrganization = (
  options?: UseMutationOptions<OrganizationResponse, unknown, { orgId: string; data: UpdateOrganizationInput }>
) => useUpdateOrganizationMutation(options);

export const useDeleteOrganization = (
  options?: UseMutationOptions<SuccessResponse, unknown, string>
) => useDeleteOrganizationMutation(options);

export const useAddOrganizationMember = (
  options?: UseMutationOptions<SuccessResponse, unknown, { orgId: string; data: AddMemberInput }>
) => useAddOrganizationMemberMutation(options);

export const useUpdateOrganizationMemberRole = (
  options?: UseMutationOptions<SuccessResponse, unknown, { orgId: string; userId: string; data: UpdateMemberRoleInput }>
) => useUpdateOrganizationMemberRoleMutation(options);

export const useRemoveOrganizationMember = (
  options?: UseMutationOptions<SuccessResponse, unknown, { orgId: string; userId: string }>
) => useRemoveOrganizationMemberMutation(options);
