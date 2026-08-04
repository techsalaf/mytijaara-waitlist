import { apiCall } from "./client";
import type { WaitlistUser, WaitlistRole } from "@/lib/types";

export type WaitlistSignupPayload = {
  name: string;
  email: string;
  phone?: string;
  city: string;
  role: WaitlistRole;
  source: "organic" | "referral";
  referralCode?: string;
  consent: true;
  /** Honeypot. Always empty for a real person. */
  website?: string;
};

export type WaitlistListParams = {
  page?: number;
  per_page?: number;
  search?: string;
  status?: string;
  source?: string;
  city?: string;
  role?: string;
  verified?: "verified" | "unverified";
  from?: string;
  to?: string;
  sort?: string;
  direction?: "asc" | "desc";
};

/** Build a query string, dropping empty values and `all` sentinels. */
export function toQuery(params: Record<string, unknown> | undefined): string {
  if (!params) return "";
  const q = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === "" || value === "all") continue;
    q.set(key, String(value));
  }
  const qs = q.toString();
  return qs ? `?${qs}` : "";
}

/**
 * Waitlist API. `POST /waitlist` and `GET /waitlist/count` are public
 * (see `backend/routes/api.php`); everything else needs an admin token.
 */
export const waitlistApi = {
  list: (params?: WaitlistListParams) =>
    apiCall<WaitlistUser[]>(`/waitlist${toQuery(params)}`),
  count: () => apiCall<{ total: number }>("/waitlist/count", { public: true }),
  get: (id: string) => apiCall<WaitlistUser | null>(`/waitlist/${id}`),
  create: (payload: WaitlistSignupPayload) =>
    apiCall<WaitlistUser>("/waitlist", { method: "POST", body: payload, public: true }),
  update: (id: string, patch: Partial<WaitlistUser>) =>
    apiCall<WaitlistUser>(`/waitlist/${id}`, { method: "PATCH", body: patch }),
  remove: (ids: string[]) =>
    apiCall<{ removed: WaitlistUser[] }>("/waitlist/bulk-delete", {
      method: "POST",
      body: { ids },
    }),
  restore: (users: WaitlistUser[]) =>
    apiCall<{ restored: number }>("/waitlist/restore", { method: "POST", body: { users } }),
  /** Bulk status / verification / tag change from the admin table. */
  bulkUpdate: (
    ids: string[],
    patch: { status?: string; verified?: boolean; tags?: string[] },
  ) =>
    apiCall<{ updated: number }>("/waitlist/bulk-update", {
      method: "POST",
      body: { ids, ...patch },
    }),
};
