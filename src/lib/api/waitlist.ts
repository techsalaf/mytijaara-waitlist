import { apiCall } from "./client";
import { waitlistUsers, type WaitlistUser } from "@/lib/mock-data";

let cache: WaitlistUser[] = [...waitlistUsers];

export const waitlistApi = {
  list: () => apiCall("/waitlist", () => cache),
  get: (id: string) =>
    apiCall(`/waitlist/${id}`, () => cache.find((u) => u.id === id) ?? null),
  create: (payload: Partial<WaitlistUser>) =>
    apiCall("/waitlist", () => {
      const user = {
        ...cache[0],
        ...payload,
        id: `wl_${Date.now()}`,
        joinedAt: new Date().toISOString(),
      } as WaitlistUser;
      cache = [user, ...cache];
      return user;
    }),
  update: (id: string, patch: Partial<WaitlistUser>) =>
    apiCall(`/waitlist/${id}`, () => {
      cache = cache.map((u) => (u.id === id ? { ...u, ...patch } : u));
      return cache.find((u) => u.id === id)!;
    }),
  remove: (ids: string[]) =>
    apiCall(`/waitlist/bulk-delete`, () => {
      const removed = cache.filter((u) => ids.includes(u.id));
      cache = cache.filter((u) => !ids.includes(u.id));
      return { removed };
    }),
  restore: (users: WaitlistUser[]) =>
    apiCall(`/waitlist/restore`, () => {
      cache = [...users, ...cache];
      return { restored: users.length };
    }),
};
