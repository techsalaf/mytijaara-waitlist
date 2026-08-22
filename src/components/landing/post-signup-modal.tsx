import { useState } from "react";
import {
  Check,
  Copy,
  Mail,
  Share2,
  Sparkles,
  Users,
  MessageCircle,
  ArrowRight,
  ExternalLink,
  ShieldCheck,
  PartyPopper,
} from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useBranding } from "@/lib/cms-context";

export interface WaitlistSuccessData {
  publicId: string;
  name: string;
  email: string;
  city?: string;
  role?: string;
  referralCode?: string;
  position?: number | null;
}

interface PostSignupModalProps {
  open: boolean;
  data: WaitlistSuccessData | null;
  onClose: () => void;
}

export function PostSignupModal({ open, data, onClose }: PostSignupModalProps) {
  const { siteName, social } = useBranding();
  const [copied, setCopied] = useState(false);

  if (!data) return null;

  const siteUrl = typeof window !== "undefined" ? window.location.origin : "https://mytijaara.com";
  const shareLink = data.referralCode
    ? `${siteUrl}/?ref=${data.referralCode}`
    : siteUrl;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareLink);
      setCopied(true);
      toast.success("Referral link copied to clipboard!");
      setTimeout(() => setCopied(false), 2500);
    } catch {
      toast.error("Could not copy link automatically.");
    }
  };

  const whatsappText = encodeURIComponent(
    `Hey! I just joined the waitlist for ${siteName || "MyTijaara"} — Nigeria's next-gen commerce & service ecosystem! Join me here to reserve priority launch access: ${shareLink}`
  );
  const whatsappUrl = `https://wa.me/?text=${whatsappText}`;

  const twitterText = encodeURIComponent(
    `I just reserved my spot on the @MyTijaara waitlist! Join early access here: ${shareLink}`
  );
  const twitterUrl = `https://twitter.com/intent/tweet?text=${twitterText}`;

  const communityChannelUrl = social.whatsapp || "https://whatsapp.com/channel";

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-xl rounded-3xl border-primary/20 bg-gradient-to-b from-card via-background to-card p-6 sm:p-8 shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto">
        {/* Top ambient glow */}
        <div className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full bg-gold/15 blur-3xl" aria-hidden />
        <div className="pointer-events-none absolute -left-20 -bottom-20 h-56 w-56 rounded-full bg-primary/10 blur-3xl" aria-hidden />

        <DialogHeader className="text-center space-y-3">
          <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-gradient-to-br from-primary via-primary-dark to-slate-900 text-gold shadow-lg ring-4 ring-gold/20 animate-in zoom-in-50 duration-300">
            <PartyPopper className="h-8 w-8" />
          </div>

          <DialogTitle className="font-display text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight">
            You're on the list, {data.name.split(" ")[0]}! 🎉
          </DialogTitle>

          <DialogDescription className="text-sm text-muted-foreground max-w-md mx-auto">
            Your early access spot for <strong className="text-foreground">{data.city || "Nigeria"}</strong> is officially reserved.
          </DialogDescription>

          {data.position && (
            <div className="inline-flex items-center gap-2 mx-auto rounded-full border border-primary/20 bg-primary/10 px-4 py-1.5 text-xs font-bold text-primary">
              <Sparkles className="h-3.5 w-3.5 text-gold" /> You are #{data.position} in line for launch
            </div>
          )}
        </DialogHeader>

        {/* 4 Action Steps */}
        <div className="mt-6 space-y-4 text-left">

          {/* STEP 1: Verify Email */}
          <div className="rounded-2xl border border-border/80 bg-muted/30 p-4 space-y-2">
            <div className="flex items-center gap-2 text-sm font-bold text-foreground">
              <div className="grid h-6 w-6 place-items-center rounded-full bg-primary text-primary-foreground text-xs font-bold">1</div>
              <Mail className="h-4 w-4 text-primary" /> Check your email inbox
            </div>
            <p className="text-xs text-muted-foreground pl-8 leading-relaxed">
              We've sent a verification link to <strong className="text-foreground">{data.email}</strong>. Clicking it confirms your position and unlocks instant referral rewards.
            </p>
            <div className="pl-8 pt-1 flex items-center gap-2 text-[11px] text-muted-foreground">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
              <span>Didn't receive it? Check your Spam or Promotions folder.</span>
            </div>
          </div>

          {/* STEP 2: Join Community */}
          <div className="rounded-2xl border border-border/80 bg-card p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-bold text-foreground">
                <div className="grid h-6 w-6 place-items-center rounded-full bg-primary text-primary-foreground text-xs font-bold">2</div>
                <MessageCircle className="h-4 w-4 text-emerald-600" /> Join Official Community
              </div>
              <Badge variant="outline" className="text-[10px] border-emerald-600/30 text-emerald-600">
                VIP Access
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground pl-8">
              Get real-time launch sneak peeks, vendor announcements & exclusive perks on our official channel.
            </p>
            <div className="pl-8">
              <Button
                asChild
                size="sm"
                variant="outline"
                className="w-full sm:w-auto border-emerald-600/30 bg-emerald-600/10 text-emerald-700 hover:bg-emerald-600 hover:text-white dark:text-emerald-400 font-semibold gap-1.5"
              >
                <a href={communityChannelUrl} target="_blank" rel="noreferrer">
                  Join WhatsApp Channel <ExternalLink className="h-3.5 w-3.5" />
                </a>
              </Button>
            </div>
          </div>

          {/* STEP 3: Share Referral Link */}
          {data.referralCode && (
            <div className="rounded-2xl border border-gold/30 bg-gold/5 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm font-bold text-foreground">
                  <div className="grid h-6 w-6 place-items-center rounded-full bg-gold text-slate-950 text-xs font-bold">3</div>
                  <Users className="h-4 w-4 text-gold" /> Move Up the Queue with Referrals
                </div>
                <span className="text-[11px] font-bold text-gold">+10 pts per friend</span>
              </div>

              <p className="text-xs text-muted-foreground pl-8">
                Share your unique link. Every friend who joins using your code moves you closer to priority launch rewards!
              </p>

              <div className="pl-8 space-y-2">
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={shareLink}
                    className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs font-mono text-foreground outline-none"
                  />
                  <Button
                    size="sm"
                    onClick={handleCopy}
                    className="shrink-0 bg-gold text-slate-950 hover:bg-gold/90 font-bold gap-1"
                  >
                    {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    {copied ? "Copied" : "Copy"}
                  </Button>
                </div>

                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <Button
                    asChild
                    size="sm"
                    variant="outline"
                    className="h-8 text-xs border-emerald-600/30 text-emerald-700 dark:text-emerald-400 gap-1.5"
                  >
                    <a href={whatsappUrl} target="_blank" rel="noreferrer">
                      <Share2 className="h-3.5 w-3.5" /> Share on WhatsApp
                    </a>
                  </Button>
                  <Button
                    asChild
                    size="sm"
                    variant="outline"
                    className="h-8 text-xs border-sky-500/30 text-sky-600 dark:text-sky-400 gap-1.5"
                  >
                    <a href={twitterUrl} target="_blank" rel="noreferrer">
                      <Share2 className="h-3.5 w-3.5" /> Share on X
                    </a>
                  </Button>
                </div>
              </div>
            </div>
          )}

        </div>

        <DialogFooter className="mt-6 sm:justify-center">
          <Button
            size="lg"
            onClick={onClose}
            className="w-full sm:w-auto bg-primary hover:bg-primary/90 text-primary-foreground font-bold px-10 shadow-md"
          >
            Got it! Continue <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
