import { createFileRoute } from "@tanstack/react-router";
import { SectionCard, StatCard } from "@/components/admin/ui-bits";
import { trafficSources, signupTrend } from "@/lib/mock-data";
import { BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from "recharts";
import { Share2, MousePointerClick, Percent, Award } from "lucide-react";

export const Route = createFileRoute("/admin/referrals/analytics")({
  component: ReferralAnalytics,
});

function ReferralAnalytics() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Link clicks" value="3,482" delta={14.2} icon={MousePointerClick} />
        <StatCard label="Shares" value="892" delta={7.8} icon={Share2} />
        <StatCard label="Signup rate" value="21.4%" delta={2.1} icon={Percent} />
        <StatCard label="Reward paid" value="₦124k" delta={38.4} icon={Award} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <SectionCard title="Referrals by channel">
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={[
                { channel: "WhatsApp", value: 342 },
                { channel: "Instagram", value: 218 },
                { channel: "Twitter/X", value: 156 },
                { channel: "Direct link", value: 98 },
                { channel: "Email", value: 78 },
              ]}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                <XAxis dataKey="channel" tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #e5e7eb", fontSize: 12 }} />
                <Bar dataKey="value" fill="#0D7A46" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </SectionCard>

        <SectionCard title="Source distribution">
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={trafficSources} dataKey="value" nameKey="name" innerRadius={55} outerRadius={90} paddingAngle={2}>
                  {trafficSources.map((s, i) => <Cell key={i} fill={s.color} />)}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #e5e7eb", fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </SectionCard>
      </div>

      <SectionCard title="Referral trend (30 days)">
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={signupTrend.map((d) => ({ ...d, refs: Math.round(d.signups * 0.42), clicks: Math.round(d.signups * 1.8) }))}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #e5e7eb", fontSize: 12 }} />
              <Line type="monotone" dataKey="clicks" stroke="#D4A017" strokeWidth={2.5} dot={false} name="Clicks" />
              <Line type="monotone" dataKey="refs" stroke="#0D7A46" strokeWidth={2.5} dot={false} name="Signups" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </SectionCard>
    </div>
  );
}
