import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  Search, Filter, Download, Plus, MoreHorizontal, CheckCircle2, XCircle,
  Eye, Pencil, Trash2, ChevronLeft, ChevronRight, Tag,
} from "lucide-react";
import { PageHeader, StatCard } from "@/components/admin/ui-bits";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { waitlistUsers, type WaitlistUser } from "@/lib/mock-data";
import { Users, UserCheck, Percent, Award } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/waitlist")({
  head: () => ({ meta: [{ title: "Waitlist — MyTijaara Admin" }, { name: "robots", content: "noindex" }] }),
  component: WaitlistPage,
});

const PAGE_SIZE = 12;

function WaitlistPage() {
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("all");
  const [source, setSource] = useState("all");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(1);
  const [view, setView] = useState<WaitlistUser | null>(null);

  const filtered = useMemo(() => {
    return waitlistUsers.filter((u) => {
      if (status !== "all" && u.status !== status) return false;
      if (source !== "all" && u.source !== source) return false;
      if (q) {
        const s = q.toLowerCase();
        if (!u.name.toLowerCase().includes(s) && !u.email.toLowerCase().includes(s) && !u.city.toLowerCase().includes(s))
          return false;
      }
      return true;
    });
  }, [q, status, source]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const p = Math.min(page, totalPages);
  const rows = filtered.slice((p - 1) * PAGE_SIZE, p * PAGE_SIZE);

  const toggleAll = () => {
    if (rows.every((r) => selected.has(r.id))) {
      const s = new Set(selected);
      rows.forEach((r) => s.delete(r.id));
      setSelected(s);
    } else {
      setSelected(new Set([...selected, ...rows.map((r) => r.id)]));
    }
  };

  const toggle = (id: string) => {
    const s = new Set(selected);
    s.has(id) ? s.delete(id) : s.add(id);
    setSelected(s);
  };

  const bulkAction = (label: string) => {
    toast.success(`${label} applied to ${selected.size} users`);
    setSelected(new Set());
  };

  const total = waitlistUsers.length;
  const verified = waitlistUsers.filter((u) => u.verified).length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Waitlist Management"
        description="Search, filter and take action on your waitlist users."
        actions={
          <>
            <Button variant="outline" size="sm" onClick={() => toast.success("Exporting CSV…")}>
              <Download className="mr-2 h-4 w-4" /> Export
            </Button>
            <Button size="sm" className="bg-[#0D7A46] hover:bg-[#166534]">
              <Plus className="mr-2 h-4 w-4" /> Add user
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Total signups" value={total} delta={18.4} icon={Users} />
        <StatCard label="Verified" value={verified} delta={12.1} icon={UserCheck} hint={`${Math.round((verified/total)*100)}% verified`} />
        <StatCard label="Avg referrals" value={(waitlistUsers.reduce((s, u) => s + u.referrals, 0) / total).toFixed(1)} icon={Award} />
        <StatCard label="Conversion" value="4.7%" delta={0.4} icon={Percent} />
      </div>

      <div className="rounded-2xl border border-border/60 bg-white shadow-sm">
        <div className="flex flex-wrap items-center gap-2 border-b border-border/60 p-4">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Search name, email, city…" value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} className="pl-9" />
          </div>
          <Select value={status} onValueChange={(v) => { setStatus(v); setPage(1); }}>
            <SelectTrigger className="w-[150px]"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="invited">Invited</SelectItem>
              <SelectItem value="onboarded">Onboarded</SelectItem>
              <SelectItem value="unsubscribed">Unsubscribed</SelectItem>
            </SelectContent>
          </Select>
          <Select value={source} onValueChange={(v) => { setSource(v); setPage(1); }}>
            <SelectTrigger className="w-[150px]"><SelectValue placeholder="Source" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All sources</SelectItem>
              <SelectItem value="organic">Organic</SelectItem>
              <SelectItem value="referral">Referral</SelectItem>
              <SelectItem value="instagram">Instagram</SelectItem>
              <SelectItem value="twitter">Twitter/X</SelectItem>
              <SelectItem value="facebook">Facebook</SelectItem>
              <SelectItem value="tiktok">TikTok</SelectItem>
              <SelectItem value="google">Google</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm"><Filter className="mr-2 h-4 w-4" /> More filters</Button>
        </div>

        {selected.size > 0 && (
          <div className="flex items-center gap-2 border-b border-border/60 bg-[#0D7A46]/5 px-4 py-2 text-sm">
            <span className="font-medium">{selected.size} selected</span>
            <div className="ml-auto flex gap-2">
              <Button size="sm" variant="outline" onClick={() => bulkAction("Verify")}><CheckCircle2 className="mr-1 h-3 w-3" /> Verify</Button>
              <Button size="sm" variant="outline" onClick={() => bulkAction("Tag")}><Tag className="mr-1 h-3 w-3" /> Tag</Button>
              <Button size="sm" variant="outline" onClick={() => bulkAction("Email")}>Email</Button>
              <Button size="sm" variant="outline" className="text-red-600" onClick={() => bulkAction("Delete")}>Delete</Button>
            </div>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/30 text-left text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="p-3 w-10"><Checkbox checked={rows.length > 0 && rows.every((r) => selected.has(r.id))} onCheckedChange={toggleAll} /></th>
                <th className="p-3 font-medium">User</th>
                <th className="p-3 font-medium">City</th>
                <th className="p-3 font-medium">Status</th>
                <th className="p-3 font-medium">Verified</th>
                <th className="p-3 font-medium">Source</th>
                <th className="p-3 font-medium text-right">Refs</th>
                <th className="p-3 font-medium">Joined</th>
                <th className="p-3 w-10"></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((u) => (
                <tr key={u.id} className="border-t border-border/40 hover:bg-muted/20">
                  <td className="p-3"><Checkbox checked={selected.has(u.id)} onCheckedChange={() => toggle(u.id)} /></td>
                  <td className="p-3">
                    <div className="flex items-center gap-2">
                      <div className="grid h-8 w-8 place-items-center rounded-full bg-[#0D7A46]/10 text-[10px] font-semibold text-[#0D7A46]">
                        {u.name.split(" ").map((n) => n[0]).slice(0, 2).join("")}
                      </div>
                      <div className="min-w-0">
                        <div className="font-medium truncate max-w-[200px]">{u.name}</div>
                        <div className="text-xs text-muted-foreground truncate max-w-[200px]">{u.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="p-3 text-muted-foreground">{u.city}</td>
                  <td className="p-3">
                    <StatusBadge status={u.status} />
                  </td>
                  <td className="p-3">
                    {u.verified
                      ? <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                      : <XCircle className="h-4 w-4 text-muted-foreground" />}
                  </td>
                  <td className="p-3">
                    <Badge variant="secondary" className="capitalize">{u.source}</Badge>
                  </td>
                  <td className="p-3 text-right font-semibold">{u.referrals}</td>
                  <td className="p-3 text-muted-foreground text-xs">{new Date(u.joinedAt).toLocaleDateString()}</td>
                  <td className="p-3">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-7 w-7"><MoreHorizontal className="h-4 w-4" /></Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuItem onClick={() => setView(u)}><Eye className="mr-2 h-3.5 w-3.5" /> View</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => toast.success("Edit dialog would open")}><Pencil className="mr-2 h-3.5 w-3.5" /> Edit</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => toast.success(`Emailed ${u.email}`)}>Email user</DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-red-600" onClick={() => toast.success("User deleted")}>
                          <Trash2 className="mr-2 h-3.5 w-3.5" /> Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr><td colSpan={9} className="p-10 text-center text-sm text-muted-foreground">No users match your filters.</td></tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border/60 px-4 py-3 text-sm">
          <div className="text-muted-foreground text-xs">
            Showing <strong>{(p - 1) * PAGE_SIZE + 1}</strong>–<strong>{Math.min(p * PAGE_SIZE, filtered.length)}</strong> of <strong>{filtered.length}</strong>
          </div>
          <div className="flex items-center gap-1">
            <Button variant="outline" size="sm" disabled={p === 1} onClick={() => setPage(p - 1)}><ChevronLeft className="h-4 w-4" /></Button>
            <div className="px-2 text-xs">Page {p} / {totalPages}</div>
            <Button variant="outline" size="sm" disabled={p === totalPages} onClick={() => setPage(p + 1)}><ChevronRight className="h-4 w-4" /></Button>
          </div>
        </div>
      </div>

      <Dialog open={!!view} onOpenChange={(o) => !o && setView(null)}>
        <DialogContent className="max-w-lg">
          {view && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-3">
                  <div className="grid h-10 w-10 place-items-center rounded-full bg-[#0D7A46]/10 text-sm font-semibold text-[#0D7A46]">
                    {view.name.split(" ").map((n) => n[0]).slice(0, 2).join("")}
                  </div>
                  {view.name}
                </DialogTitle>
                <DialogDescription>{view.email} · {view.phone}</DialogDescription>
              </DialogHeader>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <Field label="Status"><StatusBadge status={view.status} /></Field>
                <Field label="Verified">{view.verified ? "Yes" : "No"}</Field>
                <Field label="City">{view.city}, {view.state}</Field>
                <Field label="Source" className="capitalize">{view.source}</Field>
                <Field label="Device">{view.device}</Field>
                <Field label="Referrals">{view.referrals}</Field>
                <Field label="Position">#{view.position}</Field>
                <Field label="Joined">{new Date(view.joinedAt).toLocaleDateString()}</Field>
              </div>
              <div>
                <Label className="text-xs">Tags</Label>
                <div className="mt-1.5 flex flex-wrap gap-1">
                  {view.tags.length ? view.tags.map((t) => <Badge key={t} variant="secondary">{t}</Badge>) : <span className="text-xs text-muted-foreground">No tags</span>}
                </div>
              </div>
              <div>
                <Label htmlFor="notes" className="text-xs">Notes</Label>
                <Textarea id="notes" defaultValue={view.notes ?? ""} placeholder="Add a note about this user…" className="mt-1.5" />
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setView(null)}>Close</Button>
                <Button className="bg-[#0D7A46] hover:bg-[#166534]" onClick={() => { toast.success("Saved"); setView(null); }}>Save changes</Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Field({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={"mt-0.5 " + (className ?? "")}>{children}</div>
    </div>
  );
}

function StatusBadge({ status }: { status: WaitlistUser["status"] }) {
  const map: Record<string, string> = {
    active: "bg-emerald-50 text-emerald-700",
    invited: "bg-[#D4A017]/15 text-[#8a6b0f]",
    onboarded: "bg-[#0D7A46]/10 text-[#0D7A46]",
    unsubscribed: "bg-muted text-muted-foreground",
  };
  return <span className={"inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold capitalize " + map[status]}>{status}</span>;
}
