import { createFileRoute, Link } from "@tanstack/react-router";
import { referralLeaderboard } from "@/lib/mock-data";
import { SectionCard } from "@/components/admin/ui-bits";
import { Badge } from "@/components/ui/badge";
import { Trophy, Medal, Award } from "lucide-react";

export const Route = createFileRoute("/admin/referrals/leaderboard")({
  component: Leaderboard,
});

function Leaderboard() {
  const [first, second, third, ...rest] = referralLeaderboard;
  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        <Podium user={second} place={2} icon={Medal} color="from-slate-300 to-slate-400" />
        <Podium user={first} place={1} icon={Trophy} color="from-[#D4A017] to-[#b8860b]" featured />
        <Podium user={third} place={3} icon={Award} color="from-amber-700 to-amber-800" />
      </div>

      <SectionCard title="Full leaderboard" description={`${referralLeaderboard.length} active referrers`}>
        <div className="space-y-1">
          {rest.map((u) => (
            <Link key={u.id} to="/admin/referrals/$id" params={{ id: u.id }} className="flex items-center gap-3 rounded-lg px-3 py-2 hover:bg-muted/50">
              <div className="w-8 text-center text-sm font-bold text-muted-foreground">#{u.rank}</div>
              <div className="grid h-8 w-8 place-items-center rounded-full bg-primary/10 text-[10px] font-semibold text-primary">
                {u.name.split(" ").map((n) => n[0]).slice(0, 2).join("")}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium truncate">{u.name}</div>
                <div className="text-xs text-muted-foreground">{u.city}</div>
              </div>
              <div className="text-sm font-semibold">{u.referrals}</div>
              <Badge variant="secondary" className="bg-gold/10 text-gold-foreground">{u.points} pts</Badge>
            </Link>
          ))}
        </div>
      </SectionCard>
    </div>
  );
}

function Podium({ user, place, icon: Icon, color, featured }: any) {
  return (
    <Link to="/admin/referrals/$id" params={{ id: user.id }} className={`relative overflow-hidden rounded-2xl border border-border/60 bg-white p-5 text-center shadow-sm ${featured ? "md:-translate-y-2 md:shadow-lg" : ""}`}>
      <div className={`mx-auto grid h-14 w-14 place-items-center rounded-full bg-gradient-to-br ${color} text-white shadow-md`}>
        <Icon className="h-6 w-6" />
      </div>
      <div className="mt-2 text-xs font-bold uppercase tracking-widest text-muted-foreground">#{place}</div>
      <div className="mt-1 text-lg font-bold">{user.name}</div>
      <div className="text-xs text-muted-foreground">{user.city}</div>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <div className="rounded-lg bg-muted/40 py-1.5">
          <div className="text-base font-bold text-primary">{user.referrals}</div>
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Refs</div>
        </div>
        <div className="rounded-lg bg-muted/40 py-1.5">
          <div className="text-base font-bold text-gold">{user.points}</div>
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Points</div>
        </div>
      </div>
    </Link>
  );
}
