import { useRouterState } from "@tanstack/react-router";

/**
 * Thin progress bar pinned under the admin topbar during a navigation.
 *
 * `defaultPendingComponent` only appears after `defaultPendingMs` and only
 * replaces the outlet. This shows up on the first frame of any pending
 * navigation, so a sidebar click is acknowledged instantly even when the
 * destination resolves fast enough to skip the skeleton.
 *
 * The width is not tied to real progress (there is none to read), so it eases
 * toward 90% and completes on unmount, which is the convention users already
 * read as "working".
 */
export function NavProgress() {
  const isLoading = useRouterState({ select: (s) => s.status === "pending" });

  if (!isLoading) return null;

  return (
    <div
      className="pointer-events-none absolute inset-x-0 bottom-0 h-0.5 overflow-hidden"
      role="progressbar"
      aria-label="Loading page"
    >
      <div className="animate-nav-progress h-full w-full origin-left bg-gradient-to-r from-primary via-gold to-primary" />
    </div>
  );
}
