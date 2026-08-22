import { apiCall } from "./client";
import { toQuery } from "./waitlist";
import type { AnalyticsPeriod } from "./analytics";
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
  /** One line per referrer, explaining what happened to them. */
  messages: string[];
};

/** The reward structure, stored in the `referrals` settings group. */
export type ReferralProgram = {
  rewardsEnabled: boolean;
  currency: "NGN" | "USD" | "GBP" | "EUR";
  referrerReward: number;
  referredReward: number;
  minimumVerifiedForPayout: number;
  bonusMilestoneRefs: number;
  bonusMilestoneReward: number;
  rewardNote: string;
};

/** A referrer with converted referrals that have not been paid yet. */
export type PendingReward = {
  id: string;
  name: string;
  email: string;
  pending: number;
  lifetimeConverted: number;
  /** False when they are still below `minimumVerifiedForPayout`. */
  eligible: boolean;
  payout: number;
  latestConversionAt: string | null;
};

export const referralsApi = {
  leaderboard: (limit = 25) =>
    apiCall<ReferralLeaderboardEntry[]>(`/referrals/leaderboard${toQuery({ limit })}`),

  /** `days=0` means all time. Scopes every count, not just the chart. */
  analytics: (days: AnalyticsPeriod = 30) =>
    apiCall<ReferralAnalytics>(`/referrals/analytics${toQuery({ days })}`),

  get: (id: string) => apiCall<ReferralDetail>(`/referrals/${id}`),

  /** Everyone with a payable balance right now, plus the live program. */
  pendingRewards: () => apiCall<PendingReward[]>("/referrals/rewards/pending"),

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

  /** POST /referrals/visit — PUBLIC: record a referral-link click with UTM. */
  visit: (code: string, utm_source?: string) =>
    apiCall<{ valid: boolean }>(`/referrals/visit${toQuery({ code, utm_source })}`),
};
