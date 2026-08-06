import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { EmptyState, SectionCard } from "@/components/admin/ui-bits";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertTriangle, Check, Copy, Key, Loader2, Plus, RotateCcw, ShieldAlert, Trash2,
} from "lucide-react";
import { settingsApi, type ApiKeyRecord } from "@/lib/api/settings";
import { settingsError } from "@/lib/admin/use-settings-group";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/settings/api-keys")({
  component: ApiKeysPage,
});

/** Scopes the backend accepts. Free-form strings, but these are the useful set. */
const SCOPES = [
  { id: "read", label: "Read", hint: "Fetch waitlist entries, analytics and CMS content." },
  { id: "write", label: "Write", hint: "Create and update records." },
  { id: "webhook", label: "Webhook", hint: "Receive signup and referral events." },
];

function ApiKeysPage() {
  const [keys, setKeys] = useState<ApiKeyRecord[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [revoking, setRevoking] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [name, setName] = useState("");
  const [scopes, setScopes] = useState<string[]>(["read"]);
  // Set once, when a key is generated. There is no endpoint that can return it
  // again, so this is the only moment the plaintext exists in the browser.
  const [issued, setIssued] = useState<{ key: string; name: string } | null>(null);

  const load = useCallback(() => {
    let active = true;
    setLoading(true);
    setError(null);
    settingsApi.apiKeys
      .list()
      .then((res) => {
        if (active) setKeys(res.data ?? []);
      })
      .catch((err: unknown) => {
        if (active) setError(settingsError(err, "Unable to load API keys."));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => load(), [load]);

  const generate = async () => {
    const trimmed = name.trim();
    if (trimmed.length < 2) return;
    setCreating(true);
    try {
      const res = await settingsApi.apiKeys.generate(trimmed, scopes);
      setIssued({ key: res.data.key, name: trimmed });
      setKeys((prev) => [res.data.record, ...(prev ?? [])]);
      setDialogOpen(false);
      setName("");
      setScopes(["read"]);
    } catch (err) {
      toast.error(settingsError(err, "The key could not be generated."));
    } finally {
      setCreating(false);
    }
  };

  const revoke = async (record: ApiKeyRecord) => {
    setRevoking(record.id);
    try {
      await settingsApi.apiKeys.revoke(record.id);
      // The row stays for the audit trail; it comes back flagged inactive.
      setKeys((prev) =>
        (prev ?? []).map((k) =>
          k.id === record.id
            ? { ...k, active: false, revokedAt: new Date().toISOString() }
            : k,
        ),
      );
      toast.success(`"${record.name}" was revoked. Requests using it will now fail.`);
    } catch (err) {
      toast.error(settingsError(err, "The key could not be revoked."));
    } finally {
      setRevoking(null);
    }
  };

  const active = (keys ?? []).filter((k) => k.active);
  const revoked = (keys ?? []).filter((k) => !k.active);

  return (
    <div className="space-y-4">
      <SectionCard
        title="API keys"
        description="Authenticate server-to-server requests. A key is shown once at creation and stored only as a hash."
        actions={
          <Button
            size="sm"
            className="bg-primary hover:bg-primary/90"
            onClick={() => setDialogOpen(true)}
            disabled={loading || error !== null}
            title={error ? "Keys could not be loaded" : undefined}
          >
            <Plus className="mr-2 h-4 w-4" /> Generate key
          </Button>
        }
      >
        {error ? (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            <div className="flex items-center gap-2 font-semibold">
              <AlertTriangle className="h-4 w-4" /> Could not load API keys
            </div>
            <p className="mt-1 text-xs text-red-600">{error}</p>
            <Button variant="outline" size="sm" className="mt-3" onClick={load}>
              <RotateCcw className="mr-2 h-3 w-3" /> Retry
            </Button>
          </div>
        ) : loading ? (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-16 animate-pulse rounded-xl bg-muted/50" />
            ))}
          </div>
        ) : active.length === 0 && revoked.length === 0 ? (
          <EmptyState
            title="No API keys yet"
            description="Generate one to let another service read the waitlist or receive signup webhooks."
            illustration="default"
            action={
              <Button size="sm" onClick={() => setDialogOpen(true)}>
                <Plus className="mr-2 h-4 w-4" /> Generate key
              </Button>
            }
          />
        ) : (
          <div className="space-y-2">
            {active.map((k) => (
              <KeyRow
                key={k.id}
                record={k}
                busy={revoking === k.id}
                onRevoke={() => void revoke(k)}
              />
            ))}
            {revoked.length > 0 && (
              <div className="pt-3">
                <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Revoked
                </div>
                {revoked.map((k) => (
                  <KeyRow key={k.id} record={k} busy={false} onRevoke={() => {}} />
                ))}
              </div>
            )}
          </div>
        )}
      </SectionCard>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Generate an API key</DialogTitle>
            <DialogDescription>
              The key is displayed once. Store it somewhere safe before closing the dialog.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="key-name">Name</Label>
              <Input
                id="key-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Production server"
                className="mt-1.5"
                maxLength={80}
                autoFocus
              />
              <p className="mt-1.5 text-xs text-muted-foreground">
                Used to identify the key later. At least 2 characters.
              </p>
            </div>
            <div>
              <Label>Scopes</Label>
              <div className="mt-1.5 space-y-2">
                {SCOPES.map((s) => {
                  const on = scopes.includes(s.id);
                  return (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() =>
                        setScopes((prev) =>
                          on ? prev.filter((x) => x !== s.id) : [...prev, s.id],
                        )
                      }
                      className={`flex w-full items-start gap-3 rounded-lg border p-3 text-left transition ${
                        on ? "border-primary bg-primary/5" : "border-border/60 hover:bg-muted/50"
                      }`}
                    >
                      <div
                        className={`mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded border ${
                          on ? "border-primary bg-primary text-primary-foreground" : "border-border"
                        }`}
                      >
                        {on && <Check className="h-3 w-3" />}
                      </div>
                      <div>
                        <div className="text-sm font-medium">{s.label}</div>
                        <div className="text-xs text-muted-foreground">{s.hint}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={creating}>
              Cancel
            </Button>
            <Button
              onClick={() => void generate()}
              disabled={creating || name.trim().length < 2 || scopes.length === 0}
              title={
                name.trim().length < 2
                  ? "Give the key a name first"
                  : scopes.length === 0
                    ? "Pick at least one scope"
                    : undefined
              }
              className="bg-primary hover:bg-primary/90"
            >
              {creating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Generate
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={issued !== null} onOpenChange={(open) => !open && setIssued(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Copy your key now</DialogTitle>
            <DialogDescription>
              This is the only time "{issued?.name}" can be read. Only a hash is stored, so it
              cannot be shown again.
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-3">
            <code className="block break-all font-mono text-xs text-amber-900">{issued?.key}</code>
          </div>
          <DialogFooter>
            <CopyKeyButton value={issued?.key ?? ""} />
            <Button variant="outline" onClick={() => setIssued(null)}>
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function KeyRow({
  record, busy, onRevoke,
}: {
  record: ApiKeyRecord;
  busy: boolean;
  onRevoke: () => void;
}) {
  const [confirming, setConfirming] = useState(false);

  return (
    <div
      className={`flex flex-wrap items-center gap-3 rounded-xl border border-border/60 p-3 ${
        record.active ? "" : "opacity-60"
      }`}
    >
      <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-muted">
        {record.active ? <Key className="h-4 w-4" /> : <ShieldAlert className="h-4 w-4" />}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-semibold">{record.name}</span>
          {record.scopes.map((s) => (
            <Badge key={s} variant="secondary" className="text-[10px]">
              {s}
            </Badge>
          ))}
          {!record.active && (
            <Badge className="bg-red-50 text-[10px] text-red-700">Revoked</Badge>
          )}
        </div>
        <code className="mt-1 block truncate font-mono text-xs text-muted-foreground">
          {record.masked}
        </code>
      </div>
      <div className="text-xs text-muted-foreground">
        <div>{record.createdAt ? `Created ${formatDate(record.createdAt)}` : "Created —"}</div>
        <div>
          {record.lastUsedAt ? `Last used ${formatDate(record.lastUsedAt)}` : "Never used"}
        </div>
      </div>
      {record.active ? (
        confirming ? (
          <div className="flex items-center gap-1.5">
            <Button
              variant="destructive"
              size="sm"
              onClick={onRevoke}
              disabled={busy}
              className="h-8"
            >
              {busy ? <Loader2 className="mr-1.5 h-3 w-3 animate-spin" /> : null}
              Revoke
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-8"
              onClick={() => setConfirming(false)}
              disabled={busy}
            >
              Cancel
            </Button>
          </div>
        ) : (
          <Button
            variant="ghost"
            size="icon"
            className="text-red-600 hover:bg-red-50 hover:text-red-700"
            onClick={() => setConfirming(true)}
            title="Revoke this key"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        )
      ) : (
        <span
          className="text-xs text-muted-foreground"
          title="A revoked key is kept for the audit trail and cannot be restored"
        >
          {record.revokedAt ? formatDate(record.revokedAt) : ""}
        </span>
      )}
    </div>
  );
}

function CopyKeyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <Button
      variant="outline"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        } catch {
          toast.error("The clipboard is blocked. Select the key and copy it manually.");
        }
      }}
    >
      {copied ? <Check className="mr-2 h-4 w-4" /> : <Copy className="mr-2 h-4 w-4" />}
      {copied ? "Copied" : "Copy key"}
    </Button>
  );
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleDateString();
}
