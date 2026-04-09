// src/hooks/useOrganizations.ts
import { useOrganizationsQuery, useCreateOrganizationMutation } from "@/services/organization.service";
import type { UseMutationOptions } from "@tanstack/react-query";
import type { CreateOrganizationInput, OrganizationResponse } from "@/services/organization.service";

export const useOrganizations = () => {
  const query = useOrganizationsQuery();
  
  return {
    ...query,
    organizations: query.data?.success ? query.data.data : [],
  };
};

export const useCreateOrganization = (options?: UseMutationOptions<OrganizationResponse, unknown, CreateOrganizationInput>) => {
  return useCreateOrganizationMutation(options);
};
