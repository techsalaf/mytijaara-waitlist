import { apiCall } from "./client";
import type { WaitlistUser } from "@/lib/types";
import type { LaunchPassData } from "@/lib/types/launch-pass";

export const launchPassApi = {
  get: (token: string) =>
    apiCall<LaunchPassData>(`/launch-pass/${encodeURIComponent(token)}`, { public: true }),

  lookup: (identifier: string) =>
    apiCall<WaitlistUser>("/launch-pass/lookup", {
      method: "POST",
      body: { identifier: identifier.trim() },
      public: true,
    }),

  updatePreference: (publicId: string, attendingNatcon: boolean) =>
    apiCall<WaitlistUser>(`/waitlist/${encodeURIComponent(publicId)}/natcon-preference`, {
      method: "POST",
      body: { attending_natcon: attendingNatcon },
      public: true,
    }),
};
