// src/hooks/useOrganizations.ts
import {
  useOrganizationsQuery,
  useOrganizationQuery,
  useCreateOrganizationMutation,
  useUpdateOrganizationMutation,
  useDeleteOrganizationMutation,
  useAddOrganizationMemberMutation,
  useUpdateOrganizationMemberRoleMutation,
  useRemoveOrganizationMemberMutation,
} from "@/services/organization.service";
import type { UseMutationOptions } from "@tanstack/react-query";
import type {
  CreateOrganizationInput,
  UpdateOrganizationInput,
  OrganizationResponse,
  SuccessResponse,
  AddMemberInput,
  UpdateMemberRoleInput,
} from "@/services/organization.service";

export const useOrganizations = () => {
  const query = useOrganizationsQuery();

  return {
    ...query,
    organizations: query.data?.success ? query.data.data : [],
  };
};

export const useOrganization = (orgId: string) => {
  const query = useOrganizationQuery(orgId);

  return {
    ...query,
    organization: query.data?.success ? query.data.data : null,
  };
};

export const useCreateOrganization = (
  options?: UseMutationOptions<OrganizationResponse, unknown, CreateOrganizationInput>
) => {
  return useCreateOrganizationMutation(options);
};

export const useUpdateOrganization = (
  options?: UseMutationOptions<OrganizationResponse, unknown, { orgId: string; data: UpdateOrganizationInput }>
) => {
  return useUpdateOrganizationMutation(options);
};

export const useDeleteOrganization = (
  options?: UseMutationOptions<SuccessResponse, unknown, string>
) => {
  return useDeleteOrganizationMutation(options);
};

export const useAddOrganizationMember = (
  options?: UseMutationOptions<SuccessResponse, unknown, { orgId: string; data: AddMemberInput }>
) => {
  return useAddOrganizationMemberMutation(options);
};

export const useUpdateOrganizationMemberRole = (
  options?: UseMutationOptions<SuccessResponse, unknown, { orgId: string; userId: string; data: UpdateMemberRoleInput }>
) => {
  return useUpdateOrganizationMemberRoleMutation(options);
};

export const useRemoveOrganizationMember = (
  options?: UseMutationOptions<SuccessResponse, unknown, { orgId: string; userId: string }>
) => {
  return useRemoveOrganizationMemberMutation(options);
};
