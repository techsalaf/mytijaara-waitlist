import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect, useRef } from "react";
import { SectionCard } from "@/components/admin/ui-bits";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Download,
  Loader2,
  Save,
  QrCode,
  Sparkles,
  Smartphone,
  Apple,
  Globe,
  Store,
  Bike,
  Copy,
  Check,
  Printer,
  ExternalLink,
  Sliders,
  Palette,
} from "lucide-react";
import QRCode from "qrcode";
import { toast } from "sonner";
import { useCmsSection } from "@/lib/hooks/useCmsSection";

export const Route = createFileRoute("/admin/cms/download")({
  component: DownloadCmsEditor,
});

type DownloadCmsData = {
  badge?: string;
  heading?: string;
  subheading?: string;
  playStore?: {
    enabled?: boolean;
    comingSoon?: boolean;
    url?: string;
    label?: string;
  };
  appStore?: {
    enabled?: boolean;
    comingSoon?: boolean;
    url?: string;
    label?: string;
  };
  webApp?: {
    enabled?: boolean;
    url?: string;
    label?: string;
    description?: string;
  };
  vendorPartner?: {
    enabled?: boolean;
    url?: string;
    label?: string;
    description?: string;
  };
  riderPartner?: {
    enabled?: boolean;
    url?: string;
    label?: string;
    description?: string;
  };
};

const defaultData: DownloadCmsData = {
  badge: "Get the App",
  heading: "Experience MyTijaara on your device",
  subheading:
    "Order food, shop groceries & pharmacy items, book trusted artisans, send parcels, and rent cars — all in one super app built for Nigeria.",
  playStore: {
    enabled: true,
    comingSoon: false,
    url: "https://play.google.com/store/apps/details?id=com.mytijaara.app",
    label: "Google Play",
  },
  appStore: {
    enabled: true,
    comingSoon: true,
    url: "https://apps.apple.com/app/mytijaara/id000000000",
    label: "App Store",
  },
  webApp: {
    enabled: true,
    url: "https://app.mytijaara.com",
    label: "Order Online (Web App)",
    description: "No installation required — browse menus, buy essentials, and order services directly in your browser.",
  },
  vendorPartner: {
    enabled: true,
    url: "https://dashboard.mytijaara.com",
    label: "Partner with us as a Vendor",
    description: "Sell food, groceries, pharmacy or retail products to thousands of customers.",
  },
  riderPartner: {
    enabled: true,
    url: "https://dashboard.mytijaara.com",
    label: "Earn with us as a Delivery Rider",
    description: "Flexible hours, prompt payouts, and guaranteed orders across your city.",
  },
};

function DownloadCmsEditor() {
  const { data, setData, enabled, setEnabled, loading, saving, save } =
    useCmsSection<DownloadCmsData>("download", defaultData);

  // QR Studio State
  const [qrUrl, setQrUrl] = useState("https://mytijaara.com/download");
  const [qrFgColor, setQrFgColor] = useState("#004A28");
  const [qrBgColor, setQrBgColor] = useState("#FFFFFF");
  const [qrSize, setQrSize] = useState<number>(1024);
  const [qrDataUrl, setQrDataUrl] = useState<string>("");
  const [qrSvgString, setQrSvgString] = useState<string>("");
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedSvg, setCopiedSvg] = useState(false);

  // Re-generate QR preview when options change
  useEffect(() => {
    QRCode.toDataURL(qrUrl, {
      width: 480,
      margin: 1.5,
      color: {
        dark: qrFgColor,
        light: qrBgColor === "transparent" ? "#00000000" : qrBgColor,
      },
    })
      .then(setQrDataUrl)
      .catch(() => {});

    QRCode.toString(qrUrl, {
      type: "svg",
      margin: 1.5,
      color: {
        dark: qrFgColor,
        light: qrBgColor === "transparent" ? "#00000000" : qrBgColor,
      },
    })
      .then(setQrSvgString)
      .catch(() => {});
  }, [qrUrl, qrFgColor, qrBgColor]);

  // Export high-res PNG
  const downloadHighResPng = async () => {
    try {
      const highResUrl = await QRCode.toDataURL(qrUrl, {
        width: qrSize,
        margin: 1.5,
        color: {
          dark: qrFgColor,
          light: qrBgColor === "transparent" ? "#00000000" : qrBgColor,
        },
      });

      const a = document.createElement("a");
      a.href = highResUrl;
      a.download = `mytijaara-download-qr-${qrSize}px.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      toast.success(`High-res PNG (${qrSize}x${qrSize}px) downloaded!`);
    } catch {
      toast.error("Failed to generate high-res PNG.");
    }
  };

  // Export vector SVG
  const downloadVectorSvg = async () => {
    try {
      const svg = await QRCode.toString(qrUrl, {
        type: "svg",
        margin: 1.5,
        color: {
          dark: qrFgColor,
          light: qrBgColor === "transparent" ? "#00000000" : qrBgColor,
        },
      });

      const blob = new Blob([svg], { type: "image/svg+xml" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "mytijaara-download-qr.svg";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success("Vector SVG downloaded!");
    } catch {
      toast.error("Failed to generate vector SVG.");
    }
  };

  const copyPageLink = () => {
    navigator.clipboard.writeText(qrUrl);
    setCopiedLink(true);
    toast.success("URL copied to clipboard!");
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const copySvgMarkup = () => {
    if (!qrSvgString) return;
    navigator.clipboard.writeText(qrSvgString);
    setCopiedSvg(true);
    toast.success("SVG code copied to clipboard!");
    setTimeout(() => setCopiedSvg(false), 2000);
  };

  const printFlyer = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Content Settings Card */}
      <SectionCard
        title="Download Page Content"
        description="Configure titles, download links, and app store status for /download"
        actions={
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Switch
                id="enable-download-section"
                checked={enabled}
                onCheckedChange={setEnabled}
              />
              <Label htmlFor="enable-download-section" className="text-xs">
                {enabled ? "Active" : "Hidden"}
              </Label>
            </div>
            <Button size="sm" onClick={save} disabled={saving || loading}>
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              Save changes
            </Button>
          </div>
        }
      >
        <div className="grid gap-6 sm:grid-cols-2">
          <div>
            <Label htmlFor="badge">Header Badge</Label>
            <Input
              id="badge"
              value={data.badge ?? ""}
              onChange={(e) => setData({ ...data, badge: e.target.value })}
              className="mt-1.5"
              placeholder="Get the App"
            />
          </div>
          <div>
            <Label htmlFor="heading">Main Headline</Label>
            <Input
              id="heading"
              value={data.heading ?? ""}
              onChange={(e) => setData({ ...data, heading: e.target.value })}
              className="mt-1.5"
              placeholder="Experience MyTijaara on your device"
            />
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="subheading">Subheading</Label>
            <Textarea
              id="subheading"
              value={data.subheading ?? ""}
              onChange={(e) => setData({ ...data, subheading: e.target.value })}
              className="mt-1.5"
              rows={2}
            />
          </div>
        </div>

        {/* Store & Platform Toggles */}
        <div className="mt-8 border-t border-border/60 pt-6 space-y-6">
          <h3 className="text-sm font-semibold text-foreground">App Store & Download Platforms</h3>

          {/* Google Play */}
          <div className="rounded-2xl border border-border/60 p-4 space-y-3 bg-muted/20">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="grid h-8 w-8 place-items-center rounded-lg bg-emerald-500/10 text-emerald-600">
                  <Smartphone className="h-4 w-4" />
                </div>
                <div>
                  <div className="text-sm font-semibold">Google Play Store</div>
                  <div className="text-xs text-muted-foreground">Android application package link</div>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Switch
                    id="play-coming-soon"
                    checked={data.playStore?.comingSoon ?? false}
                    onCheckedChange={(v) =>
                      setData({
                        ...data,
                        playStore: { ...(data.playStore ?? {}), comingSoon: v },
                      })
                    }
                  />
                  <Label htmlFor="play-coming-soon" className="text-xs">
                    Mark Coming Soon
                  </Label>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    id="play-enabled"
                    checked={data.playStore?.enabled ?? true}
                    onCheckedChange={(v) =>
                      setData({
                        ...data,
                        playStore: { ...(data.playStore ?? {}), enabled: v },
                      })
                    }
                  />
                  <Label htmlFor="play-enabled" className="text-xs">
                    Show on Page
                  </Label>
                </div>
              </div>
            </div>
            <Input
              value={data.playStore?.url ?? ""}
              onChange={(e) =>
                setData({
                  ...data,
                  playStore: { ...(data.playStore ?? {}), url: e.target.value },
                })
              }
              placeholder="https://play.google.com/store/apps/details?id=com.mytijaara.app"
              className="text-xs font-mono"
            />
          </div>

          {/* Apple App Store */}
          <div className="rounded-2xl border border-border/60 p-4 space-y-3 bg-muted/20">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="grid h-8 w-8 place-items-center rounded-lg bg-slate-900 text-white">
                  <Apple className="h-4 w-4" />
                </div>
                <div>
                  <div className="text-sm font-semibold">Apple App Store</div>
                  <div className="text-xs text-muted-foreground">iOS application link</div>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Switch
                    id="app-coming-soon"
                    checked={data.appStore?.comingSoon ?? true}
                    onCheckedChange={(v) =>
                      setData({
                        ...data,
                        appStore: { ...(data.appStore ?? {}), comingSoon: v },
                      })
                    }
                  />
                  <Label htmlFor="app-coming-soon" className="text-xs">
                    Mark Coming Soon
                  </Label>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    id="app-enabled"
                    checked={data.appStore?.enabled ?? true}
                    onCheckedChange={(v) =>
                      setData({
                        ...data,
                        appStore: { ...(data.appStore ?? {}), enabled: v },
                      })
                    }
                  />
                  <Label htmlFor="app-enabled" className="text-xs">
                    Show on Page
                  </Label>
                </div>
              </div>
            </div>
            <Input
              value={data.appStore?.url ?? ""}
              onChange={(e) =>
                setData({
                  ...data,
                  appStore: { ...(data.appStore ?? {}), url: e.target.value },
                })
              }
              placeholder="https://apps.apple.com/app/mytijaara/id000000000"
              className="text-xs font-mono"
            />
          </div>

          {/* Web App */}
          <div className="rounded-2xl border border-border/60 p-4 space-y-3 bg-muted/20">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="grid h-8 w-8 place-items-center rounded-lg bg-primary/10 text-primary">
                  <Globe className="h-4 w-4" />
                </div>
                <div>
                  <div className="text-sm font-semibold">Order Online (Web App)</div>
                  <div className="text-xs text-muted-foreground">Direct web browser access link</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  id="web-enabled"
                  checked={data.webApp?.enabled ?? true}
                  onCheckedChange={(v) =>
                    setData({
                      ...data,
                      webApp: { ...(data.webApp ?? {}), enabled: v },
                    })
                  }
                />
                <Label htmlFor="web-enabled" className="text-xs">
                  Show on Page
                </Label>
              </div>
            </div>
            <Input
              value={data.webApp?.url ?? ""}
              onChange={(e) =>
                setData({
                  ...data,
                  webApp: { ...(data.webApp ?? {}), url: e.target.value },
                })
              }
              placeholder="https://app.mytijaara.com"
              className="text-xs font-mono"
            />
          </div>

          {/* Vendor Portal */}
          <div className="rounded-2xl border border-border/60 p-4 space-y-3 bg-muted/20">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="grid h-8 w-8 place-items-center rounded-lg bg-emerald-500/10 text-emerald-600">
                  <Store className="h-4 w-4" />
                </div>
                <div>
                  <div className="text-sm font-semibold">Vendor Portal Link</div>
                  <div className="text-xs text-muted-foreground">Business onboarding destination</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  id="vendor-enabled"
                  checked={data.vendorPartner?.enabled ?? true}
                  onCheckedChange={(v) =>
                    setData({
                      ...data,
                      vendorPartner: { ...(data.vendorPartner ?? {}), enabled: v },
                    })
                  }
                />
                <Label htmlFor="vendor-enabled" className="text-xs">
                  Show on Page
                </Label>
              </div>
            </div>
            <Input
              value={data.vendorPartner?.url ?? ""}
              onChange={(e) =>
                setData({
                  ...data,
                  vendorPartner: { ...(data.vendorPartner ?? {}), url: e.target.value },
                })
              }
              placeholder="https://dashboard.mytijaara.com"
              className="text-xs font-mono"
            />
          </div>

          {/* Rider Portal */}
          <div className="rounded-2xl border border-border/60 p-4 space-y-3 bg-muted/20">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="grid h-8 w-8 place-items-center rounded-lg bg-amber-500/10 text-amber-700">
                  <Bike className="h-4 w-4" />
                </div>
                <div>
                  <div className="text-sm font-semibold">Delivery Rider Link</div>
                  <div className="text-xs text-muted-foreground">Rider fleet signup destination</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  id="rider-enabled"
                  checked={data.riderPartner?.enabled ?? true}
                  onCheckedChange={(v) =>
                    setData({
                      ...data,
                      riderPartner: { ...(data.riderPartner ?? {}), enabled: v },
                    })
                  }
                />
                <Label htmlFor="rider-enabled" className="text-xs">
                  Show on Page
                </Label>
              </div>
            </div>
            <Input
              value={data.riderPartner?.url ?? ""}
              onChange={(e) =>
                setData({
                  ...data,
                  riderPartner: { ...(data.riderPartner ?? {}), url: e.target.value },
                })
              }
              placeholder="https://dashboard.mytijaara.com"
              className="text-xs font-mono"
            />
          </div>
        </div>
      </SectionCard>

      {/* QR Code Generator & Studio Card */}
      <SectionCard
        title="Download QR Code Studio"
        description="Generate, customize and export high-resolution QR codes for banners, rollups, and event launch walls."
      >
        <div className="grid gap-8 lg:grid-cols-12">
          {/* Controls */}
          <div className="space-y-5 lg:col-span-7">
            <div>
              <Label htmlFor="qr-target-url">QR Destination URL</Label>
              <div className="mt-1.5 flex gap-2">
                <Input
                  id="qr-target-url"
                  value={qrUrl}
                  onChange={(e) => setQrUrl(e.target.value)}
                  placeholder="https://mytijaara.com/download"
                  className="font-mono text-xs"
                />
                <Button variant="outline" size="sm" onClick={copyPageLink} className="shrink-0 gap-1">
                  {copiedLink ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                  Copy
                </Button>
              </div>
              <p className="mt-1 text-[11px] text-muted-foreground">
                Tip: Append campaign parameters like <code className="bg-muted px-1 py-0.5 rounded">?src=event_banner</code> to track scans.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {/* Color Presets */}
              <div>
                <Label className="flex items-center gap-1.5">
                  <Palette className="h-3.5 w-3.5 text-primary" /> Foreground Color
                </Label>
                <div className="mt-2 flex items-center gap-2">
                  <input
                    type="color"
                    value={qrFgColor}
                    onChange={(e) => setQrFgColor(e.target.value)}
                    className="h-9 w-12 cursor-pointer rounded-lg border border-border bg-transparent p-1"
                  />
                  <div className="flex flex-wrap gap-1">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setQrFgColor("#004A28")}
                      className={`h-8 px-2 text-[10px] ${qrFgColor === "#004A28" ? "border-primary font-bold text-primary" : ""}`}
                    >
                      Emerald
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setQrFgColor("#D4A017")}
                      className={`h-8 px-2 text-[10px] ${qrFgColor === "#D4A017" ? "border-primary font-bold text-primary" : ""}`}
                    >
                      Gold
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setQrFgColor("#111827")}
                      className={`h-8 px-2 text-[10px] ${qrFgColor === "#111827" ? "border-primary font-bold text-primary" : ""}`}
                    >
                      Dark
                    </Button>
                  </div>
                </div>
              </div>

              {/* Background Color */}
              <div>
                <Label>Background Color</Label>
                <div className="mt-2 flex items-center gap-2">
                  <input
                    type="color"
                    value={qrBgColor === "transparent" ? "#ffffff" : qrBgColor}
                    onChange={(e) => setQrBgColor(e.target.value)}
                    className="h-9 w-12 cursor-pointer rounded-lg border border-border bg-transparent p-1"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setQrBgColor("#FFFFFF")}
                    className={`h-8 px-2 text-[10px] ${qrBgColor === "#FFFFFF" ? "border-primary font-bold text-primary" : ""}`}
                  >
                    White
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setQrBgColor("#F6F4EF")}
                    className={`h-8 px-2 text-[10px] ${qrBgColor === "#F6F4EF" ? "border-primary font-bold text-primary" : ""}`}
                  >
                    Warm Light
                  </Button>
                </div>
              </div>
            </div>

            {/* Size Resolution Selector */}
            <div>
              <Label className="flex items-center gap-1.5">
                <Sliders className="h-3.5 w-3.5 text-primary" /> PNG Export Resolution
              </Label>
              <div className="mt-2 flex flex-wrap gap-2">
                {[512, 1024, 2048, 4096].map((sz) => (
                  <Button
                    key={sz}
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setQrSize(sz)}
                    className={`h-8 px-3 text-xs ${qrSize === sz ? "border-primary bg-primary/5 text-primary font-bold" : ""}`}
                  >
                    {sz} x {sz} px {sz >= 2048 ? "(Print Ready)" : ""}
                  </Button>
                ))}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-3 pt-4 border-t border-border/60">
              <Button onClick={downloadHighResPng} className="gap-2 bg-primary hover:bg-primary/90">
                <Download className="h-4 w-4" /> Download PNG ({qrSize}px)
              </Button>
              <Button onClick={downloadVectorSvg} variant="outline" className="gap-2">
                <Download className="h-4 w-4" /> Download Vector SVG
              </Button>
              <Button onClick={copySvgMarkup} variant="ghost" size="sm" className="gap-1.5 text-xs">
                {copiedSvg ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                Copy SVG
              </Button>
            </div>
          </div>

          {/* Live Printable Preview Frame */}
          <div className="lg:col-span-5">
            <div className="rounded-3xl border border-border bg-slate-50 p-6 text-center shadow-soft dark:bg-slate-900/50">
              <div className="text-xs font-bold uppercase tracking-widest text-primary">Print & Banner Preview</div>
              
              <div className="mt-4 mx-auto max-w-[280px] rounded-2xl border-2 border-dashed border-primary/30 bg-white p-5 shadow-sm text-center">
                <div className="font-display text-base font-extrabold text-[#004A28]">MyTijaara</div>
                <div className="text-[11px] font-semibold text-slate-700">Scan to Download App</div>

                <div className="mt-3 flex justify-center">
                  {qrDataUrl ? (
                    <img
                      src={qrDataUrl}
                      alt="MyTijaara Download QR"
                      className="h-44 w-44 object-contain rounded-lg"
                    />
                  ) : (
                    <div className="grid h-44 w-44 place-items-center bg-muted/40">
                      <QrCode className="h-10 w-10 animate-pulse text-muted-foreground" />
                    </div>
                  )}
                </div>

                <div className="mt-2 text-[10px] text-muted-foreground font-medium">
                  Food · Groceries · Artisans · Parcels
                </div>
                <div className="mt-1 text-[9px] font-bold text-emerald-800">
                  mytijaara.com/download
                </div>
              </div>

              <div className="mt-4 text-xs text-muted-foreground">
                Ready for rollup banners, roll-out posters, flyer handouts, and launch booth standees.
              </div>
            </div>
          </div>
        </div>
      </SectionCard>
    </div>
  );
}
