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

export type Organization = {
  id: string;
  name: string;
  owner_id: string;
  created_at: string;
  updated_at: string;
};

export type OrganizationsResponse = ApiSuccess<Organization[]>;
export type OrganizationResponse = ApiSuccess<Organization>;

export const organizationKeys = {
  all: ["organizations"] as const,
  list: () => [...organizationKeys.all, "list"] as const,
};

export async function getMyOrganizations(): Promise<OrganizationsResponse> {
  const response = await api.get<OrganizationsResponse>("/organizations");
  return response.data;
}

export async function createOrganization(
  data: CreateOrganizationInput
): Promise<OrganizationResponse> {
  const response = await api.post<OrganizationResponse>("/organizations", data);
  return response.data;
}

export function useOrganizationsQuery() {
  return useQuery({
    queryKey: organizationKeys.list(),
    queryFn: getMyOrganizations,
  });
}

export function useCreateOrganizationMutation(
  options?: UseMutationOptions<OrganizationResponse, unknown, CreateOrganizationInput>
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createOrganization,
    ...options,
    onSuccess: async (data, variables, onMutateResult, context) => {
      await queryClient.invalidateQueries({ queryKey: organizationKeys.list() });
      await options?.onSuccess?.(data, variables, onMutateResult, context);
    },
  });
}
