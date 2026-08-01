import { apiCall } from "./client";
import { waitlistUsers } from "@/lib/mock-data";
import type { WaitlistRole, WaitlistUser } from "@/lib/types";

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

let cache: WaitlistUser[] = [...waitlistUsers];

/**
 * Waitlist API.
 *
 * Backend contract (Laravel):
 *   GET    /waitlist            -> { data: WaitlistUser[], meta: {...} }
 *   GET    /waitlist/:id        -> { data: WaitlistUser | null }
 *   POST   /waitlist            -> { data: WaitlistUser }          (public)
 *   PATCH  /waitlist/:id        -> { data: WaitlistUser }
 *   POST   /waitlist/bulk-delete -> { data: { removed: WaitlistUser[] } }
 *   POST   /waitlist/restore    -> { data: { restored: number } }
 *   GET    /waitlist/count      -> { data: { total: number } }
 */
export const waitlistApi = {
  list: () => apiCall("/waitlist", () => cache),
  count: () => apiCall("/waitlist/count", () => ({ total: cache.length }), { public: true }),
  get: (id: string) => apiCall(`/waitlist/${id}`, () => cache.find((u) => u.id === id) ?? null),
  create: (payload: WaitlistSignupPayload) =>
    apiCall(
      "/waitlist",
      () => {
        const user = {
          ...cache[0],
          name: payload.name,
          email: payload.email,
          phone: payload.phone ?? "",
          city: payload.city,
          source: payload.source,
          tags: [payload.role, ...(payload.interest ? [payload.interest] : [])],
          referredBy: payload.referralCode || undefined,
          id: `wl_${Date.now()}`,
          joinedAt: new Date().toISOString(),
        } as WaitlistUser;
        cache = [user, ...cache];
        return user;
      },
      { method: "POST", body: payload, public: true },
    ),
  update: (id: string, patch: Partial<WaitlistUser>) =>
    apiCall(
      `/waitlist/${id}`,
      () => {
        cache = cache.map((u) => (u.id === id ? { ...u, ...patch } : u));
        return cache.find((u) => u.id === id)!;
      },
      { method: "PATCH", body: patch },
    ),
  remove: (ids: string[]) =>
    apiCall(
      `/waitlist/bulk-delete`,
      () => {
        const removed = cache.filter((u) => ids.includes(u.id));
        cache = cache.filter((u) => !ids.includes(u.id));
        return { removed };
      },
      { method: "POST", body: { ids } },
    ),
  restore: (users: WaitlistUser[]) =>
    apiCall(
      `/waitlist/restore`,
      () => {
        cache = [...users, ...cache];
        return { restored: users.length };
      },
      { method: "POST", body: { users } },
    ),
};
