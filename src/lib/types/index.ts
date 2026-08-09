/**
 * Shared domain types for MyTijaara.
 *
 * Routes import their row shapes from here or from the `@/lib/api` module that
 * owns the endpoint. `src/lib/mock-data.ts` is gone; nothing in the app ships a
 * fixture any more.
 */

// The program shape lives with the endpoint that owns it; imported here only so
// `ReferralAnalytics.program` can reference it, and re-exported below.
import type { ReferralProgram as ReferralProgramSettings } from "@/lib/api/referrals";

export type WaitlistStatus = "active" | "invited" | "onboarded" | "unsubscribed";
export type WaitlistSource =
  "organic" | "referral" | "instagram" | "twitter" | "facebook" | "tiktok" | "google";
export type WaitlistDevice = "iOS" | "Android" | "Web";
export type WaitlistRole = "customer" | "vendor" | "rider" | "artisan";

export type WaitlistUser = {
  id: string;
  name: string;
  email: string;
  phone: string;
  city: string;
  state: string;
  role?: WaitlistRole;
  status: WaitlistStatus;
  verified: boolean;
  referrals: number;
  referredBy?: string;
  source: WaitlistSource;
  device: WaitlistDevice;
  tags: string[];
  notes?: string;
  joinedAt: string;
  lastActive: string;
  position: number;
};

export type ReferralLeaderboardEntry = WaitlistUser & {
  rank: number;
  points: number;
};

export type ReferralTrendPoint = {
  date: string;
  label: string;
  visits: number;
  conversions: number;
  signups: number;
};

export type ReferralAnalytics = {
  /** Window the numbers cover. 0 = all time. */
  periodDays: number;
  totalVisits: number;
  conversions: number;
  conversionRate: number;
  totalReferred: number;
  activeReferrers: number;
  trend: ReferralTrendPoint[];
  sources: { name: string; value: number }[];
  /**
   * Real payout figures. The analytics page used to print `value="₦124k"
   * delta={38.4}` as a literal; these come from the rows actually marked
   * rewarded and the program settings behind them.
   */
  rewards: ReferralRewardTotals;
  program: ReferralProgramSettings;
};

export type ReferralRewardTotals = {
  currency: string;
  referrerReward: number;
  paidReferrals: number;
  paidReferrers: number;
  pendingReferrals: number;
  amountPaid: number;
  /** Pre-formatted with the program currency symbol, e.g. `₦12,500`. */
  amountPaidLabel: string;
};

/** Re-exported from the module that owns the endpoint. */
export type { ReferralProgramSettings };

/**
 * Re-exported, not redeclared.
 *
 * There used to be a second copy of this shape here, missing `periodDays`,
 * `periodSignups` and `previousPeriodSignups`. The backend has always returned
 * those three, so any route importing the copy from here could not see the
 * fields it needed to label the selected window — and the two definitions could
 * drift again on the next backend change. One declaration, in the file that owns
 * the endpoint.
 */
export type { DashboardStats } from "@/lib/api/analytics";

export type SignupTrendPoint = {
  date: string;
  label: string;
  signups: number;
  verified: number;
};

export type TrafficSource = { name: string; value: number; color: string };
export type CityBreakdown = { city: string; users: number; growth: number };
export type DeviceBreakdown = { name: string; value: number; color: string };
export type BrowserBreakdown = { name: string; value: number; color: string };
export type FunnelStep = { stage: string; value: number; pct: number };

export type CampaignStatus = "draft" | "scheduled" | "sending" | "sent";
export type Campaign = {
  id: string;
  name: string;
  status: CampaignStatus;
  subject: string;
  html: string | null;
  sent: number;
  opens: number;
  clicks: number;
  openRate: number;
  clickRate: number;
  sentAt: string | null;
  scheduledAt: string | null;
  /** Template public_id, or null when the HTML was authored directly. */
  templateId: string | null;
  segment: Record<string, unknown> | null;
  createdAt: string;
};

/** One preset segment with its live reach. */
export type CampaignSegment = {
  value: string;
  label: string;
  rules: Record<string, unknown>;
  reach: number;
};

export type EmailTemplate = {
  id: string;
  name: string;
  category: string;
  updatedAt: string;
  thumbnail: string;
};

export type MediaFile = {
  id: string;
  name: string;
  type: "image" | "video" | "document";
  size: number;
  folder: string;
  uploadedAt: string;
  dimensions: string;
  url: string;
};

export type Notification = {
  id: number;
  title: string;
  body: string;
  type: "success" | "info" | "warning" | "error";
  time: string;
  unread: boolean;
};

export type ActivityLogEntry = {
  id: number;
  user: string;
  action: string;
  target: string;
  time: string;
  ip: string;
  device: string;
};

export type AdminUser = {
  id: string;
  name: string;
  email: string;
  role: string;
  status: string;
  lastActive: string;
  avatar: string;
};

export type Role = {
  id: string;
  name: string;
  description: string;
  users: number;
  permissions: number;
  color: string;
};

export type Faq = {
  id: number;
  question: string;
  answer: string;
  order: number;
  published: boolean;
};

export type Testimonial = {
  id: number;
  name: string;
  role: string;
  quote: string;
  rating: number;
  published: boolean;
  avatar: string;
};

/** Shape returned by every API method — matches the mock envelope so the
 * backend can drop in without changing consumers. */
export type ApiResponse<T> = {
  data: T;
  meta?: Record<string, unknown>;
};
