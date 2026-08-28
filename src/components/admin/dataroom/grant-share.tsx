/**
 * The screen shown once, immediately after a grant is created or regenerated.
 *
 * This is the only place the plaintext access code exists. The backend stores a
 * hash, so closing this dialog without copying the code means reissuing it. Said
 * plainly on screen rather than implied.
 *
 * Nothing here emails the visitor. Delivery is out of band and deliberately
 * manual: the system records that a code was issued, not how it travelled.
 */

import { useState } from "react";
import { Check, Copy, KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { DetailRow } from "./bits";
import { formatDateTime } from "@/lib/dataroom/format";
import type { DataRoomAdminGrant } from "@/lib/api/dataroom-admin";

export type GrantShareDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  grant: DataRoomAdminGrant;
  accessCode: string;
  /** Set when a regeneration killed live sessions, so the count can be stated. */
  sessionsDestroyed?: number;
  /** Absolute origin for the access link. Defaults to the current origin. */
  origin?: string;
};

/** Copy helper that degrades to a manual-selection message instead of failing silently. */
async function copy(value: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(value);
    return true;
  } catch {
    return false;
  }
}

export function GrantShareDialog({
  open,
  onOpenChange,
  grant,
  accessCode,
  sessionsDestroyed,
  origin,
}: GrantShareDialogProps) {
  const [copied, setCopied] = useState<string | null>(null);
  const base = origin ?? (typeof window === "undefined" ? "" : window.location.origin);
  const link = `${base}/dataroom`;
  const credentials = `MyTijaara data room\n${link}\nEmail: ${grant.visitorEmail}\nAccess code: ${accessCode}`;

  async function handleCopy(label: string, value: string) {
    const ok = await copy(value);
    setCopied(ok ? label : "failed");
    window.setTimeout(() => setCopied(null), 2500);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Access code for {grant.visitorName ?? grant.visitorEmail}</DialogTitle>
          <DialogDescription>
            Copy this now. It is stored as a hash and cannot be shown again. If it is lost, use
            Reissue code, which invalidates the old one.
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-2xl border border-primary/30 bg-primary/5 px-4 py-3">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
                Access code
              </p>
              <p className="mt-0.5 font-mono text-xl font-semibold tracking-wider break-all">
                {accessCode}
              </p>
            </div>
            <Button size="sm" variant="outline" onClick={() => void handleCopy("code", accessCode)}>
              {copied === "code" ? (
                <Check className="mr-1.5 h-4 w-4" aria-hidden="true" />
              ) : (
                <Copy className="mr-1.5 h-4 w-4" aria-hidden="true" />
              )}
              Copy
            </Button>
          </div>
        </div>

        <dl className="grid gap-x-6 sm:grid-cols-2">
          <DetailRow label="Email">{grant.visitorEmail}</DetailRow>
          <DetailRow label="Organization">{grant.organization ?? "—"}</DetailRow>
          <DetailRow label="Expires">
            {grant.neverExpires ? "Never" : formatDateTime(grant.expiresAt)}
          </DetailRow>
          <DetailRow label="Scope">
            {grant.allDocumentsAccess
              ? `Whole room, ${grant.downloadsPermitted ? "with downloads" : "view only"}`
              : `${grant.folders?.length ?? 0} categories, ${grant.documents?.length ?? 0} documents`}
          </DetailRow>
        </dl>

        {typeof sessionsDestroyed === "number" && (
          <p className="rounded-xl border border-border/60 bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
            {sessionsDestroyed === 0
              ? "No live sessions were open, so nobody was signed out."
              : `${sessionsDestroyed} live session${sessionsDestroyed === 1 ? " was" : "s were"} ended. The previous code no longer works.`}
          </p>
        )}

        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={() => void handleCopy("link", link)}>
            {copied === "link" ? (
              <Check className="mr-1.5 h-4 w-4" aria-hidden="true" />
            ) : (
              <Copy className="mr-1.5 h-4 w-4" aria-hidden="true" />
            )}
            Copy access link
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => void handleCopy("credentials", credentials)}
          >
            {copied === "credentials" ? (
              <Check className="mr-1.5 h-4 w-4" aria-hidden="true" />
            ) : (
              <KeyRound className="mr-1.5 h-4 w-4" aria-hidden="true" />
            )}
            Copy link, email and code
          </Button>
        </div>

        {copied === "failed" && (
          <p className="text-xs text-destructive">
            The clipboard was refused. Select the code above and copy it manually.
          </p>
        )}

        <p className="text-[11px] text-muted-foreground">
          Send the code over a channel you trust. Anyone holding both this code and the email
          address above can open the room, so treat the pair as one credential.
        </p>

        <DialogFooter>
          <Button onClick={() => onOpenChange(false)}>I have copied the code</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
