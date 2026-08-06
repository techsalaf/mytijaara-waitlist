import { apiCall } from "./client";
import { toQuery } from "./waitlist";
import { downloadEndpoint } from "./download";
import type { Campaign, CampaignSegment } from "@/lib/types";

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
 * Email campaigns API. Rates on screen trace back to real event rows:
 * `sent`/`opens`/`clicks` are incremented by `EmailTrackingController`
 * when a pixel or wrapped link is hit.
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
  /** Copy a campaign back to draft status with no send history. */
  duplicate: (id: string) =>
    apiCall<Campaign>(`/campaigns/${id}/duplicate`, { method: "POST" }),
  /** Queues `SendCampaignJob`; the campaign comes back as `sending`. */
  send: (id: string) => apiCall<Campaign>(`/campaigns/${id}/send`, { method: "POST" }),
  stats: (id: string) => apiCall<CampaignStats>(`/campaigns/${id}/stats`),
  /**
   * Live reach counts per preset segment. The builder used to show
   * "All active users (2,847)" as a hardcoded string — these come from
   * the same `CampaignSegment::reach()` the dispatcher uses to build
   * the actual recipient list.
   */
  segments: () => apiCall<CampaignSegment[]>("/campaigns/segments"),
  /** Streamed CSV — bearer-authenticated via `downloadEndpoint`. */
  export: (filename: string) => downloadEndpoint("/campaigns/export", filename),
};
