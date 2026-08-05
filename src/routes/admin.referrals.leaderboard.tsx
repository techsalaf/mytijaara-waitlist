import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { referralsApi, ApiError } from "@/lib/api";
import type { ReferralLeaderboardEntry } from "@/lib/types";
import { EmptyState, SectionCard } from "@/components/admin/ui-bits";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Trophy, Medal, Award, Loader2, AlertTriangle, type LucideIcon } from "lucide-react";

export const Route = createFileRoute("/admin/referrals/leaderboard")({
  component: Leaderboard,
});

function Leaderboard() {
  const [referralLeaderboard, setReferralLeaderboard] = useState<ReferralLeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await referralsApi.leaderboard();
      setReferralLeaderboard(response.data);
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.firstError
          : err instanceof Error
            ? err.message
            : "Could not load the leaderboard.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-2xl border border-destructive/30 bg-destructive/5 px-6 py-16 text-center">
        <AlertTriangle className="h-6 w-6 text-destructive" />
        <p className="text-sm font-medium text-destructive">{error}</p>
        <Button variant="outline" size="sm" onClick={() => void load()}>
          Retry
        </Button>
      </div>
    );
  }

  if (referralLeaderboard.length === 0) {
    return (
      <EmptyState
        illustration="inbox"
        title="No referrers yet"
        description="The podium fills in when waitlist members start referring."
      />
    );
  }

  const [first, second, third, ...rest] = referralLeaderboard;
  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        {second && (
          <Podium user={second} place={2} icon={Medal} color="from-slate-300 to-slate-400" />
        )}
        {first && (
          <Podium
            user={first}
            place={1}
            icon={Trophy}
            color="from-gold to-[color-mix(in_oklab,var(--gold)_70%,black)]"
            featured
          />
        )}
        {third && (
          <Podium user={third} place={3} icon={Award} color="from-amber-700 to-amber-800" />
        )}
      </div>

      <SectionCard
        title="Full leaderboard"
        description={`${referralLeaderboard.length} active referrers`}
      >
        <div className="space-y-1">
          {rest.length === 0 && (
            <p className="rounded-lg bg-muted/30 px-3 py-4 text-center text-sm text-muted-foreground">
              Everyone on the board is on the podium above.
            </p>
          )}
          {rest.map((u) => (
            <Link
              key={u.id}
              to="/admin/referrals/$id"
              params={{ id: u.id }}
              className="flex items-center gap-3 rounded-lg px-3 py-2 hover:bg-muted/50"
            >
              <div className="w-8 text-center text-sm font-bold text-muted-foreground">
                #{u.rank}
              </div>
              <div className="grid h-8 w-8 place-items-center rounded-full bg-primary/10 text-[10px] font-semibold text-primary">
                {u.name
                  .split(" ")
                  .map((n) => n[0])
                  .slice(0, 2)
                  .join("")}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium truncate">{u.name}</div>
                <div className="text-xs text-muted-foreground">{u.city}</div>
              </div>
              <div className="text-sm font-semibold">{u.referrals}</div>
              <Badge variant="secondary" className="bg-gold/10 text-gold-foreground">
                {u.points} pts
              </Badge>
            </Link>
          ))}
        </div>
      </SectionCard>
    </div>
  );
}

function Podium({
  user,
  place,
  icon: Icon,
  color,
  featured,
}: {
  user: ReferralLeaderboardEntry;
  place: number;
  icon: LucideIcon;
  color: string;
  featured?: boolean;
}) {
  return (
    <Link
      to="/admin/referrals/$id"
      params={{ id: user.id }}
      className={`relative overflow-hidden rounded-2xl border border-border/60 bg-card p-5 text-center shadow-sm ${featured ? "md:-translate-y-2 md:shadow-lg" : ""}`}
    >
      <div
        className={`mx-auto grid h-14 w-14 place-items-center rounded-full bg-gradient-to-br ${color} text-primary-foreground shadow-md`}
      >
        <Icon className="h-6 w-6" />
      </div>
      <div className="mt-2 text-xs font-bold uppercase tracking-widest text-muted-foreground">
        #{place}
      </div>
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
