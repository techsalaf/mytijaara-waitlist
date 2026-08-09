export type WaitlistRole = "customer" | "vendor" | "artisan" | "rider";

export type RoleRewardTier = {
  milestone: number; // 1, 5, 10
  title: string;
  description: string;
  badgeText: string;
  iconName: "Zap" | "Award" | "Gift" | "Sparkles" | "Crown" | "Truck" | "Briefcase" | "Wrench";
};

export type RoleRewardInfo = {
  role: WaitlistRole;
  title: string;
  tagline: string;
  accentColor: string;
  badgeBg: string;
  badgeText: string;
  tiers: RoleRewardTier[];
  unlocked10Title: string;
  unlocked10Description: string[];
};

export const ROLE_REWARDS: Record<WaitlistRole, RoleRewardInfo> = {
  customer: {
    role: "customer",
    title: "Customer Referral Rewards",
    tagline: "Invite friends, move up the waitlist & earn cash + free delivery on launch day!",
    accentColor: "#1F5C3A",
    badgeBg: "bg-emerald-100 text-emerald-800 border-emerald-200",
    badgeText: "Customer Perks",
    unlocked10Title: "₦500 Wallet Credit + Free Delivery",
    unlocked10Description: [
      "₦500 credited automatically to your MyTijaara wallet on launch.",
      "Free delivery on your very first order when MyTijaara goes live.",
      "First order must be placed using the same email address registered on the waitlist.",
    ],
    tiers: [
      {
        milestone: 1,
        title: "Waitlist Bump",
        description: "Move up 10 spots on the waitlist instantly for every friend who joins.",
        badgeText: "1 Referral",
        iconName: "Zap",
      },
      {
        milestone: 5,
        title: "VIP Early Access",
        description: "Get invited to the exclusive 48-hour pre-launch beta test.",
        badgeText: "5 Referrals",
        iconName: "Sparkles",
      },
      {
        milestone: 10,
        title: "₦500 + Free Delivery",
        description: "Earn ₦500 wallet credit + 100% free delivery on your first order at launch.",
        badgeText: "10 Referrals",
        iconName: "Gift",
      },
    ],
  },
  vendor: {
    role: "vendor",
    title: "Vendor Referral Rewards",
    tagline: "Grow your business from day one with free store promotion & custom graphics!",
    accentColor: "#7C3AED",
    badgeBg: "bg-purple-100 text-purple-800 border-purple-200",
    badgeText: "Vendor Perks",
    unlocked10Title: "3 Days Free Store Promotion + Custom Graphic",
    unlocked10Description: [
      "3 days of top-tier featured placement on the MyTijaara homepage banner.",
      "Professional custom promotional design graphic created for your business.",
      "Priority vendor onboarding assistance from our partner success team.",
    ],
    tiers: [
      {
        milestone: 1,
        title: "Priority Onboarding",
        description: "Jump to the front of the vendor verification & store setup queue.",
        badgeText: "1 Referral",
        iconName: "Briefcase",
      },
      {
        milestone: 5,
        title: "Verified Vendor Badge",
        description: "Earn a gold 'Verified Merchant' badge visible to all customers on launch.",
        badgeText: "5 Referrals",
        iconName: "Award",
      },
      {
        milestone: 10,
        title: "3 Days Free Promotion + Design",
        description: "Unlock 3 days of prime homepage promotion + custom social graphic package.",
        badgeText: "10 Referrals",
        iconName: "Crown",
      },
    ],
  },
  artisan: {
    role: "artisan",
    title: "Artisan Referral Rewards",
    tagline: "Get featured across your city and win high-paying client bookings!",
    accentColor: "#D97706",
    badgeBg: "bg-amber-100 text-amber-800 border-amber-200",
    badgeText: "Artisan Perks",
    unlocked10Title: "3 Days Featured Service Spot + Promo Graphic",
    unlocked10Description: [
      "3 days of #1 featured ranking in your city's service directory search.",
      "Custom branded promotional graphic highlighting your skills & contact info.",
      "Zero commission fee on your first 5 completed client jobs.",
    ],
    tiers: [
      {
        milestone: 1,
        title: "Fast-Track Verification",
        description: "Express identity & skill verification within 24 hours of launch.",
        badgeText: "1 Referral",
        iconName: "Wrench",
      },
      {
        milestone: 5,
        title: "Master Craftsman Badge",
        description: "Stand out with a premium 'Top-Rated Specialist' badge on your profile.",
        badgeText: "5 Referrals",
        iconName: "Award",
      },
      {
        milestone: 10,
        title: "3 Days Featured Search + Promo",
        description: "Get 3 days featured service directory placement + professional promo design.",
        badgeText: "10 Referrals",
        iconName: "Crown",
      },
    ],
  },
  rider: {
    role: "rider",
    title: "Rider Referral Rewards",
    tagline: "Earn rider credits, priority order dispatch & zero-fee delivery weeks!",
    accentColor: "#059669",
    badgeBg: "bg-emerald-100 text-emerald-800 border-emerald-200",
    badgeText: "Rider Perks",
    unlocked10Title: "₦10,000 Rider Credits + Priority Dispatch",
    unlocked10Description: [
      "₦10,000 credited to your MyTijaara rider account for gear/fuel expenses.",
      "Priority order dispatch algorithm status for your first 30 days.",
      "Exclusive MyTijaara branded rider helmet and delivery bag kit discount.",
    ],
    tiers: [
      {
        milestone: 1,
        title: "Fast-Track Onboarding",
        description: "Priority document processing & instant app setup at launch.",
        badgeText: "1 Referral",
        iconName: "Truck",
      },
      {
        milestone: 5,
        title: "Gold Fleet Status",
        description: "Unlock high-value order batching & distance bonus multipliers.",
        badgeText: "5 Referrals",
        iconName: "Award",
      },
      {
        milestone: 10,
        title: "₦10,000 Credits + Priority Dispatch",
        description: "Receive ₦10,000 rider credits + priority dispatch preference on all orders.",
        badgeText: "10 Referrals",
        iconName: "Crown",
      },
    ],
  },
};

export function getRoleReward(role?: string): RoleRewardInfo {
  const norm = (role || "customer").toLowerCase() as WaitlistRole;
  return ROLE_REWARDS[norm] || ROLE_REWARDS.customer;
}
