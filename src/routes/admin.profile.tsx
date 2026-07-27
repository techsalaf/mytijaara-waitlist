import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { PageHeader, SectionCard } from "@/components/admin/ui-bits";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Save, Shield, Smartphone, Monitor, Monitor as MonitorIcon, LogOut, Key, Sun, Moon } from "lucide-react";
import { toast } from "sonner";
import { getStoredTheme, setTheme, type Theme } from "@/lib/theme";

export const Route = createFileRoute("/admin/profile")({
  head: () => ({ meta: [{ title: "My Profile — MyTijaara Admin" }, { name: "robots", content: "noindex" }] }),
  component: ProfilePage,
});

function ProfilePage() {
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
          <SectionCard actions={<Button size="sm" className="bg-primary hover:bg-primary/90" onClick={() => toast.success("Saved")}><Save className="mr-2 h-4 w-4" /> Save</Button>}>
            <div className="mb-6 flex items-center gap-4">
              <div className="grid h-16 w-16 place-items-center rounded-2xl bg-primary text-lg font-bold text-white">AO</div>
              <div>
                <Button variant="outline" size="sm">Change photo</Button>
                <div className="mt-1 text-xs text-muted-foreground">JPG or PNG, max 2MB</div>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div><Label>Full name</Label><Input defaultValue="Adaeze Okafor" className="mt-1.5" /></div>
              <div><Label>Email</Label><Input defaultValue="adaeze@mytijaara.com" className="mt-1.5" /></div>
              <div><Label>Phone</Label><Input defaultValue="+234 803 555 0198" className="mt-1.5" /></div>
              <div><Label>Location</Label><Input defaultValue="Lagos, Nigeria" className="mt-1.5" /></div>
            </div>
            <div className="mt-4"><Label>Bio</Label><Textarea rows={3} defaultValue="Head of Product at MyTijaara. Building the everything app for Nigeria." className="mt-1.5" /></div>
          </SectionCard>
        </TabsContent>

        <TabsContent value="security" className="mt-4">
          <SectionCard title="Change password" description="Use a strong password you haven't used before">
            <div className="grid max-w-md gap-3">
              <div><Label>Current password</Label><Input type="password" className="mt-1.5" /></div>
              <div><Label>New password</Label><Input type="password" className="mt-1.5" /></div>
              <div><Label>Confirm password</Label><Input type="password" className="mt-1.5" /></div>
              <Button className="mt-2 bg-primary hover:bg-primary/90" onClick={() => toast.success("Password updated")}><Key className="mr-2 h-4 w-4" /> Update password</Button>
            </div>
          </SectionCard>
        </TabsContent>

        <TabsContent value="2fa" className="mt-4">
          <SectionCard title="Two-factor authentication" description="Add an extra layer of security to your account">
            <div className="flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50 p-4">
              <div className="flex items-center gap-3">
                <div className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-100 text-emerald-700"><Shield className="h-5 w-5" /></div>
                <div>
                  <div className="font-semibold text-sm">Authenticator app enabled</div>
                  <div className="text-xs text-emerald-700">Google Authenticator · Set up June 2, 2026</div>
                </div>
              </div>
              <Button variant="outline" size="sm">Reconfigure</Button>
            </div>
            <div className="mt-3 rounded-xl border border-border/60 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-semibold text-sm">SMS backup</div>
                  <div className="text-xs text-muted-foreground">Get codes via text</div>
                </div>
                <Switch />
              </div>
            </div>
            <div className="mt-3 rounded-xl border border-border/60 p-4">
              <div className="font-semibold text-sm">Recovery codes</div>
              <div className="mt-1 text-xs text-muted-foreground">Store these somewhere safe. Each can be used once.</div>
              <div className="mt-3 grid grid-cols-2 gap-2 font-mono text-xs">
                {["8f2a-91bc", "7c3d-4e8a", "b9d1-6f22", "2a8e-c4d5", "51fa-8827", "e7b3-9c14"].map((c) => (
                  <div key={c} className="rounded-lg bg-muted/40 px-3 py-2">{c}</div>
                ))}
              </div>
            </div>
          </SectionCard>
        </TabsContent>

        <TabsContent value="sessions" className="mt-4">
          <SectionCard title="Active sessions" description="Sign out of devices you don't recognize">
            <div className="space-y-2">
              {[
                { device: "MacBook Pro · Chrome", location: "Lagos, Nigeria", ip: "102.89.34.12", current: true, icon: Monitor },
                { device: "iPhone 15 · Safari", location: "Lagos, Nigeria", ip: "197.210.44.5", current: false, icon: Smartphone },
                { device: "iPad · Safari", location: "Abuja, Nigeria", ip: "154.113.22.8", current: false, icon: Monitor },
              ].map((s, i) => (
                <div key={i} className="flex items-center gap-3 rounded-xl border border-border/60 p-3">
                  <div className="grid h-9 w-9 place-items-center rounded-lg bg-muted"><s.icon className="h-4 w-4" /></div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 text-sm font-medium">{s.device}{s.current && <Badge className="bg-emerald-50 text-emerald-700">Current</Badge>}</div>
                    <div className="text-xs text-muted-foreground">{s.location} · {s.ip}</div>
                  </div>
                  {!s.current && <Button variant="outline" size="sm" className="text-red-600"><LogOut className="mr-1 h-3 w-3" /> Sign out</Button>}
                </div>
              ))}
            </div>
          </SectionCard>
        </TabsContent>

        <TabsContent value="preferences" className="mt-4">
          <SectionCard title="Preferences">
            <ThemePicker />
            <div className="mt-4 space-y-3">
              {[
                { label: "Email me weekly digest", desc: "Every Monday morning", on: true },
                { label: "Email me campaign reports", desc: "After every send finishes", on: true },
                { label: "Notify me of new signups", desc: "Real-time browser push", on: false },
                { label: "Product updates", desc: "News about the admin panel", on: true },
              ].map((p, i) => (
                <div key={i} className="flex items-center justify-between rounded-lg border border-border/60 p-3">
                  <div>
                    <div className="text-sm font-medium">{p.label}</div>
                    <div className="text-xs text-muted-foreground">{p.desc}</div>
                  </div>
                  <Switch defaultChecked={p.on} />
                </div>
              ))}
            </div>
          </SectionCard>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function ThemePicker() {
  const [theme, setThemeState] = useState<Theme>("light");
  useEffect(() => { setThemeState(getStoredTheme()); }, []);
  const pick = (t: Theme) => { setTheme(t); setThemeState(t); toast.success(`Theme set to ${t}`); };
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

