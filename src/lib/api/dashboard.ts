import { analyticsApi, type AnalyticsPeriod } from "./analytics";

/**
 * Thin alias kept so existing dashboard code keeps compiling. All four calls
 * forward to `analyticsApi` with the selected period so nothing goes stale
 * when the period selector changes.
 */
export const dashboardApi = {
  stats: (days: AnalyticsPeriod = 30) => analyticsApi.overview(days),
  trend: (days = 30) => analyticsApi.trends(days),
  sources: (days: AnalyticsPeriod = 30) => analyticsApi.trafficSources(days),
  cities: (days: AnalyticsPeriod = 30) => analyticsApi.cities(days),
};
