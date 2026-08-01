// Realistic mock data for MyTijaara admin panel
export type WaitlistUser = {
  id: string;
  name: string;
  email: string;
  phone: string;
  city: string;
  state: string;
  status: "active" | "invited" | "onboarded" | "unsubscribed";
  verified: boolean;
  referrals: number;
  referredBy?: string;
  source: "organic" | "referral" | "instagram" | "twitter" | "facebook" | "tiktok" | "google";
  device: "iOS" | "Android" | "Web";
  tags: string[];
  notes?: string;
  joinedAt: string;
  lastActive: string;
  position: number;
};

const firstNames = [
  "Chidi",
  "Aisha",
  "Emeka",
  "Fatima",
  "Ibrahim",
  "Ngozi",
  "Yusuf",
  "Adaeze",
  "Tunde",
  "Zainab",
  "Segun",
  "Blessing",
  "Kelechi",
  "Halima",
  "Obinna",
  "Amara",
  "Musa",
  "Chinaza",
  "Bola",
  "Sade",
  "Nkechi",
  "Femi",
  "Rukayat",
  "Uche",
  "Damilola",
  "Kemi",
  "Olumide",
  "Grace",
  "Ifeanyi",
  "Hauwa",
];
const lastNames = [
  "Okonkwo",
  "Bello",
  "Adeyemi",
  "Ibrahim",
  "Nwosu",
  "Musa",
  "Okafor",
  "Yakubu",
  "Eze",
  "Suleiman",
  "Adegoke",
  "Okoro",
  "Lawal",
  "Obi",
  "Aliyu",
  "Balogun",
  "Ahmed",
  "Onyekachi",
  "Sanni",
  "Uzoma",
];
const cities = [
  "Lagos",
  "Abuja",
  "Kano",
  "Port Harcourt",
  "Ibadan",
  "Benin City",
  "Kaduna",
  "Enugu",
  "Jos",
  "Owerri",
  "Uyo",
  "Warri",
  "Abeokuta",
  "Ilorin",
  "Onitsha",
];
const states = [
  "Lagos",
  "FCT",
  "Kano",
  "Rivers",
  "Oyo",
  "Edo",
  "Kaduna",
  "Enugu",
  "Plateau",
  "Imo",
  "Akwa Ibom",
  "Delta",
  "Ogun",
  "Kwara",
  "Anambra",
];
const sources: WaitlistUser["source"][] = [
  "organic",
  "referral",
  "instagram",
  "twitter",
  "facebook",
  "tiktok",
  "google",
];
const devices: WaitlistUser["device"][] = ["iOS", "Android", "Web"];
const statuses: WaitlistUser["status"][] = [
  "active",
  "active",
  "active",
  "active",
  "invited",
  "onboarded",
  "unsubscribed",
];
const tagPool = [
  "early-bird",
  "vip",
  "influencer",
  "vendor",
  "rider",
  "power-user",
  "beta-tester",
  "student",
  "diaspora",
];

function seededRandom(seed: number) {
  return function () {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  };
}

export function generateWaitlist(count = 247): WaitlistUser[] {
  const rand = seededRandom(42);
  const pick = <T>(arr: T[]) => arr[Math.floor(rand() * arr.length)];
  const users: WaitlistUser[] = [];
  const now = Date.now();
  for (let i = 0; i < count; i++) {
    const first = pick(firstNames);
    const last = pick(lastNames);
    const cityIdx = Math.floor(rand() * cities.length);
    const daysAgo = Math.floor(rand() * 90);
    const tags = Array.from({ length: Math.floor(rand() * 3) }, () => pick(tagPool)).filter(
      (t, i, a) => a.indexOf(t) === i,
    );
    users.push({
      id: `wl_${String(i + 1).padStart(5, "0")}`,
      name: `${first} ${last}`,
      email: `${first.toLowerCase()}.${last.toLowerCase()}${Math.floor(rand() * 99)}@${pick(["gmail.com", "yahoo.com", "outlook.com", "icloud.com"])}`,
      phone: `+234${Math.floor(700 + rand() * 200)}${Math.floor(1000000 + rand() * 8999999)}`,
      city: cities[cityIdx],
      state: states[cityIdx],
      status: pick(statuses),
      verified: rand() > 0.25,
      referrals: Math.floor(rand() * rand() * 40),
      source: pick(sources),
      device: pick(devices),
      tags,
      notes: rand() > 0.8 ? "Reached out about vendor onboarding" : undefined,
      joinedAt: new Date(now - daysAgo * 86400000).toISOString(),
      lastActive: new Date(now - Math.floor(rand() * daysAgo) * 86400000).toISOString(),
      position: i + 1,
    });
  }
  return users.sort((a, b) => new Date(b.joinedAt).getTime() - new Date(a.joinedAt).getTime());
}

export const waitlistUsers = generateWaitlist();

export const dashboardStats = {
  visitors: 48210,
  totalWaitlist: waitlistUsers.length,
  todaySignups: 34,
  weeklyGrowth: 18.4,
  monthlyGrowth: 62.1,
  conversionRate: 4.7,
  ctaClicks: 12480,
  emailOpenRate: 42.8,
  emailClickRate: 8.3,
  verifiedRate: (waitlistUsers.filter((u) => u.verified).length / waitlistUsers.length) * 100,
};

export const signupTrend = Array.from({ length: 30 }, (_, i) => {
  const d = new Date();
  d.setDate(d.getDate() - (29 - i));
  const base = 8 + Math.floor(Math.sin(i / 3) * 6 + i * 0.6);
  return {
    date: d.toISOString().slice(0, 10),
    label: d.toLocaleDateString("en", { month: "short", day: "numeric" }),
    signups: Math.max(2, base + Math.floor(Math.random() * 8)),
    verified: Math.max(1, base - 2 + Math.floor(Math.random() * 5)),
  };
});

export const trafficSources = [
  { name: "Organic Search", value: 34, color: "#0D7A46" },
  { name: "Referral", value: 28, color: "#D4A017" },
  { name: "Instagram", value: 16, color: "#166534" },
  { name: "Twitter/X", value: 9, color: "#1DA1F2" },
  { name: "TikTok", value: 8, color: "#000000" },
  { name: "Direct", value: 5, color: "#64748b" },
];

export const cityBreakdown = [
  { city: "Lagos", users: 89, growth: 12.4 },
  { city: "Abuja", users: 47, growth: 8.1 },
  { city: "Port Harcourt", users: 28, growth: 22.3 },
  { city: "Ibadan", users: 22, growth: 5.6 },
  { city: "Kano", users: 19, growth: 15.8 },
  { city: "Benin City", users: 14, growth: 4.2 },
  { city: "Enugu", users: 11, growth: 9.7 },
];

export const deviceBreakdown = [
  { name: "Android", value: 58, color: "#0D7A46" },
  { name: "iOS", value: 32, color: "#166534" },
  { name: "Web", value: 10, color: "#D4A017" },
];

export const referralLeaderboard = waitlistUsers
  .slice()
  .sort((a, b) => b.referrals - a.referrals)
  .slice(0, 25)
  .map((u, i) => ({
    ...u,
    rank: i + 1,
    points: u.referrals * 10 + Math.floor(Math.random() * 20),
  }));

export const campaigns = [
  {
    id: "cmp_001",
    name: "Welcome to MyTijaara",
    status: "sent",
    subject: "You're on the list! Here's what's next 🎉",
    sent: 1847,
    opens: 890,
    clicks: 234,
    sentAt: "2026-07-18",
    template: "welcome",
  },
  {
    id: "cmp_002",
    name: "Early Access Invite — Lagos",
    status: "sent",
    subject: "Lagos, you're first. Try MyTijaara today.",
    sent: 892,
    opens: 512,
    clicks: 187,
    sentAt: "2026-07-14",
    template: "invite",
  },
  {
    id: "cmp_003",
    name: "Referral Bonus Reminder",
    status: "scheduled",
    subject: "3 friends away from your ₦5,000 bonus",
    sent: 0,
    opens: 0,
    clicks: 0,
    sentAt: "2026-07-26",
    template: "referral",
  },
  {
    id: "cmp_004",
    name: "Product Update — August",
    status: "draft",
    subject: "New: Book artisans in seconds",
    sent: 0,
    opens: 0,
    clicks: 0,
    sentAt: "",
    template: "update",
  },
  {
    id: "cmp_005",
    name: "Vendor Onboarding Series",
    status: "sent",
    subject: "Grow your business with MyTijaara",
    sent: 342,
    opens: 198,
    clicks: 76,
    sentAt: "2026-07-10",
    template: "vendor",
  },
];

export const emailTemplates = [
  {
    id: "tpl_1",
    name: "Welcome Email",
    category: "onboarding",
    updatedAt: "2026-07-15",
    thumbnail: "welcome",
  },
  {
    id: "tpl_2",
    name: "Referral Bonus",
    category: "engagement",
    updatedAt: "2026-07-12",
    thumbnail: "referral",
  },
  {
    id: "tpl_3",
    name: "Early Access",
    category: "launch",
    updatedAt: "2026-07-08",
    thumbnail: "invite",
  },
  {
    id: "tpl_4",
    name: "Vendor Onboarding",
    category: "onboarding",
    updatedAt: "2026-07-02",
    thumbnail: "vendor",
  },
  {
    id: "tpl_5",
    name: "Product Update",
    category: "newsletter",
    updatedAt: "2026-06-28",
    thumbnail: "update",
  },
  {
    id: "tpl_6",
    name: "Password Reset",
    category: "transactional",
    updatedAt: "2026-06-20",
    thumbnail: "reset",
  },
];

export const mediaFiles = Array.from({ length: 42 }, (_, i) => ({
  id: `media_${i + 1}`,
  name:
    [
      "hero-lagos",
      "artisan-plumber",
      "grocery-basket",
      "food-jollof",
      "vendor-store",
      "rider-bike",
      "pharmacy-shelf",
      "customer-happy",
      "delivery-parcel",
      "shopping-bag",
    ][i % 10] + `-${i + 1}.jpg`,
  type: i % 7 === 0 ? "video" : i % 11 === 0 ? "document" : "image",
  size: Math.floor(120 + Math.random() * 4800),
  folder: ["Marketing", "Product", "Hero", "Blog", "Uncategorized"][i % 5],
  uploadedAt: new Date(Date.now() - i * 86400000 * 2).toISOString(),
  dimensions: i % 7 === 0 ? "1920x1080" : "1600x900",
  url: `https://picsum.photos/seed/mt${i}/600/400`,
}));

export const activityLog = [
  {
    id: 1,
    user: "Adaeze Okafor",
    action: "Sent campaign",
    target: "Welcome to MyTijaara",
    time: "2m ago",
    ip: "102.89.34.12",
    device: "Chrome / macOS",
  },
  {
    id: 2,
    user: "System",
    action: "Auto-verified user",
    target: "yusuf.bello@gmail.com",
    time: "8m ago",
    ip: "—",
    device: "Server",
  },
  {
    id: 3,
    user: "Chidi Nwosu",
    action: "Updated hero section",
    target: "CMS / Hero",
    time: "24m ago",
    ip: "197.210.44.5",
    device: "Safari / iOS",
  },
  {
    id: 4,
    user: "Fatima Ibrahim",
    action: "Exported waitlist",
    target: "247 users",
    time: "1h ago",
    ip: "102.89.34.12",
    device: "Chrome / Windows",
  },
  {
    id: 5,
    user: "Emeka Obi",
    action: "Created role",
    target: "Content Editor",
    time: "3h ago",
    ip: "154.113.22.8",
    device: "Firefox / Ubuntu",
  },
  {
    id: 6,
    user: "System",
    action: "Backup completed",
    target: "Daily snapshot",
    time: "5h ago",
    ip: "—",
    device: "Server",
  },
  {
    id: 7,
    user: "Adaeze Okafor",
    action: "Deleted media",
    target: "hero-old-v1.jpg",
    time: "yesterday",
    ip: "102.89.34.12",
    device: "Chrome / macOS",
  },
  {
    id: 8,
    user: "Ngozi Adeyemi",
    action: "Signed in",
    target: "Admin panel",
    time: "yesterday",
    ip: "41.58.99.201",
    device: "Chrome / Android",
  },
];

export const notifications = [
  {
    id: 1,
    title: "New milestone reached",
    body: "You crossed 250 waitlist signups 🎉",
    type: "success",
    time: "5m ago",
    unread: true,
  },
  {
    id: 2,
    title: "Campaign delivered",
    body: "'Welcome to MyTijaara' sent to 1,847 recipients",
    type: "info",
    time: "2h ago",
    unread: true,
  },
  {
    id: 3,
    title: "Storage 68% used",
    body: "Consider archiving old media",
    type: "warning",
    time: "yesterday",
    unread: false,
  },
  {
    id: 4,
    title: "New admin login",
    body: "Ngozi Adeyemi signed in from Lagos",
    type: "info",
    time: "yesterday",
    unread: false,
  },
  {
    id: 5,
    title: "Weekly report ready",
    body: "Your growth digest for July W3 is available",
    type: "info",
    time: "3 days ago",
    unread: false,
  },
];

export const adminUsers = [
  {
    id: "u_1",
    name: "Adaeze Okafor",
    email: "adaeze@mytijaara.com",
    role: "Super Admin",
    status: "active",
    lastActive: "2m ago",
    avatar: "AO",
  },
  {
    id: "u_2",
    name: "Chidi Nwosu",
    email: "chidi@mytijaara.com",
    role: "Admin",
    status: "active",
    lastActive: "24m ago",
    avatar: "CN",
  },
  {
    id: "u_3",
    name: "Fatima Ibrahim",
    email: "fatima@mytijaara.com",
    role: "Marketing",
    status: "active",
    lastActive: "1h ago",
    avatar: "FI",
  },
  {
    id: "u_4",
    name: "Emeka Obi",
    email: "emeka@mytijaara.com",
    role: "Content Editor",
    status: "active",
    lastActive: "3h ago",
    avatar: "EO",
  },
  {
    id: "u_5",
    name: "Ngozi Adeyemi",
    email: "ngozi@mytijaara.com",
    role: "Analyst",
    status: "active",
    lastActive: "yesterday",
    avatar: "NA",
  },
  {
    id: "u_6",
    name: "Yusuf Bello",
    email: "yusuf@mytijaara.com",
    role: "Support",
    status: "invited",
    lastActive: "—",
    avatar: "YB",
  },
];

export const roles = [
  {
    id: "r_1",
    name: "Super Admin",
    description: "Full access to all modules and settings",
    users: 1,
    permissions: 42,
    color: "#0D7A46",
  },
  {
    id: "r_2",
    name: "Admin",
    description: "Manage content, users and campaigns",
    users: 3,
    permissions: 32,
    color: "#166534",
  },
  {
    id: "r_3",
    name: "Marketing",
    description: "Campaigns, referrals and analytics",
    users: 4,
    permissions: 18,
    color: "#D4A017",
  },
  {
    id: "r_4",
    name: "Content Editor",
    description: "CMS and media library only",
    users: 2,
    permissions: 12,
    color: "#0891b2",
  },
  {
    id: "r_5",
    name: "Analyst",
    description: "Read-only access to analytics",
    users: 5,
    permissions: 8,
    color: "#7c3aed",
  },
  {
    id: "r_6",
    name: "Support",
    description: "View users, respond to messages",
    users: 2,
    permissions: 6,
    color: "#64748b",
  },
];

export const permissionGroups = [
  { group: "Waitlist", items: ["view", "create", "edit", "delete", "export", "bulk-actions"] },
  { group: "Referrals", items: ["view", "manage", "adjust-points", "export"] },
  {
    group: "CMS",
    items: [
      "view",
      "edit-hero",
      "edit-features",
      "edit-testimonials",
      "edit-faqs",
      "edit-footer",
      "publish",
    ],
  },
  { group: "Media", items: ["view", "upload", "delete", "manage-folders"] },
  { group: "Email", items: ["view", "create", "send", "schedule", "delete", "manage-templates"] },
  { group: "Analytics", items: ["view", "export"] },
  { group: "Users", items: ["view", "invite", "edit", "delete"] },
  { group: "Roles", items: ["view", "create", "edit", "delete", "assign"] },
  { group: "Settings", items: ["view", "edit-general", "edit-integrations", "edit-api-keys"] },
];

export const funnel = [
  { stage: "Landing Page Visit", value: 48210, pct: 100 },
  { stage: "Clicked Join Waitlist", value: 12480, pct: 25.9 },
  { stage: "Completed Form", value: 3892, pct: 8.1 },
  { stage: "Verified Email", value: 2847, pct: 5.9 },
  { stage: "Referred a Friend", value: 892, pct: 1.9 },
];

export const conversionFunnel = funnel;

export const browserBreakdown = [
  { name: "Chrome", value: 58, color: "#F4B400" },
  { name: "Safari", value: 24, color: "#0D7A46" },
  { name: "Firefox", value: 8, color: "#FF7139" },
  { name: "Edge", value: 6, color: "#0078D7" },
  { name: "Other", value: 4, color: "#64748b" },
];

export const faqs = [
  {
    id: 1,
    question: "When will MyTijaara launch?",
    answer: "We're rolling out to Lagos in Q3 2026, followed by Abuja and Port Harcourt.",
    order: 1,
    published: true,
  },
  {
    id: 2,
    question: "Is MyTijaara free to use?",
    answer: "Yes, downloading and using MyTijaara is free. You only pay for what you order.",
    order: 2,
    published: true,
  },
  {
    id: 3,
    question: "How do I become a vendor?",
    answer: "Join the vendor waitlist from the app or contact us at vendors@mytijaara.com.",
    order: 3,
    published: true,
  },
  {
    id: 4,
    question: "Which cities are supported?",
    answer: "Lagos at launch, with Abuja, Port Harcourt, and Kano following within 90 days.",
    order: 4,
    published: true,
  },
  {
    id: 5,
    question: "How does the referral program work?",
    answer: "Invite friends with your unique code and earn ₦500 credit for each verified signup.",
    order: 5,
    published: false,
  },
];

export const testimonials = [
  {
    id: 1,
    name: "Kelechi Umeh",
    role: "Small business owner, Lagos",
    quote: "Finally, an app that gets what Nigerian merchants actually need.",
    rating: 5,
    published: true,
    avatar: "KU",
  },
  {
    id: 2,
    name: "Amara Eze",
    role: "Student, Abuja",
    quote: "Groceries, food, pharmacy — all in one place. I don't need 5 apps anymore.",
    rating: 5,
    published: true,
    avatar: "AE",
  },
  {
    id: 3,
    name: "Segun Adeyemi",
    role: "Rider, Ibadan",
    quote: "The earnings are transparent and the app is smooth. Big win for riders.",
    rating: 5,
    published: true,
    avatar: "SA",
  },
  {
    id: 4,
    name: "Halima Musa",
    role: "Diaspora, London",
    quote: "I can send groceries to my parents in Kano from London. Game changer.",
    rating: 5,
    published: false,
    avatar: "HM",
  },
];

export function formatNumber(n: number) {
  if (n >= 1000000) return (n / 1000000).toFixed(1) + "M";
  if (n >= 1000) return (n / 1000).toFixed(1) + "k";
  return n.toString();
}
