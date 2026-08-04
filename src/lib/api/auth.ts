import { apiCall } from "./client";

/**
 * Auth API (Laravel Sanctum).
 *
 *   POST /auth/login   -> { data: { token, user } }   (public)
 *   GET  /auth/me      -> { data: AdminUser }
 *   POST /auth/logout  -> { data: { success } }
 *
 * On a real backend, `login` persists the bearer token to
 * localStorage["mytijaara_api_token"]; every subsequent apiCall injects it.
 */

export type AdminUser = {
  id: string;
  name: string;
  email: string;
  role: string;
  status?: string;
  avatar: string;
  lastActive?: string;
};

const TOKEN_KEY = "mytijaara_api_token";

const DEMO_USER: AdminUser = {
  id: "u_1",
  name: "Admin User",
  email: "admin@example.com",
  role: "Super Admin",
  status: "active",
  avatar: "AU",
};

export function setToken(token: string) {
  try {
    localStorage.setItem(TOKEN_KEY, token);
  } catch {
    /* ignore */
  }
}

export function clearToken() {
  try {
    localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* ignore */
  }
}

export const authApi = {
  login: async (email: string, password: string) => {
    const res = await apiCall<{ token: string; user: AdminUser }>(
      "/auth/login",
      () => ({ token: `mock_${Date.now()}`, user: { ...DEMO_USER, email } }),
      { method: "POST", body: { email, password }, public: true },
    );
    if (res.data?.token) setToken(res.data.token);
    return res.data;
  },
  me: () => apiCall<AdminUser>("/auth/me", () => DEMO_USER),
  logout: async () => {
    try {
      await apiCall("/auth/logout", () => ({ success: true }), { method: "POST" });
    } finally {
      clearToken();
    }
  },
  forgotPassword: (email: string) =>
    apiCall("/auth/forgot-password", () => ({ success: true }), {
      method: "POST",
      body: { email },
      public: true,
    }),
  resetPassword: (payload: { email: string; token: string; password: string; password_confirmation: string }) =>
    apiCall("/auth/reset-password", () => ({ success: true }), {
      method: "POST",
      body: payload,
      public: true,
    }),
};
