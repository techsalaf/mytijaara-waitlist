import { apiCall } from "./client";
import { toQuery } from "./waitlist";
import type { Campaign } from "@/lib/types";

export type CampaignInput = {
  name: string;
  subject: string;
  html?: string | null;
  status?: "draft" | "scheduled" | "sending" | "sent";
  template?: string | null;
  segment?: Record<string, unknown> | null;
  scheduledAt?: string | null;
};

export type CampaignStats = {
  sent: number;
  opens: number;
  clicks: number;
  bounces: number;
  openRate: number;
  clickRate: number;
  events?: Record<string, number>;
};

/**
 * Email campaigns API. `sent` / `opens` / `clicks` are columns on
 * `email_campaigns` incremented by `EmailTrackingController` when a pixel or a
 * wrapped link is hit, so every rate on screen traces back to a real event row.
 */
export const campaignsApi = {
  list: (params?: { status?: string; search?: string }) =>
    apiCall<Campaign[]>(`/campaigns${toQuery(params as Record<string, unknown>)}`),
  get: (id: string) => apiCall<Campaign>(`/campaigns/${id}`),
  create: (payload: CampaignInput) =>
    apiCall<Campaign>("/campaigns", { method: "POST", body: payload }),
  update: (id: string, patch: Partial<CampaignInput>) =>
    apiCall<Campaign>(`/campaigns/${id}`, { method: "PATCH", body: patch }),
  remove: (id: string) =>
    apiCall<{ deleted: boolean }>(`/campaigns/${id}`, { method: "DELETE" }),
  /** Queues `SendCampaignJob`; the campaign comes back as `sending`. */
  send: (id: string) => apiCall<Campaign>(`/campaigns/${id}/send`, { method: "POST" }),
  stats: (id: string) => apiCall<CampaignStats>(`/campaigns/${id}/stats`),
};
