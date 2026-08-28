/**
 * `/admin/data-room/documents` — categories, uploads, versions, lifecycle.
 *
 * Two things here are easy to get wrong and are handled deliberately.
 *
 * Preview streams through `previewDocumentBlob`, which needs the admin token in a
 * header, so it cannot be an `<iframe src>` pointed at the API. It becomes an
 * object URL, and every object URL created here is revoked: on close, on
 * replacement, and on unmount. Leaking one keeps the decrypted bytes of a
 * confidential document alive in the tab for as long as the page is open.
 *
 * Deletion is soft by default. `purge` destroys the bytes of every version and is
 * gated behind a typed phrase, because there is no undo and no backup on the
 * application side.
 */

import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  Eye,
  FilePlus2,
  FolderPlus,
  Loader2,
  Pencil,
  RotateCcw,
  Trash2,
  Upload,
} from "lucide-react";
import { toast } from "sonner";
import { EmptyState, SectionCard } from "@/components/admin/ui-bits";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ConfirmationModal, StatusPill, loadState } from "@/components/admin/dataroom/bits";
import { errorMessage, useResource } from "@/components/admin/dataroom/use-resource";
import {
  DocumentUploadModal,
  type DocumentUploadFields,
} from "@/components/admin/dataroom/document-upload-modal";
import { dataRoomAdminApi } from "@/lib/api/dataroom-admin";
import type {
  DataRoomAdminDocument,
  DataRoomAdminFolder,
  DataRoomConfidentiality,
  DataRoomDocumentStatus,
} from "@/lib/api/dataroom-admin";
import {
  adminConfidentialityLabel,
  documentStatusView,
  reorderPayload,
  shortChecksum,
  suggestNextVersions,
} from "@/lib/dataroom/admin-format";
import { formatBytes, formatDateTime, previewSupportedFor } from "@/lib/dataroom/format";

export const Route = createFileRoute("/admin/data-room/documents")({
  component: DataRoomDocumentsRoute,
});

const STATUSES: DataRoomDocumentStatus[] = [
  "draft",
  "published",
  "restricted",
  "archived",
  "superseded",
];

const LEVELS: DataRoomConfidentiality[] = [
  "highly_confidential",
  "confidential",
  "restricted",
  "internal",
  "public",
];

type Loaded = { folders: DataRoomAdminFolder[]; documents: DataRoomAdminDocument[] };

function DataRoomDocumentsRoute() {
  const load = useCallback(async (): Promise<Loaded> => {
    const [folders, documents] = await Promise.all([
      dataRoomAdminApi.folders(),
      dataRoomAdminApi.documents(),
    ]);
    return { folders: folders.data, documents: documents.data };
  }, []);
  const res = useResource(load, "Could not load the data room documents.");

  const [uploadOpen, setUploadOpen] = useState(false);
  const [editing, setEditing] = useState<DataRoomAdminDocument | null>(null);
  const [versionFor, setVersionFor] = useState<DataRoomAdminDocument | null>(null);
  const [preview, setPreview] = useState<{
    url: string;
    contentType: string;
    title: string;
  } | null>(null);
  const [pendingDelete, setPendingDelete] = useState<{
    doc: DataRoomAdminDocument;
    purge: boolean;
  } | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [newFolder, setNewFolder] = useState("");

  // The object URL holds the document bytes. Revoke on replacement and on
  // unmount, or a confidential file stays resident for the life of the tab.
  useEffect(() => {
    if (!preview) return;
    return () => URL.revokeObjectURL(preview.url);
  }, [preview]);

  const folders = useMemo(
    () => [...(res.data?.folders ?? [])].sort((a, b) => a.sortOrder - b.sortOrder),
    [res.data],
  );
  const documents = res.data?.documents ?? [];

  const state = loadState({
    loading: res.loading,
    error: res.error,
    forbidden: res.forbidden,
    onRetry: () => void res.reload(),
    label: "the documents",
  });
  if (state || !res.data) return state;

  async function run(key: string, work: () => Promise<void>, success: string) {
    setBusy(key);
    try {
      await work();
      await res.reload();
      toast.success(success);
    } catch (error) {
      toast.error(errorMessage(error, "The change was refused."));
    } finally {
      setBusy(null);
    }
  }

  function moveFolder(index: number, direction: -1 | 1) {
    const next = [...folders];
    const target = index + direction;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    void run(
      "reorder",
      async () => {
        await dataRoomAdminApi.reorderFolders(reorderPayload(next.map((f) => f.id)));
      },
      "Category order saved.",
    );
  }

  async function openPreview(doc: DataRoomAdminDocument) {
    setBusy(`preview-${doc.id}`);
    try {
      const blob = await dataRoomAdminApi.previewDocumentBlob(doc.id);
      setPreview({ ...blob, title: doc.title });
    } catch (error) {
      toast.error(errorMessage(error, "The preview could not be produced."));
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-6">
      <SectionCard
        title="Categories"
        description="The sidebar order a visitor sees. A category with documents inside cannot be deleted."
        actions={
          <div className="flex items-end gap-2">
            <div className="space-y-1">
              <Label htmlFor="new-folder" className="sr-only">
                New category name
              </Label>
              <Input
                id="new-folder"
                value={newFolder}
                onChange={(event) => setNewFolder(event.target.value)}
                placeholder="06 Market & Competition"
                className="h-9 w-56"
              />
            </div>
            <Button
              size="sm"
              disabled={!newFolder.trim() || busy === "create-folder"}
              onClick={() =>
                void run(
                  "create-folder",
                  async () => {
                    await dataRoomAdminApi.createFolder({ name: newFolder.trim() });
                    setNewFolder("");
                  },
                  "Category created.",
                )
              }
            >
              <FolderPlus className="mr-2 h-4 w-4" aria-hidden="true" />
              Add
            </Button>
          </div>
        }
      >
        {!folders.length ? (
          <EmptyState
            illustration="inbox"
            title="No categories yet"
            description="Documents can sit outside a category, but the room reads better with the diligence sections in place."
          />
        ) : (
          <ul className="divide-y divide-border/60">
            {folders.map((folder, index) => (
              <li key={folder.id} className="flex flex-wrap items-center gap-3 py-2.5">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{folder.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {folder.documentsCount} document{folder.documentsCount === 1 ? "" : "s"},{" "}
                    {folder.publishedDocumentsCount} published
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={`Move ${folder.name} up`}
                  disabled={index === 0 || busy === "reorder"}
                  onClick={() => moveFolder(index, -1)}
                >
                  <ArrowUp className="h-4 w-4" aria-hidden="true" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={`Move ${folder.name} down`}
                  disabled={index === folders.length - 1 || busy === "reorder"}
                  onClick={() => moveFolder(index, 1)}
                >
                  <ArrowDown className="h-4 w-4" aria-hidden="true" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={`Delete ${folder.name}`}
                  disabled={busy === `folder-${folder.id}`}
                  onClick={() =>
                    void run(
                      `folder-${folder.id}`,
                      async () => {
                        await dataRoomAdminApi.deleteFolder(folder.id);
                      },
                      "Category deleted.",
                    )
                  }
                >
                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </SectionCard>

      <SectionCard
        title="Documents"
        description="A visitor sees only what is Published, and only inside the scope of their grant."
        actions={
          <Button size="sm" onClick={() => setUploadOpen(true)}>
            <Upload className="mr-2 h-4 w-4" aria-hidden="true" />
            Upload document
          </Button>
        }
      >
        {!documents.length ? (
          <EmptyState
            illustration="default"
            title="The room is empty"
            description="Upload the pitch deck, the financial model and the corporate documents. Nothing is visible to a visitor until you publish it."
            action={
              <Button size="sm" onClick={() => setUploadOpen(true)}>
                Upload the first document
              </Button>
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <caption className="sr-only">
                Every document in the data room, with its status, confidentiality level, checksum
                and engagement counts.
              </caption>
              <thead>
                <tr className="border-b border-border/60 text-left text-xs text-muted-foreground">
                  <th scope="col" className="px-2 py-2 font-medium">
                    Document
                  </th>
                  <th scope="col" className="px-2 py-2 font-medium">
                    Category
                  </th>
                  <th scope="col" className="px-2 py-2 font-medium">
                    File
                  </th>
                  <th scope="col" className="px-2 py-2 font-medium">
                    Status
                  </th>
                  <th scope="col" className="px-2 py-2 font-medium">
                    Confidentiality
                  </th>
                  <th scope="col" className="px-2 py-2 font-medium">
                    Checksum
                  </th>
                  <th scope="col" className="px-2 py-2 font-medium">
                    Activity
                  </th>
                  <th scope="col" className="px-2 py-2 text-right font-medium">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {documents.map((doc) => (
                  <tr
                    key={doc.id}
                    className={
                      doc.deletedAt
                        ? "border-b border-border/50 opacity-60"
                        : "border-b border-border/50"
                    }
                  >
                    <th scope="row" className="max-w-64 px-2 py-3 text-left font-normal">
                      <div className="truncate font-medium" title={doc.title}>
                        {doc.title}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {doc.version ? `v${doc.version.replace(/^v/, "")}` : "no version"}
                        {doc.versionsCount && doc.versionsCount > 1
                          ? ` · ${doc.versionsCount} versions`
                          : ""}
                        {doc.deletedAt ? " · deleted" : ""}
                      </div>
                    </th>
                    <td className="px-2 py-3 text-muted-foreground">{doc.folderName ?? "—"}</td>
                    <td className="px-2 py-3 whitespace-nowrap text-muted-foreground">
                      {doc.fileType.toUpperCase()} · {formatBytes(doc.fileSize)}
                    </td>
                    <td className="px-2 py-3">
                      <StatusPill view={documentStatusView(doc.status)} />
                    </td>
                    <td className="px-2 py-3 text-muted-foreground">
                      {adminConfidentialityLabel(doc.confidentialityLevel)}
                    </td>
                    <td className="px-2 py-3 font-mono text-[11px] text-muted-foreground">
                      {shortChecksum(doc.checksum)}
                    </td>
                    <td className="px-2 py-3 text-xs whitespace-nowrap text-muted-foreground">
                      {doc.viewCount} views · {doc.downloadCount} downloads
                      <div>{formatDateTime(doc.updatedAt)}</div>
                    </td>
                    <td className="px-2 py-3">
                      <div className="flex items-center justify-end gap-1">
                        {doc.deletedAt ? (
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={busy === `restore-${doc.id}`}
                            onClick={() =>
                              void run(
                                `restore-${doc.id}`,
                                async () => {
                                  await dataRoomAdminApi.restoreDocument(doc.id);
                                },
                                "Document restored.",
                              )
                            }
                          >
                            <RotateCcw className="mr-2 h-4 w-4" aria-hidden="true" />
                            Restore
                          </Button>
                        ) : null}
                        {doc.deletedAt ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive"
                            onClick={() => setPendingDelete({ doc, purge: true })}
                          >
                            Purge
                          </Button>
                        ) : (
                          <>
                            <Button
                              variant="ghost"
                              size="icon"
                              aria-label={`Preview ${doc.title}`}
                              title={
                                previewSupportedFor(doc.fileType)
                                  ? "Preview"
                                  : "No in-browser preview for this file type"
                              }
                              disabled={
                                !previewSupportedFor(doc.fileType) || busy === `preview-${doc.id}`
                              }
                              onClick={() => void openPreview(doc)}
                            >
                              {busy === `preview-${doc.id}` ? (
                                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                              ) : (
                                <Eye className="h-4 w-4" aria-hidden="true" />
                              )}
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              aria-label={`Edit ${doc.title}`}
                              onClick={() => setEditing(doc)}
                            >
                              <Pencil className="h-4 w-4" aria-hidden="true" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              aria-label={`Upload a new version of ${doc.title}`}
                              onClick={() => setVersionFor(doc)}
                            >
                              <FilePlus2 className="h-4 w-4" aria-hidden="true" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              aria-label={`Delete ${doc.title}`}
                              onClick={() => setPendingDelete({ doc, purge: false })}
                            >
                              <Trash2 className="h-4 w-4" aria-hidden="true" />
                            </Button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>

      <DocumentUploadModal
        open={uploadOpen}
        onOpenChange={setUploadOpen}
        folders={folders}
        onUpload={async (file: File, fields: DocumentUploadFields) => {
          const created = await dataRoomAdminApi.uploadDocument(file, {
            title: fields.title,
            confidentiality_level: fields.confidentiality_level,
            description: fields.description,
            folder_id: fields.folder_id,
            status: fields.status,
            version: fields.version,
            tags: fields.tags,
            downloads_permitted: fields.downloads_permitted,
          });
          const scanned = created.meta?.["malwareScanned"];
          await res.reload();
          toast.success(
            scanned === false
              ? "Uploaded. No malware scanner is provisioned, so the file was validated and stored unscanned."
              : "Uploaded and scanned.",
          );
        }}
      />

      {editing && (
        <MetadataDialog
          doc={editing}
          folders={folders}
          onClose={() => setEditing(null)}
          onSave={async (patch) => {
            await dataRoomAdminApi.updateDocument(editing.id, patch);
            await res.reload();
            setEditing(null);
            toast.success("Document updated.");
          }}
        />
      )}

      {versionFor && (
        <VersionDialog
          doc={versionFor}
          onClose={() => setVersionFor(null)}
          onUpload={async (file, version, notes) => {
            await dataRoomAdminApi.uploadVersion(versionFor.id, file, {
              version,
              change_notes: notes || null,
            });
            await res.reload();
            setVersionFor(null);
            toast.success(`Version ${version} stored. Earlier versions are untouched.`);
          }}
        />
      )}

      <Dialog
        open={Boolean(preview)}
        onOpenChange={(open) => {
          if (!open) setPreview(null);
        }}
      >
        <DialogContent className="sm:max-w-4xl">
          <DialogHeader>
            <DialogTitle>{preview?.title}</DialogTitle>
            <DialogDescription>
              Streamed from the private disk with your admin token. This is the same path a visitor
              uses, so what you see is what the authorizer allowed.
            </DialogDescription>
          </DialogHeader>
          {preview && (
            <div className="h-[70vh] overflow-hidden rounded-xl border border-border/60 bg-muted/30">
              {preview.contentType.startsWith("image/") ? (
                <img
                  src={preview.url}
                  alt={preview.title}
                  className="mx-auto max-h-full object-contain"
                />
              ) : (
                <iframe src={preview.url} title={preview.title} className="h-full w-full" />
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {pendingDelete && (
        <ConfirmationModal
          open
          onOpenChange={(open) => {
            if (!open) setPendingDelete(null);
          }}
          title={
            pendingDelete.purge ? "Destroy every version of this document" : "Delete this document"
          }
          effect={
            pendingDelete.purge
              ? `"${pendingDelete.doc.title}" and the stored bytes of all ${pendingDelete.doc.versionsCount ?? 1} version(s) are erased from disk.`
              : `"${pendingDelete.doc.title}" is hidden from every visitor immediately. The bytes stay on disk.`
          }
          reversal={
            pendingDelete.purge
              ? "There is no undo and no application-side backup. Restore from your server backup or re-upload."
              : "Reversible: the row stays and a Restore button appears in this table."
          }
          phrase={pendingDelete.purge ? "DESTROY" : undefined}
          destructive
          confirmLabel={pendingDelete.purge ? "Destroy the file" : "Delete"}
          busy={busy === `delete-${pendingDelete.doc.id}`}
          onConfirm={() => {
            const target = pendingDelete;
            void run(
              `delete-${target.doc.id}`,
              async () => {
                await dataRoomAdminApi.deleteDocument(target.doc.id, target.purge);
                setPendingDelete(null);
              },
              target.purge ? "The file was destroyed." : "Document deleted.",
            );
          }}
        />
      )}
    </div>
  );
}
/**
 * Metadata only. Publishing from here is the switch a visitor feels: `draft` is
 * invisible to every grant, however wide the grant is.
 */
function MetadataDialog({
  doc,
  folders,
  onClose,
  onSave,
}: {
  doc: DataRoomAdminDocument;
  folders: DataRoomAdminFolder[];
  onClose: () => void;
  onSave: (patch: {
    title: string;
    description: string | null;
    folder_id: number | null;
    status: DataRoomDocumentStatus;
    confidentiality_level: DataRoomConfidentiality;
    tags: string | null;
    downloads_permitted: boolean;
    start_here_order: number | null;
  }) => Promise<void>;
}) {
  const [title, setTitle] = useState(doc.title);
  const [description, setDescription] = useState(doc.description ?? "");
  const [folderId, setFolderId] = useState(doc.folderId ? String(doc.folderId) : "none");
  const [status, setStatus] = useState<DataRoomDocumentStatus>(doc.status);
  const [level, setLevel] = useState<DataRoomConfidentiality>(doc.confidentialityLevel);
  const [tags, setTags] = useState(doc.tags ?? "");
  const [downloads, setDownloads] = useState(doc.downloadsPermitted);
  const [startHere, setStartHere] = useState(
    doc.startHereOrder === null ? "" : String(doc.startHereOrder),
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setSaving(true);
    setError(null);
    try {
      await onSave({
        title: title.trim(),
        description: description.trim() || null,
        folder_id: folderId === "none" ? null : Number(folderId),
        status,
        confidentiality_level: level,
        tags: tags.trim() || null,
        downloads_permitted: downloads,
        start_here_order: startHere.trim() === "" ? null : Number(startHere),
      });
    } catch (err) {
      setError(errorMessage(err, "The update was refused."));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Edit document</DialogTitle>
          <DialogDescription>
            {doc.originalFilename} · {formatBytes(doc.fileSize)} · uploaded{" "}
            {formatDateTime(doc.createdAt)}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="doc-title">Title</Label>
            <Input id="doc-title" value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="doc-description">Description</Label>
            <Textarea
              id="doc-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="doc-folder">Category</Label>
            <Select value={folderId} onValueChange={setFolderId}>
              <SelectTrigger id="doc-folder">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No category</SelectItem>
                {folders.map((folder) => (
                  <SelectItem key={folder.id} value={String(folder.id)}>
                    {folder.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="doc-status">Status</Label>
            <Select
              value={status}
              onValueChange={(value) => setStatus(value as DataRoomDocumentStatus)}
            >
              <SelectTrigger id="doc-status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUSES.map((option) => (
                  <SelectItem key={option} value={option}>
                    {documentStatusView(option).label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="doc-level">Confidentiality</Label>
            <Select
              value={level}
              onValueChange={(value) => setLevel(value as DataRoomConfidentiality)}
            >
              <SelectTrigger id="doc-level">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LEVELS.map((option) => (
                  <SelectItem key={option} value={option}>
                    {adminConfidentialityLabel(option)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="doc-start-here">Start Here position</Label>
            <Input
              id="doc-start-here"
              value={startHere}
              inputMode="numeric"
              placeholder="blank to leave it out"
              onChange={(e) => setStartHere(e.target.value)}
            />
          </div>
          <div className="flex items-center justify-between gap-3 rounded-xl border border-border/60 px-3 py-2 sm:col-span-2">
            <div>
              <Label htmlFor="doc-downloads" className="text-sm">
                Downloads permitted
              </Label>
              <p className="text-xs text-muted-foreground">
                A ceiling, not a grant. The visitor also needs download permission and the room-wide
                switch has to be on.
              </p>
            </div>
            <Switch id="doc-downloads" checked={downloads} onCheckedChange={setDownloads} />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="doc-tags">Tags</Label>
            <Input
              id="doc-tags"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="financials, model"
            />
          </div>
        </div>

        {error && <p className="text-xs text-destructive">{error}</p>}

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={() => void submit()} disabled={saving || !title.trim()}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />}
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/**
 * A new version, not a replacement. The prior version row keeps pointing at its
 * own bytes, so an investor who cited v1.0 can still be shown v1.0.
 */
function VersionDialog({
  doc,
  onClose,
  onUpload,
}: {
  doc: DataRoomAdminDocument;
  onClose: () => void;
  onUpload: (file: File, version: string, notes: string) => Promise<void>;
}) {
  const [patch, major] = suggestNextVersions(doc.version);
  const [file, setFile] = useState<File | null>(null);
  const [version, setVersion] = useState(patch);
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      await onUpload(file, version.trim(), notes.trim());
    } catch (err) {
      setError(errorMessage(err, "The upload was refused."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>New version of {doc.title}</DialogTitle>
          <DialogDescription>
            Currently {doc.version ? `v${doc.version.replace(/^v/, "")}` : "unversioned"}. Visitors
            see only the current version; the earlier ones stay on disk for your record.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="version-file">File</Label>
            <Input
              id="version-file"
              type="file"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
            {file && (
              <p className="text-xs text-muted-foreground">
                {file.name} · {formatBytes(file.size)}
              </p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="version-number">Version</Label>
            <div className="flex items-center gap-2">
              <Input
                id="version-number"
                value={version}
                onChange={(e) => setVersion(e.target.value)}
                className="w-32"
              />
              <Button type="button" variant="outline" size="sm" onClick={() => setVersion(patch)}>
                {patch}
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={() => setVersion(major)}>
                {major}
              </Button>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="version-notes">What changed</Label>
            <Textarea
              id="version-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="Updated the revenue build for the October launch date."
            />
          </div>
          {error && <p className="text-xs text-destructive">{error}</p>}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button onClick={() => void submit()} disabled={busy || !file || !version.trim()}>
            {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />}
            Upload version
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
