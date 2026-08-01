import { apiCall } from "./client";
import { campaigns } from "@/lib/mock-data";

export type Campaign = (typeof campaigns)[number];
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
    return apiCall(`/campaigns${qs ? `?${qs}` : ""}`, () =>
      campaigns.filter(
        (c) =>
          (!params?.status || params.status === "all" || c.status === params.status) &&
          (!params?.search || c.name.toLowerCase().includes(params.search.toLowerCase())),
      ),
    );
  },
  get: (id: string) =>
    apiCall(`/campaigns/${id}`, () => campaigns.find((c) => c.id === id) ?? null),
  create: (payload: CampaignInput) =>
    apiCall(
      "/campaigns",
      () => ({ ...campaigns[0], ...payload, id: `cmp_${Date.now()}` }) as Campaign,
      { method: "POST", body: payload },
    ),
  update: (id: string, patch: Partial<CampaignInput>) =>
    apiCall(`/campaigns/${id}`, () => ({ ...campaigns.find((c) => c.id === id)!, ...patch }), {
      method: "PATCH",
      body: patch,
    }),
  remove: (id: string) =>
    apiCall(`/campaigns/${id}`, () => ({ deleted: true }), { method: "DELETE" }),
  send: (id: string) =>
    apiCall(`/campaigns/${id}/send`, () => ({ status: "sending" }), { method: "POST" }),
  stats: (id: string) =>
    apiCall<CampaignStats>(`/campaigns/${id}/stats`, () => {
      const c = campaigns.find((x) => x.id === id);
      return {
        sent: c?.sent ?? 0,
        opens: c?.opens ?? 0,
        clicks: c?.clicks ?? 0,
        bounces: 0,
        openRate: c?.sent ? Math.round(((c.opens ?? 0) / c.sent) * 100) : 0,
        clickRate: c?.sent ? Math.round(((c.clicks ?? 0) / c.sent) * 100) : 0,
      };
    }),
};
