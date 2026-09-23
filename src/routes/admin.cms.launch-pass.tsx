import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { SectionCard } from "@/components/admin/ui-bits";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Sparkles,
  Loader2,
  Save,
  Upload,
  RotateCcw,
  Download,
  Eye,
  CheckCircle2,
  ImageOff,
  Calendar,
  Layers,
  MessageSquare,
  ShieldCheck,
  Check,
  ExternalLink,
  Link as LinkIcon,
} from "lucide-react";
import { useCmsSection } from "@/lib/hooks/useCmsSection";
import { mediaApi } from "@/lib/api/media";
import {
  renderLaunchPassToCanvas,
  downloadLaunchPass,
  fetchBrandingLogoFromDb,
  type CardFormat,
} from "@/lib/launch-pass/canvas-renderer";
import { toast } from "sonner";

type LaunchPassCmsData = {
  campaignTitle?: string;
  eventName?: string;
  eventDate?: string;
  eventDateShort?: string;
  headlineGeneral?: string;
  headlineAttendee?: string;
  supportingCopyGeneral?: string;
  supportingCopyAttendee?: string;
  liveHeadlineGeneral?: string;
  liveHeadlineAttendee?: string;
  taaLogoUrl?: string;
  sharingMessage?: string;
  sharingMessageAttendee?: string;
  referralCta?: string;
  cardFooterText?: string;
  enableAttendeeQuestion?: boolean;
  enablePostFormat?: boolean;
  enableStoryFormat?: boolean;
};

const defaultLaunchPassData: LaunchPassCmsData = {
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
  taaLogoUrl: "/images/taa-natcon-logo.svg",
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

export const Route = createFileRoute("/admin/cms/launch-pass")({
  head: () => ({
    meta: [
      { title: "Launch Pass & NATCON Campaign — MyTijaara Admin" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: LaunchPassCmsEditor,
});

function LaunchPassCmsEditor() {
  const { data, setData, enabled, setEnabled, loading, saving, save } =
    useCmsSection<LaunchPassCmsData>("launch_pass", defaultLaunchPassData);

  // Database branding logo state
  const [dbBrandLogo, setDbBrandLogo] = useState<string>("");

  useEffect(() => {
    fetchBrandingLogoFromDb().then((url) => {
      if (url) setDbBrandLogo(url);
    });
  }, []);

  // Live Canvas Preview states
  const [previewFormat, setPreviewFormat] = useState<CardFormat>("feed");
  const [previewAttendee, setPreviewAttendee] = useState<boolean>(true);
  const [previewStatus, setPreviewStatus] = useState<"pre_launch" | "launch_day">("pre_launch");
  const [previewRendering, setPreviewRendering] = useState<boolean>(false);

  const [canvasNode, setCanvasNode] = useState<HTMLCanvasElement | null>(null);

  // Active headline and copies for the preview inspection card
  const isLive = previewStatus === "launch_day";
  const activeHeadline = isLive
    ? previewAttendee
      ? data.liveHeadlineAttendee || defaultLaunchPassData.liveHeadlineAttendee
      : data.liveHeadlineGeneral || defaultLaunchPassData.liveHeadlineGeneral
    : previewAttendee
      ? data.headlineAttendee || defaultLaunchPassData.headlineAttendee
      : data.headlineGeneral || defaultLaunchPassData.headlineGeneral;

  const activeCopy = previewAttendee
    ? data.supportingCopyAttendee || defaultLaunchPassData.supportingCopyAttendee
    : data.supportingCopyGeneral || defaultLaunchPassData.supportingCopyGeneral;

  const activeShare = previewAttendee
    ? data.sharingMessageAttendee || defaultLaunchPassData.sharingMessageAttendee
    : data.sharingMessage || defaultLaunchPassData.sharingMessage;

  // Re-render live canvas preview whenever CMS fields, preview controls, DB brand logo, or canvasNode change
  useEffect(() => {
    if (!canvasNode) return;

    let cancelled = false;
    setPreviewRendering(true);

    const sampleData = {
      name: "Amina Ibrahim",
      firstName: "Amina",
      city: "Abuja",
      role: "customer",
      launchPassNumber: "#00124",
      launchPassToken: "sample_token",
      referralCode: "AMINA124",
      attendingNatcon: previewAttendee,
      position: 124,
      joinedAt: new Date().toISOString(),
    };

    renderLaunchPassToCanvas(canvasNode, {
      data: sampleData,
      cms: {
        campaignTitle: data.campaignTitle || defaultLaunchPassData.campaignTitle!,
        eventName: data.eventName || defaultLaunchPassData.eventName!,
        eventDate: data.eventDate || defaultLaunchPassData.eventDate!,
        eventDateShort: data.eventDateShort || defaultLaunchPassData.eventDateShort!,
        headlineGeneral: data.headlineGeneral || defaultLaunchPassData.headlineGeneral!,
        headlineAttendee: data.headlineAttendee || defaultLaunchPassData.headlineAttendee!,
        supportingCopyGeneral: data.supportingCopyGeneral || defaultLaunchPassData.supportingCopyGeneral!,
        supportingCopyAttendee: data.supportingCopyAttendee || defaultLaunchPassData.supportingCopyAttendee!,
        liveHeadlineGeneral: data.liveHeadlineGeneral || defaultLaunchPassData.liveHeadlineGeneral!,
        liveHeadlineAttendee: data.liveHeadlineAttendee || defaultLaunchPassData.liveHeadlineAttendee!,
        taaLogoUrl: data.taaLogoUrl || defaultLaunchPassData.taaLogoUrl!,
        sharingMessage: data.sharingMessage || defaultLaunchPassData.sharingMessage!,
        sharingMessageAttendee: data.sharingMessageAttendee || defaultLaunchPassData.sharingMessageAttendee!,
        referralCta: data.referralCta || defaultLaunchPassData.referralCta!,
        cardFooterText: data.cardFooterText || defaultLaunchPassData.cardFooterText!,
        enableAttendeeQuestion: data.enableAttendeeQuestion ?? defaultLaunchPassData.enableAttendeeQuestion!,
        enablePostFormat: data.enablePostFormat ?? defaultLaunchPassData.enablePostFormat!,
        enableStoryFormat: data.enableStoryFormat ?? defaultLaunchPassData.enableStoryFormat!,
      },
      format: previewFormat,
      launchStatus: previewStatus,
      shareUrl: "https://mytijaara.com/launch-pass/sample_token",
      brandLogoUrl: dbBrandLogo,
    })
      .then(() => {
        if (!cancelled) setPreviewRendering(false);
      })
      .catch((err) => {
        console.error("Preview render failed:", err);
        if (!cancelled) setPreviewRendering(false);
      });

    return () => {
      cancelled = true;
    };
  }, [data, previewFormat, previewAttendee, previewStatus, dbBrandLogo, canvasNode]);

  const handleDownloadPreview = () => {
    if (!canvasNode) return;
    downloadLaunchPass(
      canvasNode,
      `mytijaara-preview-${previewFormat}-${previewAttendee ? "attendee" : "general"}.png`,
    );
    toast.success("Sample social card downloaded!");
  };

  return (
    <div className="space-y-8">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border/60 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-extrabold tracking-tight text-foreground">
              Launch Pass & TAA NATCON 2026 Campaign
            </h2>
            <Badge variant="outline" className="border-gold/40 text-gold text-xs font-semibold">
              Live Studio
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Manage campaign copy, partner branding, and visual card configuration with real-time graphical preview.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            asChild
            variant="outline"
            size="sm"
            className="text-xs gap-1.5 border-gold/40 text-gold hover:bg-gold/10 hover:text-gold"
          >
            <a href="/launch-badge" target="_blank" rel="noreferrer">
              <ExternalLink className="h-3.5 w-3.5" />
              Open Campaign Page (/launch-badge)
            </a>
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleDownloadPreview}
            className="text-xs gap-1.5 border-border/80"
          >
            <Download className="h-3.5 w-3.5" />
            Download Preview Card
          </Button>

          <Button
            type="button"
            className="bg-primary text-primary-foreground font-semibold shadow-md hover:bg-primary/90 px-5"
            onClick={save}
            disabled={loading || saving}
          >
            {saving ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            Save Changes
          </Button>
        </div>
      </div>

      {/* 1. Real-Time Canvas Preview Studio (Expansive Grid Layout) */}
      <div className="rounded-3xl border border-primary/25 bg-gradient-to-br from-card via-card/95 to-background p-6 shadow-xl">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 pb-4 mb-6">
          <div className="flex items-center gap-2.5">
            <span className="grid h-8 w-8 place-items-center rounded-xl bg-gold/15 text-gold border border-gold/30">
              <Eye className="h-4 w-4" />
            </span>
            <div>
              <h3 className="text-base font-bold text-foreground tracking-tight">
                Real-Time Canvas Preview Studio
              </h3>
              <p className="text-xs text-muted-foreground">
                Live 1080px resolution rendering using the exact canvas generator engine
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {dbBrandLogo ? (
              <Badge variant="outline" className="border-emerald-600/40 text-emerald-600 dark:text-emerald-400 gap-1.5 text-xs py-1">
                <CheckCircle2 className="h-3 w-3" /> Brand Logo: CMS Database
              </Badge>
            ) : (
              <Badge variant="outline" className="border-border text-muted-foreground text-xs py-1">
                Brand Logo: Vector Emblem
              </Badge>
            )}
            <Badge variant="outline" className="font-mono text-xs py-1 border-primary/40 text-foreground">
              {previewFormat === "feed" ? "1080 × 1350 • 4:5" : "1080 × 1920 • 9:16"}
            </Badge>
          </div>
        </div>

        {/* Studio Grid: Left = Controls & Live Data, Right = Stage Canvas */}
        <div className="grid gap-6 lg:grid-cols-12 items-start">
          {/* Controls & Inspection Deck (5 cols) */}
          <div className="space-y-4 lg:col-span-5">
            {/* Format Selector */}
            <div className="rounded-2xl border border-border/60 bg-muted/20 p-4 space-y-2">
              <Label className="text-xs font-semibold text-muted-foreground">Card Format</Label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setPreviewFormat("feed")}
                  className={`px-3 py-2 text-xs font-semibold rounded-xl border transition-all ${
                    previewFormat === "feed"
                      ? "bg-primary text-primary-foreground border-primary shadow-sm"
                      : "bg-background border-border/70 text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Feed Post (4:5)
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewFormat("story")}
                  className={`px-3 py-2 text-xs font-semibold rounded-xl border transition-all ${
                    previewFormat === "story"
                      ? "bg-primary text-primary-foreground border-primary shadow-sm"
                      : "bg-background border-border/70 text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Story / Status (9:16)
                </button>
              </div>
            </div>

            {/* Variant & Lifecycle Toggles */}
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-2xl border border-border/60 bg-muted/20 p-3 space-y-2">
                <Label className="text-xs font-semibold text-muted-foreground">Variant</Label>
                <div className="flex flex-col gap-1.5">
                  <button
                    type="button"
                    onClick={() => setPreviewAttendee(true)}
                    className={`px-2.5 py-1.5 text-xs font-semibold rounded-lg border text-left transition-all ${
                      previewAttendee
                        ? "bg-gold text-slate-950 border-gold shadow-sm font-bold"
                        : "bg-background border-border/70 text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    NATCON Attendee
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreviewAttendee(false)}
                    className={`px-2.5 py-1.5 text-xs font-semibold rounded-lg border text-left transition-all ${
                      !previewAttendee
                        ? "bg-emerald-700 text-white border-emerald-600 shadow-sm font-bold"
                        : "bg-background border-border/70 text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    General Member
                  </button>
                </div>
              </div>

              <div className="rounded-2xl border border-border/60 bg-muted/20 p-3 space-y-2">
                <Label className="text-xs font-semibold text-muted-foreground">Lifecycle</Label>
                <div className="flex flex-col gap-1.5">
                  <button
                    type="button"
                    onClick={() => setPreviewStatus("pre_launch")}
                    className={`px-2.5 py-1.5 text-xs font-semibold rounded-lg border text-left transition-all ${
                      previewStatus === "pre_launch"
                        ? "bg-primary text-primary-foreground border-primary shadow-sm"
                        : "bg-background border-border/70 text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    Pre-Launch
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreviewStatus("launch_day")}
                    className={`px-2.5 py-1.5 text-xs font-semibold rounded-lg border text-left transition-all ${
                      previewStatus === "launch_day"
                        ? "bg-primary text-primary-foreground border-primary shadow-sm"
                        : "bg-background border-border/70 text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    Launch Day (Live)
                  </button>
                </div>
              </div>
            </div>

            {/* Live Copy Inspection Card */}
            <div className="rounded-2xl border border-border/70 bg-card p-4 space-y-3 shadow-sm text-left">
              <div className="flex items-center justify-between border-b border-border/50 pb-2">
                <span className="text-xs font-bold text-foreground">Current Render Inspection</span>
                <span className="text-[10px] text-muted-foreground font-mono">Real-Time</span>
              </div>

              <div className="space-y-2 text-xs">
                <div>
                  <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">
                    Rendered Headline
                  </span>
                  <div className="font-extrabold text-foreground text-sm tracking-tight mt-0.5">
                    "{activeHeadline}"
                  </div>
                </div>

                <div>
                  <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">
                    Supporting Copy
                  </span>
                  <p className="text-muted-foreground line-clamp-2 mt-0.5 text-xs">
                    {activeCopy}
                  </p>
                </div>

                <div>
                  <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">
                    WhatsApp Share Message
                  </span>
                  <p className="text-muted-foreground line-clamp-2 mt-0.5 text-xs italic">
                    "{activeShare}"
                  </p>
                </div>
              </div>
            </div>

            <Button
              type="button"
              variant="outline"
              onClick={handleDownloadPreview}
              className="w-full text-xs gap-2 h-9 font-semibold border-gold/40 hover:bg-gold/10"
            >
              <Download className="h-3.5 w-3.5 text-gold" />
              Download Current Card Preview
            </Button>
          </div>

          {/* Stage Canvas Viewport (7 cols) */}
          <div className="lg:col-span-7 flex flex-col items-center justify-center">
            <div className="relative flex items-center justify-center rounded-2xl bg-slate-950 p-4 border border-primary/20 shadow-2xl overflow-hidden min-h-[460px] w-full">
              {/* Subtle ambient stage glow */}
              <div className="pointer-events-none absolute -top-24 -right-24 h-64 w-64 rounded-full bg-gold/10 blur-3xl" aria-hidden />
              <div className="pointer-events-none absolute -bottom-24 -left-24 h-64 w-64 rounded-full bg-primary/20 blur-3xl" aria-hidden />

              {previewRendering && (
                <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/60 backdrop-blur-[2px]">
                  <Loader2 className="h-7 w-7 animate-spin text-gold" />
                </div>
              )}

              <canvas
                ref={setCanvasNode}
                className="max-h-[540px] w-auto max-w-full rounded-xl shadow-2xl object-contain ring-1 ring-white/10"
              />
            </div>
            <p className="text-[11px] text-muted-foreground mt-2 text-center">
              Preview updates automatically as you type or adjust toggles below.
            </p>
          </div>
        </div>
      </div>

      {/* 2. Configuration Grid: Row 1 (Campaign Info & Partner Logo Side by Side) */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Campaign & Event Settings */}
        <SectionCard
          title="Campaign & Event Information"
          description="Conference metadata and public dates displayed on social graphics"
        >
          <div className="space-y-4">
            <div className="flex items-center justify-between rounded-xl border border-border/60 p-3 bg-muted/10">
              <div>
                <div className="text-sm font-semibold">Enable Launch Pass Campaign</div>
                <div className="text-xs text-muted-foreground">
                  Controls visibility of launch pass features across the site
                </div>
              </div>
              <Switch checked={enabled} onCheckedChange={setEnabled} />
            </div>

            <div>
              <Label>Campaign Title</Label>
              <Input
                value={data.campaignTitle ?? ""}
                onChange={(e) => setData({ ...data, campaignTitle: e.target.value })}
                className="mt-1.5"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Event Name</Label>
                <Input
                  value={data.eventName ?? ""}
                  onChange={(e) => setData({ ...data, eventName: e.target.value })}
                  className="mt-1.5"
                />
              </div>
              <div>
                <Label>Event Date (Full)</Label>
                <Input
                  value={data.eventDate ?? ""}
                  onChange={(e) => setData({ ...data, eventDate: e.target.value })}
                  className="mt-1.5"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Short Date (Badge)</Label>
                <Input
                  value={data.eventDateShort ?? ""}
                  onChange={(e) => setData({ ...data, eventDateShort: e.target.value })}
                  placeholder="02 • 10 • 26"
                  className="mt-1.5 font-mono"
                />
              </div>
              <div>
                <Label>Card Footer Text</Label>
                <Input
                  value={data.cardFooterText ?? ""}
                  onChange={(e) => setData({ ...data, cardFooterText: e.target.value })}
                  className="mt-1.5"
                />
              </div>
            </div>

            <div>
              <Label>Public Card Referral CTA Button</Label>
              <Input
                value={data.referralCta ?? ""}
                onChange={(e) => setData({ ...data, referralCta: e.target.value })}
                className="mt-1.5"
              />
            </div>
          </div>
        </SectionCard>

        {/* Partner Logo & Format Controls (Sitting Beside Campaign Info) */}
        <SectionCard
          title="Official Partner Logo & Display Controls"
          description="Manage the partner conference logo and format availability"
        >
          <div className="space-y-4">
            <PartnerLogoUploader
              value={data.taaLogoUrl ?? ""}
              onChange={(url) => setData({ ...data, taaLogoUrl: url })}
            />

            <div className="border-t border-border/60 pt-4 space-y-3">
              <div className="flex items-center justify-between rounded-xl border border-border/60 p-3 bg-muted/10">
                <div>
                  <div className="text-sm font-semibold">Enable Attendance Question</div>
                  <div className="text-xs text-muted-foreground">
                    Asks "Will you be at TAA NATCON 2026?" after signup
                  </div>
                </div>
                <Switch
                  checked={data.enableAttendeeQuestion ?? true}
                  onCheckedChange={(checked) =>
                    setData({ ...data, enableAttendeeQuestion: checked })
                  }
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex items-center justify-between rounded-xl border border-border/60 p-3 bg-muted/10">
                  <div>
                    <div className="text-xs font-semibold">Feed Post (4:5)</div>
                    <div className="text-[10px] text-muted-foreground">1080 × 1350</div>
                  </div>
                  <Switch
                    checked={data.enablePostFormat ?? true}
                    onCheckedChange={(checked) =>
                      setData({ ...data, enablePostFormat: checked })
                    }
                  />
                </div>

                <div className="flex items-center justify-between rounded-xl border border-border/60 p-3 bg-muted/10">
                  <div>
                    <div className="text-xs font-semibold">Story / Status (9:16)</div>
                    <div className="text-[10px] text-muted-foreground">1080 × 1920</div>
                  </div>
                  <Switch
                    checked={data.enableStoryFormat ?? true}
                    onCheckedChange={(checked) =>
                      setData({ ...data, enableStoryFormat: checked })
                    }
                  />
                </div>
              </div>
            </div>
          </div>
        </SectionCard>
      </div>

      {/* 3. The Two Variants Beside Each Other (2-Column Grid) */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Variant A: General Waitlist Member */}
        <SectionCard
          title="Variant A: General Waitlist Member"
          description="Applied when member answers 'No — following online'"
        >
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Badge className="bg-emerald-600/20 text-emerald-700 dark:text-emerald-400 border border-emerald-600/30 text-xs">
                General Launch Pass
              </Badge>
            </div>

            <div>
              <Label>Pre-Launch Headline</Label>
              <Input
                value={data.headlineGeneral ?? ""}
                onChange={(e) => setData({ ...data, headlineGeneral: e.target.value })}
                className="mt-1.5 font-bold"
              />
            </div>

            <div>
              <Label>Launch Day / Post-Launch Headline</Label>
              <Input
                value={data.liveHeadlineGeneral ?? ""}
                onChange={(e) => setData({ ...data, liveHeadlineGeneral: e.target.value })}
                className="mt-1.5 font-bold"
              />
            </div>

            <div>
              <div className="flex items-center justify-between">
                <Label>Card Supporting Copy</Label>
                <span className="text-[10px] text-muted-foreground font-mono">
                  {(data.supportingCopyGeneral || "").length} chars
                </span>
              </div>
              <Textarea
                rows={3}
                value={data.supportingCopyGeneral ?? ""}
                onChange={(e) => setData({ ...data, supportingCopyGeneral: e.target.value })}
                className="mt-1.5 text-xs leading-relaxed"
              />
            </div>

            <div>
              <div className="flex items-center justify-between">
                <Label>Pre-filled WhatsApp & Social Sharing Message</Label>
                <span className="text-[10px] text-muted-foreground font-mono">
                  {(data.sharingMessage || "").length} chars
                </span>
              </div>
              <Textarea
                rows={3}
                value={data.sharingMessage ?? ""}
                onChange={(e) => setData({ ...data, sharingMessage: e.target.value })}
                className="mt-1.5 text-xs leading-relaxed"
              />
            </div>
          </div>
        </SectionCard>

        {/* Variant B: NATCON Attendee */}
        <SectionCard
          title="Variant B: TAA NATCON Attendee"
          description="Applied when member answers 'Yes — I will be there LIVE'"
        >
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Badge className="bg-gold/20 text-slate-900 dark:text-gold border border-gold/40 text-xs font-bold">
                Conference Attendee Badge
              </Badge>
            </div>

            <div>
              <Label>Pre-Launch Headline</Label>
              <Input
                value={data.headlineAttendee ?? ""}
                onChange={(e) => setData({ ...data, headlineAttendee: e.target.value })}
                className="mt-1.5 font-bold"
              />
            </div>

            <div>
              <Label>Launch Day / Post-Launch Headline</Label>
              <Input
                value={data.liveHeadlineAttendee ?? ""}
                onChange={(e) => setData({ ...data, liveHeadlineAttendee: e.target.value })}
                className="mt-1.5 font-bold"
              />
            </div>

            <div>
              <div className="flex items-center justify-between">
                <Label>Card Supporting Copy</Label>
                <span className="text-[10px] text-muted-foreground font-mono">
                  {(data.supportingCopyAttendee || "").length} chars
                </span>
              </div>
              <Textarea
                rows={3}
                value={data.supportingCopyAttendee ?? ""}
                onChange={(e) => setData({ ...data, supportingCopyAttendee: e.target.value })}
                className="mt-1.5 text-xs leading-relaxed"
              />
            </div>

            <div>
              <div className="flex items-center justify-between">
                <Label>Pre-filled WhatsApp & Social Sharing Message</Label>
                <span className="text-[10px] text-muted-foreground font-mono">
                  {(data.sharingMessageAttendee || "").length} chars
                </span>
              </div>
              <Textarea
                rows={3}
                value={data.sharingMessageAttendee ?? ""}
                onChange={(e) =>
                  setData({ ...data, sharingMessageAttendee: e.target.value })
                }
                className="mt-1.5 text-xs leading-relaxed"
              />
            </div>
          </div>
        </SectionCard>
      </div>
    </div>
  );
}

/**
 * Graphical file uploader & path manager for Partner Logo.
 */
function PartnerLogoUploader({
  value,
  onChange,
}: {
  value: string;
  onChange: (url: string) => void;
}) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [uploading, setUploading] = useState(false);
  const [broken, setBroken] = useState(false);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image file (PNG, SVG, or JPG).");
      return;
    }

    setUploading(true);
    setBroken(false);
    try {
      const res = await mediaApi.upload(file, "LaunchPass", "TAA NATCON Logo");
      onChange(res.data.url);
      toast.success("Partner logo uploaded successfully!");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to upload logo.";
      toast.error(msg);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleResetDefault = () => {
    onChange("/images/taa-natcon-logo.svg");
    setBroken(false);
    toast.success("Reset to default TAA NATCON logo.");
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-4">
        {/* Preview box */}
        <div className="relative grid h-20 w-32 shrink-0 place-items-center rounded-xl border border-dashed border-border/80 bg-muted/20 p-2 overflow-hidden">
          {uploading ? (
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          ) : value && !broken ? (
            <img
              src={value}
              alt="Partner logo"
              className="max-h-16 max-w-full object-contain"
              onError={() => setBroken(true)}
            />
          ) : value && broken ? (
            <div className="flex flex-col items-center gap-1 text-[10px] text-destructive">
              <ImageOff className="h-4 w-4" />
              <span>Failed to load</span>
            </div>
          ) : (
            <span className="text-xs text-muted-foreground">No logo</span>
          )}
        </div>

        {/* Action buttons */}
        <div className="space-y-1.5 flex-1">
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={uploading}
              onClick={() => fileInputRef.current?.click()}
              className="text-xs h-8 gap-1.5"
            >
              {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
              Upload Logo
            </Button>

            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleResetDefault}
              className="text-xs h-8 text-muted-foreground hover:text-foreground gap-1"
            >
              <RotateCcw className="h-3 w-3" />
              Reset Default
            </Button>
          </div>
          <p className="text-[11px] text-muted-foreground">
            SVG or transparent PNG recommended. Placed in card header.
          </p>
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />

      <div>
        <Label className="text-xs text-muted-foreground">Logo URL / Static Path</Label>
        <Input
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            setBroken(false);
          }}
          placeholder="/images/taa-natcon-logo.svg"
          className="mt-1 font-mono text-xs h-8"
        />
      </div>
    </div>
  );
}
