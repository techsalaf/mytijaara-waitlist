import { apiCall } from "./client";
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
    apiCall<ReferralLeaderboardEntry[]>("/referrals/leaderboard", () => [
      { id: "1", name: "Chioma Okafor", email: "chioma@example.com", phone: "+234801234567", city: "Lagos", state: "Lagos", role: "customer", interest: "", source: "organic", referralCode: "CHIOMA123", status: "active", verified: true, device: "iPhone", position: 1, referrals: 24, tags: [], notes: null, joinedAt: new Date(Date.now() - 30*24*60*60*1000).toISOString(), rank: 1, points: 1200 },
      { id: "2", name: "Tunde Adesanya", email: "tunde@example.com", phone: "+234802234567", city: "Abuja", state: "Abuja", role: "vendor", interest: "", source: "referral", referralCode: "TUNDE456", status: "active", verified: true, device: "Android", position: 2, referrals: 18, tags: [], notes: null, joinedAt: new Date(Date.now() - 25*24*60*60*1000).toISOString(), rank: 2, points: 900 },
      { id: "3", name: "Ada Nwankwo", email: "ada@example.com", phone: "+234803234567", city: "Kaduna", state: "Kaduna", role: "rider", interest: "", source: "referral", referralCode: "ADA789", status: "active", verified: true, device: "iPhone", position: 3, referrals: 14, tags: [], notes: null, joinedAt: new Date(Date.now() - 20*24*60*60*1000).toISOString(), rank: 3, points: 700 },
    ]),
  analytics: () =>
    apiCall<ReferralAnalytics>("/referrals/analytics", () => ({
      totalVisits: 4280,
      conversions: 156,
      conversionRate: 3.65,
      totalReferred: 156,
      activeReferrers: 48,
      trend: [
        { date: "Mon", visits: 520, conversions: 18 },
        { date: "Tue", visits: 580, conversions: 22 },
        { date: "Wed", visits: 610, conversions: 25 },
        { date: "Thu", visits: 640, conversions: 28 },
        { date: "Fri", visits: 700, conversions: 32 },
        { date: "Sat", visits: 560, conversions: 20 },
        { date: "Sun", visits: 470, conversions: 11 },
      ],
      sources: [
        { source: "WhatsApp", value: 45, referrals: 68 },
        { source: "Twitter", value: 28, referrals: 42 },
        { source: "Instagram", value: 18, referrals: 28 },
        { source: "Direct", value: 9, referrals: 18 },
      ],
    })),
  get: (id: string) =>
    apiCall<{ referrer: ReferralLeaderboardEntry; referred: WaitlistUser[]; points: number }>(
      `/referrals/${id}`,
      () => ({ referrer: { id: "1", name: "Chioma Okafor", email: "chioma@example.com", phone: "+234801234567", city: "Lagos", state: "Lagos", role: "customer", interest: "", source: "organic", referralCode: "CHIOMA123", status: "active", verified: true, device: "iPhone", position: 1, referrals: 24, tags: [], notes: null, joinedAt: new Date().toISOString(), rank: 1, points: 1200 }, referred: [], points: 1200 }),
    ),
};
