/**
 * Access screen. Email + access code, plus the room PIN when one is configured.
 *
 * Two rules this screen must not break:
 *
 *  1. Every authentication failure shows the server's message verbatim. The
 *     backend answers one generic 401 for unknown email, wrong code, revoked,
 *     suspended, expired and exhausted, so the UI must not try to be helpful and
 *     re-derive which of those it was. Doing so would rebuild the enumeration
 *     hole the backend deliberately closed.
 *  2. Nothing about the room's contents is readable here. `gate()` returns three
 *     fields: whether it is open, whether a PIN is needed, and a message.
 *
 * The lockdown message and the "temporarily unavailable" message are identical on
 * purpose, so an outsider cannot tell an incident from maintenance.
 */

import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { KeyRound, Loader2, Lock, Mail, ShieldCheck, Sparkles } from "lucide-react";
import { dataRoomApi, getDataRoomToken, type DataRoomGate } from "@/lib/api/dataroom";
import { ApiError } from "@/lib/api/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { normalizeAccessCode } from "@/lib/dataroom/format";

export const Route = createFileRoute("/dataroom/")({
  component: DataRoomAccessPage,
});

function DataRoomAccessPage() {
  const navigate = useNavigate();
  const [gate, setGate] = useState<DataRoomGate | null>(null);
  const [gateLoading, setGateLoading] = useState(true);
  const [gateError, setGateError] = useState<string | null>(null);

  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [pin, setPin] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const errorRef = useRef<HTMLParagraphElement | null>(null);

  // An existing tab token means there is already a session to return to.
  useEffect(() => {
    if (getDataRoomToken()) {
      void navigate({ to: "/dataroom/workspace", replace: true });
    }
  }, [navigate]);

  useEffect(() => {
    void (async () => {
      try {
        setGate(await dataRoomApi.gate());
      } catch {
        setGateError("The data room is unavailable right now. Please try again later.");
      } finally {
        setGateLoading(false);
      }
    })();
  }, []);

  // Move focus to the error so a screen reader announces the failure instead of
  // leaving the visitor on a form that silently did nothing.
  useEffect(() => {
    if (error) errorRef.current?.focus();
  }, [error]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    const normalizedCode = normalizeAccessCode(code);
    const trimmedEmail = email.trim();
    if (!trimmedEmail || !normalizedCode) {
      setError("Enter both the email address and the access code you were given.");
      return;
    }

    setSubmitting(true);
    try {
      await dataRoomApi.authenticate({
        email: trimmedEmail,
        code: normalizedCode,
        ...(gate?.pinRequired ? { pin } : {}),
      });
      await navigate({ to: "/dataroom/workspace", replace: true });
    } catch (caught) {
      // Shown as sent. Never interpreted, never replaced with something more
      // specific.
      setError(
        caught instanceof ApiError
          ? caught.message
          : "We could not verify those details. Please check them and try again.",
      );
      setCode("");
      setPin("");
    } finally {
      setSubmitting(false);
    }
  };

  const closed = gate && !gate.open;

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* Brand panel. No document titles, no counts, nothing about the round's
          contents: this side is visible to anyone who reaches the URL. */}
      <div className="relative hidden overflow-hidden bg-[var(--primary)] lg:block">
        <div
          className="absolute inset-0 opacity-30"
          style={{
            backgroundImage:
              "radial-gradient(circle at 20% 10%, rgba(212,160,23,0.35), transparent 45%), radial-gradient(circle at 80% 80%, rgba(255,255,255,0.15), transparent 40%)",
          }}
        />
        <div className="relative flex h-full flex-col justify-between p-12 text-white">
          <div className="flex items-center gap-2">
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-white/15">
              <Sparkles className="h-4 w-4" aria-hidden="true" />
            </div>
            <div>
              <div className="text-sm font-bold tracking-tight">MyTijaara</div>
              <div className="text-[10px] font-medium uppercase tracking-widest text-[var(--gold)]">
                Investor Data Room
              </div>
            </div>
          </div>

          <div>
            <h1 className="max-w-md text-3xl font-semibold leading-tight tracking-tight">
              A private room for the people we have invited into this round.
            </h1>
            <p className="mt-4 max-w-md text-sm text-white/70">
              Access is issued individually, expires on a schedule, and is logged. If your access
              has ended, ask us for a new invitation.
            </p>
          </div>

          <ul className="space-y-2 text-sm text-white/70">
            <li className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-[var(--gold)]" aria-hidden="true" />
              Individual, time-limited access
            </li>
            <li className="flex items-center gap-2">
              <Lock className="h-4 w-4 text-[var(--gold)]" aria-hidden="true" />
              Documents are never served from a public URL
            </li>
          </ul>
        </div>
      </div>

      <div className="flex flex-col justify-center px-6 py-12">
        <div className="mx-auto w-full max-w-md">
          <div className="mb-8 lg:hidden">
            <div className="text-sm font-bold tracking-tight">MyTijaara</div>
            <div className="text-[10px] font-medium uppercase tracking-widest text-[var(--gold)]">
              Investor Data Room
            </div>
          </div>

          {gateLoading ? (
            <div className="flex items-center gap-3 text-sm text-muted-foreground" role="status">
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              Checking availability…
            </div>
          ) : gateError || closed ? (
            <div className="rounded-2xl border border-border/60 bg-card p-6 shadow-sm">
              <div className="mb-3 grid h-10 w-10 place-items-center rounded-xl bg-muted text-muted-foreground">
                <Lock className="h-5 w-5" aria-hidden="true" />
              </div>
              <h2 className="text-lg font-semibold">Data room unavailable</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {gateError ?? gate?.message ?? "The data room is temporarily unavailable."}
              </p>
            </div>
          ) : (
            <>
              <h2 className="text-2xl font-semibold tracking-tight">Sign in to continue</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Use the email address the invitation was sent to, and the access code you were
                given.
              </p>

              <form onSubmit={submit} className="mt-6 space-y-4" noValidate>
                <div className="space-y-1.5">
                  <Label htmlFor="dataroom-email">Email address</Label>
                  <div className="relative">
                    <Mail
                      className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                      aria-hidden="true"
                    />
                    <Input
                      id="dataroom-email"
                      type="email"
                      inputMode="email"
                      autoComplete="email"
                      autoCapitalize="none"
                      spellCheck={false}
                      required
                      className="pl-9"
                      placeholder="you@firm.com"
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      disabled={submitting}
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="dataroom-code">Access code</Label>
                  <div className="relative">
                    <KeyRound
                      className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                      aria-hidden="true"
                    />
                    <Input
                      id="dataroom-code"
                      // Normalized as it is typed so a pasted code with the
                      // wrong dashes or lowercase still matches. The server
                      // normalizes again before hashing; this is a courtesy.
                      value={code}
                      onChange={(event) => setCode(normalizeAccessCode(event.target.value))}
                      autoComplete="off"
                      autoCapitalize="characters"
                      spellCheck={false}
                      required
                      className="pl-9 font-mono tracking-wider"
                      placeholder="MTJ-XXXX-XXXX"
                      aria-describedby="dataroom-code-hint"
                      disabled={submitting}
                    />
                  </div>
                  <p id="dataroom-code-hint" className="text-xs text-muted-foreground">
                    Three groups, separated by hyphens. Case does not matter.
                  </p>
                </div>

                {gate?.pinRequired && (
                  <div className="space-y-1.5">
                    <Label htmlFor="dataroom-pin">Data room PIN</Label>
                    <div className="relative">
                      <Lock
                        className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                        aria-hidden="true"
                      />
                      <Input
                        id="dataroom-pin"
                        type="password"
                        value={pin}
                        onChange={(event) => setPin(event.target.value)}
                        autoComplete="off"
                        required
                        className="pl-9"
                        aria-describedby="dataroom-pin-hint"
                        disabled={submitting}
                      />
                    </div>
                    <p id="dataroom-pin-hint" className="text-xs text-muted-foreground">
                      Shared by everyone invited to the room. Sent separately from your code.
                    </p>
                  </div>
                )}

                {error && (
                  <p
                    ref={errorRef}
                    tabIndex={-1}
                    role="alert"
                    className="rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive outline-none"
                  >
                    {error}
                  </p>
                )}

                <Button type="submit" className="w-full" disabled={submitting}>
                  {submitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                      Verifying your access…
                    </>
                  ) : (
                    "Enter the data room"
                  )}
                </Button>
              </form>

              <p className="mt-6 text-xs text-muted-foreground">
                Access is individual to you and is logged. Please do not share your code. If you
                need access, or yours has ended, contact the MyTijaara team.
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
