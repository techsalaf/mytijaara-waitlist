import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Rocket, Loader2, Save, RotateCcw } from "lucide-react";
import { toast } from "sonner";

import { SectionCard } from "@/components/admin/ui-bits";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { launchApi } from "@/lib/api";
import {
  DEFAULT_LAUNCH_CONFIG,
  formatLaunchDate,
  formatLaunchTime,
  getTimeRemaining,
  resolveLaunchStatus,
  type LaunchConfiguration,
  type LaunchStatusSetting,
} from "@/lib/launch/config";

export const Route = createFileRoute("/admin/cms/launch")({
  head: () => ({
    meta: [
      { title: "Launch & Countdown — MyTijaara Admin" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: LaunchCms,
});

/** ISO with offset -> value for <input type="datetime-local"> in that offset. */
function isoToLocalInput(iso: string): string {
  const m = iso.match(/^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})/);
  return m ? `${m[1]}T${m[2]}` : "";
}

/** Keep the original offset suffix when the admin edits the wall-clock time. */
function localInputToIso(value: string, previousIso: string): string {
  const offset = previousIso.match(/(Z|[+-]\d{2}:\d{2})$/)?.[0] ?? "+01:00";
  return `${value}:00${offset === "Z" ? "Z" : offset}`;
}

const TIMEZONES = [
  "Africa/Lagos",
  "Africa/Accra",
  "Africa/Nairobi",
  "Europe/London",
  "America/New_York",
  "UTC",
];

const STATUS_OPTIONS: { value: LaunchStatusSetting; label: string }[] = [
  { value: "auto", label: "Auto (derive from launch date)" },
  { value: "pre_launch", label: "Pin: Pre-launch" },
  { value: "launch_day", label: "Pin: Launch day" },
  { value: "post_launch", label: "Pin: Post-launch" },
];

function LaunchCms() {
  const [cfg, setCfg] = useState<LaunchConfiguration>(DEFAULT_LAUNCH_CONFIG);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    let cancelled = false;
    launchApi
      .get()
      .then((c) => !cancelled && setCfg(c))
      .catch(() => toast.error("Could not load launch configuration"))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const set = <K extends keyof LaunchConfiguration>(
    key: K,
    value: LaunchConfiguration[K],
  ) => setCfg((c) => ({ ...c, [key]: value }));

  const save = async () => {
    setSaving(true);
    try {
      const saved = await launchApi.update(cfg);
      setCfg(saved);
      toast.success("Launch configuration saved");
    } catch {
      toast.error("Save failed");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="grid h-64 place-items-center text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
      </div>
    );
  }

  const status = resolveLaunchStatus(cfg, now);
  const remaining = getTimeRemaining(cfg.launchDateTime, now);
  // Master switch off => every dependent control is inert. Editing a countdown
  // that cannot render is how admins end up believing a setting took effect.
  const locked = !cfg.launchEnabled;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border/60 bg-card p-4 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary/10 text-primary">
            <Rocket className="h-5 w-5" />
          </div>
          <div>
            <div className="text-sm font-semibold">
              Effective state:{" "}
              <span className="text-primary">{status.replace("_", " ")}</span>
            </div>
            <div className="text-xs text-muted-foreground">
              {status === "pre_launch"
                ? `${remaining.days}d ${remaining.hours}h ${remaining.minutes}m ${remaining.seconds}s remaining`
                : "Countdown and waitlist are hidden on the public site"}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCfg(DEFAULT_LAUNCH_CONFIG)}
          >
            <RotateCcw className="mr-2 h-4 w-4" /> Reset to defaults
          </Button>
          <Button size="sm" onClick={save} disabled={saving}>
            {saving ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            Save configuration
          </Button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <SectionCard
          title="Visibility switches"
          description="Master toggles for the launch experience"
        >
          <div className="space-y-3">
            {[
              {
                key: "launchEnabled" as const,
                title: "Launch section enabled",
                hint: "Off hides the whole section — no empty space",
              },
              {
                key: "countdownEnabled" as const,
                title: "Countdown timer",
                hint: "Only meaningful before the launch moment",
              },
              {
                key: "waitlistEnabled" as const,
                title: "Waitlist section & CTAs",
                hint: "Off removes the form and switches CTAs to Download",
              },
            ].map((row) => (
              <div
                key={row.key}
                className="flex items-center justify-between rounded-lg border border-border/60 p-3"
              >
                <div>
                  <div className="text-sm font-medium">{row.title}</div>
                  <div className="text-xs text-muted-foreground">
                    {locked && row.key !== "launchEnabled"
                      ? "Disabled — launch section is off"
                      : row.hint}
                  </div>
                </div>
                <Switch
                  checked={cfg[row.key]}
                  disabled={locked && row.key !== "launchEnabled"}
                  onCheckedChange={(v) => set(row.key, v)}
                />
              </div>
            ))}
            <div>
              <Label>Launch status override</Label>
              <Select
                value={cfg.launchStatus}
                disabled={locked}
                onValueChange={(v) => set("launchStatus", v as LaunchStatusSetting)}
              >
                <SelectTrigger className="mt-1.5">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="mt-1.5 text-xs text-muted-foreground">
                Use a pin to preview launch day before the real date. Set back to
                Auto before publishing.
              </p>
            </div>
          </div>
        </SectionCard>

        <SectionCard
          title="Launch date & time"
          description="Stored as ISO-8601 with an explicit UTC offset"
        >
          <div className="space-y-4">
            <div>
              <Label htmlFor="launch-dt">Launch date & time</Label>
              <Input
                id="launch-dt"
                type="datetime-local"
                className="mt-1.5"
                disabled={locked}
                value={isoToLocalInput(cfg.launchDateTime)}
                onChange={(e) =>
                  set(
                    "launchDateTime",
                    localInputToIso(e.target.value, cfg.launchDateTime),
                  )
                }
              />
            </div>
            <div>
              <Label>Timezone</Label>
              <Select
                value={cfg.timezone}
                disabled={locked}
                onValueChange={(v) => set("timezone", v)}
              >
                <SelectTrigger className="mt-1.5">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TIMEZONES.map((tz) => (
                    <SelectItem key={tz} value={tz}>
                      {tz}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="celebration-days">Celebration window (days)</Label>
              <Input
                id="celebration-days"
                type="number"
                min={0}
                max={30}
                className="mt-1.5"
                disabled={locked}
                value={cfg.launchCelebrationDays}
                onChange={(e) =>
                  set(
                    "launchCelebrationDays",
                    Math.min(30, Math.max(0, Number(e.target.value) || 0)),
                  )
                }
              />
              <p className="mt-1.5 text-xs text-muted-foreground">
                How long the "We're live" banner, ribbon and confetti stay up
                after launch. Afterwards the page becomes the plain homepage.
              </p>
            </div>
            <div className="rounded-lg border border-border/60 bg-surface p-3 text-sm">
              <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Renders on site as
              </div>
              <div className="mt-1 font-medium">{formatLaunchDate(cfg)}</div>
              <div className="text-muted-foreground">{formatLaunchTime(cfg)}</div>
              <div className="mt-2 font-mono text-[11px] text-muted-foreground">
                {cfg.launchDateTime}
              </div>
            </div>
          </div>
        </SectionCard>

        <SectionCard
          title="Top ribbon (marquee)"
          description="Thin animated strip pinned above the navigation"
        >
          <div className="space-y-4">
            <div className="flex items-center justify-between rounded-lg border border-border/60 p-3">
              <div>
                <div className="text-sm font-medium">Ribbon enabled</div>
                <div className="text-xs text-muted-foreground">
                  Off removes the strip entirely — the nav sits at the top
                </div>
              </div>
              <Switch
                checked={cfg.ticker.enabled}
                disabled={locked}
                onCheckedChange={(v) =>
                  set("ticker", { ...cfg.ticker, enabled: v })
                }
              />
            </div>
            <div>
              <Label>Pre-launch text</Label>
              <Input
                className="mt-1.5"
                disabled={locked || !cfg.ticker.enabled}
                value={cfg.ticker.text}
                onChange={(e) =>
                  set("ticker", { ...cfg.ticker, text: e.target.value })
                }
              />
              <p className="mt-1.5 text-xs text-muted-foreground">
                <code>{"{days}"}</code> is replaced with the time remaining.
              </p>
            </div>
            <div>
              <Label>Launch-day text</Label>
              <Input
                className="mt-1.5"
                disabled={locked || !cfg.ticker.enabled}
                value={cfg.ticker.liveText}
                onChange={(e) =>
                  set("ticker", { ...cfg.ticker, liveText: e.target.value })
                }
              />
            </div>
            <div>
              <Label>Link</Label>
              <Input
                className="mt-1.5"
                disabled={locked || !cfg.ticker.enabled}
                value={cfg.ticker.href}
                onChange={(e) =>
                  set("ticker", { ...cfg.ticker, href: e.target.value })
                }
              />
              <p className="mt-1.5 text-xs text-muted-foreground">
                Leave empty for a non-clickable strip.
              </p>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-border/60 p-3">
              <div>
                <div className="text-sm font-medium">Confetti from the ribbon</div>
                <div className="text-xs text-muted-foreground">
                  Fires for first-time visitors during the celebration window
                </div>
              </div>
              <Switch
                checked={cfg.ticker.confetti}
                disabled={locked || !cfg.ticker.enabled}
                onCheckedChange={(v) =>
                  set("ticker", { ...cfg.ticker, confetti: v })
                }
              />
            </div>
          </div>
        </SectionCard>

        <SectionCard
          title="Pre-launch copy"
          description="Shown while the countdown is running"
        >
          <div className="space-y-4">
            <div>
              <Label>Badge</Label>
              <Input
                className="mt-1.5"
                disabled={locked}
                value={cfg.badge}
                onChange={(e) => set("badge", e.target.value)}
              />
            </div>
            <div>
              <Label>Headline</Label>
              <Input
                className="mt-1.5"
                disabled={locked}
                value={cfg.launchTitle}
                onChange={(e) => set("launchTitle", e.target.value)}
              />
            </div>
            <div>
              <Label>Subheadline</Label>
              <Textarea
                rows={4}
                className="mt-1.5"
                disabled={locked}
                value={cfg.launchSubtitle}
                onChange={(e) => set("launchSubtitle", e.target.value)}
              />
            </div>
          </div>
        </SectionCard>

        <SectionCard
          title="Call to action buttons"
          description="Anchor (#waitlist) or absolute URL"
        >
          <div className="space-y-4">
            {(["primaryCTA", "secondaryCTA"] as const).map((key) => (
              <div
                key={key}
                className="space-y-3 rounded-lg border border-border/60 p-3"
              >
                <div className="flex items-center justify-between">
                  <div className="text-sm font-medium">
                    {key === "primaryCTA" ? "Primary CTA" : "Secondary CTA"}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">Visible</span>
                    <Switch
                      checked={!cfg[key].hidden}
                      disabled={locked}
                      onCheckedChange={(v) =>
                        set(key, { ...cfg[key], hidden: !v })
                      }
                    />
                  </div>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <Label>Label</Label>
                    <Input
                      className="mt-1.5"
                      disabled={locked}
                      value={cfg[key].label}
                      onChange={(e) =>
                        set(key, { ...cfg[key], label: e.target.value })
                      }
                    />
                  </div>
                  <div>
                    <Label>Link</Label>
                    <Input
                      className="mt-1.5"
                      disabled={locked}
                      value={cfg[key].href}
                      onChange={(e) =>
                        set(key, { ...cfg[key], href: e.target.value })
                      }
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </SectionCard>

        <SectionCard
          title="Live (post-launch) content"
          description="Replaces the countdown once the launch moment passes"
        >
          <div className="space-y-4">
            <div>
              <Label>Badge</Label>
              <Input
                className="mt-1.5"
                disabled={locked}
                value={cfg.live.badge}
                onChange={(e) =>
                  set("live", { ...cfg.live, badge: e.target.value })
                }
              />
            </div>
            <div>
              <Label>Title</Label>
              <Input
                className="mt-1.5"
                disabled={locked}
                value={cfg.live.title}
                onChange={(e) =>
                  set("live", { ...cfg.live, title: e.target.value })
                }
              />
            </div>
            <div>
              <Label>Subtitle</Label>
              <Textarea
                rows={3}
                className="mt-1.5"
                disabled={locked}
                value={cfg.live.subtitle}
                onChange={(e) =>
                  set("live", { ...cfg.live, subtitle: e.target.value })
                }
              />
            </div>
            <div className="flex items-center justify-between rounded-lg border border-border/60 p-3">
              <div>
                <div className="text-sm font-medium">Confetti on first load</div>
                <div className="text-xs text-muted-foreground">
                  Fires once per browser session after launch
                </div>
              </div>
              <Switch
                checked={cfg.live.confetti}
                disabled={locked}
                onCheckedChange={(v) => set("live", { ...cfg.live, confetti: v })}
              />
            </div>
          </div>
        </SectionCard>

        <SectionCard
          title="App store buttons"
          description="Shown in the live banner and post-launch CTAs"
        >
          <div className="space-y-4">
            {cfg.live.stores.map((store, i) => (
              <div
                key={store.platform}
                className="space-y-3 rounded-lg border border-border/60 p-3"
              >
                <div className="flex items-center justify-between">
                  <div className="text-sm font-medium capitalize">
                    {store.platform}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">
                      Coming soon
                    </span>
                    <Switch
                      checked={!!store.comingSoon}
                      disabled={locked}
                      onCheckedChange={(v) => {
                        const stores = cfg.live.stores.map((s, idx) =>
                          idx === i ? { ...s, comingSoon: v } : s,
                        );
                        set("live", { ...cfg.live, stores });
                      }}
                    />
                  </div>
                </div>
                <div className="grid gap-3 sm:grid-cols-3">
                  {(["sublabel", "label", "href"] as const).map((field) => (
                    <div key={field}>
                      <Label className="capitalize">{field}</Label>
                      <Input
                        className="mt-1.5"
                        disabled={locked}
                        value={store[field]}
                        onChange={(e) => {
                          const stores = cfg.live.stores.map((s, idx) =>
                            idx === i ? { ...s, [field]: e.target.value } : s,
                          );
                          set("live", { ...cfg.live, stores });
                        }}
                      />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </SectionCard>
      </div>
    </div>
  );
}
