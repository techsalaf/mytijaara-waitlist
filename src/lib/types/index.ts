/**
 * Shared domain types for MyTijaara.
 *
 * Routes import their row shapes from here or from the `@/lib/api` module that
 * owns the endpoint. `src/lib/mock-data.ts` is gone; nothing in the app ships a
 * fixture any more.
 */

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
  totalVisits: number;
  conversions: number;
  conversionRate: number;
  totalReferred: number;
  activeReferrers: number;
  trend: ReferralTrendPoint[];
  sources: { name: string; value: number }[];
};

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

export type CampaignStatus = "draft" | "scheduled" | "sent";
export type Campaign = {
  id: string;
  name: string;
  status: CampaignStatus;
  subject: string;
  sent: number;
  opens: number;
  clicks: number;
  sentAt: string;
  template: string;
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
