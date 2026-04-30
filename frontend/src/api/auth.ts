import { useEffect } from "react";
import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { deleteToken, setToken, apiRequest } from "@/lib/api";
import { useAuthStore } from "@/store/auth.store";
import type { ApiSuccess } from "@/types/api";

// --- TYPES ---

export type AuthUser = {
  id: string;
  email: string;
  name: string;
  avatar_url?: string;
  role: string;
  created_at?: string;
};

export type AuthPayload = {
  accessToken: string;
  user: AuthUser;
};

export type LoginInput = {
  email: string;
  password?: string;
};

export type RegisterInput = {
  email: string;
  name: string;
  password?: string;
};

export type ProfileResponse = ApiSuccess<AuthUser>;
export type AuthResponse = ApiSuccess<AuthPayload>;

// --- KEYS ---

export const authKeys = {
  all: ["auth"] as const,
  profile: () => [...authKeys.all, "profile"] as const,
};

// --- SERVICE ---

export const authService = {
  login: async (data: LoginInput): Promise<AuthResponse> => {
    return apiRequest.post<AuthResponse>("/auth/login", data);
  },

  register: async (data: RegisterInput): Promise<AuthResponse> => {
    return apiRequest.post<AuthResponse>("/auth/register", data);
  },

  logout: async (): Promise<void> => {
    return apiRequest.post("/auth/logout");
  },

  getProfile: async (): Promise<ProfileResponse> => {
    return apiRequest.get<ProfileResponse>("/auth/profile");
  },

  refreshToken: async (): Promise<AuthResponse> => {
    return apiRequest.post<AuthResponse>("/auth/refresh");
  },
};

// --- HOOKS ---

export const useAuthProfile = (options?: { enabled?: boolean }) => {
  const setSession = useAuthStore((state) => state.setSession);
  const clearSession = useAuthStore((state) => state.clearSession);

  const query = useQuery({
    queryKey: authKeys.profile(),
    queryFn: authService.getProfile,
    enabled: options?.enabled,
    staleTime: 1000 * 60 * 5,
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
        clearSession();
      }
    }
  }, [query.error, clearSession]);

  return {
    ...query,
    user: query.data?.data ?? null,
  };
};

export const useLoginMutation = () => {
  const queryClient = useQueryClient();
  const setAuthenticated = useAuthStore((state) => state.setAuthenticated);
  const setUser = useAuthStore((state) => state.setUser);

  return useMutation({
    mutationFn: authService.login,
    onSuccess: async (data) => {
      setToken(data.data.accessToken);
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
    },
  });
};

export const useRegisterMutation = () => {
  const queryClient = useQueryClient();
  const setAuthenticated = useAuthStore((state) => state.setAuthenticated);
  const setUser = useAuthStore((state) => state.setUser);

  return useMutation({
    mutationFn: authService.register,
    onSuccess: async (data) => {
      setToken(data.data.accessToken);
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
    },
  });
};

export const useLogoutMutation = () => {
  const queryClient = useQueryClient();
  const clearSession = useAuthStore((state) => state.clearSession);

  return useMutation({
    mutationFn: authService.logout,
    onSettled: async () => {
      deleteToken();
      clearSession();
      queryClient.removeQueries({ queryKey: authKeys.all });
    },
  });
};

