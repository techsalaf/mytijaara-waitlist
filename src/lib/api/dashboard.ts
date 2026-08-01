import { apiCall } from "./client";
import { dashboardStats, signupTrend, trafficSources, cityBreakdown } from "@/lib/mock-data";

/**
 * Dashboard summary. The admin home stitches together several analytics
 * aggregates; the backend serves them from `/analytics/overview`.
 */
export const dashboardApi = {
  stats: () => apiCall("/analytics/overview", () => dashboardStats),
  trend: () => apiCall("/analytics/trends", () => signupTrend),
  sources: () => apiCall("/analytics/traffic-sources", () => trafficSources),
  cities: () => apiCall("/analytics/cities", () => cityBreakdown),
};
