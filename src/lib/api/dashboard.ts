import { apiCall } from "./client";

export const dashboardApi = {
  stats: () => apiCall("/analytics/overview", () => ({})),
  trend: (days = 30) => apiCall(`/analytics/trends?days=${days}`, () => []),
  sources: () => apiCall("/analytics/traffic-sources", () => []),
  cities: () => apiCall("/analytics/cities", () => []),
};
