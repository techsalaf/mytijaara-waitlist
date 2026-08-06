import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { EmptyState, SectionCard } from "@/components/admin/ui-bits";
import { templatesApi } from "@/lib/api";
import type { EmailTemplateDetail, EmailTemplateInput } from "@/lib/api";
import { ApiError } from "@/lib/api/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Mail,
  Plus,
  Loader2,
  Pencil,
  Trash2,
  Eye,
  RotateCcw,
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/email/templates")({
  component: EmailTemplates,
});

const CATEGORIES = [
  { value: "transactional", label: "Transactional" },
  { value: "marketing", label: "Marketing" },
  { value: "notification", label: "Notification" },
  { value: "custom", label: "Custom" },
] as const;

const BLANK_INPUT: EmailTemplateInput = {
  name: "",
  category: "transactional",
  subject: "",
  html: "",
  text: "",
};

/** HTML thumbnail preview rendered inline on the card */
function TemplateThumbnail({ html }: { html: string | null }) {
  const ref = useRef<HTMLIFrameElement>(null);
  useEffect(() => {
    const doc = ref.current?.contentDocument;
    if (!doc) return;
    doc.open();
    doc.write(html ?? "<p style='color:#aaa;font-family:sans-serif;padding:24px'>No HTML yet</p>");
    doc.close();
  }, [html]);
  return (
    <iframe
      ref={ref}
      title="preview-thumb"
      sandbox="allow-same-origin"
      className="pointer-events-none h-full w-full border-0"
      aria-hidden="true"
    />
  );
}

/** Full-screen preview dialog */
function PreviewDialog({
  open,
  onClose,
  template,
}: {
  open: boolean;
  onClose: () => void;
  template: EmailTemplateDetail | null;
}) {
  const ref = useRef<HTMLIFrameElement>(null);
  useEffect(() => {
    if (!open || !template) return;
    const doc = ref.current?.contentDocument;
    if (!doc) return;
    doc.open();
    doc.write(template.html ?? "<p>No HTML content</p>");
    doc.close();
  }, [open, template]);
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="flex h-[90vh] max-h-[90vh] max-w-4xl flex-col p-0">
        <DialogHeader className="shrink-0 px-6 pt-5 pb-3">
          <DialogTitle>{template?.name ?? "Preview"}</DialogTitle>
          {template?.subject && (
            <p className="text-sm text-muted-foreground">
              Subject: <span className="font-medium text-foreground">{template.subject}</span>
            </p>
          )}
        </DialogHeader>
        <div className="flex-1 overflow-hidden border-t border-border">
          <iframe
            ref={ref}
            title="email-preview"
            sandbox="allow-same-origin"
            className="h-full w-full border-0 bg-white"
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}

/** Create / edit slide-over sheet */
function TemplateSheet({
  open,
  initial,
  onClose,
  onSaved,
}: {
  open: boolean;
  initial: EmailTemplateDetail | null;
  onClose: () => void;
  onSaved: (t: EmailTemplateDetail) => void;
}) {
  const isEdit = Boolean(initial?.id);
  const [form, setForm] = useState<EmailTemplateInput>(BLANK_INPUT);
  const [saving, setSaving] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);

  // Sync form when the sheet opens / changes target
  useEffect(() => {
    if (!open) return;
    setForm(
      initial
        ? {
            name: initial.name,
            category: initial.category,
            subject: initial.subject ?? "",
            html: initial.html ?? "",
            text: initial.text ?? "",
          }
        : BLANK_INPUT,
    );
  }, [open, initial]);

  const field = <K extends keyof EmailTemplateInput>(key: K, value: EmailTemplateInput[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const submit = async () => {
    if (!form.name.trim()) {
      toast.error("Template name is required.");
      return;
    }
    setSaving(true);
    try {
      const result = isEdit
        ? await templatesApi.update(initial!.id, form)
        : await templatesApi.create(form);
      onSaved(result.data);
      toast.success(isEdit ? "Template updated." : "Template created.");
      onClose();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.firstError : "Save failed.");
    } finally {
      setSaving(false);
    }
  };

  // Preview template: compose a temporary EmailTemplateDetail from form state
  const previewTemplate: EmailTemplateDetail = {
    id: initial?.id ?? "",
    name: form.name,
    category: form.category ?? "",
    subject: form.subject ?? null,
    html: form.html ?? null,
    text: form.text ?? null,
    thumbnail: "",
    updatedAt: "",
  };

  return (
    <>
      <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
        <SheetContent
          side="right"
          className="flex w-full flex-col gap-0 p-0 sm:max-w-2xl"
        >
          <SheetHeader className="shrink-0 border-b border-border px-6 py-4">
            <SheetTitle>{isEdit ? "Edit template" : "New template"}</SheetTitle>
            <SheetDescription>
              {isEdit ? `Editing "${initial?.name}"` : "Create a reusable email design."}
            </SheetDescription>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto px-6 py-4">
            <div className="space-y-4">
              {/* Name + Category */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label>
                    Template name <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    value={form.name}
                    onChange={(e) => field("name", e.target.value)}
                    placeholder="Waitlist welcome"
                    className="mt-1.5"
                  />
                </div>
                <div>
                  <Label>Category</Label>
                  <Select
                    value={form.category ?? "transactional"}
                    onValueChange={(v) => field("category", v)}
                  >
                    <SelectTrigger className="mt-1.5">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map((c) => (
                        <SelectItem key={c.value} value={c.value}>
                          {c.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Subject */}
              <div>
                <Label>Subject line</Label>
                <Input
                  value={form.subject ?? ""}
                  onChange={(e) => field("subject", e.target.value)}
                  placeholder="You're on the MyTijaara waitlist 🎉"
                  className="mt-1.5"
                />
              </div>

              {/* HTML / plain-text tabs */}
              <Tabs defaultValue="html">
                <div className="mb-2 flex items-center justify-between">
                  <TabsList>
                    <TabsTrigger value="html">HTML</TabsTrigger>
                    <TabsTrigger value="text">Plain text</TabsTrigger>
                  </TabsList>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setPreviewOpen(true)}
                    className="cursor-pointer"
                  >
                    <Eye className="mr-1.5 h-3.5 w-3.5" /> Preview
                  </Button>
                </div>
                <TabsContent value="html">
                  <Textarea
                    value={form.html ?? ""}
                    onChange={(e) => field("html", e.target.value)}
                    rows={20}
                    placeholder="<!DOCTYPE html>…"
                    className="font-mono text-xs"
                    spellCheck={false}
                  />
                  <p className="mt-1 text-xs text-muted-foreground">
                    Paste full HTML. Blade variables like{" "}
                    <code className="text-xs">{"{{ $name }}"}</code> work in server-rendered sends.
                  </p>
                </TabsContent>
                <TabsContent value="text">
                  <Textarea
                    value={form.text ?? ""}
                    onChange={(e) => field("text", e.target.value)}
                    rows={20}
                    placeholder="Plain-text fallback for email clients that block HTML."
                    className="font-mono text-xs"
                    spellCheck={false}
                  />
                </TabsContent>
              </Tabs>
            </div>
          </div>

          <SheetFooter className="shrink-0 border-t border-border px-6 py-4">
            <Button variant="outline" onClick={onClose} disabled={saving}>
              Cancel
            </Button>
            <Button
              onClick={() => void submit()}
              disabled={saving}
              className="cursor-pointer bg-primary hover:bg-primary/90"
            >
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isEdit ? "Save changes" : "Create template"}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <PreviewDialog
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        template={previewTemplate}
      />
    </>
  );
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

function EmailTemplates() {
  const [templates, setTemplates] = useState<EmailTemplateDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Sheet state
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editing, setEditing] = useState<EmailTemplateDetail | null>(null);

  // Preview state
  const [previewTarget, setPreviewTarget] = useState<EmailTemplateDetail | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);

  // Delete confirm state
  const [deleteTarget, setDeleteTarget] = useState<EmailTemplateDetail | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    try {
      const r = await templatesApi.list();
      setTemplates(r.data);
    } catch (err) {
      setError(err instanceof ApiError ? err.firstError : "Could not load templates.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const openCreate = () => {
    setEditing(null);
    setSheetOpen(true);
  };

  const openEdit = async (t: EmailTemplateDetail) => {
    // Fetch full detail (html/text not in list response)
    try {
      const r = await templatesApi.get(t.id);
      setEditing(r.data);
    } catch {
      setEditing(t); // fallback to list data
    }
    setSheetOpen(true);
  };

  const openPreview = async (t: EmailTemplateDetail) => {
    try {
      const r = await templatesApi.get(t.id);
      setPreviewTarget(r.data);
    } catch {
      setPreviewTarget(t);
    }
    setPreviewOpen(true);
  };

  const onSaved = (t: EmailTemplateDetail) => {
    setTemplates((prev) => {
      const idx = prev.findIndex((x) => x.id === t.id);
      if (idx === -1) return [t, ...prev];
      return prev.map((x) => (x.id === t.id ? t : x));
    });
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await templatesApi.remove(deleteTarget.id);
      setTemplates((prev) => prev.filter((x) => x.id !== deleteTarget.id));
      toast.success("Template deleted.");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.firstError : "Delete failed.");
    } finally {
      setDeleting(false);
      setDeleteTarget(null);
    }
  };

  if (loading) {
    return (
      <div className="flex h-48 items-center justify-center text-muted-foreground">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading templates…
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-destructive/40 bg-destructive/5 p-6 text-center text-sm text-destructive">
        {error}
        <Button
          variant="link"
          className="ml-2 cursor-pointer p-0 text-destructive"
          onClick={() => void load()}
        >
          <RotateCcw className="mr-1 h-3 w-3" /> Retry
        </Button>
      </div>
    );
  }

  return (
    <>
      <SectionCard
        title="Email templates"
        description="Reusable email designs for campaigns and transactional sends"
        actions={
          <Button
            size="sm"
            className="cursor-pointer bg-primary hover:bg-primary/90"
            onClick={openCreate}
          >
            <Plus className="mr-2 h-4 w-4" /> New template
          </Button>
        }
      >
        {templates.length === 0 ? (
          <EmptyState
            icon={Mail}
            title="No templates yet"
            description="Create a reusable template to speed up campaign writing."
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {templates.map((t) => (
              <div
                key={t.id}
                className="group overflow-hidden rounded-xl border border-border/60 bg-card shadow-sm transition-shadow hover:shadow-md"
              >
                {/* Thumbnail */}
                <div className="relative aspect-video overflow-hidden bg-white">
                  <TemplateThumbnail html={t.html} />
                  {/* Hover overlay with actions */}
                  <div className="absolute inset-0 flex items-center justify-center gap-2 bg-black/50 opacity-0 transition-opacity group-hover:opacity-100">
                    <button
                      type="button"
                      onClick={() => void openPreview(t)}
                      className="grid h-9 w-9 cursor-pointer place-items-center rounded-lg bg-white/90 text-foreground shadow hover:bg-white"
                      aria-label="Preview template"
                    >
                      <Eye className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => void openEdit(t)}
                      className="grid h-9 w-9 cursor-pointer place-items-center rounded-lg bg-white/90 text-foreground shadow hover:bg-white"
                      aria-label="Edit template"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleteTarget(t)}
                      className="grid h-9 w-9 cursor-pointer place-items-center rounded-lg bg-white/90 text-destructive shadow hover:bg-white"
                      aria-label="Delete template"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {/* Card footer */}
                <div className="p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-semibold">{t.name}</div>
                      {t.subject && (
                        <div className="mt-0.5 truncate text-xs text-muted-foreground">
                          {t.subject}
                        </div>
                      )}
                    </div>
                    <Badge variant="secondary" className="shrink-0 capitalize">
                      {t.category}
                    </Badge>
                  </div>
                  <div className="mt-2 flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">
                      Updated {t.updatedAt}
                    </span>
                    <div className="flex gap-1">
                      <button
                        type="button"
                        onClick={() => void openPreview(t)}
                        className="grid h-7 w-7 cursor-pointer place-items-center rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground"
                        aria-label="Preview"
                      >
                        <Eye className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => void openEdit(t)}
                        className="grid h-7 w-7 cursor-pointer place-items-center rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground"
                        aria-label="Edit"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteTarget(t)}
                        className="grid h-7 w-7 cursor-pointer place-items-center rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                        aria-label="Delete"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </SectionCard>

      {/* Create / edit sheet */}
      <TemplateSheet
        open={sheetOpen}
        initial={editing}
        onClose={() => setSheetOpen(false)}
        onSaved={onSaved}
      />

      {/* Preview dialog */}
      <PreviewDialog
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        template={previewTarget}
      />

      {/* Delete confirmation */}
      <AlertDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(v) => !v && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete template?</AlertDialogTitle>
            <AlertDialogDescription>
              <strong>"{deleteTarget?.name}"</strong> will be permanently removed and cannot be
              recovered. Any campaigns using this template will keep their current content.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => void confirmDelete()}
              disabled={deleting}
              className="cursor-pointer bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
