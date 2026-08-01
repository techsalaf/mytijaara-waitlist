import { apiCall } from "./client";
import { referralLeaderboard } from "@/lib/mock-data";
import type { ReferralAnalytics, ReferralLeaderboardEntry, WaitlistUser } from "@/lib/types";

/**
 * Referrals API.
 *
 *   GET /referrals/leaderboard -> { data: (WaitlistUser & {rank, points})[] }
 *   GET /referrals/analytics   -> { data: { totalVisits, conversions, conversionRate, ... } }
 *   GET /referrals/:id         -> { data: { referrer, referred[], points } }
 */
export const referralsApi = {
  leaderboard: () =>
    apiCall<ReferralLeaderboardEntry[]>("/referrals/leaderboard", () => referralLeaderboard),
  analytics: () =>
    apiCall<ReferralAnalytics>("/referrals/analytics", () => ({
      totalVisits: 48210,
      conversions: 3892,
      conversionRate: 8.1,
      totalReferred: referralLeaderboard.reduce((s, u) => s + u.referrals, 0),
      activeReferrers: referralLeaderboard.length,
      trend: [],
      sources: [],
    })),
  get: (id: string) =>
    apiCall<{ referrer: ReferralLeaderboardEntry; referred: WaitlistUser[]; points: number }>(
      `/referrals/${id}`,
      () => {
        const referrer = referralLeaderboard.find((u) => u.id === id) ?? referralLeaderboard[0];
        return { referrer, referred: [], points: referrer?.points ?? 0 };
      },
    ),
};
