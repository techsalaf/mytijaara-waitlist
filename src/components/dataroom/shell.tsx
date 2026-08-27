/**
 * Workspace chrome: shell, header, sidebar, breadcrumbs.
 *
 * The shell owns the one folder fetch. The sidebar needs the category list and so
 * does the dashboard, and the visitor endpoint returns the whole tree in one
 * call, so fetching it twice would double the work and let the two views disagree
 * with each other. Children read it through `useDataRoomFolders()`.
 *
 * Every category the room has is listed, reachable or not. That is deliberate:
 * the shape of the room is not a secret, its contents are. A category this grant
 * cannot open is rendered as plain text with a padlock and no link.
 */

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import {
  ChevronRight,
  Folder,
  LayoutDashboard,
  Lock,
  LogOut,
  Menu,
  Search,
  ScrollText,
  Sparkles,
  Loader2,
} from "lucide-react";
import { dataRoomApi, type DataRoomFolderCard } from "@/lib/api/dataroom";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useDataRoomSession } from "./session";
import { AccessExpiryBadge } from "./cards";

// -- folder context ---------------------------------------------------------

type FoldersState = {
  folders: DataRoomFolderCard[];
  loading: boolean;
  error: string | null;
  reload: () => Promise<void>;
};

const FoldersContext = createContext<FoldersState | null>(null);

export function useDataRoomFolders(): FoldersState {
  const context = useContext(FoldersContext);
  if (!context) throw new Error("useDataRoomFolders must be used inside <DataRoomShell>.");
  return context;
}

// -- shell ------------------------------------------------------------------

export function DataRoomShell({ children }: { children: React.ReactNode }) {
  const { visitor, loading: sessionLoading, handleError } = useDataRoomSession();
  const [folders, setFolders] = useState<DataRoomFolderCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setFolders(await dataRoomApi.folders());
    } catch (caught) {
      // A dead session is the session provider's problem, not this component's.
      if (!handleError(caught)) {
        setError("We could not load the data room. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  }, [handleError]);

  useEffect(() => {
    if (!visitor) return;
    void reload();
  }, [visitor, reload]);

  if (sessionLoading || !visitor) {
    return <WorkspaceSkeleton />;
  }

  return (
    <FoldersContext.Provider value={{ folders, loading, error, reload }}>
      <div className="flex min-h-screen bg-[var(--surface,theme(colors.background))]">
        <aside className="hidden lg:fixed lg:inset-y-0 lg:z-30 lg:flex lg:w-72 lg:flex-col border-r border-border/60 bg-card">
          <DataRoomSidebar folders={folders} loading={loading} />
        </aside>

        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetContent side="left" className="w-80 p-0">
            <DataRoomSidebar
              folders={folders}
              loading={loading}
              onNavigate={() => setMobileOpen(false)}
            />
          </SheetContent>
        </Sheet>

        <div className="flex min-w-0 flex-1 flex-col lg:pl-72">
          <DataRoomHeader onOpenNav={() => setMobileOpen(true)} />
          <main className="flex-1 p-4 lg:p-8">
            {error ? (
              <div
                role="alert"
                className="rounded-2xl border border-destructive/30 bg-destructive/5 p-6 text-sm"
              >
                <p className="font-medium text-destructive">{error}</p>
                <Button variant="outline" size="sm" className="mt-3" onClick={() => void reload()}>
                  Try again
                </Button>
              </div>
            ) : (
              children
            )}
          </main>
          <footer className="border-t border-border/60 px-4 py-4 text-xs text-muted-foreground lg:px-8">
            Confidential. Shared with {visitor.email} for evaluation purposes only. Views and
            downloads are logged.
          </footer>
        </div>
      </div>
    </FoldersContext.Provider>
  );
}

// -- header -----------------------------------------------------------------

export function DataRoomHeader({ onOpenNav }: { onOpenNav: () => void }) {
  const { visitor, signOut } = useDataRoomSession();
  const [signingOut, setSigningOut] = useState(false);

  const handleSignOut = async () => {
    setSigningOut(true);
    try {
      await signOut();
    } finally {
      setSigningOut(false);
    }
  };

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-border/60 bg-card/85 px-4 backdrop-blur-md lg:px-8">
      <Button variant="ghost" size="icon" className="lg:hidden" onClick={onOpenNav}>
        <Menu className="h-5 w-5" aria-hidden="true" />
        <span className="sr-only">Open data room navigation</span>
      </Button>

      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-semibold">
          {visitor?.name ? `Welcome, ${visitor.name.split(" ")[0]}` : "Welcome"}
        </div>
        <div className="truncate text-xs text-muted-foreground">
          {visitor?.organization ?? visitor?.email}
        </div>
      </div>

      <AccessExpiryBadge expiresAt={visitor?.expiresAt ?? null} className="hidden sm:inline-flex" />

      <Button
        variant="outline"
        size="sm"
        onClick={() => void handleSignOut()}
        disabled={signingOut}
      >
        <LogOut className="mr-2 h-4 w-4" aria-hidden="true" />
        {signingOut ? "Signing out…" : "Sign out"}
      </Button>
    </header>
  );
}

// -- sidebar ----------------------------------------------------------------

const NAV = [
  { label: "Dashboard", to: "/dataroom/workspace", icon: LayoutDashboard, exact: true },
  { label: "Search", to: "/dataroom/workspace/search", icon: Search, exact: false },
  { label: "My activity", to: "/dataroom/workspace/activity", icon: ScrollText, exact: false },
];

export function DataRoomSidebar({
  folders,
  loading,
  onNavigate,
}: {
  folders: DataRoomFolderCard[];
  loading: boolean;
  onNavigate?: () => void;
}) {
  const { visitor } = useDataRoomSession();

  return (
    <div className="flex h-full flex-col">
      <div className="flex h-16 items-center gap-2 border-b border-border/60 px-5">
        <div className="grid h-9 w-9 place-items-center rounded-xl bg-[var(--primary)] text-white">
          <Sparkles className="h-4 w-4" aria-hidden="true" />
        </div>
        <div className="flex flex-col leading-tight">
          <span className="text-sm font-bold tracking-tight">MyTijaara</span>
          <span className="text-[10px] font-medium uppercase tracking-widest text-[var(--gold)]">
            Data Room
          </span>
        </div>
      </div>

      <nav aria-label="Data room" className="flex-1 overflow-y-auto px-3 py-4">
        <div className="space-y-0.5">
          {NAV.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.to}
                to={item.to}
                activeOptions={{ exact: item.exact }}
                onClick={onNavigate}
                className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-foreground/70 transition-colors hover:bg-muted hover:text-foreground data-[status=active]:bg-[var(--primary)] data-[status=active]:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]/40"
              >
                <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span className="truncate">{item.label}</span>
              </Link>
            );
          })}
        </div>

        <div className="mb-1 mt-6 px-3 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70">
          Categories
        </div>

        {loading ? (
          <div className="space-y-2 px-3 py-2">
            <Skeleton className="h-5 w-full" />
            <Skeleton className="h-5 w-4/5" />
            <Skeleton className="h-5 w-3/5" />
          </div>
        ) : folders.length === 0 ? (
          <p className="px-3 py-2 text-sm text-muted-foreground">No categories yet.</p>
        ) : (
          <ul className="space-y-0.5">
            {folders.map((folder) =>
              folder.accessible ? (
                <li key={folder.id}>
                  <Link
                    to="/dataroom/workspace"
                    hash={folder.slug}
                    onClick={onNavigate}
                    className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-foreground/70 transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]/40"
                  >
                    <Folder className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                    <span className="truncate">{folder.name}</span>
                    <span className="ml-auto text-[10px] font-semibold text-muted-foreground">
                      {folder.accessibleCount}
                    </span>
                  </Link>
                </li>
              ) : (
                // Not a link and not focusable: there is nothing to open.
                <li
                  key={folder.id}
                  className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted-foreground/70"
                >
                  <Lock className="h-4 w-4 shrink-0" aria-hidden="true" />
                  <span className="truncate">{folder.name}</span>
                  <span className="sr-only">Additional authorization required</span>
                </li>
              ),
            )}
          </ul>
        )}
      </nav>

      <div className="border-t border-border/60 p-4">
        <div className="rounded-xl bg-[var(--primary)] p-4 text-white">
          <div className="mb-1 text-[10px] font-semibold uppercase tracking-widest text-[var(--gold)]">
            Your access
          </div>
          <div className="truncate text-sm font-medium">{visitor?.email}</div>
          <AccessExpiryBadge
            expiresAt={visitor?.expiresAt ?? null}
            className="mt-2 border-white/25 bg-white/10 text-white"
          />
        </div>
      </div>
    </div>
  );
}

// -- breadcrumbs ------------------------------------------------------------

/**
 * Trail back to the dashboard. Takes explicit crumbs rather than parsing the
 * path, because a document's uuid is not a readable segment.
 */
export function DataRoomBreadcrumbs({
  trail,
}: {
  trail: Array<{ label: string; to?: string; hash?: string }>;
}) {
  return (
    <nav aria-label="Breadcrumb" className="mb-4">
      <ol className="flex flex-wrap items-center gap-1.5 text-sm text-muted-foreground">
        {trail.map((crumb, index) => {
          const last = index === trail.length - 1;
          return (
            <li key={`${crumb.label}-${index}`} className="flex items-center gap-1.5">
              {index > 0 && <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />}
              {crumb.to && !last ? (
                <Link
                  to={crumb.to}
                  hash={crumb.hash}
                  className="rounded hover:text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]/40"
                >
                  {crumb.label}
                </Link>
              ) : (
                <span
                  className={cn(last && "font-medium text-foreground")}
                  aria-current={last ? "page" : undefined}
                >
                  {crumb.label}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

// -- loading ----------------------------------------------------------------

/** Shown while `me()` is in flight, before it is known there is a session at all. */
export function WorkspaceSkeleton() {
  return (
    <div className="grid min-h-screen place-items-center bg-background p-8">
      <div className="flex flex-col items-center gap-3 text-center">
        <Loader2 className="h-6 w-6 animate-spin text-[var(--primary)]" aria-hidden="true" />
        <p className="text-sm text-muted-foreground" role="status">
          Verifying your access…
        </p>
      </div>
    </div>
  );
}

/** Signed-out helper used by the access screen and empty views. */
export function DataRoomNotice({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  const navigate = useNavigate();
  return (
    <div className="rounded-2xl border border-border/60 bg-card p-8 text-center shadow-sm">
      <h2 className="text-lg font-semibold">{title}</h2>
      <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">{description}</p>
      <div className="mt-4 flex justify-center">
        {action ?? (
          <Button variant="outline" onClick={() => void navigate({ to: "/dataroom" })}>
            Back to sign in
          </Button>
        )}
      </div>
    </div>
  );
}
