import { apiCall } from "./client";
import type { WaitlistUser, WaitlistRole } from "@/lib/types";

export type WaitlistSignupPayload = {
  name: string;
  email: string;
  phone?: string;
  city: string;
  role: WaitlistRole;
  interest?: string;
  source: "organic" | "referral";
  referralCode?: string;
  consent: true;
  website?: string;
};

/**
 * Waitlist API — forward calls to the backend endpoints.
 * Factories return minimal defaults so the UI degrades cleanly when no
 * backend is configured (mock mode will still receive these minimal values).
 */
export const waitlistApi = {
  list: (params?: { page?: number; per_page?: number; search?: string; status?: string; source?: string; sort?: string; direction?: string }) => {
    const q = new URLSearchParams();
    if (params?.page) q.set("page", String(params.page));
    if (params?.per_page) q.set("per_page", String(params.per_page));
    if (params?.search) q.set("search", params.search ?? "");
    if (params?.status) q.set("status", params.status);
    if (params?.source) q.set("source", params.source);
    if (params?.sort) q.set("sort", params.sort);
    if (params?.direction) q.set("direction", params.direction);
    const qs = q.toString();
    return apiCall(`/waitlist${qs ? `?${qs}` : ""}`, () => [] as WaitlistUser[]);
  },
  count: () => apiCall("/waitlist/count", () => ({ total: 0 }), { public: true }),
  get: (id: string) => apiCall(`/waitlist/${id}`, () => null as WaitlistUser | null),
  create: (payload: WaitlistSignupPayload) =>
    apiCall("/waitlist",
      () => ({
        id: `temp-${Date.now()}`,
        name: payload.name,
        email: payload.email,
        phone: payload.phone || "",
        city: payload.city,
        state: "",
        role: payload.role,
        interest: payload.interest || "",
        source: payload.source,
        referralCode: payload.referralCode || "",
        status: "active",
        verified: false,
        device: "unknown",
        position: Math.floor(Math.random() * 500) + 100,
        referrals: 0,
        tags: [],
        notes: null,
        joinedAt: new Date().toISOString(),
      } as WaitlistUser),
      { method: "POST", body: payload, public: true }
    ),
  update: (id: string, patch: Partial<WaitlistUser>) => apiCall(`/waitlist/${id}`, () => ({} as WaitlistUser), { method: "PATCH", body: patch }),
  remove: (ids: string[]) => apiCall("/waitlist/bulk-delete", () => ({ removed: [] as WaitlistUser[] }), { method: "POST", body: { ids } }),
  restore: (users: WaitlistUser[]) => apiCall("/waitlist/restore", () => ({ restored: 0 }), { method: "POST", body: { users } }),
};
