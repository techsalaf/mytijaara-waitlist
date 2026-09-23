import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useEffect, useState, useRef } from "react";
import {
  Sparkles,
  ArrowRight,
  Share2,
  Download,
  Copy,
  Check,
  Calendar,
  Layers,
  MapPin,
  CheckCircle2,
  Loader2,
  AlertCircle,
  MessageCircle,
} from "lucide-react";
import { toast } from "sonner";
import { PublicLayout } from "@/components/landing/public-layout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { launchPassApi } from "@/lib/api/launch-pass";
import { useCmsData, useBranding } from "@/lib/cms-context";
import { useLaunch } from "@/components/launch/launch-state-provider";
import {
  renderLaunchPassToCanvas,
  downloadLaunchPass,
  shareLaunchPass,
  getWhatsAppShareUrl,
  type CardFormat,
} from "@/lib/launch-pass/canvas-renderer";
import { loadPublicPageData } from "@/lib/public-page-data";
import { LaunchPassModal } from "@/components/launch-pass/launch-pass-modal";
import { LaunchPassLookupDialog } from "@/components/launch-pass/launch-pass-lookup-dialog";
import type { LaunchPassData } from "@/lib/types/launch-pass";
import type { WaitlistUser } from "@/lib/types";
type LaunchPassCmsData = {
  campaignTitle: string;
  eventName: string;
  eventDate: string;
  eventDateShort: string;
  headlineGeneral: string;
  headlineAttendee: string;
  supportingCopyGeneral: string;
  supportingCopyAttendee: string;
  liveHeadlineGeneral: string;
  liveHeadlineAttendee: string;
  taaLogoUrl: string;
  sharingMessage: string;
  sharingMessageAttendee: string;
  referralCta: string;
  cardFooterText: string;
  enableAttendeeQuestion: boolean;
  enablePostFormat: boolean;
  enableStoryFormat: boolean;
};

const DEFAULT_LAUNCH_PASS: LaunchPassCmsData = {
  campaignTitle: "My Launch Pass",
  eventName: "TAA NATCON 2026",
  eventDate: "October 2, 2026",
  eventDateShort: "02 • 10 • 26",
  headlineGeneral: "I'M ON THE LIST",
  headlineAttendee: "I'LL BE THERE",
  supportingCopyGeneral:
    "I'm getting ready for MyTijaara. Officially launching October 2, 2026 at TAA NATCON 2026. Something big is coming.",
  supportingCopyAttendee:
    "I'll be witnessing the official launch of MyTijaara LIVE at TAA NATCON 2026. 02 • 10 • 26.",
  liveHeadlineGeneral: "MYTIJAARA IS LIVE",
  liveHeadlineAttendee: "I WAS THERE",
  taaLogoUrl: "/images/taa-natcon-partner-logo.png",
  sharingMessage:
    "I'm on the MyTijaara Launch List! Officially launching Oct 2 at TAA NATCON 2026. Join with me:",
  sharingMessageAttendee:
    "I'll be witnessing the official launch of MyTijaara LIVE at TAA NATCON 2026! Join the waitlist before launch:",
  referralCta: "Join the Waitlist",
  cardFooterText: "MyTijaara × TAA NATCON 2026 • Nigeria's Everyday Super App",
  enableAttendeeQuestion: true,
  enablePostFormat: true,
  enableStoryFormat: true,
};

export const Route = createFileRoute("/launch-pass/$token")({
  loader: () => loadPublicPageData(),
  head: () => ({
    meta: [
      { title: "Official Launch Pass — MyTijaara × TAA NATCON 2026" },
      {
        name: "description",
        content:
          "Personalized MyTijaara Launch Pass for TAA NATCON 2026. Join Nigeria's next-gen super app before official launch on October 2, 2026.",
      },
      { property: "og:type", content: "website" },
      { property: "og:title", content: "MyTijaara Official Launch Pass • TAA NATCON 2026" },
      {
        property: "og:description",
        content: "Join the launch on October 2, 2026. Be part of Nigeria's everyday super app.",
      },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: LaunchPassPage,
});

function LaunchPassPage() {
  const { launchConfig, serverNow, cms: loaderCms, branding } = Route.useLoaderData();
  const { token } = useParams({ from: "/launch-pass/$token" });
  const cms = useCmsData("launch_pass", DEFAULT_LAUNCH_PASS);
  const { status: launchStatus } = useLaunch();

  const [loading, setLoading] = useState(true);
  const [passData, setPassData] = useState<LaunchPassData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [format, setFormat] = useState<CardFormat>("feed");
  const [copied, setCopied] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [lookupOpen, setLookupOpen] = useState(false);

  const [canvasNode, setCanvasNode] = useState<HTMLCanvasElement | null>(null);

  if (!cms) return null;

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    launchPassApi
      .get(token)
      .then((res) => {
        if (!cancelled && res.data) {
          setPassData({
            ...res.data,
            attendingNatcon: res.data.attendingNatcon !== false,
          });
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : "We could not find this launch pass.",
          );
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [token]);

  // Render canvas once passData is loaded and canvas element is attached
  useEffect(() => {
    if (!passData || !canvasNode) return;

    renderLaunchPassToCanvas(canvasNode, {
      data: passData,
      cms,
      format,
      launchStatus,
      shareUrl: typeof window !== "undefined" ? window.location.href : undefined,
      brandLogoUrl: branding?.logoDarkUrl || branding?.logoUrl,
    }).catch((err) => console.error("Canvas render error:", err));
  }, [
    passData,
    cms,
    format,
    launchStatus,
    canvasNode,
    branding?.logoDarkUrl,
    branding?.logoUrl,
  ]);

  const handleDownload = () => {
    if (!canvasNode || !passData) return;
    downloadLaunchPass(canvasNode, `mytijaara-pass-${passData.launchPassToken}.png`);
    toast.success("Launch pass downloaded!");
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      toast.success("Pass link copied!");
      setTimeout(() => setCopied(false), 2500);
    } catch {
      toast.error("Could not copy link.");
    }
  };

  const handleShare = async () => {
    if (!canvasNode || !passData) return;

    const shareTitle = `${cms.campaignTitle} • ${passData.name}`;
    const shareText = passData.attendingNatcon
      ? cms.sharingMessageAttendee
      : cms.sharingMessage;

    try {
      const result = await shareLaunchPass({
        canvas: canvasNode,
        title: shareTitle,
        text: shareText,
        url: window.location.href,
        filename: `mytijaara-launch-pass-${passData.launchPassToken}.png`,
      });

      if (result.method === "clipboard") {
        toast.success("Pass link and text copied!");
      }
    } catch {
      toast.error("Could not complete share.");
    }
  };

  const handleLookupSuccess = (user: WaitlistUser) => {
    if (user.launchPassToken) {
      window.location.href = `/launch-pass/${user.launchPassToken}`;
    }
  };

  const joinWaitlistUrl = passData?.referralCode
    ? `/?ref=${encodeURIComponent(passData.referralCode)}#waitlist`
    : "/#waitlist";

  const isLive = launchStatus === "launch_day" || launchStatus === "post_launch";

  return (
    <PublicLayout launchConfig={launchConfig} serverNow={serverNow} cmsData={loaderCms} branding={branding}>
      <div className="relative min-h-[85vh] py-12 sm:py-20 overflow-hidden">
        {/* Ambient background glows */}
        <div
          className="pointer-events-none absolute -top-40 left-1/2 -translate-x-1/2 h-96 w-[700px] rounded-full bg-emerald-600/10 blur-3xl"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute top-1/3 right-[-10%] h-80 w-80 rounded-full bg-gold/15 blur-3xl"
          aria-hidden
        />

        <div className="mx-auto max-w-5xl px-4 sm:px-6 relative z-10">
          {loading ? (
            <div className="min-h-[400px] flex flex-col items-center justify-center gap-4 text-center">
              <Loader2 className="h-10 w-10 animate-spin text-gold" />
              <p className="text-sm font-semibold text-muted-foreground">
                Loading official launch pass…
              </p>
            </div>
          ) : error || !passData ? (
            <div className="mx-auto max-w-md rounded-3xl border border-border/80 bg-card p-8 text-center shadow-xl space-y-4">
              <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-destructive/10 text-destructive border border-destructive/20">
                <AlertCircle className="h-7 w-7" />
              </div>
              <h2 className="font-display text-2xl font-bold text-foreground">
                Pass Not Found
              </h2>
              <p className="text-sm text-muted-foreground">
                {error || "This launch pass does not exist or has expired."}
              </p>
              <div className="pt-2 flex flex-col gap-2">
                <Button asChild className="bg-gold text-slate-950 hover:bg-gold/90 font-bold">
                  <a href="/#waitlist">
                    Join Waitlist & Get a Pass <ArrowRight className="ml-2 h-4 w-4" />
                  </a>
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setLookupOpen(true)}
                  className="text-xs"
                >
                  Find Existing Pass
                </Button>
              </div>
            </div>
          ) : (
            <div className="grid gap-12 lg:grid-cols-12 items-center">
              {/* Left Column: Canvas Pass Preview */}
              <div className="lg:col-span-6 flex flex-col items-center justify-center">
                <div
                  className={`relative w-full max-w-[360px] sm:max-w-[420px] rounded-3xl overflow-hidden shadow-2xl border-2 border-gold/40 bg-slate-950 transition-all ${
                    format === "story" ? "aspect-[9/16]" : "aspect-[4/5]"
                  }`}
                >
                  <canvas
                    ref={setCanvasNode}
                    className="w-full h-full object-contain block"
                    style={{ imageRendering: "auto" }}
                  />
                </div>

                {/* Format Toggle Buttons */}
                <div className="mt-4 flex items-center gap-2">
                  {cms.enablePostFormat && (
                    <Button
                      size="sm"
                      variant={format === "feed" ? "default" : "outline"}
                      onClick={() => setFormat("feed")}
                      className={`text-xs h-8 ${
                        format === "feed" ? "bg-gold text-slate-950 hover:bg-gold/90 font-bold" : ""
                      }`}
                    >
                      Feed Post (4:5)
                    </Button>
                  )}
                  {cms.enableStoryFormat && (
                    <Button
                      size="sm"
                      variant={format === "story" ? "default" : "outline"}
                      onClick={() => setFormat("story")}
                      className={`text-xs h-8 ${
                        format === "story" ? "bg-gold text-slate-950 hover:bg-gold/90 font-bold" : ""
                      }`}
                    >
                      Story / Status (9:16)
                    </Button>
                  )}
                </div>
              </div>

              {/* Right Column: Details & Dual CTAs */}
              <div className="lg:col-span-6 space-y-6 text-left">
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge
                      variant="outline"
                      className={`text-xs font-bold px-3 py-1 ${
                        passData.attendingNatcon
                          ? "border-gold bg-gold/10 text-gold"
                          : "border-emerald-600 bg-emerald-600/10 text-emerald-500"
                      }`}
                    >
                      <Sparkles className="mr-1.5 h-3.5 w-3.5" />
                      {passData.attendingNatcon
                        ? "CONFERENCE LAUNCH ATTENDEE"
                        : "OFFICIAL LAUNCH PASS"}
                    </Badge>

                    <span className="font-mono text-xs font-bold text-gold">
                      {passData.launchPassNumber}
                    </span>

                    {cms.taaLogoUrl && (
                      <img
                        src={cms.taaLogoUrl}
                        alt={cms.eventName ?? "TAA NATCON 2026"}
                        className="h-5 w-auto object-contain opacity-80 ml-auto"
                      />
                    )}
                  </div>

                  <h1 className="font-display text-3xl sm:text-5xl font-extrabold tracking-tight text-foreground">
                    {passData.name.toUpperCase()}
                  </h1>

                  <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1.5 text-foreground font-semibold">
                      <MapPin className="h-4 w-4 text-emerald-500" />
                      {passData.city || "Nigeria"}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Calendar className="h-4 w-4 text-gold" />
                      {cms.eventDate} • {cms.eventName}
                    </span>
                    <span className="font-mono text-xs text-gold/80">
                      {cms.eventDateShort}
                    </span>
                  </div>

                  <div className="font-display text-base sm:text-lg font-bold text-gold tracking-wide uppercase">
                    {isLive
                      ? passData.attendingNatcon
                        ? cms.liveHeadlineAttendee
                        : cms.liveHeadlineGeneral
                      : passData.attendingNatcon
                        ? cms.headlineAttendee
                        : cms.headlineGeneral}
                  </div>

                  <p className="text-base text-muted-foreground leading-relaxed pt-1">
                    {passData.attendingNatcon
                      ? cms.supportingCopyAttendee
                      : cms.supportingCopyGeneral}
                  </p>
                </div>

                {/* Primary CTA Box: "Join [Name] on the Waitlist" */}
                <div className="rounded-3xl border border-gold/40 bg-gradient-to-br from-gold/15 via-emerald-950/40 to-gold/10 p-6 shadow-xl space-y-4">
                  <div>
                    <h3 className="text-lg font-bold text-foreground">
                      Join {passData.firstName} on the Waitlist
                    </h3>
                    <p className="text-xs text-muted-foreground mt-1">
                      Reserve early access for Nigeria's super app and generate your own
                      official launch pass.
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
                    <Button
                      asChild
                      size="lg"
                      className="bg-gold text-slate-950 hover:bg-gold/90 font-extrabold text-sm px-6 h-12 shadow-lg"
                    >
                      <a href={joinWaitlistUrl}>
                        {cms.referralCta} <ArrowRight className="ml-2 h-4 w-4" />
                      </a>
                    </Button>

                    {cms.enableAttendeeQuestion && (
                      <Button
                        type="button"
                        variant="outline"
                        size="lg"
                        onClick={() => setModalOpen(true)}
                        className="border-gold/50 bg-background/50 hover:bg-gold/10 text-xs font-bold h-12"
                      >
                        <Layers className="mr-2 h-4 w-4 text-gold" /> Customize / Attendee Badge
                      </Button>
                    )}
                  </div>
                </div>

                {/* Secondary Actions: Social Sharing & Download */}
                <div className="space-y-3">
                  <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Share or Download this Pass
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      type="button"
                      onClick={handleShare}
                      className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs h-9 gap-1.5"
                    >
                      <Share2 className="h-3.5 w-3.5" /> Share Pass
                    </Button>

                    <Button
                      asChild
                      variant="outline"
                      className="border-emerald-600/30 text-emerald-700 dark:text-emerald-400 text-xs h-9 gap-1.5"
                    >
                      <a
                        href={getWhatsAppShareUrl(passData, cms, window.location.href)}
                        target="_blank"
                        rel="noreferrer"
                      >
                        <MessageCircle className="h-3.5 w-3.5" /> WhatsApp Status
                      </a>
                    </Button>

                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleDownload}
                      className="text-xs h-9 gap-1.5"
                    >
                      <Download className="h-3.5 w-3.5 text-gold" /> Download PNG
                    </Button>

                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleCopyLink}
                      className="text-xs h-9 gap-1.5"
                    >
                      {copied ? (
                        <Check className="h-3.5 w-3.5 text-emerald-600" />
                      ) : (
                        <Copy className="h-3.5 w-3.5" />
                      )}
                      {copied ? "Copied" : "Copy Link"}
                    </Button>
                  </div>
                </div>

                <p className="text-[11px] text-muted-foreground/80">
                  {cms.cardFooterText}
                </p>

                {/* Existing Member Lookup Link */}
                <div className="pt-2 border-t border-border/60 text-xs text-muted-foreground">
                  Already joined the waitlist?{" "}
                  <button
                    type="button"
                    onClick={() => setLookupOpen(true)}
                    className="text-gold font-semibold underline hover:text-gold/80 cursor-pointer ml-1"
                  >
                    Find your launch pass here
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modal for Customizing / Full Experience */}
      <LaunchPassModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        entry={passData}
        cms={cms}
      />

      {/* Lookup dialog for existing waitlist members */}
      <LaunchPassLookupDialog
        open={lookupOpen}
        onClose={() => setLookupOpen(false)}
        onSuccess={handleLookupSuccess}
      />
    </PublicLayout>
  );
}
