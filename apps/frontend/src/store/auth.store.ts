// src/store/auth.store.ts
import { create } from "zustand";
import { persist, devtools } from "zustand/middleware";

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
  devtools(
    persist(
      (set) => ({
        user: null,
        isAuthenticated: false,
        setAuthenticated: (isAuthenticated) => set({ isAuthenticated }, false, "auth/setAuthenticated"),
        setUser: (user) => set((state) => ({ user, isAuthenticated: state.isAuthenticated || Boolean(user) }), false, "auth/setUser"),
        setSession: (user) => set({ user, isAuthenticated: true }, false, "auth/setSession"),
        clearSession: () => set({ user: null, isAuthenticated: false }, false, "auth/clearSession"),
      }),
      {
        name: "omnitask-auth",
      }
    ),
    { name: "AuthStore" }
  )
);

