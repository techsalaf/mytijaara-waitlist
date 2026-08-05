import { apiCall } from "./client";

/**
 * Analytics API. Every endpoint is DB-backed in
 * `backend/app/Http/Controllers/Api/AnalyticsController.php` and accepts a
 * `days` window so the dashboard period selector rescopes the whole page.
 * `days=0` means "all time".
 */

export type AnalyticsPeriod = 7 | 30 | 90 | 0;

export type DashboardStats = {
  visitors: number;
  totalWaitlist: number;
  todaySignups: number;
  weeklyGrowth: number;
  monthlyGrowth: number;
  conversionRate: number;
  ctaClicks: number;
  emailOpenRate: number;
  emailClickRate: number;
  verifiedRate: number;
  periodDays: number;
  periodSignups: number;
  previousPeriodSignups: number;
};

export type TrendPoint = {
  date: string;
  label: string;
  signups: number;
  verified: number;
};

export type Slice = { name: string; value: number; color: string };
export type CityRow = { city: string; users: number; growth: number };
export type FunnelStep = { stage: string; value: number; pct: number };

/** Live numbers behind the weekly digest. Mirrors `App\Support\WeeklyDigest`. */
export type DigestMetrics = {
  days: number;
  from: string;
  to: string;
  signups: number;
  previousSignups: number;
  growth: number;
  verified: number;
  verifiedRate: number;
  total: number;
  referredSignups: number;
  topCities: { city: string; signups: number }[];
  topReferrers: { name: string; email: string; referrals: number }[];
};

export type DigestPreview = { metrics: DigestMetrics; subject: string; html: string };

export type DigestDraft = {
  campaignId: string;
  name: string;
  subject: string;
  status: string;
  metrics: DigestMetrics;
};

const win = (days: number) => `days=${days}`;

export const analyticsApi = {
  overview: (days: AnalyticsPeriod = 30) =>
    apiCall<DashboardStats>(`/analytics/overview?${win(days)}`),
  trends: (days = 30) => apiCall<TrendPoint[]>(`/analytics/trends?${win(days)}`),
  trafficSources: (days: AnalyticsPeriod = 30) =>
    apiCall<Slice[]>(`/analytics/traffic-sources?${win(days)}`),
  cities: (days: AnalyticsPeriod = 30) => apiCall<CityRow[]>(`/analytics/cities?${win(days)}`),
  devices: (days: AnalyticsPeriod = 30) => apiCall<Slice[]>(`/analytics/devices?${win(days)}`),
  browsers: (days: AnalyticsPeriod = 30) => apiCall<Slice[]>(`/analytics/browsers?${win(days)}`),
  funnel: (days: AnalyticsPeriod = 30) => apiCall<FunnelStep[]>(`/analytics/funnel?${win(days)}`),
  /** Digest numbers + rendered body, no write. */
  digestPreview: (days = 7) => apiCall<DigestPreview>(`/analytics/digest?${win(days)}`),
  /** Builds the digest and saves it as a draft campaign. */
  createDigest: (days = 7) =>
    apiCall<DigestDraft>("/analytics/digest", { method: "POST", body: { days } }),
};
