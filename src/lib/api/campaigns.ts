import { apiCall } from "./client";

export type Campaign = Record<string, any>;
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
 * Email campaigns API.
 *
 *   GET    /campaigns           -> { data: Campaign[], meta }
 *   GET    /campaigns/:id       -> { data: Campaign }
 *   POST   /campaigns           -> { data: Campaign }
 *   PATCH  /campaigns/:id       -> { data: Campaign }
 *   DELETE /campaigns/:id       -> { data: { deleted } }
 *   POST   /campaigns/:id/send  -> { data: { status } }
 *   GET    /campaigns/:id/stats -> { data: {...} }
 */
export const campaignsApi = {
  list: (params?: { status?: string; search?: string }) => {
    const q = new URLSearchParams();
    if (params?.status && params.status !== "all") q.set("status", params.status);
    if (params?.search) q.set("search", params.search);
    const qs = q.toString();
    return apiCall(`/campaigns${qs ? `?${qs}` : ""}`, () => [
      { id: "cmp_1", name: "Welcome Email", subject: "Welcome to MyTijaara!", status: "sent", created_at: new Date(Date.now() - 15*24*60*60*1000).toISOString(), sent_at: new Date(Date.now() - 14*24*60*60*1000).toISOString(), stats: { sent: 248, opens: 89, clicks: 24, bounces: 2, openRate: 35.9, clickRate: 9.7 } },
      { id: "cmp_2", name: "Feature Announcement", subject: "Check out new features", status: "sent", created_at: new Date(Date.now() - 8*24*60*60*1000).toISOString(), sent_at: new Date(Date.now() - 7*24*60*60*1000).toISOString(), stats: { sent: 248, opens: 124, clicks: 34, bounces: 1, openRate: 50.0, clickRate: 13.7 } },
      { id: "cmp_3", name: "Weekly Digest", subject: "Your weekly update", status: "draft", created_at: new Date(Date.now() - 2*24*60*60*1000).toISOString(), sent_at: null, stats: { sent: 0, opens: 0, clicks: 0, bounces: 0, openRate: 0, clickRate: 0 } },
    ]);
  },
  get: (id: string) =>
    apiCall(`/campaigns/${id}`, () => null),
  create: (payload: CampaignInput) =>
    apiCall(
      "/campaigns",
      () => ({ ...payload, id: `cmp_${Date.now()}` }) as Campaign,
      { method: "POST", body: payload },
    ),
  update: (id: string, patch: Partial<CampaignInput>) =>
    apiCall(`/campaigns/${id}`, () => ({ ...patch } as Campaign), {
      method: "PATCH",
      body: patch,
    }),
  remove: (id: string) =>
    apiCall(`/campaigns/${id}`, () => ({ deleted: true }), { method: "DELETE" }),
  send: (id: string) =>
    apiCall(`/campaigns/${id}/send`, () => ({ status: "sending" }), { method: "POST" }),
  stats: (id: string) =>
    apiCall<CampaignStats>(`/campaigns/${id}/stats`, () => {
      return {
        sent: 0,
        opens: 0,
        clicks: 0,
        bounces: 0,
        openRate: 0,
        clickRate: 0,
      };
    }),
};
