import { cn } from "@/lib/utils";
import { type LucideIcon, TrendingUp, TrendingDown } from "lucide-react";
import { toast } from "sonner";

export function PageHeader({
  title, description, actions,
}: { title: string; description?: string; actions?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">{title}</h1>
        {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function StatCard({
  label, value, delta, icon: Icon, hint,
}: {
  label: string;
  value: string | number;
  delta?: number;
  icon?: LucideIcon;
  hint?: string;
}) {
  const positive = (delta ?? 0) >= 0;
  return (
    <div className="rounded-2xl border border-border/60 bg-white p-5 shadow-sm dark:bg-neutral-900">
      <div className="flex items-start justify-between">
        <div className="text-sm font-medium text-muted-foreground">{label}</div>
        {Icon && (
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-[#0D7A46]/10 text-[#0D7A46]">
            <Icon className="h-4 w-4" />
          </div>
        )}
      </div>
      <div className="mt-3 flex items-baseline gap-2">
        <div className="text-2xl font-bold tracking-tight">{value}</div>
        {typeof delta === "number" && (
          <span
            className={cn(
              "inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[11px] font-semibold",
              positive ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700",
            )}
          >
            {positive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
            {Math.abs(delta).toFixed(1)}%
          </span>
        )}
      </div>
      {hint && <div className="mt-1 text-xs text-muted-foreground">{hint}</div>}
    </div>
  );
}

export function SectionCard({
  title, description, actions, children, className,
}: {
  title?: string;
  description?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("rounded-2xl border border-border/60 bg-white shadow-sm dark:bg-neutral-900", className)}>
      {(title || actions) && (
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border/60 px-5 py-4">
          <div className="min-w-0">
            {title && <h2 className="text-base font-semibold tracking-tight">{title}</h2>}
            {description && <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>}
          </div>
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </div>
      )}
      <div className="p-5">{children}</div>
    </div>
  );
}

/**
 * Beautiful empty state with a bespoke SVG illustration in MyTijaara green/gold.
 * Falls back to the passed icon when `illustration` is not provided.
 */
export function EmptyState({
  icon: Icon, title, description, action, illustration = "default",
}: {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
  illustration?: "default" | "search" | "inbox" | "chart" | "none";
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border/70 bg-muted/20 px-6 py-12 text-center dark:bg-neutral-900/40">
      {illustration !== "none" ? (
        <EmptyIllustration variant={illustration} />
      ) : Icon ? (
        <div className="grid h-12 w-12 place-items-center rounded-2xl bg-[#0D7A46]/10 text-[#0D7A46]">
          <Icon className="h-5 w-5" />
        </div>
      ) : null}
      <h3 className="mt-4 text-sm font-semibold">{title}</h3>
      {description && <p className="mt-1 max-w-sm text-xs text-muted-foreground">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

function EmptyIllustration({ variant }: { variant: "default" | "search" | "inbox" | "chart" }) {
  // Palette: green #0D7A46, deep #166534, gold #D4A017
  const common = "h-32 w-40";
  if (variant === "search") {
    return (
      <svg className={common} viewBox="0 0 160 128" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
        <ellipse cx="80" cy="112" rx="56" ry="6" fill="#0D7A46" fillOpacity="0.08" />
        <circle cx="70" cy="58" r="30" fill="#F0F7F3" stroke="#0D7A46" strokeWidth="2.5" />
        <circle cx="70" cy="58" r="20" fill="#fff" stroke="#166534" strokeWidth="1.5" strokeDasharray="3 3" />
        <path d="M92 80l16 16" stroke="#166534" strokeWidth="4" strokeLinecap="round" />
        <circle cx="118" cy="34" r="6" fill="#D4A017" fillOpacity="0.35" />
        <circle cx="30" cy="88" r="4" fill="#D4A017" fillOpacity="0.5" />
      </svg>
    );
  }
  if (variant === "inbox") {
    return (
      <svg className={common} viewBox="0 0 160 128" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
        <ellipse cx="80" cy="112" rx="56" ry="6" fill="#0D7A46" fillOpacity="0.08" />
        <rect x="34" y="42" width="92" height="60" rx="8" fill="#fff" stroke="#0D7A46" strokeWidth="2" />
        <path d="M34 72h30l6 10h20l6-10h30" stroke="#166534" strokeWidth="2" fill="#F0F7F3" />
        <rect x="52" y="30" width="56" height="18" rx="3" fill="#D4A017" fillOpacity="0.25" stroke="#D4A017" strokeWidth="1.5" />
        <circle cx="130" cy="34" r="6" fill="#D4A017" />
      </svg>
    );
  }
  if (variant === "chart") {
    return (
      <svg className={common} viewBox="0 0 160 128" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
        <ellipse cx="80" cy="112" rx="56" ry="6" fill="#0D7A46" fillOpacity="0.08" />
        <rect x="30" y="34" width="100" height="68" rx="8" fill="#fff" stroke="#0D7A46" strokeWidth="2" />
        <rect x="46" y="70" width="12" height="22" rx="2" fill="#0D7A46" fillOpacity="0.3" />
        <rect x="66" y="58" width="12" height="34" rx="2" fill="#0D7A46" fillOpacity="0.55" />
        <rect x="86" y="46" width="12" height="46" rx="2" fill="#0D7A46" />
        <rect x="106" y="62" width="12" height="30" rx="2" fill="#D4A017" />
      </svg>
    );
  }
  // default: sparkles + list
  return (
    <svg className={common} viewBox="0 0 160 128" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
      <ellipse cx="80" cy="112" rx="56" ry="6" fill="#0D7A46" fillOpacity="0.08" />
      <rect x="34" y="28" width="92" height="76" rx="10" fill="#fff" stroke="#0D7A46" strokeWidth="2" />
      <rect x="46" y="46" width="60" height="6" rx="3" fill="#0D7A46" fillOpacity="0.25" />
      <rect x="46" y="60" width="42" height="6" rx="3" fill="#0D7A46" fillOpacity="0.15" />
      <rect x="46" y="74" width="52" height="6" rx="3" fill="#0D7A46" fillOpacity="0.15" />
      <path d="M120 30l3 8 8 3-8 3-3 8-3-8-8-3 8-3z" fill="#D4A017" />
      <circle cx="30" cy="94" r="4" fill="#D4A017" fillOpacity="0.6" />
    </svg>
  );
}

/**
 * Confirm a destructive action with an undoable toast. Runs `perform`
 * immediately (optimistic) and calls `undo` if the user hits the Undo button
 * before the toast dismisses.
 */
export function confirmDestructive({
  message, description, perform, undo, undoLabel = "Undo", duration = 6000,
}: {
  message: string;
  description?: string;
  perform: () => void;
  undo: () => void;
  undoLabel?: string;
  duration?: number;
}) {
  perform();
  toast(message, {
    description,
    duration,
    action: { label: undoLabel, onClick: undo },
  });
}
