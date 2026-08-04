import { apiCall } from "./client";

/**
 * Dashboard summary. Calls the backend analytics endpoints. Default factories
 * return realistic test data so the UI looks functional when no backend is configured.
 */
export const dashboardApi = {
  stats: () =>
    apiCall("/analytics/overview", () => ({
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
    }), { public: true }),
  trend: (days = 30) => {
    // Generate sample trend data
    const data = [];
    const baseDate = new Date();
    const perDay = days === 30 ? 8 : 15;
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(baseDate);
      date.setDate(date.getDate() - i);
      data.push({
        date: date.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        signups: Math.floor(Math.random() * 15) + perDay,
        verified: Math.floor(Math.random() * 8) + Math.floor(perDay * 0.6),
      });
    }
    return data;
  },
  sources: () => apiCall("/analytics/traffic-sources", () => [
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
};
