/** Skeleton shell shown while the auth guard verifies the session. */
export function AdminSkeleton() {
  return (
    <div className="flex min-h-screen bg-[#F8FAF8]">
      <aside className="hidden lg:flex lg:w-64 lg:flex-col lg:fixed lg:inset-y-0 border-r border-border/60 bg-card">
        <div className="flex h-16 items-center gap-2 border-b border-border/60 px-5">
          <div className="h-9 w-9 animate-pulse rounded-xl bg-muted" />
          <div className="flex flex-col gap-1.5">
            <div className="h-3 w-20 animate-pulse rounded bg-muted" />
            <div className="h-2 w-12 animate-pulse rounded bg-muted/70" />
          </div>
        </div>
        <div className="flex-1 space-y-1 p-3">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 rounded-lg px-3 py-2">
              <div className="h-4 w-4 animate-pulse rounded bg-muted" />
              <div className="h-3 flex-1 animate-pulse rounded bg-muted" style={{ maxWidth: `${60 + (i % 4) * 20}px` }} />
            </div>
          ))}
        </div>
      </aside>
      <div className="flex-1 lg:pl-64">
        <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-border/60 bg-card/80 px-4 backdrop-blur-md lg:px-6">
          <div className="h-9 w-full max-w-md animate-pulse rounded-md bg-muted/60" />
          <div className="ml-auto flex items-center gap-2">
            <div className="h-9 w-9 animate-pulse rounded-full bg-muted/60" />
            <div className="h-9 w-24 animate-pulse rounded-full bg-muted/60" />
          </div>
        </header>
        <main className="p-4 lg:p-8">
          <div className="mb-6 space-y-2">
            <div className="h-8 w-64 animate-pulse rounded bg-muted" />
            <div className="h-4 w-96 max-w-full animate-pulse rounded bg-muted/60" />
          </div>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-28 animate-pulse rounded-2xl border border-border/60 bg-card" />
            ))}
          </div>
          <div className="mt-6 grid gap-4 lg:grid-cols-3">
            <div className="h-80 animate-pulse rounded-2xl border border-border/60 bg-card lg:col-span-2" />
            <div className="h-80 animate-pulse rounded-2xl border border-border/60 bg-card" />
          </div>
        </main>
      </div>
    </div>
  );
}
