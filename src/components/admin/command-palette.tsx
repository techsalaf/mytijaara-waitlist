import { useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command";
import {
  LayoutDashboard, Users, Award, FileText, Image as ImageIcon, Mail, BarChart3,
  Shield, Settings, Bell, ScrollText, HeartPulse, UserCircle2, LogOut, Sun, Moon,
  Plus, Download, Timer,
} from "lucide-react";
import { signOut } from "@/lib/auth";
import { setTheme, getStoredTheme } from "@/lib/theme";
import { toast } from "sonner";

type Item = {
  label: string;
  to?: string;
  icon: React.ComponentType<{ className?: string }>;
  onSelect?: () => void;
  shortcut?: string;
  group: "Navigate" | "Actions" | "Preferences";
  keywords?: string;
};

export function CommandPalette({
  open, onOpenChange,
}: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const navigate = useNavigate();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        onOpenChange(!open);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onOpenChange]);

  const go = (to: string) => {
    onOpenChange(false);
    navigate({ to });
  };

  const items: Item[] = [
    { group: "Navigate", label: "Dashboard", icon: LayoutDashboard, onSelect: () => go("/admin"), keywords: "home overview" },
    { group: "Navigate", label: "Analytics", icon: BarChart3, onSelect: () => go("/admin/analytics") },
    { group: "Navigate", label: "Waitlist", icon: Users, onSelect: () => go("/admin/waitlist"), keywords: "signups users" },
    { group: "Navigate", label: "Referrals", icon: Award, onSelect: () => go("/admin/referrals") },
    { group: "Navigate", label: "Email Marketing", icon: Mail, onSelect: () => go("/admin/email"), keywords: "campaigns newsletters" },
    { group: "Navigate", label: "CMS", icon: FileText, onSelect: () => go("/admin/cms") },
    { group: "Navigate", label: "Media Library", icon: ImageIcon, onSelect: () => go("/admin/media") },
    { group: "Navigate", label: "Users & Team", icon: UserCircle2, onSelect: () => go("/admin/users") },
    { group: "Navigate", label: "Roles & Permissions", icon: Shield, onSelect: () => go("/admin/roles") },
    { group: "Navigate", label: "Notifications", icon: Bell, onSelect: () => go("/admin/notifications") },
    { group: "Navigate", label: "Audit Logs", icon: ScrollText, onSelect: () => go("/admin/audit-logs") },
    { group: "Navigate", label: "System Health", icon: HeartPulse, onSelect: () => go("/admin/system-health") },
    { group: "Navigate", label: "Cron Setup", icon: Timer, onSelect: () => go("/admin/cron-setup"), keywords: "scheduler reminders cpanel cron job verification" },
    { group: "Navigate", label: "Settings", icon: Settings, onSelect: () => go("/admin/settings") },
    { group: "Navigate", label: "My Profile", icon: UserCircle2, onSelect: () => go("/admin/profile") },

    { group: "Actions", label: "New waitlist user", icon: Plus, onSelect: () => { onOpenChange(false); toast.success("Opening new user form…"); go("/admin/waitlist"); } },
    { group: "Actions", label: "Export waitlist CSV", icon: Download, onSelect: () => { onOpenChange(false); go("/admin/waitlist"); toast.success("Tip: use the Export button on the toolbar."); } },
    { group: "Actions", label: "Sign out", icon: LogOut, onSelect: () => { signOut(); onOpenChange(false); navigate({ to: "/auth/login" }); } },

    { group: "Preferences", label: "Switch to light mode", icon: Sun, onSelect: () => { setTheme("light"); onOpenChange(false); toast.success("Light mode on"); } },
    { group: "Preferences", label: "Switch to dark mode", icon: Moon, onSelect: () => { setTheme("dark"); onOpenChange(false); toast.success("Dark mode on"); } },
    { group: "Preferences", label: `Use system theme (current: ${getStoredTheme()})`, icon: Settings, onSelect: () => { setTheme("system"); onOpenChange(false); toast.success("Using system theme"); } },
  ];

  const grouped = items.reduce<Record<string, Item[]>>((acc, it) => {
    (acc[it.group] ||= []).push(it);
    return acc;
  }, {});

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput placeholder="Jump to a page, run an action…" />
      <CommandList>
        <CommandEmpty>No matches found.</CommandEmpty>
        {Object.entries(grouped).map(([group, list], idx) => (
          <div key={group}>
            {idx > 0 && <CommandSeparator />}
            <CommandGroup heading={group}>
              {list.map((it) => (
                <CommandItem
                  key={it.label}
                  value={`${it.label} ${it.keywords ?? ""}`}
                  onSelect={() => it.onSelect?.()}
                >
                  <it.icon className="mr-2 h-4 w-4 text-muted-foreground" />
                  <span>{it.label}</span>
                  {it.shortcut && <CommandShortcut>{it.shortcut}</CommandShortcut>}
                </CommandItem>
              ))}
            </CommandGroup>
          </div>
        ))}
      </CommandList>
    </CommandDialog>
  );
}
