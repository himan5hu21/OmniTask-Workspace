// src/store/auth.store.ts
import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  created_at?: string;
}

interface AuthState {
  user: AuthUser | null;
  isAuthenticated: boolean;
  setAuthenticated: (isAuthenticated: boolean) => void;
  setUser: (user: AuthUser | null) => void;
  setSession: (user: AuthUser | null) => void;
  clearSession: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      setAuthenticated: (isAuthenticated) => set({ isAuthenticated }),
      setUser: (user) => set((state) => ({ user, isAuthenticated: state.isAuthenticated || Boolean(user) })),
      setSession: (user) => set({ user, isAuthenticated: true }),
      clearSession: () => set({ user: null, isAuthenticated: false }),
    }),
    {
      name: "omnitask-auth",
    }
  )
);

