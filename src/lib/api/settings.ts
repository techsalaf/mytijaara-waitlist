import { apiCall } from "./client";

/**
 * Settings API. One JSON row per group on the backend
 * (`SettingsController::GROUPS`). Secrets are redacted on read; posting a
 * redacted value back is a no-op server-side, so a saved form never destroys a
 * stored password or key.
 */

export type SettingsGroup =
  "company" | "branding" | "seo" | "social" | "smtp" | "integrations" | "system" | "referrals";

export type SmtpSettings = {
  enabled: boolean;
  host: string;
  port: number;
  encryption: "tls" | "ssl" | "none";
  username: string;
  /** Always the redaction placeholder on read. Send a new value to change it. */
  password: string;
  passwordSet?: boolean;
  fromAddress: string;
  fromName: string;
};

export type ApiKeyRecord = {
  id: string;
  name: string;
  masked: string;
  scopes: string[];
  createdAt: string | null;
  createdBy: string | null;
  lastUsedAt: string | null;
  revokedAt: string | null;
  active: boolean;
};

/** Result of `POST /settings/cache/purge`. */
export type CachePurgeResult = {
  store: string;
  /** Entries seen before the flush, or null when the driver cannot be counted. */
  entriesCleared: number | null;
  purgedAt: string;
};

/** The `system` group. Mirrors `SettingsController::rules('system')`. */
export type SystemSettings = {
  maintenanceMode: boolean;
  signupsPaused: boolean;
  signupRateLimitPerHour: number;
  weeklyDigestEnabled: boolean;
  weeklyDigestDay: "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun";
  weeklyDigestRecipients: string[];
  notifyOnSignup: boolean;
};

/** Social profile URLs returned as part of `/settings/public`. */
export type PublicSocial = {
  instagram: string;
  twitter: string;
  facebook: string;
  linkedin: string;
  tiktok: string;
  youtube: string;
  whatsapp: string;
};

/** Non-secret subset returned by `GET /settings/public`. */
export type PublicBranding = {
  siteName: string;
  tagline: string;
  // Company contact fields (used by footer, email templates, etc.)
  contactEmail: string;
  supportEmail: string;
  phone: string;
  launchCity: string;
  address: string;
  logoUrl: string;
  logoDarkUrl: string;
  faviconUrl: string;
  ogImageUrl: string;
  primaryColor: string;
  accentColor: string;
  secondaryColor: string;
  backgroundColor: string;
  surfaceColor: string;
  /** Social profile URLs. Only links with a non-empty value are rendered. */
  social: PublicSocial;
  /** App store URLs. Footer badges become clickable when filled. */
  iosAppUrl: string;
  androidAppUrl: string;
};

export const settingsApi = {
  /** Public endpoint — no auth needed. Returns branding URLs and company name. */
  publicSettings: () => apiCall<PublicBranding>("/settings/public"),
  get: <T = Record<string, unknown>>(group: SettingsGroup) => apiCall<T>(`/settings/${group}`),
  update: <T = Record<string, unknown>>(group: SettingsGroup, patch: Record<string, unknown>) =>
    apiCall<T>(`/settings/${group}`, { method: "PATCH", body: patch }),

  /** Opens a real SMTP connection. Rejects with `ApiError` on failure. */
  testSmtp: (override?: Partial<Omit<SmtpSettings, "enabled" | "fromAddress" | "fromName">>) =>
    apiCall<{ ok: boolean; message: string }>("/settings/smtp/test", {
      method: "POST",
      body: override ?? {},
      timeoutMs: 30000, // an unreachable SMTP host can take a while to fail
    }),

  /** Flushes the configured cache store. Reports what was actually cleared. */
  purgeCache: () =>
    apiCall<CachePurgeResult>("/settings/cache/purge", { method: "POST", timeoutMs: 30000 }),

  apiKeys: {
    list: () => apiCall<ApiKeyRecord[]>("/settings/api-keys"),
    /** The plaintext `key` is returned once and never retrievable again. */
    generate: (name: string, scopes: string[] = ["read"]) =>
      apiCall<{ key: string; record: ApiKeyRecord }>("/settings/api-keys", {
        method: "POST",
        body: { name, scopes },
      }),
    revoke: (id: string) =>
      apiCall<{ revoked: string }>(`/settings/api-keys/${id}`, { method: "DELETE" }),
  },
};
