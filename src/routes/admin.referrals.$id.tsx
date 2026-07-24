import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { referralLeaderboard } from "@/lib/mock-data";
import { SectionCard, StatCard } from "@/components/admin/ui-bits";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Share2, Award, TrendingUp, Users, Copy } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/referrals/$id")({
  component: RefDetail,
  notFoundComponent: () => (
    <div className="rounded-xl border border-border/60 bg-white p-10 text-center">
      <p>Referrer not found.</p>
      <Button asChild variant="link"><Link to="/admin/referrals/leaderboard">Back to leaderboard</Link></Button>
    </div>
  ),
  loader: ({ params }) => {
    const u = referralLeaderboard.find((x) => x.id === params.id);
    if (!u) throw notFound();
    return u;
  },
});

function RefDetail() {
  const u = Route.useLoaderData();
  const link = `mytijaara.com/join/${u.id.slice(3)}`;
  return (
    <div className="space-y-6">
      <div>
        <Button asChild variant="ghost" size="sm" className="-ml-2 mb-3">
          <Link to="/admin/referrals/leaderboard"><ArrowLeft className="mr-1 h-3 w-3" /> Back to leaderboard</Link>
        </Button>
        <div className="flex items-center gap-4">
          <div className="grid h-16 w-16 place-items-center rounded-2xl bg-[#0D7A46] text-lg font-bold text-white">
            {u.name.split(" ").map((n) => n[0]).slice(0, 2).join("")}
          </div>
          <div>
            <div className="text-xs font-semibold uppercase tracking-widest text-[#D4A017]">Rank #{u.rank}</div>
            <h1 className="text-2xl font-bold">{u.name}</h1>
            <div className="text-sm text-muted-foreground">{u.email} · {u.city}</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Total referrals" value={u.referrals} icon={Users} delta={12} />
        <StatCard label="Verified" value={Math.floor(u.referrals * 0.8)} icon={TrendingUp} />
        <StatCard label="Points earned" value={u.points} icon={Award} />
        <StatCard label="Reward earned" value={`₦${(u.referrals * 500).toLocaleString()}`} icon={Award} />
      </div>

      <SectionCard title="Referral link">
        <div className="flex items-center gap-2 rounded-lg border border-border/60 bg-muted/30 px-3 py-2 text-sm">
          <Share2 className="h-4 w-4 text-muted-foreground" />
          <code className="flex-1 truncate font-mono">{link}</code>
          <Button size="sm" variant="ghost" onClick={() => { navigator.clipboard.writeText(link); toast.success("Copied"); }}>
            <Copy className="h-3 w-3" />
          </Button>
        </div>
      </SectionCard>

      <SectionCard title="Referred users">
        <div className="space-y-2">
          {Array.from({ length: Math.min(u.referrals, 8) }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 rounded-lg border border-border/60 p-3">
              <div className="grid h-8 w-8 place-items-center rounded-full bg-muted text-[10px] font-semibold">R{i + 1}</div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium">Referred user #{i + 1}</div>
                <div className="text-xs text-muted-foreground">Joined {i + 1} day{i ? "s" : ""} ago</div>
              </div>
              <Badge variant="secondary" className={i % 3 === 0 ? "bg-[#D4A017]/15 text-[#8a6b0f]" : "bg-emerald-50 text-emerald-700"}>
                {i % 3 === 0 ? "Invited" : "Verified"}
              </Badge>
            </div>
          ))}
        </div>
      </SectionCard>
    </div>
  );
}
