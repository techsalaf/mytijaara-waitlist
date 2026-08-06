/**
 * Shown while a route's chunk and loader are in flight.
 *
 * The admin sidebar used to leave the previous page on screen for seconds after
 * a click, because nothing rendered until the new route was fully resolved.
 * TanStack Router swaps this in after `defaultPendingMs`, so a click produces
 * visible feedback immediately.
 *
 * It deliberately mimics the shape of an admin page (header, stat row, table
 * block) rather than showing a centred spinner: matching the destination layout
 * keeps the content from jumping when the real page lands.
 */
export function RoutePending() {
  return (
    <div className="animate-in fade-in duration-150" role="status" aria-busy="true">
      <span className="sr-only">Loading page…</span>

      <div className="mb-6 space-y-2">
        <div className="h-8 w-56 animate-pulse rounded-lg bg-muted" />
        <div className="h-4 w-80 max-w-full animate-pulse rounded bg-muted/60" />
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="h-28 animate-pulse rounded-2xl border border-border/60 bg-card"
            style={{ animationDelay: `${i * 60}ms` }}
          />
        ))}
      </div>

      <div className="mt-6 rounded-2xl border border-border/60 bg-card p-5">
        <div className="h-5 w-40 animate-pulse rounded bg-muted" />
        <div className="mt-4 space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4">
              <div className="h-9 w-9 shrink-0 animate-pulse rounded-full bg-muted/70" />
              <div className="h-3 flex-1 animate-pulse rounded bg-muted/60" />
              <div className="hidden h-3 w-24 animate-pulse rounded bg-muted/60 sm:block" />
              <div className="hidden h-3 w-16 animate-pulse rounded bg-muted/60 md:block" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
