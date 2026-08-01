import { apiCall } from "./client";
import {
  dashboardStats,
  signupTrend,
  trafficSources,
  cityBreakdown,
  deviceBreakdown,
  browserBreakdown,
  funnel,
} from "@/lib/mock-data";

/**
 * Analytics API.
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
  overview: () => apiCall("/analytics/overview", () => dashboardStats),
  trends: () => apiCall("/analytics/trends", () => signupTrend),
  trafficSources: () => apiCall("/analytics/traffic-sources", () => trafficSources),
  cities: () => apiCall("/analytics/cities", () => cityBreakdown),
  devices: () => apiCall("/analytics/devices", () => deviceBreakdown),
  browsers: () => apiCall("/analytics/browsers", () => browserBreakdown),
  funnel: () => apiCall("/analytics/funnel", () => funnel),
};
