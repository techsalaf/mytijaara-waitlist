/**
 * Document upload and new-version upload.
 *
 * The extension list here is a courtesy filter on the file picker. The backend
 * re-validates the extension, the MIME type against the extension, every segment
 * of a multi-part filename, and the size, then writes to a quarantine directory
 * before promoting the bytes. A file that slips past this dialog is refused there.
 *
 * `meta.malwareScanned` comes back false when no scanner is provisioned. That is
 * surfaced after a successful upload rather than hidden: the pipeline ran, the
 * scan stage did not.
 */

import { useEffect, useState } from "react";
import { Loader2, Upload } from "lucide-react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { IssueList } from "./bits";
import { adminConfidentialityLabel, documentStatusView } from "@/lib/dataroom/admin-format";
import { formatBytes } from "@/lib/dataroom/format";
import type {
  DataRoomAdminFolder,
  DataRoomConfidentiality,
  DataRoomDocumentStatus,
} from "@/lib/api/dataroom-admin";

const ACCEPT = ".pdf,.docx,.xlsx,.pptx,.doc,.xls,.ppt,.csv,.png,.jpg,.jpeg,.zip";

const CONFIDENTIALITY: DataRoomConfidentiality[] = [
  "confidential",
  "highly_confidential",
  "restricted",
  "internal",
  "public",
];

const STATUSES: DataRoomDocumentStatus[] = ["draft", "published", "restricted", "archived"];

export type DocumentUploadFields = {
  title: string;
  description: string | null;
  folder_id: number | null;
  status: DataRoomDocumentStatus;
  confidentiality_level: DataRoomConfidentiality;
  version: string | null;
  tags: string | null;
  downloads_permitted: boolean;
};

export type DocumentUploadModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  folders: DataRoomAdminFolder[];
  /** Server-side ceiling in kilobytes, from the policy snapshot. */
  maxUploadKb?: number;
  onUpload: (file: File, fields: DocumentUploadFields) => Promise<void>;
};

export function DocumentUploadModal({
  open,
  onOpenChange,
  folders,
  maxUploadKb = 51200,
  onUpload,
}: DocumentUploadModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [folderId, setFolderId] = useState<string>("none");
  const [status, setStatus] = useState<DataRoomDocumentStatus>("draft");
  const [confidentiality, setConfidentiality] = useState<DataRoomConfidentiality>("confidential");
  const [version, setVersion] = useState("1.0");
  const [tags, setTags] = useState("");
  const [downloads, setDownloads] = useState(false);
  const [busy, setBusy] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setFile(null);
    setTitle("");
    setDescription("");
    setFolderId("none");
    setStatus("draft");
    setConfidentiality("confidential");
    setVersion("1.0");
    setTags("");
    setDownloads(false);
    setBusy(false);
    setServerError(null);
  }, [open]);

  const issues: string[] = [];
  if (!file) issues.push("Choose a file to upload.");
  if (!title.trim()) issues.push("Give the document a title visitors will recognize.");
  if (file && file.size > maxUploadKb * 1024) {
    issues.push(
      `That file is ${formatBytes(file.size)}. The server accepts up to ${formatBytes(maxUploadKb * 1024)}.`,
    );
  }

  async function submit() {
    if (!file || issues.length) return;
    setBusy(true);
    setServerError(null);
    try {
      await onUpload(file, {
        title: title.trim(),
        description: description.trim() || null,
        folder_id: folderId === "none" ? null : Number(folderId),
        status,
        confidentiality_level: confidentiality,
        version: version.trim() || null,
        tags: tags.trim() || null,
        downloads_permitted: downloads,
      });
    } catch (error) {
      setServerError(error instanceof Error ? error.message : "The upload was refused.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Upload a document</DialogTitle>
          <DialogDescription>
            Files are stored outside the web root and streamed through an authorized endpoint. No
            public URL is ever created.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="doc-file">File</Label>
            <Input
              id="doc-file"
              type="file"
              accept={ACCEPT}
              onChange={(event) => {
                const chosen = event.target.files?.[0] ?? null;
                setFile(chosen);
                // Prefill the title from the filename, minus the extension. The
                // filename itself is normalized server-side and never trusted.
                if (chosen && !title.trim()) {
                  setTitle(
                    chosen.name
                      .replace(/\.[^.]+$/, "")
                      .replace(/[_-]+/g, " ")
                      .trim(),
                  );
                }
              }}
            />
            {file && (
              <p className="text-[11px] text-muted-foreground">
                {file.name} · {formatBytes(file.size)}
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="doc-title">Title</Label>
            <Input id="doc-title" value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="doc-description">Description</Label>
            <Textarea
              id="doc-description"
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What a reader should know before opening it."
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="doc-folder">Category</Label>
              <Select value={folderId} onValueChange={setFolderId}>
                <SelectTrigger id="doc-folder">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Uncategorized</SelectItem>
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
                  {STATUSES.map((value) => (
                    <SelectItem key={value} value={value}>
                      {documentStatusView(value).label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-[11px] text-muted-foreground">
                {documentStatusView(status).explanation}
              </p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="doc-confidentiality">Confidentiality</Label>
              <Select
                value={confidentiality}
                onValueChange={(value) => setConfidentiality(value as DataRoomConfidentiality)}
              >
                <SelectTrigger id="doc-confidentiality">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CONFIDENTIALITY.map((value) => (
                    <SelectItem key={value} value={value}>
                      {adminConfidentialityLabel(value)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="doc-version">Version</Label>
              <Input
                id="doc-version"
                value={version}
                onChange={(e) => setVersion(e.target.value)}
              />
            </div>

            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="doc-tags">Tags</Label>
              <Input
                id="doc-tags"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                placeholder="cap table, 2026"
              />
            </div>
          </div>

          <label className="flex items-start justify-between gap-3 rounded-xl border border-border/60 px-3 py-2.5">
            <span className="text-xs">
              <span className="block text-sm font-medium">Downloadable</span>
              Off means this document can be read in the browser but never saved, whatever a grant
              says.
            </span>
            <Switch
              checked={downloads}
              onCheckedChange={setDownloads}
              aria-label="Allow this document to be downloaded"
            />
          </label>

          <IssueList issues={issues} />
          {serverError && (
            <p className="rounded-xl border border-destructive/25 bg-destructive/5 px-3 py-2 text-xs text-destructive">
              {serverError}
            </p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>
            Cancel
          </Button>
          <Button onClick={() => void submit()} disabled={issues.length > 0 || busy}>
            {busy ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <Upload className="mr-2 h-4 w-4" aria-hidden="true" />
            )}
            Upload
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
