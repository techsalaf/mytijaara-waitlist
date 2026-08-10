import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import {
  Award,
  Zap,
  Sparkles,
  Crown,
  Gift,
  CheckCircle2,
  Share2,
  Copy,
  Check,
  MessageCircle,
  Users,
  ArrowRight,
  ShieldCheck,
  Briefcase,
  Wrench,
  Truck,
  ShoppingBag,
  HelpCircle,
} from "lucide-react";
import { ROLE_REWARDS, getRoleReward, type WaitlistRole } from "@/lib/referrals/rewards";
import { PublicLayout } from "@/components/landing/public-layout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";
import { toast } from "sonner";

export const Route = createFileRoute("/referral-rewards")({
  head: () => ({
    meta: [
      { title: "MyTijaara Referral Rewards — Earn Cash, Free Delivery & Store Promo" },
      { name: "description", content: "Invite friends to MyTijaara and unlock exclusive rewards based on your role: Customer, Vendor, Artisan, or Rider. 10 referrals unlocks top-tier perks!" },
    ],
  }),
  component: ReferralRewardsPage,
});

const ROLE_ICONS: Record<WaitlistRole, typeof ShoppingBag> = {
  customer: ShoppingBag,
  vendor: Briefcase,
  artisan: Wrench,
  rider: Truck,
};

const FAQS = [
  {
    q: "How does the MyTijaara referral program work?",
    a: "Every waitlist member gets a unique referral link. When your friends, colleagues, or network join the waitlist using your link and verify their email, it counts as a successful referral for you.",
  },
  {
    q: "When do I receive my 10-referral reward?",
    a: "Customer ₦500 wallet credits and free delivery rewards, Vendor 3-day store promotions, Artisan directory features, and Rider credits are activated on launch day for all eligible members who hit 10 referrals.",
  },
  {
    q: "Does the email address matter for Customer rewards?",
    a: "Yes! The ₦500 wallet credit and free delivery on your first order require that you place your first order using the exact same email address you used when signing up on the waitlist.",
  },
  {
    q: "Can I refer people from any city in Nigeria?",
    a: "Absolutely! MyTijaara is expanding across major Nigerian cities. Anyone in Nigeria can join using your referral link.",
  },
  {
    q: "How can I track my referral progress?",
    a: "Your current referral count and waitlist position are updated automatically and included in all your waitlist email updates.",
  },
];

function ReferralRewardsPage() {
  const [selectedRole, setSelectedRole] = useState<WaitlistRole>("customer");
  const [userLink, setUserLink] = useState("");
  const [copied, setCopied] = useState(false);

  const activeReward = getRoleReward(selectedRole);

  const copyRefLink = () => {
    if (!userLink.trim()) {
      toast.error("Enter your referral code or link first.");
      return;
    }
    navigator.clipboard.writeText(userLink);
    setCopied(true);
    toast.success("Link copied!");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <PublicLayout>

      <main className="pt-24 pb-16">
        {/* Hero Section */}
        <section className="relative overflow-hidden bg-gradient-to-b from-primary/10 via-primary/5 to-background py-16 px-4 sm:px-6 lg:py-24">
          <div className="mx-auto max-w-5xl text-center">
            <Badge variant="outline" className="inline-flex items-center gap-1.5 border-primary/30 bg-primary/10 px-4 py-1.5 text-xs font-semibold text-primary">
              <Gift className="h-4 w-4" /> MyTijaara Referral Perks
            </Badge>

            <h1 className="mt-6 font-display text-4xl font-extrabold tracking-tight text-foreground sm:text-5xl lg:text-6xl">
              Invite 10 People. <br className="hidden sm:inline" />
              <span className="text-primary">Unlock Your Exclusive Reward.</span>
            </h1>

            <p className="mx-auto mt-6 max-w-2xl text-base text-muted-foreground sm:text-lg">
              Whether you're a Customer, Vendor, Artisan, or Rider, every person you refer moves you up the queue and unlocks role-specific benefits on launch day.
            </p>

            {/* Quick Share Bar */}
            <div className="mx-auto mt-8 max-w-md rounded-2xl border border-border bg-card p-3 shadow-lg">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Paste your referral code or link…"
                  value={userLink}
                  onChange={(e) => setUserLink(e.target.value)}
                  className="flex-1 rounded-xl border border-border bg-muted/40 px-3.5 py-2 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-primary"
                />
                <Button onClick={copyRefLink} size="sm" className="bg-primary hover:bg-primary/90 text-xs gap-1.5">
                  {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                  {copied ? "Copied" : "Copy Link"}
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* Interactive Role Selector Section */}
        <section className="mx-auto max-w-6xl px-4 sm:px-6 py-12">
          <div className="text-center">
            <h2 className="font-display text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              Select Your Role to See Your Rewards
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Rewards are tailored to what you joined as on MyTijaara.
            </p>
          </div>

          <div className="mt-8">
            <Tabs value={selectedRole} onValueChange={(v) => setSelectedRole(v as WaitlistRole)} className="w-full">
              <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4 h-auto p-1.5 bg-muted/60 rounded-2xl gap-1">
                {(Object.keys(ROLE_REWARDS) as WaitlistRole[]).map((r) => {
                  const Icon = ROLE_ICONS[r];
                  const info = ROLE_REWARDS[r];
                  return (
                    <TabsTrigger
                      key={r}
                      value={r}
                      className="flex items-center justify-center gap-2 rounded-xl py-3 text-xs font-bold capitalize transition-all data-[state=active]:bg-card data-[state=active]:text-primary data-[state=active]:shadow"
                    >
                      <Icon className="h-4 w-4" />
                      {r}
                    </TabsTrigger>
                  );
                })}
              </TabsList>

              {(Object.keys(ROLE_REWARDS) as WaitlistRole[]).map((r) => {
                const info = ROLE_REWARDS[r];
                return (
                  <TabsContent key={r} value={r} className="mt-8 space-y-8">
                    {/* Role Header Banner */}
                    <div className="rounded-3xl border border-primary/20 bg-card p-6 sm:p-8 shadow-md">
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                        <div>
                          <Badge variant="outline" className={`text-xs font-semibold ${info.badgeBg}`}>
                            {info.badgeText}
                          </Badge>
                          <h3 className="mt-3 font-display text-2xl font-bold text-foreground">
                            {info.title}
                          </h3>
                          <p className="mt-1 text-sm text-muted-foreground">{info.tagline}</p>
                        </div>

                        {/* Top Tier Highlight Card */}
                        <div className="rounded-2xl border border-primary/20 bg-primary-soft/50 p-5 min-w-[280px]">
                          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-primary">
                            <Crown className="h-4 w-4 text-gold" /> 10 Referrals Milestone
                          </div>
                          <div className="mt-1 font-display text-base font-extrabold text-foreground">
                            {info.unlocked10Title}
                          </div>
                        </div>
                      </div>

                      {/* Progression Steps: 1 -> 5 -> 10 */}
                      <div className="mt-10 grid gap-6 md:grid-cols-3">
                        {info.tiers.map((tier) => (
                          <div
                            key={tier.milestone}
                            className={`relative rounded-2xl border p-5 transition-all ${
                              tier.milestone === 10
                                ? "border-primary bg-primary/5 shadow-md ring-1 ring-primary/20"
                                : "border-border bg-card"
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <Badge
                                variant={tier.milestone === 10 ? "default" : "secondary"}
                                className={tier.milestone === 10 ? "bg-primary text-primary-foreground font-bold" : ""}
                              >
                                {tier.badgeText}
                              </Badge>
                              <div className="text-xs font-bold text-muted-foreground">
                                Step {tier.milestone === 1 ? "1" : tier.milestone === 5 ? "2" : "3"} of 3
                              </div>
                            </div>

                            <div className="mt-4 font-display text-lg font-bold text-foreground">
                              {tier.title}
                            </div>
                            <p className="mt-1.5 text-xs text-muted-foreground leading-relaxed">
                              {tier.description}
                            </p>
                          </div>
                        ))}
                      </div>

                      {/* Detailed Reward Explanation */}
                      <div className="mt-8 rounded-2xl border border-border bg-muted/30 p-6">
                        <h4 className="font-display text-sm font-bold text-foreground">
                          Exact Payout & Activation Details at 10 Referrals:
                        </h4>
                        <ul className="mt-3 space-y-2 text-xs text-muted-foreground">
                          {info.unlocked10Description.map((desc, i) => (
                            <li key={i} className="flex items-start gap-2">
                              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                              <span>{desc}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </TabsContent>
                );
              })}
            </Tabs>
          </div>
        </section>

        {/* FAQ Section */}
        <section className="mx-auto max-w-3xl px-4 sm:px-6 py-12">
          <div className="text-center">
            <h2 className="font-display text-2xl font-bold tracking-tight text-foreground sm:text-3xl flex items-center justify-center gap-2">
              <HelpCircle className="h-6 w-6 text-primary" /> Frequently Asked Questions
            </h2>
          </div>

          <Accordion type="single" collapsible className="mt-8 space-y-3">
            {FAQS.map((faq, i) => (
              <AccordionItem key={i} value={`faq-${i}`} className="rounded-2xl border border-border bg-card px-5">
                <AccordionTrigger className="text-left text-sm font-semibold hover:no-underline">
                  {faq.q}
                </AccordionTrigger>
                <AccordionContent className="text-xs text-muted-foreground leading-relaxed">
                  {faq.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </section>

        {/* CTA Footer Section */}
        <section className="mx-auto max-w-4xl px-4 sm:px-6 py-12 text-center">
          <div className="rounded-3xl bg-primary px-6 py-12 text-primary-foreground shadow-xl sm:px-12">
            <h2 className="font-display text-2xl font-extrabold sm:text-3xl">
              Haven't joined the waitlist yet?
            </h2>
            <p className="mt-2 text-sm text-primary-foreground/80">
              Join thousands of Nigerians reserving their spot on MyTijaara today.
            </p>
            <div className="mt-6">
              <Button asChild size="lg" className="bg-gold text-foreground hover:bg-gold/90 font-bold px-8">
                <Link to="/#waitlist">
                  Join the Waitlist Now <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
        </section>
      </main>

    </PublicLayout>
  );
}
