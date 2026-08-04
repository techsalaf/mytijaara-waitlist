import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import {
  AlertTriangle,
  Bell,
  Check,
  CheckCheck,
  Loader2,
  Mail,
  Trash2,
  UserPlus,
  Users,
} from "lucide-react";
import { toast } from "sonner";

import { PageHeader, SectionCard } from "@/components/admin/ui-bits";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { notificationsApi, type Notification, type NotificationType } from "@/lib/api";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/notifications")({
  head: () => ({
    meta: [{ title: "Notifications — MyTijaara Admin" }, { name: "robots", content: "noindex" }],
  }),
  component: NotificationsPage,
});

/** Tab value -> the `type` filter sent to the API. `all` sends nothing. */
const TABS: { value: string; label: string; type?: NotificationType }[] = [
  { value: "all", label: "All" },
  { value: "signup", label: "Signups", type: "signup" },
  { value: "referral", label: "Referrals", type: "referral" },
  { value: "email", label: "Email", type: "email" },
  { value: "system", label: "System", type: "system" },
  { value: "error", label: "Errors", type: "error" },
];

const ICONS: Record<NotificationType, typeof Bell> = {
  signup: UserPlus,
  referral: Users,
  email: Mail,
  system: Bell,
  error: AlertTriangle,
  info: Bell,
};

const TONES: Record<NotificationType, string> = {
  signup: "bg-emerald-100 text-emerald-700",
  referral: "bg-primary/10 text-primary",
  email: "bg-sky-100 text-sky-700",
  system: "bg-muted text-muted-foreground",
  error: "bg-red-100 text-red-700",
  info: "bg-primary/10 text-primary",
};

function NotificationsPage() {
  const [tab, setTab] = useState("all");
  const [items, setItems] = useState<Notification[]>([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const type = TABS.find((t) => t.value === tab)?.type;

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await notificationsApi.list(type ? { type } : undefined);
      setItems(res.data);
      setUnread(
        typeof res.meta?.unread === "number"
          ? res.meta.unread
          : res.data.filter((n) => n.unread).length,
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load notifications");
    } finally {
      setLoading(false);
    }
  }, [type]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const run = async (fn: () => Promise<unknown>, ok: string) => {
    setBusy(true);
    try {
      await fn();
      toast.success(ok);
      await refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Action failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Notifications"
        description={`${unread} unread`}
        actions={
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              disabled={busy || unread === 0}
              title={unread === 0 ? "Nothing unread" : undefined}
              onClick={() =>
                void run(() => notificationsApi.markAllRead(), "All notifications marked read")
              }
            >
              <CheckCheck className="mr-2 h-4 w-4" /> Mark all as read
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={busy || items.every((n) => n.unread)}
              title={items.every((n) => n.unread) ? "Nothing read to clear" : undefined}
              onClick={() =>
                void run(() => notificationsApi.clearRead(), "Read notifications cleared")
              }
            >
              <Trash2 className="mr-2 h-4 w-4" /> Clear read
            </Button>
          </div>
        }
      />

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          {TABS.map((t) => (
            <TabsTrigger key={t.value} value={t.value}>
              {t.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {TABS.map((t) => (
          <TabsContent key={t.value} value={t.value} className="mt-4">
            <SectionCard>
              {loading ? (
                <div className="grid h-40 place-items-center text-muted-foreground">
                  <Loader2 className="h-5 w-5 animate-spin" />
                </div>
              ) : error ? (
                <div className="grid h-40 place-items-center gap-3 text-center">
                  <p className="text-sm text-red-600">{error}</p>
                  <Button size="sm" variant="outline" onClick={() => void refresh()}>
                    Try again
                  </Button>
                </div>
              ) : items.length === 0 ? (
                <div className="grid h-40 place-items-center text-center text-sm text-muted-foreground">
                  No {t.value === "all" ? "" : `${t.label.toLowerCase()} `}notifications yet.
                  They appear here as events happen.
                </div>
              ) : (
                <div className="space-y-2">
                  {items.map((n) => {
                    const Icon = ICONS[n.type] ?? Bell;
                    return (
                      <div
                        key={n.id}
                        className={cn(
                          "flex items-start gap-3 rounded-xl border p-4",
                          n.unread ? "border-primary/30 bg-primary/[0.03]" : "border-border/60",
                        )}
                      >
                        <div
                          className={cn(
                            "grid h-9 w-9 shrink-0 place-items-center rounded-xl",
                            TONES[n.type] ?? TONES.info,
                          )}
                        >
                          <Icon className="h-4 w-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold">{n.title}</span>
                            {n.unread && <span className="h-1.5 w-1.5 rounded-full bg-gold" />}
                          </div>
                          {n.body && (
                            <p className="text-sm text-muted-foreground">{n.body}</p>
                          )}
                          <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
                            <span>{n.time}</span>
                            {n.link && (
                              <a className="text-primary hover:underline" href={n.link}>
                                View
                              </a>
                            )}
                          </div>
                        </div>
                        <div className="flex shrink-0 items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            disabled={busy || !n.unread}
                            title={n.unread ? "Mark as read" : "Already read"}
                            onClick={() =>
                              void run(() => notificationsApi.markRead(n.id), "Marked as read")
                            }
                          >
                            <Check className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-red-600"
                            disabled={busy}
                            title="Delete"
                            onClick={() =>
                              void run(() => notificationsApi.remove(n.id), "Notification deleted")
                            }
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </SectionCard>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
