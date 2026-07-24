import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { PageHeader, SectionCard } from "@/components/admin/ui-bits";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Upload, Search, Grid3x3, List, Folder, FileVideo, FileText, Image as ImageIcon, Trash2, Download, RefreshCw } from "lucide-react";
import { mediaFiles } from "@/lib/mock-data";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/media")({
  head: () => ({ meta: [{ title: "Media Library — MyTijaara Admin" }, { name: "robots", content: "noindex" }] }),
  component: MediaPage,
});

function MediaPage() {
  const [view, setView] = useState<"grid" | "list">("grid");
  const [folder, setFolder] = useState("all");
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState<any>(null);

  const items = mediaFiles.filter((m) => {
    if (folder !== "all" && m.folder !== folder) return false;
    if (q && !m.name.toLowerCase().includes(q.toLowerCase())) return false;
    return true;
  });

  const folders = ["all", ...Array.from(new Set(mediaFiles.map((m) => m.folder)))];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Media Library"
        description={`${mediaFiles.length} files · 218 MB of 500 MB used`}
        actions={<Button size="sm" className="bg-[#0D7A46] hover:bg-[#166534]"><Upload className="mr-2 h-4 w-4" /> Upload</Button>}
      />

      <div className="grid gap-6 lg:grid-cols-[220px_1fr]">
        <aside className="space-y-1">
          <div className="mb-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">Folders</div>
          {folders.map((f) => (
            <button key={f} onClick={() => setFolder(f)} className={cn(
              "flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium",
              folder === f ? "bg-[#0D7A46] text-white" : "text-foreground/70 hover:bg-muted"
            )}>
              <Folder className="h-4 w-4" />
              <span className="flex-1 text-left capitalize">{f}</span>
              <span className="text-xs opacity-70">{f === "all" ? mediaFiles.length : mediaFiles.filter((m) => m.folder === f).length}</span>
            </button>
          ))}
        </aside>

        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-border/60 bg-white p-3 shadow-sm">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Search files…" value={q} onChange={(e) => setQ(e.target.value)} className="pl-9" />
            </div>
            <Select defaultValue="recent">
              <SelectTrigger className="w-[130px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="recent">Most recent</SelectItem>
                <SelectItem value="name">Name A-Z</SelectItem>
                <SelectItem value="size">Largest first</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex overflow-hidden rounded-lg border border-border/60">
              <button className={cn("p-2", view === "grid" ? "bg-[#0D7A46] text-white" : "hover:bg-muted")} onClick={() => setView("grid")}><Grid3x3 className="h-4 w-4" /></button>
              <button className={cn("p-2", view === "list" ? "bg-[#0D7A46] text-white" : "hover:bg-muted")} onClick={() => setView("list")}><List className="h-4 w-4" /></button>
            </div>
          </div>

          {view === "grid" ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {items.map((m) => (
                <button key={m.id} onClick={() => setSelected(m)} className="group overflow-hidden rounded-xl border border-border/60 bg-white text-left shadow-sm transition-shadow hover:shadow-md">
                  <div className="aspect-square bg-muted">
                    {m.type === "image" && <img src={m.url} alt={m.name} loading="lazy" className="h-full w-full object-cover" />}
                    {m.type === "video" && <div className="grid h-full place-items-center bg-slate-900 text-white"><FileVideo className="h-8 w-8" /></div>}
                    {m.type === "document" && <div className="grid h-full place-items-center bg-slate-100"><FileText className="h-8 w-8 text-muted-foreground" /></div>}
                  </div>
                  <div className="p-2">
                    <div className="truncate text-xs font-medium">{m.name}</div>
                    <div className="text-[10px] text-muted-foreground">{(m.size / 1024).toFixed(1)} MB</div>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="overflow-hidden rounded-2xl border border-border/60 bg-white">
              <table className="w-full text-sm">
                <thead className="bg-muted/40 text-left text-xs uppercase tracking-wider text-muted-foreground">
                  <tr><th className="p-3">Name</th><th className="p-3">Folder</th><th className="p-3">Size</th><th className="p-3">Uploaded</th></tr>
                </thead>
                <tbody>
                  {items.map((m) => (
                    <tr key={m.id} onClick={() => setSelected(m)} className="cursor-pointer border-t border-border/40 hover:bg-muted/20">
                      <td className="p-3">
                        <div className="flex items-center gap-3">
                          <div className="grid h-10 w-10 place-items-center rounded-lg bg-muted overflow-hidden">
                            {m.type === "image" ? <img src={m.url} alt="" className="h-full w-full object-cover" /> : <ImageIcon className="h-4 w-4 text-muted-foreground" />}
                          </div>
                          <span className="font-medium">{m.name}</span>
                        </div>
                      </td>
                      <td className="p-3"><Badge variant="secondary">{m.folder}</Badge></td>
                      <td className="p-3 text-muted-foreground">{(m.size / 1024).toFixed(1)} MB</td>
                      <td className="p-3 text-muted-foreground">{new Date(m.uploadedAt).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="max-w-3xl">
          {selected && (
            <>
              <DialogHeader><DialogTitle>{selected.name}</DialogTitle></DialogHeader>
              <div className="grid gap-4 lg:grid-cols-[1fr_240px]">
                <div className="rounded-xl bg-muted p-2">
                  {selected.type === "image"
                    ? <img src={selected.url} alt={selected.name} className="mx-auto max-h-[420px] rounded-lg object-contain" />
                    : <div className="grid h-64 place-items-center"><FileText className="h-10 w-10 text-muted-foreground" /></div>}
                </div>
                <div className="space-y-3 text-sm">
                  <div><div className="text-xs text-muted-foreground">Type</div><div className="font-medium capitalize">{selected.type}</div></div>
                  <div><div className="text-xs text-muted-foreground">Size</div><div className="font-medium">{(selected.size / 1024).toFixed(1)} MB</div></div>
                  <div><div className="text-xs text-muted-foreground">Dimensions</div><div className="font-medium">{selected.dimensions}</div></div>
                  <div><div className="text-xs text-muted-foreground">Folder</div><div className="font-medium">{selected.folder}</div></div>
                  <div><div className="text-xs text-muted-foreground">Uploaded</div><div className="font-medium">{new Date(selected.uploadedAt).toLocaleString()}</div></div>
                  <div className="space-y-2 pt-3">
                    <Button variant="outline" size="sm" className="w-full"><Download className="mr-2 h-3 w-3" /> Download</Button>
                    <Button variant="outline" size="sm" className="w-full"><RefreshCw className="mr-2 h-3 w-3" /> Replace</Button>
                    <Button variant="outline" size="sm" className="w-full text-red-600" onClick={() => { toast.success("Deleted"); setSelected(null); }}>
                      <Trash2 className="mr-2 h-3 w-3" /> Delete
                    </Button>
                  </div>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
