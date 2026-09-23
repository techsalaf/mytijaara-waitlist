import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import {
  Sparkles,
  ArrowRight,
  UserCheck,
  UserPlus,
  ShieldCheck,
  Calendar,
} from "lucide-react";
import { PublicLayout } from "@/components/landing/public-layout";
import { loadPublicPageData, type PublicPageData } from "@/lib/public-page-data";
import { useCmsData } from "@/lib/cms-context";
import { LaunchPassLookupDialog } from "@/components/launch-pass/launch-pass-lookup-dialog";
import type { WaitlistUser } from "@/lib/types";

export const DEFAULT_LAUNCH_PASS_CMS = {
  campaignTitle: "My Launch Pass",
  eventName: "TAA NATCON 2026",
  eventDate: "October 2, 2026",
  eventDateShort: "02 • 10 • 26",
  taaLogoUrl: "/images/taa-natcon-partner-logo.png",
  referralCta: "Join the Waitlist & Get Pass",
};

export const Route = createFileRoute("/launch-badge")({
  loader: () => loadPublicPageData(),
  head: () => ({
    meta: [
      { title: "Get Your Official Launch Pass • MyTijaara × TAA NATCON 2026" },
      {
        name: "description",
        content:
          "Claim your personalized MyTijaara Launch Pass for TAA NATCON 2026. Already joined? Retrieve your pass instantly. New to MyTijaara? Reserve your spot now.",
      },
      { property: "og:type", content: "website" },
      { property: "og:title", content: "Get Your Official Launch Pass • MyTijaara × TAA NATCON 2026" },
      {
        property: "og:description",
        content: "Join the launch on October 2, 2026. Retrieve your personalized pass or sign up today.",
      },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: LaunchBadgePageWrapper,
});

function LaunchBadgePageWrapper() {
  const data = Route.useLoaderData();
  return <LaunchBadgeView data={data} />;
}

export function LaunchBadgeView({ data }: { data: PublicPageData }) {
  const { launchConfig, serverNow, cms: loaderCms, branding } = data;
  const cms = useCmsData("launch_pass", DEFAULT_LAUNCH_PASS_CMS);

  const [lookupOpen, setLookupOpen] = useState(false);

  if (!cms) return null;

  const handleLookupSuccess = (user: WaitlistUser) => {
    if (user.launchPassToken) {
      window.location.href = `/launch-pass/${user.launchPassToken}`;
    }
  };

  return (
    <PublicLayout
      launchConfig={launchConfig}
      serverNow={serverNow}
      cmsData={loaderCms}
      branding={branding}
    >
      <div className="relative min-h-[85vh] py-12 sm:py-20 overflow-hidden">
        {/* Ambient atmospheric glows */}
        <div
          className="pointer-events-none absolute -top-40 left-1/2 -translate-x-1/2 h-96 w-[700px] rounded-full bg-emerald-600/10 blur-3xl"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute top-1/3 right-[-10%] h-80 w-80 rounded-full bg-gold/15 blur-3xl"
          aria-hidden
        />

        <div className="mx-auto max-w-4xl px-4 sm:px-6 relative z-10 text-center">
          {/* Top Campaign Badge */}
          <div className="inline-flex items-center gap-2 rounded-full border border-gold/40 bg-gold/10 px-4 py-1.5 text-xs font-bold text-gold mb-6 shadow-sm">
            <Sparkles className="h-3.5 w-3.5 text-gold" />
            <span>OFFICIAL LAUNCH PASS • {cms.eventName}</span>
          </div>

          <h1 className="font-display text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-foreground max-w-3xl mx-auto leading-tight">
            Claim Your Official{" "}
            <span className="bg-gradient-to-r from-gold via-amber-300 to-gold bg-clip-text text-transparent">
              Digital Launch Pass
            </span>
          </h1>

          <p className="mt-4 text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Officially launching on <strong className="text-foreground">{cms.eventDate}</strong> at{" "}
            <strong className="text-foreground">{cms.eventName}</strong>. Get your verified personalized
            badge to share across WhatsApp and social media.
          </p>

          {/* Interactive Qualification Gate Card */}
          <div className="mt-10 mx-auto max-w-xl rounded-3xl border border-primary/30 bg-gradient-to-b from-card via-card/95 to-background p-6 sm:p-8 shadow-2xl space-y-6">
            <div className="space-y-2">
              <h2 className="font-display text-xl sm:text-2xl font-bold text-foreground">
                Have you already joined the waitlist?
              </h2>
              <p className="text-xs sm:text-sm text-muted-foreground">
                Only waitlist members can generate and download their official digital launch pass.
              </p>
            </div>

            <div className="grid gap-3.5 sm:grid-cols-2">
              {/* Option 1: Yes, Already Joined */}
              <button
                type="button"
                onClick={() => setLookupOpen(true)}
                className="group relative flex flex-col items-center justify-center p-5 rounded-2xl border-2 border-gold/40 bg-gold/5 hover:bg-gold/15 hover:border-gold transition-all text-center cursor-pointer shadow-md"
              >
                <div className="grid h-12 w-12 place-items-center rounded-2xl bg-gold/20 text-gold mb-3 group-hover:scale-110 transition-transform">
                  <UserCheck className="h-6 w-6" />
                </div>
                <span className="font-bold text-sm text-foreground">
                  Yes, I've Joined
                </span>
                <span className="text-[11px] text-muted-foreground mt-1">
                  Find my pass with email or phone
                </span>
                <div className="mt-3 inline-flex items-center text-xs font-bold text-gold gap-1">
                  Retrieve Pass <ArrowRight className="h-3 w-3" />
                </div>
              </button>

              {/* Option 2: No, Haven't Joined Yet */}
              <a
                href="/#waitlist"
                className="group relative flex flex-col items-center justify-center p-5 rounded-2xl border-2 border-emerald-500/40 bg-emerald-500/5 hover:bg-emerald-500/15 hover:border-emerald-500 transition-all text-center cursor-pointer shadow-md"
              >
                <div className="grid h-12 w-12 place-items-center rounded-2xl bg-emerald-500/20 text-emerald-500 mb-3 group-hover:scale-110 transition-transform">
                  <UserPlus className="h-6 w-6" />
                </div>
                <span className="font-bold text-sm text-foreground">
                  No, I'm New
                </span>
                <span className="text-[11px] text-muted-foreground mt-1">
                  Join waitlist & get instant pass
                </span>
                <div className="mt-3 inline-flex items-center text-xs font-bold text-emerald-500 gap-1">
                  Join in 30 Seconds <ArrowRight className="h-3 w-3" />
                </div>
              </a>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-4 pt-2 text-[11px] text-muted-foreground/80">
              <span className="flex items-center gap-1">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" /> Instant Pass Generation
              </span>
              <span className="flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5 text-gold" /> Launches Oct 2, 2026
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Lookup Dialog */}
      <LaunchPassLookupDialog
        open={lookupOpen}
        onClose={() => setLookupOpen(false)}
        onSuccess={handleLookupSuccess}
      />
    </PublicLayout>
  );
}
