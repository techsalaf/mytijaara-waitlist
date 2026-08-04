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
};
