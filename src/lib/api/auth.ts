import { apiCall, ApiError } from "./client";
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
  location: string | null;
  bio: string | null;
  avatarUrl: string | null;
  preferences: NotificationPreferences;
  twoFactorEnabled: boolean;
  /** A secret has been issued but no valid code has confirmed it yet. */
  twoFactorPending: boolean;
  recoveryCodesRemaining: number;
  createdAt: string | null;
};

/** Mirrors `User::PREFERENCE_DEFAULTS`. Unknown keys are dropped server-side. */
export type NotificationPreferences = {
  weeklyDigest: boolean;
  campaignReports: boolean;
  signupAlerts: boolean;
  productUpdates: boolean;
};

export type ProfilePatch = {
  name?: string;
  email?: string;
  phone?: string | null;
  timezone?: string | null;
  location?: string | null;
  bio?: string | null;
  avatarUrl?: string | null;
  preferences?: Partial<NotificationPreferences>;
};

/** One row of `/auth/sessions` — a real Sanctum personal access token. */
export type AdminSession = {
  id: string;
  name: string;
  /** Derived from the stored user agent, e.g. "Windows · Chrome". */
  device: string;
  ip: string | null;
  /** True for the token this request is authenticated with. */
  current: boolean;
  createdAt: string | null;
  lastUsedAt: string | null;
};

/** Response of `POST /auth/two-factor`. The codes are shown exactly once. */
export type TwoFactorSetup = {
  secret: string;
  otpauthUrl: string;
  /** Inline SVG, so the QR never has to be fetched from a third party. */
  qrSvg: string;
  recoveryCodes: string[];
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

/** `/auth/login` either signs you in or asks for a second factor. */
export type LoginResult =
  | { twoFactorRequired: false; token: string; user: AdminUser }
  | { twoFactorRequired: true; message: string };

export const authApi = {
  /**
   * POST /auth/login. When the account has a confirmed second factor and no
   * `code` was sent, the backend answers 202 with `twoFactorRequired` instead
   * of a token — a challenge, not a failure, so the form asks for the code
   * rather than claiming the password was wrong.
   */
  login: async (email: string, password: string, code?: string): Promise<LoginResult> => {
    const res = await apiCall<{
      token?: string;
      user?: AdminUser;
      twoFactorRequired?: boolean;
      message?: string;
    }>("/auth/login", {
      method: "POST",
      body: code ? { email, password, code } : { email, password },
      public: true,
    });

    if (res.data?.twoFactorRequired) {
      return {
        twoFactorRequired: true,
        message: res.data.message ?? "Enter the 6-digit code from your authenticator app.",
      };
    }
    if (!res.data?.token || !res.data.user) {
      throw new ApiError("The server did not return a session token.", 500);
    }
    setToken(res.data.token);
    return { twoFactorRequired: false, token: res.data.token, user: res.data.user };
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

  /** Active sessions are this account's Sanctum tokens, not a separate store. */
  sessions: {
    list: () => apiCall<AdminSession[]>("/auth/sessions"),
    /** Revoking the current session is refused (422); sign out instead. */
    revoke: (id: string) =>
      apiCall<{ revoked: string }>(`/auth/sessions/${id}`, { method: "DELETE" }),
    revokeOthers: () =>
      apiCall<{ revoked: number }>("/auth/sessions/revoke-others", { method: "POST" }),
  },

  twoFactor: {
    /** Issues a secret and recovery codes. Not enforced until `confirm`. */
    start: () => apiCall<TwoFactorSetup>("/auth/two-factor", { method: "POST" }),
    confirm: (code: string) =>
      apiCall<AuthenticatedUser>("/auth/two-factor/confirm", { method: "POST", body: { code } }),
    disable: (password: string) =>
      apiCall<AuthenticatedUser>("/auth/two-factor", { method: "DELETE", body: { password } }),
    regenerateCodes: () =>
      apiCall<{ recoveryCodes: string[] }>("/auth/two-factor/recovery-codes", { method: "POST" }),
  },

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
