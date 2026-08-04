import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  Users,
  TrendingUp,
  Award,
  MousePointerClick,
  Mail,
  Percent,
  MapPin,
  Smartphone,
  Sparkles,
  Calendar,
  ArrowRight,
} from "lucide-react";
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { Link } from "@tanstack/react-router";

import { PageHeader, StatCard, SectionCard } from "@/components/admin/ui-bits";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { analyticsApi, campaignsApi, dashboardApi, referralsApi } from "@/lib/api";
import type {
  Campaign,
  CityBreakdown,
  DashboardStats,
  DeviceBreakdown,
  ReferralLeaderboardEntry,
  SignupTrendPoint,
  TrafficSource,
} from "@/lib/types";

export const Route = createFileRoute("/admin/")({
  head: () => ({
    meta: [{ title: "Dashboard — MyTijaara Admin" }, { name: "robots", content: "noindex" }],
  }),
  component: DashboardPage,
});

function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [trend, setTrend] = useState<SignupTrendPoint[]>([]);
  const [sources, setSources] = useState<TrafficSource[]>([]);
  const [cities, setCities] = useState<CityBreakdown[]>([]);
  const [devices, setDevices] = useState<DeviceBreakdown[]>([]);
  const [leaderboard, setLeaderboard] = useState<ReferralLeaderboardEntry[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [days, setDays] = useState<number>(30);

  useEffect(() => {
    let active = true;
    void Promise.all([
      dashboardApi.stats(),
      dashboardApi.trend(days),
      dashboardApi.sources(),
      analyticsApi.cities(),
      analyticsApi.devices(),
      referralsApi.leaderboard(),
      campaignsApi.list(),
    ]).then((responses) => {
      if (!active) return;
      setStats(responses[0].data);
      setTrend(responses[1].data);
      setSources(responses[2].data);
      setCities(responses[3].data);
      setDevices(responses[4].data);
      setLeaderboard(responses[5].data);
      setCampaigns(responses[6].data);
    });
    return () => {
      active = false;
    };
  }, [days]);

  const formatNumber = (value: number) => new Intl.NumberFormat("en-NG").format(value);
  const maxCityUsers = Math.max(...cities.map((city) => city.users), 1);
  const dashboardStats = stats ?? {
    visitors: 0,
    totalWaitlist: 0,
    todaySignups: 0,
    weeklyGrowth: 0,
    monthlyGrowth: 0,
    conversionRate: 0,
    ctaClicks: 0,
    emailOpenRate: 0,
    emailClickRate: 0,
    verifiedRate: 0,
  };
  const signupTrend = trend;
  const trafficSources = sources;
  const cityBreakdown = cities;
  const deviceBreakdown = devices;
  const referralLeaderboard = leaderboard;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Good morning, Adaeze 👋"
        description="Here's what's happening with your waitlist today."
        actions={
          <>
            <Button variant="outline" size="sm" onClick={() => setDays((d) => (d === 30 ? 7 : 30))}>
              <Calendar className="mr-2 h-4 w-4" /> Last {days} days
            </Button>
            <Button
              size="sm"
              className="bg-primary hover:bg-primary/90"
              onClick={async () => {
                try {
                  const name = `Weekly Digest — ${new Date().toISOString().slice(0, 10)}`;
                  await campaignsApi.create({ name, subject: name, html: "", status: "draft" });
                  // eslint-disable-next-line no-console
                  console.info("Weekly digest draft created");
                } catch (err) {
                  // eslint-disable-next-line no-console
                  console.error(err);
                }
              }}
            >
              <Sparkles className="mr-2 h-4 w-4" /> Weekly digest
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Total Waitlist"
          value={formatNumber(dashboardStats.totalWaitlist)}
          delta={dashboardStats.monthlyGrowth}
          icon={Users}
          hint="vs last 30 days"
        />
        <StatCard
          label="Today's Signups"
          value={dashboardStats.todaySignups}
          delta={dashboardStats.weeklyGrowth}
          icon={TrendingUp}
          hint="8 verified · 26 pending"
        />
        <StatCard
          label="Conversion Rate"
          value={dashboardStats.conversionRate + "%"}
          delta={0.4}
          icon={Percent}
          hint="landing → signup"
        />
        <StatCard
          label="CTA Clicks"
          value={formatNumber(dashboardStats.ctaClicks)}
          delta={12.8}
          icon={MousePointerClick}
          hint="Join waitlist button"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <SectionCard
          title="Signup Growth"
          description="Daily signups vs verified users, last 30 days"
          className="lg:col-span-2"
        >
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={signupTrend}>
                <defs>
                  <linearGradient id="signupG" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="var(--primary)" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="verifG" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--gold)" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="var(--gold)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 11, fill: "#64748b" }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ borderRadius: 12, border: "1px solid #e5e7eb", fontSize: 12 }}
                />
                <Area
                  type="monotone"
                  dataKey="signups"
                  stroke="var(--primary)"
                  strokeWidth={2.5}
                  fill="url(#signupG)"
                  name="Signups"
                />
                <Area
                  type="monotone"
                  dataKey="verified"
                  stroke="var(--gold)"
                  strokeWidth={2.5}
                  fill="url(#verifG)"
                  name="Verified"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </SectionCard>

        <SectionCard title="Traffic Sources" description="Where signups come from">
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={trafficSources}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={45}
                  outerRadius={80}
                  paddingAngle={2}
                >
                  {trafficSources.map((s, i) => (
                    <Cell key={i} fill={s.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ borderRadius: 12, border: "1px solid #e5e7eb", fontSize: 12 }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-2 space-y-1.5">
            {trafficSources.map((s) => (
              <div key={s.name} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full" style={{ background: s.color }} />
                  <span>{s.name}</span>
                </div>
                <span className="font-semibold">{s.value}%</span>
              </div>
            ))}
          </div>
        </SectionCard>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <SectionCard
          title="Popular Cities"
          description="Top waitlist cities"
          actions={<MapPin className="h-4 w-4 text-muted-foreground" />}
        >
          <div className="space-y-3">
            {cityBreakdown.slice(0, 6).map((c) => (
              <div key={c.city}>
                <div className="mb-1 flex items-center justify-between text-xs">
                  <span className="font-medium">{c.city}</span>
                  <span className="text-muted-foreground">
                    {c.users} users · <span className="text-emerald-600">+{c.growth}%</span>
                  </span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary"
                    style={{ width: `${(c.users / maxCityUsers) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </SectionCard>

        <SectionCard
          title="Devices"
          description="Signup device breakdown"
          actions={<Smartphone className="h-4 w-4 text-muted-foreground" />}
        >
          <div className="h-40">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={deviceBreakdown} layout="vertical" margin={{ left: 10 }}>
                <XAxis type="number" hide />
                <YAxis
                  type="category"
                  dataKey="name"
                  tick={{ fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  contentStyle={{ borderRadius: 12, border: "1px solid #e5e7eb", fontSize: 12 }}
                />
                <Bar dataKey="value" radius={[0, 8, 8, 0]}>
                  {deviceBreakdown.map((d, i) => (
                    <Cell key={i} fill={d.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
            {deviceBreakdown.map((d) => (
              <div key={d.name} className="rounded-lg bg-muted/50 py-2">
                <div className="font-bold">{d.value}%</div>
                <div className="text-muted-foreground">{d.name}</div>
              </div>
            ))}
          </div>
        </SectionCard>

        <SectionCard
          title="Email Campaigns"
          description="Latest send performance"
          actions={<Mail className="h-4 w-4 text-muted-foreground" />}
        >
          <div className="space-y-3">
            {campaigns.slice(0, 2).map((campaign) => (
              <div key={campaign.id} className="rounded-xl border border-border/60 p-3">
                <div className="text-xs font-medium">{campaign.name}</div>
                <div className="mt-2 grid grid-cols-3 gap-2 text-center text-xs">
                  <div>
                    <div className="font-bold">{formatNumber(campaign.sent)}</div>
                    <div className="text-muted-foreground">Sent</div>
                  </div>
                  <div>
                    <div className="font-bold text-primary">
                      {campaign.sent
                        ? `${Math.round((campaign.opens / campaign.sent) * 1000) / 10}%`
                        : "0%"}
                    </div>
                    <div className="text-muted-foreground">Opens</div>
                  </div>
                  <div>
                    <div className="font-bold text-gold">
                      {campaign.sent
                        ? `${Math.round((campaign.clicks / campaign.sent) * 1000) / 10}%`
                        : "0%"}
                    </div>
                    <div className="text-muted-foreground">Clicks</div>
                  </div>
                </div>
              </div>
            ))}
            <Button asChild variant="ghost" size="sm" className="w-full">
              <Link to="/admin/email">
                View all campaigns <ArrowRight className="ml-1 h-3 w-3" />
              </Link>
            </Button>
          </div>
        </SectionCard>
      </div>

      <SectionCard
        title="Top Referrers"
        description="Users driving the most signups"
        actions={
          <Button asChild variant="ghost" size="sm">
            <Link to="/admin/referrals">
              See leaderboard <ArrowRight className="ml-1 h-3 w-3" />
            </Link>
          </Button>
        }
      >
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/60 text-left text-xs uppercase tracking-wider text-muted-foreground">
                <th className="pb-2 font-medium">#</th>
                <th className="pb-2 font-medium">User</th>
                <th className="pb-2 font-medium">City</th>
                <th className="pb-2 font-medium text-right">Referrals</th>
                <th className="pb-2 font-medium text-right">Points</th>
              </tr>
            </thead>
            <tbody>
              {referralLeaderboard.slice(0, 6).map((u) => (
                <tr key={u.id} className="border-b border-border/40 last:border-0">
                  <td className="py-2.5">
                    <Badge
                      variant="secondary"
                      className="bg-gold/15 text-gold-foreground font-bold"
                    >
                      #{u.rank}
                    </Badge>
                  </td>
                  <td className="py-2.5">
                    <div className="flex items-center gap-2">
                      <div className="grid h-7 w-7 place-items-center rounded-full bg-primary/10 text-[10px] font-semibold text-primary">
                        {u.name
                          .split(" ")
                          .map((n) => n[0])
                          .slice(0, 2)
                          .join("")}
                      </div>
                      <div>
                        <div className="font-medium">{u.name}</div>
                        <div className="text-xs text-muted-foreground">{u.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="py-2.5 text-muted-foreground">{u.city}</td>
                  <td className="py-2.5 text-right font-semibold">{u.referrals}</td>
                  <td className="py-2.5 text-right">
                    <span className="inline-flex items-center gap-1 rounded-full bg-gold/10 px-2 py-0.5 text-xs font-semibold text-gold-foreground">
                      <Award className="h-3 w-3" /> {u.points}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionCard>
    </div>
  );
}
