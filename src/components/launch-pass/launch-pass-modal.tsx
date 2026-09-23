import { useEffect, useRef, useState } from "react";
import {
  Download,
  Share2,
  Copy,
  Check,
  Sparkles,
  Loader2,
  ExternalLink,
  MessageCircle,
  Calendar,
  Layers,
} from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useLaunch } from "@/components/launch/launch-state-provider";
import { useBranding } from "@/lib/cms-context";
import {
  renderLaunchPassToCanvas,
  shareLaunchPass,
  downloadLaunchPass,
  getWhatsAppShareUrl,
  type CardFormat,
} from "@/lib/launch-pass/canvas-renderer";
import { launchPassApi } from "@/lib/api/launch-pass";
import { DEFAULT_LAUNCH_PASS_CMS, type LaunchPassCmsData, type LaunchPassData } from "@/lib/types/launch-pass";

export interface LaunchPassModalProps {
  open: boolean;
  onClose: () => void;
  cms?: LaunchPassCmsData;
  onPreferenceChange?: (attending: boolean) => void;
  entry: {
    publicId?: string;
    name: string;
    email?: string;
    city?: string;
    role?: string;
    launchPassToken: string;
    launchPassNumber?: string;
    referralCode?: string;
    attendingNatcon?: boolean;
    position?: number | null;
    joinedAt?: string;
  } | null;
}

export function LaunchPassModal({
  open,
  onClose,
  entry,
  cms: propCms,
  onPreferenceChange,
}: LaunchPassModalProps) {
  const cms = propCms || DEFAULT_LAUNCH_PASS_CMS;
  const { status: launchStatus } = useLaunch();
  const { logoUrl, logoDarkUrl } = useBranding();

  const [format, setFormat] = useState<CardFormat>("feed");
  const [attending, setAttending] = useState<boolean>(entry?.attendingNatcon !== false);
  const [rendering, setRendering] = useState<boolean>(true);
  const [sharing, setSharing] = useState<boolean>(false);
  const [copiedLink, setCopiedLink] = useState<boolean>(false);

  const [canvasNode, setCanvasNode] = useState<HTMLCanvasElement | null>(null);

  // Sync initial attending state only when opening or switching to a new entry
  const prevIdRef = useRef<string | null>(null);
  useEffect(() => {
    if (open && entry) {
      const currentId = entry.publicId || entry.launchPassToken;
      if (prevIdRef.current !== currentId) {
        prevIdRef.current = currentId;
        setAttending(entry.attendingNatcon !== false);
      }
    } else if (!open) {
      prevIdRef.current = null;
    }
  }, [open, entry?.publicId, entry?.launchPassToken, entry?.attendingNatcon]);

  // Derived public pass URL
  const origin = typeof window !== "undefined" ? window.location.origin : "https://mytijaara.com";
  const passUrl = entry?.launchPassToken ? `${origin}/launch-pass/${entry.launchPassToken}` : origin;

  // Render canvas whenever format, attending, entry fields, canvasNode, or branding change
  useEffect(() => {
    if (!open || !entry || !canvasNode) return;

    let cancelled = false;
    setRendering(true);

    const passData: LaunchPassData = {
      name: entry.name,
      firstName: entry.name.split(" ")[0] || entry.name,
      city: entry.city || "Nigeria",
      role: entry.role,
      launchPassNumber: entry.launchPassNumber || (entry.position ? `#${String(entry.position).padStart(5, "0")}` : "#00001"),
      launchPassToken: entry.launchPassToken,
      referralCode: entry.referralCode,
      attendingNatcon: attending,
      position: entry.position || 1,
      joinedAt: entry.joinedAt || new Date().toISOString(),
    };

    renderLaunchPassToCanvas(canvasNode, {
      data: passData,
      cms,
      format,
      launchStatus,
      shareUrl: passUrl,
      brandLogoUrl: logoDarkUrl || logoUrl,
    })
      .then(() => {
        if (!cancelled) setRendering(false);
      })
      .catch((err) => {
        console.error("Canvas render failed:", err);
        if (!cancelled) setRendering(false);
      });

    return () => {
      cancelled = true;
    };
  }, [
    open,
    entry?.publicId,
    entry?.launchPassToken,
    entry?.name,
    entry?.city,
    entry?.role,
    entry?.position,
    format,
    attending,
    cms,
    launchStatus,
    passUrl,
    canvasNode,
    logoDarkUrl,
    logoUrl,
  ]);

  if (!entry) return null;

  const handleAttendingChange = async (val: string) => {
    const isYes = val === "yes";
    setAttending(isYes);
    onPreferenceChange?.(isYes);

    if (entry.publicId) {
      try {
        await launchPassApi.updatePreference(entry.publicId, isYes);
        toast.success(isYes ? "NATCON Attendee badge activated! 🎉" : "Preference updated.");
      } catch {
        // silent fail
      }
    }
  };

  const handleNativeShare = async () => {
    if (!canvasNode) return;
    setSharing(true);

    const passData: LaunchPassData = {
      name: entry.name,
      firstName: entry.name.split(" ")[0] || entry.name,
      city: entry.city || "Nigeria",
      role: entry.role,
      launchPassNumber: entry.launchPassNumber || "#00001",
      launchPassToken: entry.launchPassToken,
      referralCode: entry.referralCode,
      attendingNatcon: attending,
      position: entry.position || 1,
      joinedAt: entry.joinedAt || new Date().toISOString(),
    };

    const shareTitle = `${cms.campaignTitle} • ${entry.name}`;
    const shareText = attending ? cms.sharingMessageAttendee : cms.sharingMessage;

    try {
      const result = await shareLaunchPass({
        canvas: canvasNode,
        title: shareTitle,
        text: shareText,
        url: passUrl,
        filename: `mytijaara-launch-pass-${entry.launchPassToken || "card"}.png`,
      });

      if (result.method === "clipboard") {
        toast.success("Pass link and message copied to clipboard!");
      } else if (result.method === "download") {
        toast.success("Launch pass downloaded! Ready to share.");
      }
    } catch (err) {
      console.error(err);
      toast.error("Could not complete share.");
    } finally {
      setSharing(false);
    }
  };

  const handleDownload = () => {
    if (!canvasNode) return;
    downloadLaunchPass(
      canvasNode,
      `mytijaara-pass-${entry.launchPassToken || "download"}.png`,
    );
    toast.success("Launch Pass downloaded!");
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(passUrl);
      setCopiedLink(true);
      toast.success("Launch Pass link copied!");
      setTimeout(() => setCopiedLink(false), 2500);
    } catch {
      toast.error("Could not copy link.");
    }
  };

  const passDataForUrl: LaunchPassData = {
    name: entry.name,
    firstName: entry.name.split(" ")[0] || entry.name,
    city: entry.city || "Nigeria",
    role: entry.role,
    launchPassNumber: entry.launchPassNumber || "#00001",
    launchPassToken: entry.launchPassToken,
    referralCode: entry.referralCode,
    attendingNatcon: attending,
    position: entry.position || 1,
    joinedAt: entry.joinedAt || new Date().toISOString(),
  };
  const whatsappUrl = getWhatsAppShareUrl(passDataForUrl, cms, passUrl);

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-4xl rounded-3xl border-primary/20 bg-gradient-to-b from-card via-background to-card p-4 sm:p-6 shadow-2xl overflow-hidden max-h-[92vh] overflow-y-auto">
        <DialogHeader className="text-center sm:text-left space-y-1">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="grid h-8 w-8 place-items-center rounded-lg bg-gold/10 text-gold border border-gold/20">
                <Sparkles className="h-4 w-4" />
              </span>
              <DialogTitle className="font-display text-xl sm:text-2xl font-bold tracking-tight text-foreground">
                {cms.campaignTitle}
              </DialogTitle>
            </div>

            {/* Format Tabs (Feed 4:5 vs Story 9:16) */}
            <Tabs
              value={format}
              onValueChange={(val) => setFormat(val as CardFormat)}
              className="w-auto"
            >
              <TabsList className="bg-muted/60 p-0.5 h-8">
                {cms.enablePostFormat && (
                  <TabsTrigger value="feed" className="text-xs px-2.5 py-1">
                    Feed (4:5)
                  </TabsTrigger>
                )}
                {cms.enableStoryFormat && (
                  <TabsTrigger value="story" className="text-xs px-2.5 py-1">
                    Story (9:16)
                  </TabsTrigger>
                )}
              </TabsList>
            </Tabs>
          </div>
          <DialogDescription className="text-xs text-muted-foreground">
            Personalized digital launch badge for {cms.eventName} • {cms.eventDate}
          </DialogDescription>
        </DialogHeader>

        <div className="mt-4 grid gap-6 lg:grid-cols-12 items-start">
          {/* Left Column: Canvas Preview */}
          <div className="lg:col-span-6 flex flex-col items-center justify-center">
            <div
              className={`relative w-full max-w-[340px] sm:max-w-[380px] rounded-2xl overflow-hidden shadow-2xl border border-gold/30 bg-slate-950 transition-all ${
                format === "story" ? "aspect-[9/16]" : "aspect-[4/5]"
              }`}
            >
              {rendering && (
                <div className="absolute inset-0 z-10 grid place-items-center bg-background/60 backdrop-blur-xs">
                  <div className="flex items-center gap-2 text-xs font-semibold text-gold">
                    <Loader2 className="h-4 w-4 animate-spin" /> Rendering pass…
                  </div>
                </div>
              )}
              <canvas
                ref={setCanvasNode}
                className="w-full h-full object-contain block"
                style={{ imageRendering: "auto" }}
              />
            </div>
            <p className="mt-2 text-[11px] text-muted-foreground text-center flex items-center gap-1">
              <Layers className="h-3 w-3 text-gold" /> Generated at 1080px high resolution
            </p>
          </div>

          {/* Right Column: Customization Controls & Sharing */}
          <div className="lg:col-span-6 space-y-4 text-left">
            {/* NATCON Attendance Question */}
            {cms.enableAttendeeQuestion && (
              <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4 space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold text-foreground">
                  <Calendar className="h-4 w-4 text-gold" />
                  <span>Will you be at {cms.eventName}?</span>
                </div>

                <RadioGroup
                  value={attending ? "yes" : "no"}
                  onValueChange={handleAttendingChange}
                  className="grid gap-2"
                >
                  <label
                    htmlFor="attend-yes"
                    className={`flex items-center gap-3 rounded-xl border p-3 cursor-pointer transition-colors ${
                      attending
                        ? "border-gold bg-gold/10 text-foreground font-semibold"
                        : "border-border/60 hover:bg-muted/40 text-muted-foreground"
                    }`}
                  >
                    <RadioGroupItem value="yes" id="attend-yes" />
                    <div className="text-xs">
                      <strong className="block text-foreground">Yes — I'll be there LIVE</strong>
                      <span>Unlocks the exclusive Conference Launch Attendee badge</span>
                    </div>
                  </label>

                  <label
                    htmlFor="attend-no"
                    className={`flex items-center gap-3 rounded-xl border p-3 cursor-pointer transition-colors ${
                      !attending
                        ? "border-primary bg-primary/10 text-foreground font-semibold"
                        : "border-border/60 hover:bg-muted/40 text-muted-foreground"
                    }`}
                  >
                    <RadioGroupItem value="no" id="attend-no" />
                    <div className="text-xs">
                      <strong className="block text-foreground">No — Following the launch online</strong>
                      <span>Official MyTijaara Launch Pass</span>
                    </div>
                  </label>
                </RadioGroup>
              </div>
            )}

            {/* Share CTA Actions */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold text-foreground">Share to Social & WhatsApp</Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <Button
                  onClick={handleNativeShare}
                  disabled={rendering || sharing}
                  className="bg-gold text-slate-950 hover:bg-gold/90 font-bold text-xs h-10 shadow-sm gap-2"
                >
                  {sharing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Share2 className="h-4 w-4" />}
                  Share Launch Pass
                </Button>

                <Button
                  asChild
                  variant="outline"
                  className="border-emerald-600/30 bg-emerald-600/10 text-emerald-700 hover:bg-emerald-600 hover:text-white dark:text-emerald-400 font-bold text-xs h-10 gap-2"
                >
                  <a href={whatsappUrl} target="_blank" rel="noreferrer">
                    <MessageCircle className="h-4 w-4" /> WhatsApp Status
                  </a>
                </Button>

                <Button
                  variant="outline"
                  onClick={handleDownload}
                  disabled={rendering}
                  className="border-border/80 text-xs h-10 font-semibold gap-2"
                >
                  <Download className="h-4 w-4 text-primary" /> Download PNG
                </Button>

                <Button
                  variant="outline"
                  onClick={handleCopyLink}
                  className="border-border/80 text-xs h-10 font-semibold gap-2"
                >
                  {copiedLink ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
                  {copiedLink ? "Link Copied" : "Copy Pass Link"}
                </Button>
              </div>
            </div>

            {/* Public Pass Web Link Preview */}
            <div className="rounded-xl border border-border/80 bg-muted/30 p-3 space-y-1.5">
              <div className="flex items-center justify-between text-[11px] text-muted-foreground font-medium">
                <span>Public Card URL:</span>
                <a
                  href={passUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-primary hover:underline inline-flex items-center gap-1"
                >
                  View Page <ExternalLink className="h-3 w-3" />
                </a>
              </div>
              <div className="truncate rounded-lg bg-background px-2.5 py-1.5 font-mono text-[11px] text-foreground/80 border border-border/60">
                {passUrl}
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
