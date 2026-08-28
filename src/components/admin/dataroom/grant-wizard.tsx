/**
 * The four-step access grant wizard: Visitor, Access, Permissions, Review.
 *
 * Every validation rule here also exists in the backend request class. This copy
 * exists so the operator sees the problem next to the field instead of after a
 * round trip, and so "Next" cannot advance past an incomplete step. The scope
 * shipped to the API is produced by `grantInputFromDraft`, which is pinned by
 * tests: sending a wider scope than the operator ticked would grant access nobody
 * asked for.
 */

import { useEffect, useMemo, useState } from "react";
import { Check, ChevronLeft, ChevronRight, Loader2, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { DetailRow, IssueList } from "./bits";
import {
  durationLabel,
  durationNeedsConfirmation,
  durationNeedsDate,
  emptyGrantDraft,
  grantInputFromDraft,
  scopeSummary,
  wizardBlockingIssues,
  wizardStepIssues,
  type GrantDraft,
  type WizardStep,
} from "@/lib/dataroom/admin-format";
import type {
  DataRoomAccessTemplate,
  DataRoomAdminDocument,
  DataRoomAdminFolder,
  DataRoomGrantDuration,
  DataRoomGrantInput,
} from "@/lib/api/dataroom-admin";

const DURATIONS: DataRoomGrantDuration[] = [
  "1h",
  "6h",
  "24h",
  "3d",
  "7d",
  "14d",
  "30d",
  "custom",
  "never",
];

const STEP_TITLES: Record<WizardStep, string> = {
  1: "Visitor",
  2: "Access window",
  3: "Permissions",
  4: "Review",
};

export type GrantWizardProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  folders: DataRoomAdminFolder[];
  documents: DataRoomAdminDocument[];
  templates: DataRoomAccessTemplate[];
  defaultDuration?: DataRoomGrantDuration;
  /** Rejects with an `ApiError` the wizard shows without closing. */
  onCreate: (body: DataRoomGrantInput) => Promise<void>;
};

export function GrantWizard({
  open,
  onOpenChange,
  folders,
  documents,
  templates,
  defaultDuration = "7d",
  onCreate,
}: GrantWizardProps) {
  const [step, setStep] = useState<WizardStep>(1);
  const [draft, setDraft] = useState<GrantDraft>(() => emptyGrantDraft(defaultDuration));
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  // A fresh draft on every open. Carrying the previous visitor's selections into
  // a new grant is the easiest way to hand the wrong person the wrong documents.
  useEffect(() => {
    if (open) {
      setStep(1);
      setDraft(emptyGrantDraft(defaultDuration));
      setServerError(null);
      setSubmitting(false);
    }
  }, [open, defaultDuration]);

  const patch = (changes: Partial<GrantDraft>) => setDraft((prev) => ({ ...prev, ...changes }));

  const stepIssues = useMemo(() => wizardStepIssues(step, draft), [step, draft]);
  const allIssues = useMemo(() => wizardBlockingIssues(draft), [draft]);

  const publishedDocuments = useMemo(
    () => documents.filter((doc) => doc.status === "published" && !doc.deletedAt),
    [documents],
  );

  function applyTemplate(value: string) {
    if (value === "none") {
      patch({ templateId: null });
      return;
    }
    const template = templates.find((item) => String(item.id) === value);
    if (!template) return;
    patch({
      templateId: template.id,
      allDocumentsAccess: template.allDocumentsAccess,
      downloadsPermitted: template.downloadsPermitted,
      folderIds: template.allDocumentsAccess ? [] : [...template.folderIds],
      documentIds: template.allDocumentsAccess ? [] : [...template.documentIds],
      // A template carries no per-item overrides, so start them empty rather
      // than leaving a previous selection's flags attached to new ids.
      documentDownload: {},
      documentPrint: {},
      folderDownload: {},
    });
  }

  function toggleId(list: number[], id: number): number[] {
    return list.includes(id) ? list.filter((item) => item !== id) : [...list, id];
  }

  async function submit() {
    if (allIssues.length) {
      setStep(1);
      return;
    }
    setSubmitting(true);
    setServerError(null);
    try {
      await onCreate(grantInputFromDraft(draft));
    } catch (error) {
      setServerError(error instanceof Error ? error.message : "The grant could not be created.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>New access grant</DialogTitle>
          <DialogDescription>
            The visitor signs in with the email address entered here plus a code shown once, after
            the grant is created.
          </DialogDescription>
        </DialogHeader>

        <ol className="flex items-center gap-1" aria-label="Wizard progress">
          {([1, 2, 3, 4] as WizardStep[]).map((value) => (
            <li key={value} className="flex-1">
              <div
                className={cn(
                  "flex items-center gap-2 rounded-lg border px-2.5 py-1.5 text-xs font-medium",
                  value === step
                    ? "border-primary/40 bg-primary/10 text-primary"
                    : value < step
                      ? "border-border/60 bg-muted/40 text-muted-foreground"
                      : "border-border/40 text-muted-foreground/70",
                )}
                aria-current={value === step ? "step" : undefined}
              >
                {value < step ? (
                  <Check className="h-3.5 w-3.5" aria-hidden="true" />
                ) : (
                  <span aria-hidden="true">{value}</span>
                )}
                <span className="truncate">{STEP_TITLES[value]}</span>
              </div>
            </li>
          ))}
        </ol>

        <div className="space-y-4 py-2">
          {step === 1 && <StepVisitor draft={draft} patch={patch} />}
          {step === 2 && (
            <StepAccess
              draft={draft}
              patch={patch}
              templates={templates}
              applyTemplate={applyTemplate}
            />
          )}
          {step === 3 && (
            <StepPermissions
              draft={draft}
              patch={patch}
              folders={folders}
              documents={publishedDocuments}
              toggleId={toggleId}
            />
          )}
          {step === 4 && <StepReview draft={draft} folders={folders} documents={documents} />}

          <IssueList issues={step === 4 ? allIssues : stepIssues} />
          {serverError && (
            <p className="rounded-xl border border-destructive/25 bg-destructive/5 px-3 py-2 text-xs text-destructive">
              {serverError}
            </p>
          )}
        </div>

        <div className="flex items-center justify-between gap-2 border-t border-border/60 pt-4">
          <Button
            variant="ghost"
            onClick={() => setStep((prev) => (prev > 1 ? ((prev - 1) as WizardStep) : prev))}
            disabled={step === 1 || submitting}
          >
            <ChevronLeft className="mr-1 h-4 w-4" aria-hidden="true" />
            Back
          </Button>
          {step < 4 ? (
            <Button
              onClick={() => setStep((prev) => (prev + 1) as WizardStep)}
              disabled={stepIssues.length > 0}
            >
              Next
              <ChevronRight className="ml-1 h-4 w-4" aria-hidden="true" />
            </Button>
          ) : (
            <Button onClick={() => void submit()} disabled={allIssues.length > 0 || submitting}>
              {submitting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
              ) : (
                <Lock className="mr-2 h-4 w-4" aria-hidden="true" />
              )}
              Create grant
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

type Patch = (changes: Partial<GrantDraft>) => void;

function StepVisitor({ draft, patch }: { draft: GrantDraft; patch: Patch }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="space-y-1.5">
        <Label htmlFor="grant-name">Full name</Label>
        <Input
          id="grant-name"
          value={draft.visitorName}
          onChange={(event) => patch({ visitorName: event.target.value })}
          placeholder="Aisha Bello"
          autoComplete="off"
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="grant-email">Email address</Label>
        <Input
          id="grant-email"
          type="email"
          value={draft.visitorEmail}
          onChange={(event) => patch({ visitorEmail: event.target.value })}
          placeholder="aisha@fund.example"
          autoComplete="off"
          aria-describedby="grant-email-hint"
        />
        <p id="grant-email-hint" className="text-[11px] text-muted-foreground">
          Half the credential, and fixed after creation. To change it, revoke this grant and issue a
          new one.
        </p>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="grant-org">Organization</Label>
        <Input
          id="grant-org"
          value={draft.organization}
          onChange={(event) => patch({ organization: event.target.value })}
          placeholder="Sahel Ventures"
          autoComplete="off"
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="grant-role">Role or visitor type</Label>
        <Input
          id="grant-role"
          value={draft.roleTitle}
          onChange={(event) => patch({ roleTitle: event.target.value })}
          placeholder="Partner"
          autoComplete="off"
        />
      </div>
      <div className="space-y-1.5 sm:col-span-2">
        <Label htmlFor="grant-notes">Internal notes</Label>
        <Textarea
          id="grant-notes"
          value={draft.notes}
          onChange={(event) => patch({ notes: event.target.value })}
          rows={2}
          placeholder="Intro via Yusuf. Sent the teaser on 14 August."
        />
        <p className="text-[11px] text-muted-foreground">
          Administrators only. The visitor never sees this.
        </p>
      </div>
    </div>
  );
}

function StepAccess({
  draft,
  patch,
  templates,
  applyTemplate,
}: {
  draft: GrantDraft;
  patch: Patch;
  templates: DataRoomAccessTemplate[];
  applyTemplate: (value: string) => void;
}) {
  return (
    <div className="space-y-4">
      {templates.length > 0 && (
        <div className="space-y-1.5">
          <Label htmlFor="grant-template">Start from a template</Label>
          <Select
            value={draft.templateId == null ? "none" : String(draft.templateId)}
            onValueChange={applyTemplate}
          >
            <SelectTrigger id="grant-template">
              <SelectValue placeholder="No template" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">No template</SelectItem>
              {templates.map((template) => (
                <SelectItem key={template.id} value={String(template.id)}>
                  {template.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-[11px] text-muted-foreground">
            A template fills in the scope on the next step. It is a starting point, not a lock:
            everything stays editable.
          </p>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="grant-duration">Access duration</Label>
          <Select
            value={draft.duration}
            onValueChange={(value) =>
              patch({ duration: value as DataRoomGrantDuration, confirmNeverExpires: false })
            }
          >
            <SelectTrigger id="grant-duration">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {DURATIONS.map((duration) => (
                <SelectItem key={duration} value={duration}>
                  {durationLabel(duration)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {durationNeedsDate(draft.duration) && (
          <div className="space-y-1.5">
            <Label htmlFor="grant-expires">Ends at</Label>
            <Input
              id="grant-expires"
              type="datetime-local"
              value={draft.expiresAtLocal}
              onChange={(event) => patch({ expiresAtLocal: event.target.value })}
            />
          </div>
        )}

        <div className="space-y-1.5">
          <Label htmlFor="grant-starts">Starts at (optional)</Label>
          <Input
            id="grant-starts"
            type="datetime-local"
            value={draft.startsAtLocal}
            onChange={(event) => patch({ startsAtLocal: event.target.value })}
          />
          <p className="text-[11px] text-muted-foreground">
            A future start holds the grant at Pending. Sign-in is refused until then.
          </p>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="grant-max-uses">Maximum sign-ins (optional)</Label>
          <Input
            id="grant-max-uses"
            inputMode="numeric"
            value={draft.maxUses}
            onChange={(event) => patch({ maxUses: event.target.value })}
            placeholder="Unlimited"
          />
          <p className="text-[11px] text-muted-foreground">
            Leave blank for unlimited. Once spent, the grant reads Exhausted.
          </p>
        </div>
      </div>

      {durationNeedsConfirmation(draft.duration) && (
        <label className="flex items-start gap-3 rounded-xl border border-[var(--gold)]/45 bg-[var(--gold)]/10 px-3 py-2.5">
          <Checkbox
            checked={draft.confirmNeverExpires}
            onCheckedChange={(checked) => patch({ confirmNeverExpires: checked === true })}
            aria-label="Confirm this grant never expires"
          />
          <span className="text-xs">
            This grant will never expire. Access ends only when an administrator suspends or revokes
            it.
          </span>
        </label>
      )}
    </div>
  );
}

function StepPermissions({
  draft,
  patch,
  folders,
  documents,
  toggleId,
}: {
  draft: GrantDraft;
  patch: Patch;
  folders: DataRoomAdminFolder[];
  documents: DataRoomAdminDocument[];
  toggleId: (list: number[], id: number) => number[];
}) {
  return (
    <div className="space-y-4">
      <label className="flex items-start justify-between gap-3 rounded-xl border border-border/60 bg-muted/30 px-3 py-2.5">
        <span className="text-xs">
          <span className="block text-sm font-medium">Grant the whole room</span>
          Every published document, including anything uploaded later. Categories and individual
          documents are ignored while this is on.
        </span>
        <Switch
          checked={draft.allDocumentsAccess}
          onCheckedChange={(checked) => patch({ allDocumentsAccess: checked })}
          aria-label="Grant access to the whole room"
        />
      </label>

      <label className="flex items-start justify-between gap-3 rounded-xl border border-border/60 px-3 py-2.5">
        <span className="text-xs">
          <span className="block text-sm font-medium">Allow downloads</span>
          Off means view and preview only. Per-item switches below cannot override this.
        </span>
        <Switch
          checked={draft.downloadsPermitted}
          onCheckedChange={(checked) => patch({ downloadsPermitted: checked })}
          aria-label="Allow downloads for this grant"
        />
      </label>

      {!draft.allDocumentsAccess && (
        <>
          <fieldset className="space-y-2">
            <legend className="text-sm font-medium">Categories</legend>
            {folders.length === 0 ? (
              <p className="text-xs text-muted-foreground">No categories exist yet.</p>
            ) : (
              <ul className="divide-y divide-border/60 rounded-xl border border-border/60">
                {folders.map((folder) => {
                  const selected = draft.folderIds.includes(folder.id);
                  return (
                    <li key={folder.id} className="flex items-center gap-3 px-3 py-2">
                      <Checkbox
                        checked={selected}
                        onCheckedChange={() =>
                          patch({ folderIds: toggleId(draft.folderIds, folder.id) })
                        }
                        aria-label={`Include the category ${folder.name}`}
                      />
                      <span className="min-w-0 flex-1 truncate text-sm">
                        {folder.name}
                        <span className="ml-2 text-xs text-muted-foreground">
                          {folder.publishedDocumentsCount} published
                        </span>
                      </span>
                      {selected && draft.downloadsPermitted && (
                        <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <Checkbox
                            checked={draft.folderDownload[folder.id] === true}
                            onCheckedChange={(checked) =>
                              patch({
                                folderDownload: {
                                  ...draft.folderDownload,
                                  [folder.id]: checked === true,
                                },
                              })
                            }
                            aria-label={`Allow downloads in ${folder.name}`}
                          />
                          Download
                        </label>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </fieldset>

          <fieldset className="space-y-2">
            <legend className="text-sm font-medium">Individual documents</legend>
            <p className="text-[11px] text-muted-foreground">
              Selecting one document and nothing else is a valid grant. The visitor still signs in
              with their own email and code, and sees only that document.
            </p>
            {documents.length === 0 ? (
              <p className="text-xs text-muted-foreground">No published documents yet.</p>
            ) : (
              <ul className="max-h-64 divide-y divide-border/60 overflow-y-auto rounded-xl border border-border/60">
                {documents.map((doc) => {
                  const selected = draft.documentIds.includes(doc.id);
                  return (
                    <li key={doc.id} className="flex items-center gap-3 px-3 py-2">
                      <Checkbox
                        checked={selected}
                        onCheckedChange={() =>
                          patch({ documentIds: toggleId(draft.documentIds, doc.id) })
                        }
                        aria-label={`Include the document ${doc.title}`}
                      />
                      <span className="min-w-0 flex-1 truncate text-sm">
                        {doc.title}
                        <span className="ml-2 text-xs text-muted-foreground">
                          {doc.folderName ?? "Uncategorized"}
                        </span>
                      </span>
                      {selected && (
                        <span className="flex items-center gap-3">
                          {draft.downloadsPermitted && (
                            <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                              <Checkbox
                                checked={draft.documentDownload[doc.id] === true}
                                onCheckedChange={(checked) =>
                                  patch({
                                    documentDownload: {
                                      ...draft.documentDownload,
                                      [doc.id]: checked === true,
                                    },
                                  })
                                }
                                aria-label={`Allow downloading ${doc.title}`}
                              />
                              Download
                            </label>
                          )}
                          <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <Checkbox
                              checked={draft.documentPrint[doc.id] === true}
                              onCheckedChange={(checked) =>
                                patch({
                                  documentPrint: {
                                    ...draft.documentPrint,
                                    [doc.id]: checked === true,
                                  },
                                })
                              }
                              aria-label={`Allow printing ${doc.title}`}
                            />
                            Print
                          </label>
                        </span>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </fieldset>
        </>
      )}
    </div>
  );
}

function StepReview({
  draft,
  folders,
  documents,
}: {
  draft: GrantDraft;
  folders: DataRoomAdminFolder[];
  documents: DataRoomAdminDocument[];
}) {
  const folderNames = folders
    .filter((folder) => draft.folderIds.includes(folder.id))
    .map((folder) => folder.name);
  const documentTitles = documents
    .filter((doc) => draft.documentIds.includes(doc.id))
    .map((doc) => doc.title);

  return (
    <div className="space-y-4">
      <dl className="grid gap-x-6 sm:grid-cols-2">
        <DetailRow label="Visitor">{draft.visitorName.trim() || "—"}</DetailRow>
        <DetailRow label="Email">{draft.visitorEmail.trim().toLowerCase() || "—"}</DetailRow>
        <DetailRow label="Organization">{draft.organization.trim() || "—"}</DetailRow>
        <DetailRow label="Role">{draft.roleTitle.trim() || "—"}</DetailRow>
        <DetailRow label="Duration">{durationLabel(draft.duration)}</DetailRow>
        <DetailRow label="Maximum sign-ins">{draft.maxUses.trim() || "Unlimited"}</DetailRow>
      </dl>

      <div className="rounded-xl border border-border/60 bg-muted/30 px-3 py-2.5">
        <p className="text-sm font-medium">{scopeSummary(draft)}</p>
        {draft.allDocumentsAccess ? (
          <p className="mt-1 text-xs text-muted-foreground">
            Includes documents published after today.
          </p>
        ) : (
          <ul className="mt-1 space-y-0.5 text-xs text-muted-foreground">
            {folderNames.map((name) => (
              <li key={`folder-${name}`}>Category: {name}</li>
            ))}
            {documentTitles.map((title) => (
              <li key={`doc-${title}`}>Document: {title}</li>
            ))}
          </ul>
        )}
      </div>

      <p className="text-[11px] text-muted-foreground">
        The access code is generated by the server and shown once on the next screen. It is stored
        as a hash, so it cannot be looked up later. Deliver it to the visitor yourself: nothing is
        emailed automatically.
      </p>
    </div>
  );
}
