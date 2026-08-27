/**
 * Visitor session state for the data room.
 *
 * Holds the answer to `GET /dataroom/me` and nothing else. It is not an
 * authorization layer: it decides what to draw and when to send the visitor back
 * to the access screen, while the server re-decides every request on its own.
 *
 * Two things live here that the components should not each reinvent:
 *
 *  - One place that reacts to a dead session. Any 401 from any call means the
 *    server has already deleted the session row (revoked grant, lockdown, idle
 *    timeout, absolute ceiling). `endSession()` drops the local token and returns
 *    to `/dataroom` with one message, rather than each screen inventing its own.
 *  - The absolute clock. `absoluteExpiresAt` is a hard server ceiling, so the UI
 *    stops pretending to be signed in the moment it passes instead of waiting for
 *    the next request to fail.
 */

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import {
  dataRoomApi,
  getDataRoomToken,
  clearDataRoomToken,
  type DataRoomMe,
} from "@/lib/api/dataroom";
import { ApiError } from "@/lib/api/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

type SessionState = {
  visitor: DataRoomMe | null;
  loading: boolean;
  /** Reload `me()`. Used after acknowledgement, and by the expiry badge. */
  refresh: () => Promise<void>;
  /** Sign out deliberately. */
  signOut: () => Promise<void>;
  /**
   * Route any caught error through the session. Returns true when the error was
   * a dead session and has been handled, so callers can stop.
   */
  handleError: (error: unknown) => boolean;
};

const SessionContext = createContext<SessionState | null>(null);

export function useDataRoomSession(): SessionState {
  const context = useContext(SessionContext);
  if (!context) {
    throw new Error("useDataRoomSession must be used inside <DataRoomSessionProvider>.");
  }
  return context;
}

export function DataRoomSessionProvider({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const [visitor, setVisitor] = useState<DataRoomMe | null>(null);
  const [loading, setLoading] = useState(true);
  // Guards against two concurrent 401s both firing a toast and a navigation.
  const ending = useRef(false);

  const endSession = useCallback(
    (message: string) => {
      if (ending.current) return;
      ending.current = true;
      clearDataRoomToken();
      setVisitor(null);
      toast.error(message);
      void navigate({ to: "/dataroom", replace: true });
    },
    [navigate],
  );

  const load = useCallback(async () => {
    if (!getDataRoomToken()) {
      setLoading(false);
      endSession("Please sign in to continue.");
      return;
    }
    try {
      setVisitor(await dataRoomApi.me());
    } catch (error) {
      endSession(
        error instanceof ApiError && error.status === 401
          ? "Your data room session has ended. Please sign in again."
          : "Could not load your session. Please sign in again.",
      );
    } finally {
      setLoading(false);
    }
  }, [endSession]);

  useEffect(() => {
    void load();
  }, [load]);

  // The absolute ceiling. Nothing refreshes this clock server-side, so once it
  // passes the session is gone whatever the visitor does next.
  useEffect(() => {
    const absolute = visitor?.session?.absoluteExpiresAt;
    if (!absolute) return;
    const ms = new Date(absolute).getTime() - Date.now();
    if (Number.isNaN(ms)) return;
    if (ms <= 0) {
      endSession("Your data room session has ended. Please sign in again.");
      return;
    }
    // setTimeout truncates past ~24.8 days; the ceiling is hours, so a direct
    // delay is safe here.
    const timer = setTimeout(
      () => endSession("Your data room session has ended. Please sign in again."),
      ms,
    );
    return () => clearTimeout(timer);
  }, [visitor?.session?.absoluteExpiresAt, endSession]);

  const handleError = useCallback(
    (error: unknown): boolean => {
      if (error instanceof ApiError && error.status === 401) {
        endSession(error.message || "Your data room session has ended. Please sign in again.");
        return true;
      }
      return false;
    },
    [endSession],
  );

  const signOut = useCallback(async () => {
    await dataRoomApi.logout();
    ending.current = true;
    setVisitor(null);
    toast.success("You have been signed out.");
    void navigate({ to: "/dataroom", replace: true });
  }, [navigate]);

  return (
    <SessionContext.Provider value={{ visitor, loading, refresh: load, signOut, handleError }}>
      {children}
      {visitor && !visitor.acknowledgedAt && <ConfidentialityGate onDone={load} />}
    </SessionContext.Provider>
  );
}

/**
 * First-visit confidentiality acknowledgement.
 *
 * Deliberately plain language and deliberately not styled as a contract. It
 * records that the visitor was told the materials are confidential, with a
 * server-side timestamp. It is not counsel-reviewed and does not claim to be an
 * agreement; see docs/data-room/known-limitations.md.
 *
 * Not dismissible: no close button, escape and outside clicks are swallowed. The
 * only exit is the button, which writes the timestamp. It is a UI gate, not a
 * permission gate; the documents are already authorized independently.
 */
function ConfidentialityGate({ onDone }: { onDone: () => Promise<void> }) {
  const [saving, setSaving] = useState(false);

  const accept = async () => {
    setSaving(true);
    try {
      await dataRoomApi.acknowledge();
      await onDone();
    } catch {
      toast.error("Could not record your acknowledgement. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open>
      <DialogContent
        className="max-w-lg"
        showClose={false}
        onEscapeKeyDown={(event) => event.preventDefault()}
        onInteractOutside={(event) => event.preventDefault()}
        aria-describedby="dataroom-ack-description"
      >
        <DialogHeader>
          <div className="mb-2 grid h-10 w-10 place-items-center rounded-xl bg-[var(--primary-soft)] text-[var(--primary)]">
            <ShieldCheck className="h-5 w-5" aria-hidden="true" />
          </div>
          <DialogTitle>Before you continue</DialogTitle>
          <DialogDescription id="dataroom-ack-description">
            The materials in this data room are confidential and are shared with you for the sole
            purpose of evaluating an investment in MyTijaara.
          </DialogDescription>
        </DialogHeader>

        <ul className="space-y-2 text-sm text-muted-foreground">
          <li>Please do not redistribute, republish or forward these documents.</li>
          <li>Your access is individual to you and is logged, including views and downloads.</li>
          <li>Access can be changed or withdrawn at any time.</li>
        </ul>

        <DialogFooter>
          <Button onClick={() => void accept()} disabled={saving} className="w-full sm:w-auto">
            {saving ? "Saving…" : "I understand, continue"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
