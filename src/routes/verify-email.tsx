import { createFileRoute, Link, useSearch } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  CheckCircle2,
  Copy,
  Check,
  Share2,
  MessageCircle,
  Sparkles,
  ArrowRight,
  Gift,
  Award,
  Zap,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { waitlistApi } from "@/lib/api/waitlist";
import { settingsApi } from "@/lib/api/settings";
import type { WaitlistUser } from "@/lib/types";
import { getRoleReward } from "@/lib/referrals/rewards";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import confetti from "canvas-confetti";

export const Route = createFileRoute("/verify-email")({
  component: VerifyEmailPage,
});

function VerifyEmailPage() {
  const search = useSearch({ strict: false }) as { token?: string };
  const token = search.token;

  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<WaitlistUser | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [whatsappUrl, setWhatsappUrl] = useState<string | null>(null);

  useEffect(() => {
    // Fetch WhatsApp URL from public settings
    settingsApi
      .publicSettings()
      .then((res) => {
        if (res.data.social?.whatsapp) {
          setWhatsappUrl(res.data.social.whatsapp);
        }
      })
      .catch(() => {});

    if (!token) {
      setError("No verification token was provided in the link.");
      setLoading(false);
      return;
    }

    waitlistApi
      .verify(token)
      .then((res) => {
        setUser(res.data);
        // Trigger celebratory confetti on success
        try {
          void confetti({
            particleCount: 80,
            spread: 70,
            origin: { y: 0.6 },
            colors: ["#1F5C3A", "#D4A017", "#10B981", "#3B82F6"],
          });
        } catch {
          // Ignore canvas errors
        }
      })
      .catch((err) => {
        const msg =
          err instanceof Error
            ? err.message
            : "This verification link is invalid or has already been used.";
        setError(msg);
      })
      .finally(() => setLoading(false));
  }, [token]);

  const referralUrl = user ? `${window.location.origin}/?ref=${user.referralCode || user.id}` : "";

  const copyLink = () => {
    if (!referralUrl) return;
    navigator.clipboard.writeText(referralUrl);
    setCopied(true);
    toast.success("Referral link copied to clipboard!");
    setTimeout(() => setCopied(false), 2000);
  };

  const shareWhatsApp = () => {
    if (!referralUrl) return;
    const text = encodeURIComponent(
      `Hey! I just joined the MyTijaara waitlist — the all-in-one app for food, shopping, deliveries & services in Nigeria. Use my link to join: ${referralUrl}`,
    );
    window.open(`https://wa.me/?text=${text}`, "_blank");
  };

  const shareNative = () => {
    if (navigator.share && referralUrl) {
      navigator
        .share({
          title: "Join MyTijaara Waitlist",
          text: "Order food, groceries, book artisans and shop — all from one app built for Nigerians.",
          url: referralUrl,
        })
        .catch(() => {});
    } else {
      copyLink();
    }
  };

  const roleReward = getRoleReward(user?.role);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="flex flex-col items-center gap-3 text-center">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <p className="text-sm font-medium text-muted-foreground">Verifying your email address…</p>
        </div>
      </div>
    );
  }

  if (error || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="max-w-md rounded-2xl border border-border bg-card p-8 text-center shadow-lg">
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-amber-100 text-amber-600">
            <AlertCircle className="h-7 w-7" />
          </div>
          <h1 className="mt-4 font-display text-xl font-bold text-foreground">Verification Notice</h1>
          <p className="mt-2 text-sm text-muted-foreground">{error || "Could not verify email."}</p>
          <div className="mt-6 flex flex-col gap-2">
            <Button asChild className="bg-primary hover:bg-primary/90">
              <Link to="/">Go to MyTijaara Home</Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary/5 via-background to-background py-12 px-4 sm:px-6">
      <div className="mx-auto max-w-2xl">
        {/* Header / Brand Badge */}
        <div className="text-center">
          <Badge variant="outline" className="inline-flex items-center gap-1.5 border-primary/30 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
            <Sparkles className="h-3.5 w-3.5" /> Email Verified Successfully
          </Badge>

          <h1 className="mt-4 font-display text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
            You're officially confirmed on the MyTijaara waitlist! 🎉
          </h1>
          <p className="mt-3 text-base text-muted-foreground">
            Welcome aboard, <strong className="text-foreground">{user.name}</strong>. Your spot as a{" "}
            <span className="font-semibold capitalize text-primary">{user.role || "customer"}</span> is locked in at position{" "}
            <strong className="text-foreground">#{user.position}</strong>.
          </p>
        </div>

        {/* Hero Card */}
        <div className="mt-8 overflow-hidden rounded-3xl border border-primary/20 bg-card shadow-xl">
          <div className="bg-primary px-6 py-6 text-primary-foreground sm:px-8">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <div className="text-xs uppercase tracking-wider text-primary-foreground/80 font-medium">Your Reserved Position</div>
                <div className="mt-1 text-4xl font-extrabold text-gold">#{user.position}</div>
              </div>
              <div className="rounded-2xl bg-white/10 px-4 py-2 text-right backdrop-blur-sm">
                <div className="text-xs text-primary-foreground/80">Registered Email</div>
                <div className="text-sm font-semibold">{user.email}</div>
              </div>
            </div>
          </div>

          <div className="space-y-8 p-6 sm:p-8">
            {/* WhatsApp Community CTA */}
            {whatsappUrl && (
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-5 dark:bg-emerald-950/20">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-emerald-500 text-white shadow-sm">
                      <MessageCircle className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="font-display text-sm font-bold text-foreground">
                        Join the MyTijaara WhatsApp Community
                      </h3>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        Get instant launch updates, sneak peeks & VIP perks directly on WhatsApp.
                      </p>
                    </div>
                  </div>
                  <Button
                    asChild
                    size="sm"
                    className="shrink-0 bg-[#25D366] text-white hover:bg-[#1EBE5B] font-semibold"
                  >
                    <a href={whatsappUrl} target="_blank" rel="noreferrer">
                      Join on WhatsApp <ArrowRight className="ml-1.5 h-4 w-4" />
                    </a>
                  </Button>
                </div>
              </div>
            )}

            {/* Share Referral Link Section */}
            <div className="rounded-2xl border border-border bg-muted/30 p-6">
              <div className="flex items-center gap-2">
                <Gift className="h-5 w-5 text-primary" />
                <h3 className="font-display text-base font-bold text-foreground">
                  Invite Friends & Earn Rewards
                </h3>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                Share your unique link below. Each friend who joins pushes you higher up the waitlist!
              </p>

              <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                <input
                  type="text"
                  readOnly
                  value={referralUrl}
                  className="flex-1 rounded-xl border border-border bg-card px-3.5 py-2.5 font-mono text-xs text-foreground focus:outline-none"
                />
                <div className="flex gap-2">
                  <Button onClick={copyLink} variant="outline" className="gap-1.5 text-xs">
                    {copied ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
                    {copied ? "Copied" : "Copy"}
                  </Button>
                  <Button onClick={shareWhatsApp} className="gap-1.5 bg-[#25D366] text-white hover:bg-[#1EBE5B] text-xs">
                    <MessageCircle className="h-4 w-4" /> WhatsApp
                  </Button>
                  {typeof navigator !== "undefined" && "share" in navigator && (
                    <Button onClick={shareNative} variant="secondary" className="gap-1.5 text-xs">
                      <Share2 className="h-4 w-4" /> Share
                    </Button>
                  )}
                </div>
              </div>
            </div>

            {/* Role-Specific Reward Card */}
            <div className="rounded-2xl border border-primary/20 bg-card p-6 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Award className="h-5 w-5 text-gold" />
                  <h3 className="font-display text-base font-bold text-foreground">
                    Invite 10 people. Unlock your reward.
                  </h3>
                </div>
                <Badge variant="outline" className={`text-[11px] font-semibold ${roleReward.badgeBg}`}>
                  {roleReward.badgeText}
                </Badge>
              </div>

              <p className="mt-2 text-xs text-muted-foreground">{roleReward.tagline}</p>

              <div className="mt-4 rounded-xl border border-primary/10 bg-primary-soft/50 p-4">
                <div className="font-display text-sm font-bold text-primary">
                  🏆 Milestone Reward: {roleReward.unlocked10Title}
                </div>
                <ul className="mt-2 space-y-1.5 text-xs text-muted-foreground">
                  {roleReward.unlocked10Description.map((item, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="mt-5 pt-4 border-t border-border flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Want to see all role rewards?</span>
                <Button asChild variant="link" size="sm" className="text-xs text-primary font-semibold p-0">
                  <Link to="/referral-rewards">View Full Referral Perks Page &rarr;</Link>
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Link */}
        <div className="mt-8 text-center text-xs text-muted-foreground">
          <Link to="/" className="hover:text-foreground underline">
            Back to MyTijaara Homepage
          </Link>
        </div>
      </div>
    </div>
  );
}
