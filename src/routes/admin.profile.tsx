import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { PageHeader, SectionCard } from "@/components/admin/ui-bits";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertTriangle,
  Check,
  Copy,
  FolderOpen,
  Key,
  Loader2,
  LogOut,
  Monitor,
  Monitor as MonitorIcon,
  Moon,
  RefreshCw,
  Save,
  Shield,
  ShieldOff,
  Smartphone,
  Sun,
} from "lucide-react";
import { toast } from "sonner";
import { authApi } from "@/lib/api";
import { MediaPickerModal } from "@/components/admin/media-picker-modal";
import { ApiError } from "@/lib/api/client";
import type {
  AdminSession,
  AuthenticatedUser,
  NotificationPreferences,
  TwoFactorSetup,
} from "@/lib/api/auth";

export const Route = createFileRoute("/admin/profile")({
  head: () => ({ meta: [{ title: "My Profile — MyTijaara Admin" }, { name: "robots", content: "noindex" }] }),
  component: ProfilePage,
});

/** Message from an ApiError, preferring the first field-level validation error. */
function reason(err: unknown, fallback: string): string {
  if (err instanceof ApiError) return err.firstError;
  return err instanceof Error ? err.message : fallback;
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

function ProfilePage() {
  const [user, setUser] = useState<AuthenticatedUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await authApi.me();
      setUser(data);
    } catch (err) {
      setError(reason(err, "Could not load your profile."));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Your profile" description="Manage your personal details, security and preferences." />
        <div className="h-10 w-96 max-w-full animate-pulse rounded-lg bg-muted/60" />
        <div className="h-72 animate-pulse rounded-2xl border border-border/60 bg-card" />
      </div>
    );
  }

  if (error || !user) {
    return (
      <div className="space-y-6">
        <PageHeader title="Your profile" description="Manage your personal details, security and preferences." />
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center">
          <AlertTriangle className="mx-auto h-6 w-6 text-red-600" />
          <div className="mt-2 text-sm font-semibold text-red-900">{error ?? "Your profile is unavailable."}</div>
          <Button variant="outline" size="sm" className="mt-4" onClick={() => void load()}>
            <RefreshCw className="mr-2 h-4 w-4" /> Try again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Your profile" description="Manage your personal details, security and preferences." />
      <Tabs defaultValue="profile">
        <TabsList>
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
          <TabsTrigger value="2fa">2FA</TabsTrigger>
          <TabsTrigger value="sessions">Sessions</TabsTrigger>
          <TabsTrigger value="preferences">Preferences</TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="mt-4">
          <ProfileTab user={user} onSaved={setUser} />
        </TabsContent>
        <TabsContent value="security" className="mt-4">
          <SecurityTab />
        </TabsContent>
        <TabsContent value="2fa" className="mt-4">
          <TwoFactorTab user={user} onChanged={setUser} />
        </TabsContent>
        <TabsContent value="sessions" className="mt-4">
          <SessionsTab />
        </TabsContent>
        <TabsContent value="preferences" className="mt-4">
          <PreferencesTab user={user} onSaved={setUser} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Profile
// ---------------------------------------------------------------------------

function ProfileTab({
  user,
  onSaved,
}: {
  user: AuthenticatedUser;
  onSaved: (u: AuthenticatedUser) => void;
}) {
  const [form, setForm] = useState({
    name: user.name,
    email: user.email,
    phone: user.phone ?? "",
    location: user.location ?? "",
    bio: user.bio ?? "",
    avatarUrl: user.avatarUrl ?? "",
  });
  const [saving, setSaving] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);

  const dirty =
    form.name !== user.name ||
    form.email !== user.email ||
    form.phone !== (user.phone ?? "") ||
    form.location !== (user.location ?? "") ||
    form.bio !== (user.bio ?? "") ||
    form.avatarUrl !== (user.avatarUrl ?? "");

  const save = async () => {
    setSaving(true);
    try {
      const { data } = await authApi.updateProfile({
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim() || null,
        location: form.location.trim() || null,
        bio: form.bio.trim() || null,
        avatarUrl: form.avatarUrl.trim() || null,
      });
      onSaved(data);
      toast.success("Profile saved");
    } catch (err) {
      toast.error(reason(err, "Could not save your profile."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <SectionCard
      actions={
        <Button
          size="sm"
          className="bg-primary hover:bg-primary/90"
          disabled={saving || !dirty}
          title={dirty ? undefined : "No changes to save"}
          onClick={() => void save()}
        >
          {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
          {saving ? "Saving…" : "Save"}
        </Button>
      }
    >
      <div className="mb-6 flex items-center gap-4">
        {form.avatarUrl ? (
          <img
            src={form.avatarUrl}
            alt={user.name}
            className="h-16 w-16 rounded-2xl object-cover border border-border"
            onError={(e) => {
              e.currentTarget.style.display = "none";
            }}
          />
        ) : (
          <div className="grid h-16 w-16 place-items-center rounded-2xl bg-primary text-lg font-bold text-primary-foreground">
            {initials(form.name || user.name)}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <Label htmlFor="avatarUrl" className="text-xs">
            Avatar image URL
          </Label>
          <div className="mt-1.5 flex gap-2">
            <Input
              id="avatarUrl"
              placeholder="https://… or select from Media Library"
              value={form.avatarUrl}
              onChange={(e) => setForm((f) => ({ ...f, avatarUrl: e.target.value }))}
              className="flex-1"
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setPickerOpen(true)}
              className="gap-1.5 shrink-0"
            >
              <FolderOpen className="h-4 w-4" /> Media Library
            </Button>
          </div>
          <div className="mt-1 text-xs text-muted-foreground">
            Paste an image URL or choose/upload from the Media Library.
          </div>
        </div>
      </div>

      <MediaPickerModal
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        onSelect={(url) => setForm((f) => ({ ...f, avatarUrl: url }))}
        title="Select Avatar Image"
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="name">Full name</Label>
          <Input
            id="name"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            className="mt-1.5"
          />
        </div>
        <div>
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            value={form.email}
            onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
            className="mt-1.5"
          />
          {form.email !== user.email && (
            <div className="mt-1 text-xs text-amber-700">
              Changing your email clears its verified status.
            </div>
          )}
        </div>
        <div>
          <Label htmlFor="phone">Phone</Label>
          <Input
            id="phone"
            value={form.phone}
            onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
            className="mt-1.5"
          />
        </div>
        <div>
          <Label htmlFor="location">Location</Label>
          <Input
            id="location"
            value={form.location}
            onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
            className="mt-1.5"
          />
        </div>
      </div>
      <div className="mt-4">
        <Label htmlFor="bio">Bio</Label>
        <Textarea
          id="bio"
          rows={3}
          maxLength={1000}
          value={form.bio}
          onChange={(e) => setForm((f) => ({ ...f, bio: e.target.value }))}
          className="mt-1.5"
        />
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        <Badge variant="secondary">{user.role}</Badge>
        <span>·</span>
        <span>{user.permissions.length} permissions</span>
        {user.createdAt && (
          <>
            <span>·</span>
            <span>Joined {new Date(user.createdAt).toLocaleDateString()}</span>
          </>
        )}
      </div>
    </SectionCard>
  );
}

// ---------------------------------------------------------------------------
// Security
// ---------------------------------------------------------------------------

function SecurityTab() {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [saving, setSaving] = useState(false);

  const mismatch = confirm.length > 0 && next !== confirm;
  const ready = current.length > 0 && next.length >= 8 && next === confirm;

  const submit = async () => {
    setSaving(true);
    try {
      await authApi.changePassword({
        current_password: current,
        password: next,
        password_confirmation: confirm,
      });
      setCurrent("");
      setNext("");
      setConfirm("");
      // Every other token was revoked server-side, so say so.
      toast.success("Password updated. Other devices have been signed out.");
    } catch (err) {
      toast.error(reason(err, "Could not update your password."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <SectionCard title="Change password" description="Use a strong password you haven't used before">
      <div className="grid max-w-md gap-3">
        <div>
          <Label htmlFor="current">Current password</Label>
          <Input
            id="current"
            type="password"
            autoComplete="current-password"
            value={current}
            onChange={(e) => setCurrent(e.target.value)}
            className="mt-1.5"
          />
        </div>
        <div>
          <Label htmlFor="next">New password</Label>
          <Input
            id="next"
            type="password"
            autoComplete="new-password"
            value={next}
            onChange={(e) => setNext(e.target.value)}
            className="mt-1.5"
          />
          <div className="mt-1 text-xs text-muted-foreground">At least 8 characters.</div>
        </div>
        <div>
          <Label htmlFor="confirm">Confirm password</Label>
          <Input
            id="confirm"
            type="password"
            autoComplete="new-password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            className="mt-1.5"
          />
          {mismatch && <div className="mt-1 text-xs text-red-600">The two passwords do not match.</div>}
        </div>
        <Button
          className="mt-2 bg-primary hover:bg-primary/90"
          disabled={saving || !ready}
          onClick={() => void submit()}
        >
          {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Key className="mr-2 h-4 w-4" />}
          {saving ? "Updating…" : "Update password"}
        </Button>
        <p className="text-xs text-muted-foreground">
          Changing your password signs out every other device. This session stays active.
        </p>
      </div>
    </SectionCard>
  );
}

// ---------------------------------------------------------------------------
// Two-factor
// ---------------------------------------------------------------------------

function TwoFactorTab({
  user,
  onChanged,
}: {
  user: AuthenticatedUser;
  onChanged: (u: AuthenticatedUser) => void;
}) {
  const [setup, setSetup] = useState<TwoFactorSetup | null>(null);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [disableOpen, setDisableOpen] = useState(false);
  const [password, setPassword] = useState("");
  /** Freshly issued codes, shown once. Never fetched back from the server. */
  const [freshCodes, setFreshCodes] = useState<string[] | null>(null);

  const start = async () => {
    setBusy(true);
    try {
      const { data } = await authApi.twoFactor.start();
      setSetup(data);
      setFreshCodes(data.recoveryCodes);
    } catch (err) {
      toast.error(reason(err, "Could not start two-factor setup."));
    } finally {
      setBusy(false);
    }
  };

  const confirm = async () => {
    setBusy(true);
    try {
      const { data } = await authApi.twoFactor.confirm(code.trim());
      onChanged(data);
      setSetup(null);
      setCode("");
      toast.success("Two-factor authentication is on");
    } catch (err) {
      toast.error(reason(err, "That code did not match."));
    } finally {
      setBusy(false);
    }
  };

  const disable = async () => {
    setBusy(true);
    try {
      const { data } = await authApi.twoFactor.disable(password);
      onChanged(data);
      setDisableOpen(false);
      setPassword("");
      setFreshCodes(null);
      toast.success("Two-factor authentication is off");
    } catch (err) {
      toast.error(reason(err, "Could not turn off two-factor authentication."));
    } finally {
      setBusy(false);
    }
  };

  const reissue = async () => {
    setBusy(true);
    try {
      const { data } = await authApi.twoFactor.regenerateCodes();
      setFreshCodes(data.recoveryCodes);
      const { data: me } = await authApi.me();
      onChanged(me);
      toast.success("New recovery codes issued. The old ones no longer work.");
    } catch (err) {
      toast.error(reason(err, "Could not issue new recovery codes."));
    } finally {
      setBusy(false);
    }
  };

  // Mid-enrolment: a secret exists, waiting on a valid code.
  if (setup) {
    return (
      <SectionCard
        title="Finish two-factor setup"
        description="Scan the code with your authenticator app, then enter the 6 digits it shows"
      >
        <div className="grid gap-6 md:grid-cols-[220px_1fr]">
          <div className="rounded-xl border border-border/60 bg-white p-3">
            {/* Inline SVG from the backend: the QR is never fetched from a third party. */}
            <div className="[&_svg]:h-full [&_svg]:w-full" dangerouslySetInnerHTML={{ __html: setup.qrSvg }} />
          </div>
          <div>
            <Label className="text-xs">Can't scan? Enter this key manually</Label>
            <div className="mt-1.5 flex items-center gap-2">
              <code className="flex-1 truncate rounded-lg bg-muted/50 px-3 py-2 font-mono text-xs">
                {setup.secret}
              </code>
              <CopyButton value={setup.secret} label="setup key" />
            </div>

            <div className="mt-4 max-w-xs">
              <Label htmlFor="totp">Authentication code</Label>
              <Input
                id="totp"
                inputMode="numeric"
                autoComplete="one-time-code"
                placeholder="123456"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="mt-1.5 font-mono tracking-[0.3em]"
              />
            </div>
            <div className="mt-4 flex gap-2">
              <Button
                className="bg-primary hover:bg-primary/90"
                disabled={busy || code.trim().length < 6}
                onClick={() => void confirm()}
              >
                {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Shield className="mr-2 h-4 w-4" />}
                Turn on 2FA
              </Button>
              <Button variant="outline" disabled={busy} onClick={() => setSetup(null)}>
                Cancel
              </Button>
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              2FA is not enforced until a valid code confirms it, so you cannot lock yourself out here.
            </p>
          </div>
        </div>

        {freshCodes && <RecoveryCodes codes={freshCodes} />}
      </SectionCard>
    );
  }

  return (
    <SectionCard title="Two-factor authentication" description="Add an extra layer of security to your account">
      {user.twoFactorEnabled ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-100 text-emerald-700">
              <Shield className="h-5 w-5" />
            </div>
            <div>
              <div className="text-sm font-semibold">Authenticator app enabled</div>
              <div className="text-xs text-emerald-700">
                {user.recoveryCodesRemaining} recovery code
                {user.recoveryCodesRemaining === 1 ? "" : "s"} remaining
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={busy} onClick={() => void reissue()}>
              <RefreshCw className="mr-2 h-3.5 w-3.5" /> New recovery codes
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="text-red-600"
              disabled={busy}
              onClick={() => setDisableOpen(true)}
            >
              <ShieldOff className="mr-2 h-3.5 w-3.5" /> Turn off
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border/60 p-4">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-muted text-muted-foreground">
              <ShieldOff className="h-5 w-5" />
            </div>
            <div>
              <div className="text-sm font-semibold">
                {user.twoFactorPending ? "Setup started but not finished" : "Not enabled"}
              </div>
              <div className="text-xs text-muted-foreground">
                Use any TOTP app: Google Authenticator, 1Password, Authy.
              </div>
            </div>
          </div>
          <Button className="bg-primary hover:bg-primary/90" size="sm" disabled={busy} onClick={() => void start()}>
            {busy ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> : <Shield className="mr-2 h-3.5 w-3.5" />}
            {user.twoFactorPending ? "Restart setup" : "Set up 2FA"}
          </Button>
        </div>
      )}

      {user.twoFactorEnabled && freshCodes && <RecoveryCodes codes={freshCodes} />}

      {user.twoFactorEnabled && !freshCodes && (
        <p className="mt-3 text-xs text-muted-foreground">
          Recovery codes are shown only when they are issued. If you have lost them, generate a new set.
        </p>
      )}

      <Dialog open={disableOpen} onOpenChange={setDisableOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Turn off two-factor authentication?</DialogTitle>
            <DialogDescription>
              Your account will be protected by your password alone. Confirm with your password.
            </DialogDescription>
          </DialogHeader>
          <div>
            <Label htmlFor="disable-password">Password</Label>
            <Input
              id="disable-password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1.5"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDisableOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={busy || password.length === 0}
              onClick={() => void disable()}
            >
              {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null} Turn off 2FA
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SectionCard>
  );
}

function RecoveryCodes({ codes }: { codes: string[] }) {
  return (
    <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50/60 p-4">
      <div className="text-sm font-semibold">Recovery codes</div>
      <div className="mt-1 text-xs text-amber-800">
        Shown once. Store them somewhere safe: each works a single time, and no endpoint can return them again.
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2 font-mono text-xs sm:grid-cols-4">
        {codes.map((c) => (
          <div key={c} className="rounded-lg bg-white/70 px-3 py-2">
            {c}
          </div>
        ))}
      </div>
      <div className="mt-3">
        <CopyButton value={codes.join("\n")} label="recovery codes" />
      </div>
    </div>
  );
}

function CopyButton({ value, label }: { value: string; label: string }) {
  const [done, setDone] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setDone(true);
      setTimeout(() => setDone(false), 2000);
    } catch {
      toast.error("Your browser blocked clipboard access. Select the text and copy it manually.");
    }
  };
  return (
    <Button variant="outline" size="sm" onClick={() => void copy()}>
      {done ? <Check className="mr-2 h-3.5 w-3.5" /> : <Copy className="mr-2 h-3.5 w-3.5" />}
      {done ? "Copied" : `Copy ${label}`}
    </Button>
  );
}

// ---------------------------------------------------------------------------
// Sessions
// ---------------------------------------------------------------------------

function SessionsTab() {
  const [sessions, setSessions] = useState<AdminSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await authApi.sessions.list();
      setSessions(data);
    } catch (err) {
      setError(reason(err, "Could not load your sessions."));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const revoke = async (id: string) => {
    setBusyId(id);
    try {
      await authApi.sessions.revoke(id);
      setSessions((prev) => prev.filter((s) => s.id !== id));
      toast.success("Session signed out");
    } catch (err) {
      toast.error(reason(err, "Could not sign that session out."));
    } finally {
      setBusyId(null);
    }
  };

  const revokeOthers = async () => {
    setBusyId("others");
    try {
      const { data } = await authApi.sessions.revokeOthers();
      toast.success(`Signed out of ${data.revoked} other session${data.revoked === 1 ? "" : "s"}`);
      await load();
    } catch (err) {
      toast.error(reason(err, "Could not sign out the other sessions."));
    } finally {
      setBusyId(null);
    }
  };

  const others = sessions.filter((s) => !s.current).length;

  return (
    <SectionCard
      title="Active sessions"
      description="Every access token issued to your account. Sign out of anything you don't recognise."
      actions={
        <Button
          variant="outline"
          size="sm"
          className="text-red-600"
          disabled={busyId !== null || others === 0}
          title={others === 0 ? "No other sessions" : undefined}
          onClick={() => void revokeOthers()}
        >
          {busyId === "others" ? (
            <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
          ) : (
            <LogOut className="mr-2 h-3.5 w-3.5" />
          )}
          Sign out others
        </Button>
      }
    >
      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-16 animate-pulse rounded-xl border border-border/60 bg-muted/30" />
          ))}
        </div>
      ) : error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-center text-sm text-red-900">
          {error}
          <div className="mt-3">
            <Button variant="outline" size="sm" onClick={() => void load()}>
              <RefreshCw className="mr-2 h-3.5 w-3.5" /> Retry
            </Button>
          </div>
        </div>
      ) : sessions.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border/70 bg-muted/20 p-6 text-center text-sm text-muted-foreground">
          No active tokens. This can happen when you are signed in through a browser session rather than a token.
        </div>
      ) : (
        <div className="space-y-2">
          {sessions.map((s) => {
            const Icon = /iPhone|Android|iPad/.test(s.device) ? Smartphone : Monitor;
            return (
              <div key={s.id} className="flex items-center gap-3 rounded-xl border border-border/60 p-3">
                <div className="grid h-9 w-9 place-items-center rounded-lg bg-muted">
                  <Icon className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2 text-sm font-medium">
                    {s.device}
                    {s.current && <Badge className="bg-emerald-50 text-emerald-700">Current</Badge>}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {s.ip ?? "IP not recorded"}
                    {s.lastUsedAt ? ` · last used ${new Date(s.lastUsedAt).toLocaleString()}` : " · never used"}
                  </div>
                </div>
                {!s.current && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-red-600"
                    disabled={busyId !== null}
                    onClick={() => void revoke(s.id)}
                  >
                    {busyId === s.id ? (
                      <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                    ) : (
                      <LogOut className="mr-1 h-3 w-3" />
                    )}
                    Sign out
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </SectionCard>
  );
}

// ---------------------------------------------------------------------------
// Preferences
// ---------------------------------------------------------------------------

const PREFERENCE_FIELDS: {
  key: keyof NotificationPreferences;
  label: string;
  desc: string;
}[] = [
  { key: "weeklyDigest", label: "Email me the weekly digest", desc: "A summary of signups and referrals" },
  { key: "campaignReports", label: "Email me campaign reports", desc: "After every send finishes" },
  { key: "signupAlerts", label: "Notify me of new signups", desc: "One notification per waitlist join" },
  { key: "productUpdates", label: "Product updates", desc: "News about the admin panel" },
];

function PreferencesTab({
  user,
  onSaved,
}: {
  user: AuthenticatedUser;
  onSaved: (u: AuthenticatedUser) => void;
}) {
  const [preferences, setPreferences] = useState<NotificationPreferences>(
    user.preferences ?? {
      weeklyDigest: true,
      campaignReports: true,
      signupAlerts: false,
      productUpdates: true,
    }
  );
  const [busyKey, setBusyKey] = useState<string | null>(null);

  useEffect(() => {
    if (user.preferences) {
      setPreferences(user.preferences);
    }
  }, [user.preferences]);

  const toggle = async (key: keyof NotificationPreferences, value: boolean) => {
    const updated = { ...preferences, [key]: value };
    setPreferences(updated);
    setBusyKey(key);
    try {
      const { data } = await authApi.updateProfile({ preferences: updated });
      onSaved(data);
      if (data.preferences) {
        setPreferences(data.preferences);
      }
      toast.success("Preference updated");
    } catch (err) {
      setPreferences(preferences);
      toast.error(reason(err, "Could not save that preference."));
    } finally {
      setBusyKey(null);
    }
  };

  return (
    <SectionCard title="Preferences">
      <ThemePicker />
      <div className="mt-4 space-y-3">
        {PREFERENCE_FIELDS.map((p) => (
          <div key={p.key} className="flex items-center justify-between rounded-lg border border-border/60 p-3">
            <div>
              <div className="text-sm font-medium">{p.label}</div>
              <div className="text-xs text-muted-foreground">{p.desc}</div>
            </div>
            <div className="flex items-center gap-2">
              {busyKey === p.key && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />}
              <Switch
                checked={Boolean(preferences[p.key])}
                disabled={busyKey !== null}
                onCheckedChange={(v) => void toggle(p.key, v)}
              />
            </div>
          </div>
        ))}
      </div>
      <p className="mt-3 text-xs text-muted-foreground">
        Each toggle saves as you change it. Appearance is stored on this device only.
      </p>
    </SectionCard>
  );
}

function ThemePicker() {
  const [theme, setThemeState] = useState<Theme>("light");
  useEffect(() => {
    setThemeState(getStoredTheme());
  }, []);
  const pick = (t: Theme) => {
    setTheme(t);
    setThemeState(t);
    toast.success(`Theme set to ${t}`);
  };
  const opts: { value: Theme; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { value: "light", label: "Light", icon: Sun },
    { value: "dark", label: "Dark", icon: Moon },
    { value: "system", label: "System", icon: MonitorIcon },
  ];
  return (
    <div className="rounded-xl border border-border/60 p-4">
      <div className="mb-3">
        <div className="text-sm font-medium">Appearance</div>
        <div className="text-xs text-muted-foreground">Choose how the admin looks on this device.</div>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {opts.map((o) => {
          const active = theme === o.value;
          return (
            <button
              key={o.value}
              onClick={() => pick(o.value)}
              className={
                "flex flex-col items-center gap-1.5 rounded-lg border p-3 text-xs font-medium transition-colors " +
                (active ? "border-primary bg-primary/5 text-primary" : "border-border/60 hover:bg-muted/50")
              }
            >
              <o.icon className="h-4 w-4" />
              {o.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
