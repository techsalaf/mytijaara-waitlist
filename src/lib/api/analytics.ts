import { apiCall } from "./client";

/**
 * Analytics API. Returns realistic test data by default.
 *
 *   GET /analytics/overview        -> { data: DashboardStats }
 *   GET /analytics/trends          -> { data: SignupTrendPoint[] }
 *   GET /analytics/traffic-sources -> { data: Slice[] }
 *   GET /analytics/cities          -> { data: CityRow[] }
 *   GET /analytics/devices         -> { data: Slice[] }
 *   GET /analytics/browsers        -> { data: Slice[] }
 *   GET /analytics/funnel          -> { data: FunnelStage[] }
 */
export const analyticsApi = {
  overview: () =>
    apiCall(
      "/analytics/overview",
      () => ({
        visitors: 5240,
        totalWaitlist: 248,
        todaySignups: 12,
        weeklyGrowth: 18.4,
        monthlyGrowth: 42.3,
        conversionRate: 4.7,
        ctaClicks: 1248,
        emailOpenRate: 32.5,
        emailClickRate: 8.2,
        verifiedRate: 68,
      }),
      { public: true },
    ),
  trends: (days = 30) => apiCall(`/analytics/trends?days=${days}`, () => []),
  trafficSources: () => apiCall("/analytics/traffic-sources", () => [
    { name: "Organic", value: 42, color: "#1f5c3a" },
    { name: "Referral", value: 28, color: "#d4a373" },
    { name: "Social", value: 18, color: "#3b82f6" },
    { name: "Direct", value: 12, color: "#8b5cf6" },
  ]),
  cities: () => apiCall("/analytics/cities", () => [
    { city: "Lagos", users: 94, growth: 28 },
    { city: "Abuja", users: 52, growth: 15 },
    { city: "Kaduna", users: 38, growth: 12 },
    { city: "Kano", users: 31, growth: 8 },
    { city: "Port Harcourt", users: 28, growth: 5 },
    { city: "Ibadan", users: 22, growth: 3 },
  ]),
  devices: () => apiCall("/analytics/devices", () => [
    { name: "Mobile", value: 68, color: "#1f5c3a" },
    { name: "Desktop", value: 22, color: "#d4a373" },
    { name: "Tablet", value: 10, color: "#3b82f6" },
  ]),
  browsers: () => apiCall("/analytics/browsers", () => [
    { name: "Chrome", value: 58, color: "#1f5c3a" },
    { name: "Safari", value: 24, color: "#d4a373" },
    { name: "Firefox", value: 12, color: "#3b82f6" },
    { name: "Other", value: 6, color: "#8b5cf6" },
  ]),
  funnel: () => apiCall("/analytics/funnel", () => [
    { stage: "Landing", count: 5240, rate: 100 },
    { stage: "Signup Form", count: 2108, rate: 40.2 },
    { stage: "Submitted", count: 1248, rate: 23.8 },
    { stage: "Verified Email", count: 848, rate: 16.2 },
  ]),
};
