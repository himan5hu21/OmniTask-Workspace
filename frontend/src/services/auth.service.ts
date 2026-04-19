// src/services/auth.service.ts
"use client";

import { useEffect } from "react";
import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationOptions,
} from "@tanstack/react-query";

import { api, deleteToken, setToken } from "@/lib/api";
import type { ApiSuccess } from "@/types/api";
import { useAuthStore, type AuthUser } from "@/store/auth.store";

export type LoginInput = {
  email: string;
  password: string;
};

export type RegisterInput = {
  name: string;
  email: string;
  password: string;
  confirmPassword?: string;
};

export type AuthPayload = {
  token: string;
  user?: AuthUser;
};

export type ProfileResponse = ApiSuccess<AuthUser>;
export type AuthResponse = ApiSuccess<AuthPayload>;

export const authKeys = {
  all: ["auth"] as const,
  profile: () => [...authKeys.all, "profile"] as const,
};

export async function loginUser(data: LoginInput): Promise<AuthResponse> {
  const response = await api.post<AuthResponse>("/auth/login", data);
  return response.data;
}

export async function registerUser(data: RegisterInput): Promise<AuthResponse> {
  const payload = {
    name: data.name,
    email: data.email,
    password: data.password,
  };
  const response = await api.post<AuthResponse>("/auth/register", payload);
  return response.data;
}

export async function logoutUser(): Promise<void> {
  await api.post("/auth/logout");
}

export async function getUserProfile(): Promise<ProfileResponse> {
  const response = await api.get<ProfileResponse>("/auth/profile");
  return response.data;
}

export function useProfileQuery(options?: { enabled?: boolean }) {
  const setSession = useAuthStore((state) => state.setSession);
  const clearSession = useAuthStore((state) => state.clearSession);

  const query = useQuery({
    queryKey: authKeys.profile(),
    queryFn: getUserProfile,
    enabled: options?.enabled,
    staleTime: 1000 * 60 * 5, // 5 min cache
  });

  useEffect(() => {
    if (query.data?.success) {
      setSession(query.data.data);
    }
  }, [query.data, setSession]);

  useEffect(() => {
    if (query.error && typeof query.error === 'object' && 'response' in query.error) {
      const errorWithResponse = query.error as { response?: { status?: number } };
      if (errorWithResponse.response?.status === 404) {
        // Clear auth store when profile is not found
        clearSession();
      }
    }
  }, [query.error, clearSession]);

  return query;
}

export function useAuthProfile(options?: { enabled?: boolean }) {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const query = useProfileQuery({ enabled: (options?.enabled ?? true) && isAuthenticated });

  return {
    ...query,
    user: query.data?.data ?? null,
  };
}

export function useLoginMutation(
  options?: UseMutationOptions<AuthResponse, unknown, LoginInput>
) {
  const queryClient = useQueryClient();
  const setAuthenticated = useAuthStore((state) => state.setAuthenticated);
  const setUser = useAuthStore((state) => state.setUser);

  return useMutation({
    mutationFn: loginUser,
    ...options,
    onSuccess: async (data, variables, onMutateResult, context) => {
      setToken(data.data.token);
      setAuthenticated(true);

      if (data.data.user) {
        setUser(data.data.user);
        queryClient.setQueryData(authKeys.profile(), {
          success: true,
          data: data.data.user,
          message: data.message,
        } satisfies ProfileResponse);
      } else {
        await queryClient.invalidateQueries({ queryKey: authKeys.profile() });
      }

      await options?.onSuccess?.(data, variables, onMutateResult, context);
    },
  });
}

export function useRegisterMutation(
  options?: UseMutationOptions<AuthResponse, unknown, RegisterInput>
) {
  const queryClient = useQueryClient();
  const setAuthenticated = useAuthStore((state) => state.setAuthenticated);
  const setUser = useAuthStore((state) => state.setUser);

  return useMutation({
    mutationFn: registerUser,
    ...options,
    onSuccess: async (data, variables, onMutateResult, context) => {
      setToken(data.data.token);
      setAuthenticated(true);

      if (data.data.user) {
        setUser(data.data.user);
        queryClient.setQueryData(authKeys.profile(), {
          success: true,
          data: data.data.user,
          message: data.message,
        } satisfies ProfileResponse);
      } else {
        await queryClient.invalidateQueries({ queryKey: authKeys.profile() });
      }

      await options?.onSuccess?.(data, variables, onMutateResult, context);
    },
  });
}

export function useLogoutMutation(
  options?: UseMutationOptions<void, unknown, void>
) {
  const queryClient = useQueryClient();
  const clearSession = useAuthStore((state) => state.clearSession);

  return useMutation({
    mutationFn: logoutUser,
    ...options,
    onSettled: async (data, error, variables, onMutateResult, context) => {
      deleteToken();
      clearSession();
      queryClient.removeQueries({ queryKey: authKeys.all });
      await options?.onSettled?.(data, error, variables, onMutateResult, context);
    },
  });
}
