import { Link, Outlet, useRouterState, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  LayoutDashboard, Users, Award, FileText, Image as ImageIcon, Mail, BarChart3,
  Shield, Settings, Bell, ScrollText, HeartPulse, UserCircle2, ChevronDown,
  Search, LogOut, Menu, Sparkles,
} from "lucide-react";
import { getSession, signOut, type AdminSession } from "@/lib/auth-mock";
import { notifications } from "@/lib/mock-data";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { CommandPalette } from "./command-palette";
import { AdminSkeleton } from "./admin-skeleton";
import { initTheme } from "@/lib/theme";

import { cn } from "@/lib/utils";

type NavItem = { label: string; to: string; icon: React.ComponentType<{ className?: string }>; badge?: string };
type NavGroup = { label: string; items: NavItem[] };

const nav: NavGroup[] = [
  {
    label: "Overview",
    items: [
      { label: "Dashboard", to: "/admin", icon: LayoutDashboard },
      { label: "Analytics", to: "/admin/analytics", icon: BarChart3 },
    ],
  },
  {
    label: "Growth",
    items: [
      { label: "Waitlist", to: "/admin/waitlist", icon: Users, badge: "247" },
      { label: "Referrals", to: "/admin/referrals", icon: Award },
      { label: "Email Marketing", to: "/admin/email", icon: Mail },
    ],
  },
  {
    label: "Content",
    items: [
      { label: "CMS", to: "/admin/cms", icon: FileText },
      { label: "Media Library", to: "/admin/media", icon: ImageIcon },
    ],
  },
  {
    label: "System",
    items: [
      { label: "Users", to: "/admin/users", icon: UserCircle2 },
      { label: "Roles & Permissions", to: "/admin/roles", icon: Shield },
      { label: "Notifications", to: "/admin/notifications", icon: Bell },
      { label: "Audit Logs", to: "/admin/audit-logs", icon: ScrollText },
      { label: "System Health", to: "/admin/system-health", icon: HeartPulse },
      { label: "Settings", to: "/admin/settings", icon: Settings },
    ],
  },
];

export function AdminShell() {
  const [session, setSession] = useState<AdminSession | null>(null);
  const [checked, setChecked] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => {
    initTheme();
    const s = getSession();
    if (!s) {
      navigate({ to: "/auth/login" });
    } else {
      setSession(s);
    }
    setChecked(true);
  }, [navigate]);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  if (!checked || !session) {
    return <AdminSkeleton />;
  }

  const handleSignOut = () => {
    signOut();
    navigate({ to: "/auth/login" });
  };

  const unreadCount = notifications.filter((n) => n.unread).length;
  const isMac = typeof navigator !== "undefined" && /mac/i.test(navigator.platform);

  return (
    <div className="flex min-h-screen bg-[#F8FAF8] dark:bg-neutral-950">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex lg:w-64 lg:flex-col lg:fixed lg:inset-y-0 lg:z-30 border-r border-border/60 bg-white dark:bg-neutral-900">
        <SidebarContent pathname={pathname} />
      </aside>

      {/* Mobile sidebar */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="w-72 p-0">
          <SidebarContent pathname={pathname} />
        </SheetContent>
      </Sheet>

      <div className="flex-1 lg:pl-64 flex flex-col min-w-0">
        {/* Topbar */}
        <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-border/60 bg-white/80 px-4 backdrop-blur-md lg:px-6 dark:bg-neutral-900/80">
          <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setMobileOpen(true)}>
            <Menu className="h-5 w-5" />
          </Button>

          <button
            onClick={() => setPaletteOpen(true)}
            className="group relative flex h-9 w-full max-w-md items-center gap-2 rounded-md bg-muted/40 px-3 text-left text-sm text-muted-foreground transition-colors hover:bg-muted/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0D7A46]/40"
          >
            <Search className="h-4 w-4" />
            <span className="hidden sm:inline">Search or jump to…</span>
            <span className="inline sm:hidden">Search</span>
            <kbd className="ml-auto hidden items-center gap-0.5 rounded border border-border bg-white px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground shadow-sm sm:inline-flex dark:bg-neutral-800">
              {isMac ? "⌘" : "Ctrl"}<span>K</span>
            </kbd>
          </button>

          <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="relative">
                  <Bell className="h-5 w-5" />
                  {unreadCount > 0 && (
                    <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-[#D4A017]" />
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-80">
                <DropdownMenuLabel className="flex items-center justify-between">
                  <span>Notifications</span>
                  <Link to="/admin/notifications" className="text-xs font-normal text-[#0D7A46] hover:underline">
                    View all
                  </Link>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                {notifications.slice(0, 4).map((n) => (
                  <DropdownMenuItem key={n.id} className="flex flex-col items-start gap-0.5 py-2.5">
                    <div className="flex w-full items-center gap-2">
                      <span className="text-sm font-medium">{n.title}</span>
                      {n.unread && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-[#D4A017]" />}
                    </div>
                    <span className="text-xs text-muted-foreground line-clamp-1">{n.body}</span>
                    <span className="text-[10px] text-muted-foreground">{n.time}</span>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2 rounded-full py-1 pl-1 pr-3 hover:bg-muted/60">
                  <div className="grid h-8 w-8 place-items-center rounded-full bg-[#0D7A46] text-xs font-semibold text-white">
                    {session.avatar}
                  </div>
                  <span className="hidden text-sm font-medium sm:inline">{session.name.split(" ")[0]}</span>
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  <div className="flex flex-col">
                    <span className="text-sm font-medium">{session.name}</span>
                    <span className="text-xs text-muted-foreground">{session.email}</span>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setPaletteOpen(true)}>
                  <Search className="mr-2 h-4 w-4" /> Command palette
                  <span className="ml-auto text-[10px] text-muted-foreground">{isMac ? "⌘K" : "Ctrl K"}</span>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/admin/profile"><UserCircle2 className="mr-2 h-4 w-4" /> Profile</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/admin/settings"><Settings className="mr-2 h-4 w-4" /> Settings</Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut} className="text-destructive focus:text-destructive">
                  <LogOut className="mr-2 h-4 w-4" /> Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        <main className="flex-1 p-4 lg:p-8">
          <Outlet />
        </main>
      </div>

      <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} />
    </div>
  );
}

function SidebarContent({ pathname }: { pathname: string }) {
  return (
    <div className="flex h-full flex-col">
      <div className="flex h-16 items-center gap-2 border-b border-border/60 px-5">
        <div className="grid h-9 w-9 place-items-center rounded-xl bg-[#0D7A46] text-white">
          <Sparkles className="h-4 w-4" />
        </div>
        <div className="flex flex-col leading-tight">
          <span className="text-sm font-bold tracking-tight">MyTijaara</span>
          <span className="text-[10px] font-medium uppercase tracking-widest text-[#D4A017]">Admin</span>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4">
        {nav.map((group) => (
          <div key={group.label} className="mb-4">
            <div className="mb-1 px-3 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70">
              {group.label}
            </div>
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const active =
                  item.to === "/admin"
                    ? pathname === "/admin"
                    : pathname === item.to || pathname.startsWith(item.to + "/");
                const Icon = item.icon;
                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                      active
                        ? "bg-[#0D7A46] text-white shadow-sm"
                        : "text-foreground/70 hover:bg-muted hover:text-foreground",
                    )}
                  >
                    <Icon className={cn("h-4 w-4 shrink-0", active ? "text-white" : "text-muted-foreground")} />
                    <span className="flex-1 truncate">{item.label}</span>
                    {item.badge && (
                      <Badge
                        variant="secondary"
                        className={cn(
                          "h-5 px-1.5 text-[10px] font-semibold",
                          active ? "bg-white/20 text-white" : "bg-[#0D7A46]/10 text-[#0D7A46]",
                        )}
                      >
                        {item.badge}
                      </Badge>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="border-t border-border/60 p-4">
        <div className="rounded-xl bg-gradient-to-br from-[#0D7A46] to-[#166534] p-4 text-white">
          <div className="mb-1 text-xs font-semibold uppercase tracking-wider text-[#D4A017]">Pro tip</div>
          <div className="text-sm font-medium leading-snug">Press <kbd className="rounded bg-white/20 px-1 font-mono">⌘K</kbd> anywhere to jump.</div>
        </div>
      </div>
    </div>
  );
}
