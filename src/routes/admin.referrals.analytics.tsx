import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { SectionCard, StatCard } from "@/components/admin/ui-bits";
import { referralsApi } from "@/lib/api";
import type { ReferralAnalytics } from "@/lib/types";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
} from "recharts";
import { Share2, MousePointerClick, Percent, Award } from "lucide-react";

export const Route = createFileRoute("/admin/referrals/analytics")({
  component: ReferralAnalytics,
});

function ReferralAnalytics() {
  const [analytics, setAnalytics] = useState<ReferralAnalytics | null>(null);
  useEffect(() => {
    void referralsApi.analytics().then((response) => setAnalytics(response.data));
  }, []);
  const signupTrend = analytics?.trend ?? [];
  const trafficSources = (analytics?.sources ?? []).map((source, index) => ({
    ...source,
    color: index % 2 ? "var(--gold)" : "var(--primary)",
  }));

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          label="Link clicks"
          value={(analytics?.totalVisits ?? 0).toLocaleString()}
          delta={0}
          icon={MousePointerClick}
        />
        <StatCard
          label="Conversions"
          value={(analytics?.conversions ?? 0).toLocaleString()}
          delta={0}
          icon={Share2}
        />
        <StatCard
          label="Signup rate"
          value={`${analytics?.conversionRate ?? 0}%`}
          delta={0}
          icon={Percent}
        />
        <StatCard label="Reward paid" value="₦124k" delta={38.4} icon={Award} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <SectionCard title="Referrals by channel">
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={trafficSources}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 11, fill: "#64748b" }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ borderRadius: 12, border: "1px solid #e5e7eb", fontSize: 12 }}
                />
                <Bar dataKey="value" fill="var(--primary)" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </SectionCard>

        <SectionCard title="Source distribution">
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={trafficSources}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={55}
                  outerRadius={90}
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
        </SectionCard>
      </div>

      <SectionCard title="Referral trend (30 days)">
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={signupTrend}>
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
              <Line
                type="monotone"
                dataKey="visits"
                stroke="var(--gold)"
                strokeWidth={2.5}
                dot={false}
                name="Clicks"
              />
              <Line
                type="monotone"
                dataKey="signups"
                stroke="var(--primary)"
                strokeWidth={2.5}
                dot={false}
                name="Signups"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </SectionCard>
    </div>
  );
}
