import { apiCall } from "./client";
import type { AdminUser } from "@/lib/types";

/**
 * Auth API (Laravel Sanctum). `login` persists the bearer token to
 * localStorage["mytijaara_api_token"]; every subsequent `apiCall` injects it.
 * There is no demo user: a failed login throws `ApiError` so the form can show
 * the real reason.
 */

export type { AdminUser };

/** `/auth/me` also carries the permission set the sidebar gates on. */
export type AuthenticatedUser = AdminUser & {
  roleSlug: string;
  permissions: string[];
  phone: string | null;
  timezone: string | null;
  avatarUrl: string | null;
};

export type ProfilePatch = {
  name?: string;
  email?: string;
  phone?: string | null;
  timezone?: string | null;
  avatarUrl?: string | null;
};

const TOKEN_KEY = "mytijaara_api_token";

export function setToken(token: string) {
  try {
    localStorage.setItem(TOKEN_KEY, token);
  } catch {
    /* private browsing / storage disabled */
  }
}

export function clearToken() {
  try {
    localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* ignore */
  }
}

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export const authApi = {
  login: async (email: string, password: string) => {
    const res = await apiCall<{ token: string; user: AdminUser }>("/auth/login", {
      method: "POST",
      body: { email, password },
      public: true,
    });
    if (res.data?.token) setToken(res.data.token);
    return res.data;
  },
  me: () => apiCall<AuthenticatedUser>("/auth/me"),
  logout: async () => {
    try {
      await apiCall<{ success: boolean }>("/auth/logout", { method: "POST" });
    } finally {
      // Clear locally even if the revoke call failed, so the UI can't be
      // stuck logged in against a dead token.
      clearToken();
    }
  },

  /** PATCH /auth/me — profile tab. Persists immediately. */
  updateProfile: (patch: ProfilePatch) =>
    apiCall<AuthenticatedUser>("/auth/me", { method: "PATCH", body: patch }),

  changePassword: (payload: {
    current_password: string;
    password: string;
    password_confirmation: string;
  }) => apiCall<{ success: boolean }>("/auth/password", { method: "POST", body: payload }),

  forgotPassword: (email: string) =>
    apiCall<{ success: boolean }>("/auth/forgot-password", {
      method: "POST",
      body: { email },
      public: true,
    }),
  resetPassword: (payload: {
    email: string;
    token: string;
    password: string;
    password_confirmation: string;
  }) =>
    apiCall<{ success: boolean }>("/auth/reset-password", {
      method: "POST",
      body: payload,
      public: true,
    }),
};
