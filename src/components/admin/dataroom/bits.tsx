/**
 * Shared pieces of the data room admin UI.
 *
 * `ConfirmationModal` is the only one worth reading twice. When a `phrase` is
 * passed, the confirm button stays disabled until the typed value equals it
 * exactly. That is a speed bump in front of a human, not a security control: the
 * backend re-compares the phrase with `hash_equals` and answers 422, so the worst
 * a bug here can do is enable a button the server then refuses.
 */

import { useEffect, useId, useState } from "react";
import { AlertTriangle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import type { StatusView, Tone } from "@/lib/dataroom/admin-format";

const TONE_CLASS: Record<Tone, string> = {
  good: "border-primary/30 bg-primary/10 text-primary",
  info: "border-sky-500/30 bg-sky-500/10 text-sky-700",
  warn: "border-[var(--gold)]/45 bg-[var(--gold)]/12 text-[color-mix(in_oklab,var(--gold)_70%,black)]",
  bad: "border-destructive/30 bg-destructive/10 text-destructive",
  neutral: "border-border/60 bg-muted/50 text-muted-foreground",
};

/**
 * A status as a pill. The explanation rides along in `title` so an operator can
 * find out what "Exhausted" means without leaving the row.
 */
export function StatusPill({ view, className }: { view: StatusView; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium whitespace-nowrap",
        TONE_CLASS[view.tone],
        className,
      )}
      title={view.explanation}
    >
      {view.label}
    </span>
  );
}

/** A short label above a value, for the read-only review and detail panels. */
export function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5 py-1.5">
      <dt className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
        {label}
      </dt>
      <dd className="text-sm text-foreground">{children}</dd>
    </div>
  );
}

/** A list of blocking problems, rendered where the operator is looking. */
export function IssueList({ issues }: { issues: string[] }) {
  if (!issues.length) return null;
  return (
    <ul className="space-y-1 rounded-xl border border-destructive/25 bg-destructive/5 px-3 py-2">
      {issues.map((issue) => (
        <li key={issue} className="flex items-start gap-2 text-xs text-destructive">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <span>{issue}</span>
        </li>
      ))}
    </ul>
  );
}

export type ConfirmationModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  /** What actually changes, in the operator's terms. */
  effect: string;
  /** Whether and how it can be walked back. Always shown. */
  reversal?: string;
  /** When set, the confirm button unlocks only on an exact match after a trim. */
  phrase?: string;
  confirmLabel?: string;
  destructive?: boolean;
  busy?: boolean;
  onConfirm: () => void;
};

/**
 * Confirm an action that cannot be undone with a toast.
 *
 * `ui-bits.confirmDestructive` covers the optimistic-with-undo case. This covers
 * the other one: room-wide switches and code regeneration, where there is no undo
 * and the operator has to read the blast radius first.
 */
export function ConfirmationModal({
  open,
  onOpenChange,
  title,
  effect,
  reversal,
  phrase,
  confirmLabel = "Confirm",
  destructive = false,
  busy = false,
  onConfirm,
}: ConfirmationModalProps) {
  const [typed, setTyped] = useState("");
  const inputId = useId();

  // Reopening must not inherit the last phrase, or a second click confirms
  // instantly with a value the operator typed for a different action.
  useEffect(() => {
    if (!open) setTyped("");
  }, [open]);

  const unlocked = phrase ? typed.trim() === phrase : true;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{effect}</DialogDescription>
        </DialogHeader>

        {reversal && (
          <p className="rounded-xl border border-border/60 bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
            {reversal}
          </p>
        )}

        {phrase && (
          <div className="space-y-2">
            <Label htmlFor={inputId} className="text-xs">
              Type <span className="font-mono font-semibold text-foreground">{phrase}</span> to
              enable the button.
            </Label>
            <Input
              id={inputId}
              value={typed}
              onChange={(event) => setTyped(event.target.value)}
              autoComplete="off"
              spellCheck={false}
              aria-describedby={`${inputId}-hint`}
            />
            <p id={`${inputId}-hint`} className="text-[11px] text-muted-foreground">
              Case sensitive. The server checks it again.
            </p>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>
            Cancel
          </Button>
          <Button
            variant={destructive ? "destructive" : "default"}
            onClick={onConfirm}
            disabled={!unlocked || busy}
          >
            {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />}
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Loading, permission and failure states for a tab.
 *
 * A 403 gets its own copy because it is not an error the operator can retry
 * their way out of: the role is missing a `data-room.*` permission and a
 * super administrator has to grant it. Returns null once there is something to
 * render, so a caller can place it above the real content.
 */
export function LoadState({
  loading,
  error,
  forbidden,
  onRetry,
  label,
}: {
  loading: boolean;
  error: string | null;
  forbidden?: boolean;
  onRetry?: () => void;
  label: string;
}) {
  if (loading) {
    return (
      <div className="flex items-center gap-2 rounded-2xl border border-border/60 bg-card px-5 py-8 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
        <span role="status">Loading {label}…</span>
      </div>
    );
  }
  if (forbidden) {
    return (
      <div className="rounded-2xl border border-[var(--gold)]/45 bg-[var(--gold)]/10 px-5 py-4">
        <p className="text-sm font-medium">Your role does not include this permission</p>
        <p className="mt-1 text-xs text-muted-foreground">
          A super administrator has to grant the matching <code>data-room.*</code> permission under
          Roles. Retrying will not change the answer.
        </p>
      </div>
    );
  }
  if (error) {
    return (
      <div className="rounded-2xl border border-destructive/25 bg-destructive/5 px-5 py-4">
        <p className="text-sm text-destructive">{error}</p>
        {onRetry && (
          <Button variant="outline" size="sm" className="mt-2" onClick={onRetry}>
            Try again
          </Button>
        )}
      </div>
    );
  }
  return null;
}
