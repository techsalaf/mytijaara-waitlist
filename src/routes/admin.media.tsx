import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { PageHeader } from "@/components/admin/ui-bits";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertTriangle,
  Download,
  FileText,
  FileVideo,
  Folder,
  FolderPlus,
  Grid3x3,
  Image as ImageIcon,
  List,
  Loader2,
  RefreshCw,
  Search,
  Trash2,
  Upload,
} from "lucide-react";
import { mediaApi } from "@/lib/api";
import type { MediaFile } from "@/lib/types";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/media")({
  head: () => ({
    meta: [{ title: "Media Library — MyTijaara Admin" }, { name: "robots", content: "noindex" }],
  }),
  component: MediaPage,
});

type SortKey = "recent" | "name" | "size";

/** Bytes to a readable size. `size` is stored in bytes, not kilobytes. */
function humanSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 KB";
  const units = ["B", "KB", "MB", "GB"];
  let value = bytes;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  return `${value.toFixed(value < 10 && unit > 1 ? 1 : 0)} ${units[unit]}`;
}

function MediaPage() {
  const [view, setView] = useState<"grid" | "list">("grid");
  const [folder, setFolder] = useState("all");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<SortKey>("recent");

  const [media, setMedia] = useState<MediaFile[]>([]);
  const [folders, setFolders] = useState<string[]>([]);
  const [selected, setSelected] = useState<MediaFile | null>(null);

  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newFolder, setNewFolder] = useState("");
  const [folderDialog, setFolderDialog] = useState(false);

  const uploadInput = useRef<HTMLInputElement>(null);
  const replaceInput = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Filtering and sorting run in SQL, so the folder counts and the grid
      // never disagree about what the API considers a match.
      const response = await mediaApi.list({
        folder: folder === "all" ? undefined : folder,
        search: search.trim() || undefined,
        sort,
      });
      setMedia(response.data);
      const names = response.meta?.folders;
      setFolders(Array.isArray(names) ? (names as string[]) : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load the media library");
    } finally {
      setLoading(false);
    }
  }, [folder, search, sort]);

  useEffect(() => {
    const timer = setTimeout(() => void load(), 250);
    return () => clearTimeout(timer);
  }, [load]);

  const upload = async (file?: File) => {
    if (!file) return;
    setBusy(true);
    try {
      await mediaApi.upload(file, folder === "all" ? "Uncategorized" : folder);
      await load();
      toast.success(`Uploaded ${file.name}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not upload the file");
    } finally {
      setBusy(false);
      if (uploadInput.current) uploadInput.current.value = "";
    }
  };

  const replace = async (file?: File) => {
    if (!file || !selected) return;
    setBusy(true);
    try {
      const response = await mediaApi.replace(selected.id, file);
      setSelected(response.data);
      await load();
      toast.success("File replaced. The existing URL still points at it.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not replace the file");
    } finally {
      setBusy(false);
      if (replaceInput.current) replaceInput.current.value = "";
    }
  };

  const remove = async (id: string) => {
    setBusy(true);
    try {
      await mediaApi.remove(id);
      setSelected(null);
      await load();
      toast.success("File deleted");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not delete the file");
    } finally {
      setBusy(false);
    }
  };

  const createFolder = async () => {
    const name = newFolder.trim();
    if (!name) return;
    setBusy(true);
    try {
      const response = await mediaApi.createFolder(name);
      setFolders(response.data.folders);
      setFolder(name);
      setNewFolder("");
      setFolderDialog(false);
      toast.success(`Folder "${name}" created`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not create the folder");
    } finally {
      setBusy(false);
    }
  };

  /** Fetch as a blob so the file downloads rather than navigating away. */
  const download = async (file: MediaFile) => {
    try {
      const response = await fetch(file.url);
      if (!response.ok) throw new Error(`The file returned ${response.status}`);
      const blob = await response.blob();
      const href = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = href;
      anchor.download = file.name;
      anchor.click();
      URL.revokeObjectURL(href);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not download the file");
    }
  };

  const folderList = ["all", ...folders];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Media Library"
        description={loading ? "Loading…" : `${media.length} file${media.length === 1 ? "" : "s"}`}
        actions={
          <>
            <input
              ref={uploadInput}
              type="file"
              className="hidden"
              onChange={(event) => void upload(event.target.files?.[0])}
            />
            <Button
              size="sm"
              variant="outline"
              onClick={() => setFolderDialog(true)}
              disabled={busy}
            >
              <FolderPlus className="mr-2 h-4 w-4" /> New folder
            </Button>
            <Button
              size="sm"
              className="bg-primary hover:bg-primary/90"
              onClick={() => uploadInput.current?.click()}
              disabled={busy}
            >
              {busy ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Upload className="mr-2 h-4 w-4" />
              )}
              Upload
            </Button>
          </>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[220px_1fr]">
        <aside className="space-y-1">
          <div className="mb-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Folders
          </div>
          {folderList.map((f) => (
            <button
              key={f}
              onClick={() => setFolder(f)}
              className={cn(
                "flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium",
                folder === f
                  ? "bg-primary text-primary-foreground"
                  : "text-foreground/70 hover:bg-muted",
              )}
            >
              <Folder className="h-4 w-4" />
              <span className="flex-1 text-left capitalize">{f}</span>
            </button>
          ))}
        </aside>

        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-border/60 bg-card p-3 shadow-sm">
            <div className="relative min-w-[200px] flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search files…"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={sort} onValueChange={(value) => setSort(value as SortKey)}>
              <SelectTrigger className="w-[150px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="recent">Most recent</SelectItem>
                <SelectItem value="name">Name A-Z</SelectItem>
                <SelectItem value="size">Largest first</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex overflow-hidden rounded-lg border border-border/60">
              <button
                aria-label="Grid view"
                className={cn(
                  "p-2",
                  view === "grid" ? "bg-primary text-primary-foreground" : "hover:bg-muted",
                )}
                onClick={() => setView("grid")}
              >
                <Grid3x3 className="h-4 w-4" />
              </button>
              <button
                aria-label="List view"
                className={cn(
                  "p-2",
                  view === "list" ? "bg-primary text-primary-foreground" : "hover:bg-muted",
                )}
                onClick={() => setView("list")}
              >
                <List className="h-4 w-4" />
              </button>
            </div>
          </div>

          {loading && (
            <div className="grid min-h-[30vh] place-items-center text-muted-foreground">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          )}

          {!loading && error && (
            <div className="space-y-3 rounded-2xl border border-border/60 bg-card py-10 text-center">
              <AlertTriangle className="mx-auto h-7 w-7 text-destructive" />
              <p className="text-sm text-destructive">{error}</p>
              <Button size="sm" variant="outline" onClick={() => void load()}>
                Try again
              </Button>
            </div>
          )}

          {!loading && !error && media.length === 0 && (
            <div className="space-y-3 rounded-2xl border border-dashed border-border/60 py-14 text-center">
              <ImageIcon className="mx-auto h-8 w-8 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                {search || folder !== "all"
                  ? "No files match this filter."
                  : "No files yet. Upload the first one."}
              </p>
              <Button size="sm" variant="outline" onClick={() => uploadInput.current?.click()}>
                <Upload className="mr-2 h-4 w-4" /> Upload
              </Button>
            </div>
          )}

          {!loading && !error && media.length > 0 && view === "grid" && (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {media.map((m) => (
                <button
                  key={m.id}
                  onClick={() => setSelected(m)}
                  className="group overflow-hidden rounded-xl border border-border/60 bg-card text-left shadow-sm transition-shadow hover:shadow-md"
                >
                  <div className="aspect-square bg-muted">
                    {m.type === "image" && (
                      <img
                        src={m.url}
                        alt={m.name}
                        loading="lazy"
                        className="h-full w-full object-cover"
                      />
                    )}
                    {m.type === "video" && (
                      <div className="grid h-full place-items-center bg-slate-900 text-primary-foreground">
                        <FileVideo className="h-8 w-8" />
                      </div>
                    )}
                    {m.type === "document" && (
                      <div className="grid h-full place-items-center bg-slate-100">
                        <FileText className="h-8 w-8 text-muted-foreground" />
                      </div>
                    )}
                  </div>
                  <div className="p-2">
                    <div className="truncate text-xs font-medium">{m.name}</div>
                    <div className="text-[10px] text-muted-foreground">{humanSize(m.size)}</div>
                  </div>
                </button>
              ))}
            </div>
          )}

          {!loading && !error && media.length > 0 && view === "list" && (
            <div className="overflow-hidden rounded-2xl border border-border/60 bg-card">
              <table className="w-full text-sm">
                <thead className="bg-muted/40 text-left text-xs uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="p-3">Name</th>
                    <th className="p-3">Folder</th>
                    <th className="p-3">Size</th>
                    <th className="p-3">Uploaded</th>
                  </tr>
                </thead>
                <tbody>
                  {media.map((m) => (
                    <tr
                      key={m.id}
                      onClick={() => setSelected(m)}
                      className="cursor-pointer border-t border-border/40 hover:bg-muted/20"
                    >
                      <td className="p-3">
                        <div className="flex items-center gap-3">
                          <div className="grid h-10 w-10 place-items-center overflow-hidden rounded-lg bg-muted">
                            {m.type === "image" ? (
                              <img src={m.url} alt="" className="h-full w-full object-cover" />
                            ) : (
                              <ImageIcon className="h-4 w-4 text-muted-foreground" />
                            )}
                          </div>
                          <span className="font-medium">{m.name}</span>
                        </div>
                      </td>
                      <td className="p-3">
                        <Badge variant="secondary">{m.folder}</Badge>
                      </td>
                      <td className="p-3 text-muted-foreground">{humanSize(m.size)}</td>
                      <td className="p-3 text-muted-foreground">
                        {m.uploadedAt ? new Date(m.uploadedAt).toLocaleDateString() : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <Dialog open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent className="max-w-3xl">
          {selected && (
            <>
              <DialogHeader>
                <DialogTitle className="truncate">{selected.name}</DialogTitle>
              </DialogHeader>
              <input
                ref={replaceInput}
                type="file"
                className="hidden"
                onChange={(event) => void replace(event.target.files?.[0])}
              />
              <div className="grid gap-4 lg:grid-cols-[1fr_240px]">
                <div className="rounded-xl bg-muted p-2">
                  {selected.type === "image" ? (
                    <img
                      src={selected.url}
                      alt={selected.name}
                      className="mx-auto max-h-[420px] rounded-lg object-contain"
                    />
                  ) : (
                    <div className="grid h-64 place-items-center">
                      {selected.type === "video" ? (
                        <FileVideo className="h-10 w-10 text-muted-foreground" />
                      ) : (
                        <FileText className="h-10 w-10 text-muted-foreground" />
                      )}
                    </div>
                  )}
                </div>
                <div className="space-y-3 text-sm">
                  <div>
                    <div className="text-xs text-muted-foreground">Type</div>
                    <div className="font-medium capitalize">{selected.type}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Size</div>
                    <div className="font-medium">{humanSize(selected.size)}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Dimensions</div>
                    <div className="font-medium">{selected.dimensions || "—"}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Folder</div>
                    <div className="font-medium">{selected.folder}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Uploaded</div>
                    <div className="font-medium">
                      {selected.uploadedAt ? new Date(selected.uploadedAt).toLocaleString() : "—"}
                    </div>
                  </div>
                  <div className="space-y-2 pt-3">
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full"
                      onClick={() => void download(selected)}
                    >
                      <Download className="mr-2 h-3 w-3" /> Download
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full"
                      disabled={busy}
                      onClick={() => replaceInput.current?.click()}
                      title="Swaps the file in place, keeping this URL"
                    >
                      <RefreshCw className="mr-2 h-3 w-3" /> Upload replacement
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full text-red-600"
                      disabled={busy}
                      onClick={() => void remove(selected.id)}
                    >
                      <Trash2 className="mr-2 h-3 w-3" /> Delete
                    </Button>
                  </div>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={folderDialog} onOpenChange={setFolderDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>New folder</DialogTitle>
          </DialogHeader>
          <Input
            placeholder="Folder name"
            value={newFolder}
            onChange={(event) => setNewFolder(event.target.value)}
            onKeyDown={(event) => event.key === "Enter" && void createFolder()}
          />
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setFolderDialog(false)}>
              Cancel
            </Button>
            <Button size="sm" disabled={busy || !newFolder.trim()} onClick={() => void createFolder()}>
              {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
