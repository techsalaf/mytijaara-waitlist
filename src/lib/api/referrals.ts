import { apiCall } from "./client";
import { toQuery } from "./waitlist";
import type { ReferralAnalytics, ReferralLeaderboardEntry, WaitlistUser } from "@/lib/types";

/**
 * Referrals API. Every number comes from `referral_visits` / `referrals`
 * (see `ReferralController`); there is no client-side fallback, so an empty
 * table renders an empty state rather than invented traffic.
 */

export type ReferralDetail = {
  referrer: ReferralLeaderboardEntry;
  referred: WaitlistUser[];
  points: number;
};

export type RewardResult = {
  rewarded: number;
  skipped: number;
  failed: number;
  messages: string[];
};

export const referralsApi = {
  leaderboard: (limit = 25) =>
    apiCall<ReferralLeaderboardEntry[]>(`/referrals/leaderboard${toQuery({ limit })}`),
  analytics: () => apiCall<ReferralAnalytics>("/referrals/analytics"),
  get: (id: string) => apiCall<ReferralDetail>(`/referrals/${id}`),

  /**
   * Dispatch rewards to the given referrers. The backend marks each pending
   * referral rewarded and mails the referrer, so this is never a no-op: the
   * counts it returns are what actually happened.
   */
  sendRewards: (ids: string[], note?: string) =>
    apiCall<RewardResult>("/referrals/rewards", {
      method: "POST",
      body: { ids, note: note ?? null },
      timeoutMs: 60000, // one mail per referrer
    }),
};
