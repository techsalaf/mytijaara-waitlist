import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  Search, Filter, Download, Plus, MoreHorizontal, CheckCircle2, XCircle,
  Eye, Pencil, Trash2, ChevronLeft, ChevronRight, Tag, UsersRound,
} from "lucide-react";
import { PageHeader, StatCard, EmptyState, confirmDestructive } from "@/components/admin/ui-bits";
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
import { type WaitlistUser } from "@/lib/mock-data";
import { Users, UserCheck, Percent, Award } from "lucide-react";
import { toast } from "sonner";
import { waitlistApi } from "@/lib/api";
import { toCsv, downloadCsv } from "@/lib/csv";

export const Route = createFileRoute("/admin/waitlist")({
  head: () => ({ meta: [{ title: "Waitlist — MyTijaara Admin" }, { name: "robots", content: "noindex" }] }),
  component: WaitlistPage,
});

const PAGE_SIZE = 12;

function WaitlistPage() {
  const [users, setUsers] = useState<WaitlistUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("all");
  const [source, setSource] = useState("all");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(1);
  const [view, setView] = useState<WaitlistUser | null>(null);

  useEffect(() => {
    let cancel = false;
    waitlistApi.list().then((r) => { if (!cancel) { setUsers(r.data); setLoading(false); } });
    return () => { cancel = true; };
  }, []);

  const filtered = useMemo(() => {
    return users.filter((u) => {
      if (status !== "all" && u.status !== status) return false;
      if (source !== "all" && u.source !== source) return false;
      if (q) {
        const s = q.toLowerCase();
        if (!u.name.toLowerCase().includes(s) && !u.email.toLowerCase().includes(s) && !u.city.toLowerCase().includes(s))
          return false;
      }
      return true;
    });
  }, [users, q, status, source]);

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

  const deleteUsers = (ids: string[]) => {
    const snapshot = users.filter((u) => ids.includes(u.id));
    confirmDestructive({
      message: `${ids.length} user${ids.length > 1 ? "s" : ""} deleted`,
      description: "You can undo this action.",
      perform: () => {
        setUsers((prev) => prev.filter((u) => !ids.includes(u.id)));
        setSelected(new Set());
        waitlistApi.remove(ids);
      },
      undo: () => {
        setUsers((prev) => [...snapshot, ...prev]);
        waitlistApi.restore(snapshot);
      },
    });
  };

  const bulkAction = (label: string) => {
    if (label === "Delete") { deleteUsers(Array.from(selected)); return; }
    toast.success(`${label} applied to ${selected.size} users`);
    setSelected(new Set());
  };

  const exportCsv = () => {
    const csv = toCsv(filtered, [
      { key: "name", label: "Name" },
      { key: "email", label: "Email" },
      { key: "phone", label: "Phone" },
      { key: "city", label: "City" },
      { key: "state", label: "State" },
      { key: "status", label: "Status" },
      { key: "verified", label: "Verified" },
      { key: "source", label: "Source" },
      { key: "referrals", label: "Referrals" },
      { key: "position", label: "Position" },
      { key: "tags", label: "Tags" },
      { key: "joinedAt", label: "Joined" },
    ]);
    downloadCsv(`mytijaara-waitlist-${new Date().toISOString().slice(0, 10)}.csv`, csv);
    toast.success(`Exported ${filtered.length} rows`);
  };

  const total = users.length || 1;
  const verified = users.filter((u) => u.verified).length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Waitlist Management"
        description="Search, filter and take action on your waitlist users."
        actions={
          <>
            <Button variant="outline" size="sm" onClick={exportCsv}>
              <Download className="mr-2 h-4 w-4" /> Export
            </Button>
            <Button size="sm" className="bg-primary hover:bg-primary/90">
              <Plus className="mr-2 h-4 w-4" /> Add user
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Total signups" value={users.length} delta={18.4} icon={Users} />
        <StatCard label="Verified" value={verified} delta={12.1} icon={UserCheck} hint={`${Math.round((verified/total)*100)}% verified`} />
        <StatCard label="Avg referrals" value={users.length ? (users.reduce((s, u) => s + u.referrals, 0) / users.length).toFixed(1) : "0"} icon={Award} />
        <StatCard label="Conversion" value="4.7%" delta={0.4} icon={Percent} />
      </div>

      <div className="rounded-2xl border border-border/60 bg-card shadow-sm">
        <div className="flex flex-wrap items-center gap-2 border-b border-border/60 p-4">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Search name, email, city…" value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} className="pl-9" />
          </div>
          <Select value={status} onValueChange={(v) => { setStatus(v); setPage(1); }}>
            <SelectTrigger className="w-[140px]"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="invited">Invited</SelectItem>
              <SelectItem value="onboarded">Onboarded</SelectItem>
              <SelectItem value="unsubscribed">Unsubscribed</SelectItem>
            </SelectContent>
          </Select>
          <Select value={source} onValueChange={(v) => { setSource(v); setPage(1); }}>
            <SelectTrigger className="w-[140px]"><SelectValue placeholder="Source" /></SelectTrigger>
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
          <Button variant="outline" size="sm" className="hidden sm:inline-flex"><Filter className="mr-2 h-4 w-4" /> More filters</Button>
        </div>

        {selected.size > 0 && (
          <div className="flex flex-wrap items-center gap-2 border-b border-border/60 bg-primary/5 px-4 py-2 text-sm">
            <span className="font-medium">{selected.size} selected</span>
            <div className="ml-auto flex flex-wrap gap-2">
              <Button size="sm" variant="outline" onClick={() => bulkAction("Verify")}><CheckCircle2 className="mr-1 h-3 w-3" /> Verify</Button>
              <Button size="sm" variant="outline" onClick={() => bulkAction("Tag")}><Tag className="mr-1 h-3 w-3" /> Tag</Button>
              <Button size="sm" variant="outline" onClick={() => bulkAction("Email")}>Email</Button>
              <Button size="sm" variant="outline" className="text-red-600" onClick={() => bulkAction("Delete")}>Delete</Button>
            </div>
          </div>
        )}

        {/* Desktop table */}
        <div className="hidden md:block overflow-x-auto">
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
              {loading && Array.from({ length: 6 }).map((_, i) => (
                <tr key={i} className="border-t border-border/40">
                  <td colSpan={9} className="p-3"><div className="h-8 animate-pulse rounded bg-muted/60" /></td>
                </tr>
              ))}
              {!loading && rows.map((u) => (
                <tr key={u.id} className="border-t border-border/40 hover:bg-muted/20">
                  <td className="p-3"><Checkbox checked={selected.has(u.id)} onCheckedChange={() => toggle(u.id)} /></td>
                  <td className="p-3">
                    <div className="flex items-center gap-2">
                      <div className="grid h-8 w-8 place-items-center rounded-full bg-primary/10 text-[10px] font-semibold text-primary">
                        {u.name.split(" ").map((n) => n[0]).slice(0, 2).join("")}
                      </div>
                      <div className="min-w-0">
                        <div className="font-medium truncate max-w-[200px]">{u.name}</div>
                        <div className="text-xs text-muted-foreground truncate max-w-[200px]">{u.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="p-3 text-muted-foreground">{u.city}</td>
                  <td className="p-3"><StatusBadge status={u.status} /></td>
                  <td className="p-3">
                    {u.verified ? <CheckCircle2 className="h-4 w-4 text-emerald-600" /> : <XCircle className="h-4 w-4 text-muted-foreground" />}
                  </td>
                  <td className="p-3"><Badge variant="secondary" className="capitalize">{u.source}</Badge></td>
                  <td className="p-3 text-right font-semibold">{u.referrals}</td>
                  <td className="p-3 text-muted-foreground text-xs">{new Date(u.joinedAt).toLocaleDateString()}</td>
                  <td className="p-3">
                    <RowMenu user={u} onView={setView} onDelete={(id) => deleteUsers([id])} />
                  </td>
                </tr>
              ))}
              {!loading && rows.length === 0 && (
                <tr><td colSpan={9} className="p-6">
                  <EmptyState
                    illustration="search"
                    title="No users match your filters"
                    description="Try clearing the search or picking a different status."
                    action={<Button size="sm" variant="outline" onClick={() => { setQ(""); setStatus("all"); setSource("all"); }}>Clear filters</Button>}
                  />
                </td></tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile cards */}
        <div className="md:hidden divide-y divide-border/40">
          {loading && Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="p-4"><div className="h-16 animate-pulse rounded bg-muted/60" /></div>
          ))}
          {!loading && rows.map((u) => (
            <div key={u.id} className="flex items-start gap-3 p-4">
              <Checkbox checked={selected.has(u.id)} onCheckedChange={() => toggle(u.id)} className="mt-1" />
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                {u.name.split(" ").map((n) => n[0]).slice(0, 2).join("")}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <div className="truncate font-medium">{u.name}</div>
                  {u.verified && <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-600" />}
                </div>
                <div className="truncate text-xs text-muted-foreground">{u.email}</div>
                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                  <StatusBadge status={u.status} />
                  <Badge variant="secondary" className="text-[10px] capitalize">{u.source}</Badge>
                  <span className="text-[11px] text-muted-foreground">{u.city} · {u.referrals} refs</span>
                </div>
              </div>
              <RowMenu user={u} onView={setView} onDelete={(id) => deleteUsers([id])} />
            </div>
          ))}
          {!loading && rows.length === 0 && (
            <div className="p-6">
              <EmptyState
                illustration="search"
                title="No users match your filters"
                description="Try clearing the search or picking a different status."
                icon={UsersRound}
              />
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border/60 px-4 py-3 text-sm">
          <div className="text-muted-foreground text-xs">
            Showing <strong>{filtered.length ? (p - 1) * PAGE_SIZE + 1 : 0}</strong>–<strong>{Math.min(p * PAGE_SIZE, filtered.length)}</strong> of <strong>{filtered.length}</strong>
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
                  <div className="grid h-10 w-10 place-items-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
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
                <Button className="bg-primary hover:bg-primary/90" onClick={() => { toast.success("Saved"); setView(null); }}>Save changes</Button>
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
    invited: "bg-gold/15 text-gold-foreground",
    onboarded: "bg-primary/10 text-primary",
    unsubscribed: "bg-muted text-muted-foreground",
  };
  return <span className={"inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold capitalize " + map[status]}>{status}</span>;
}

function RowMenu({ user, onView, onDelete }: { user: WaitlistUser; onView: (u: WaitlistUser) => void; onDelete: (id: string) => void }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-7 w-7"><MoreHorizontal className="h-4 w-4" /></Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>Actions</DropdownMenuLabel>
        <DropdownMenuItem onClick={() => onView(user)}><Eye className="mr-2 h-3.5 w-3.5" /> View</DropdownMenuItem>
        <DropdownMenuItem onClick={() => toast.success("Edit dialog would open")}><Pencil className="mr-2 h-3.5 w-3.5" /> Edit</DropdownMenuItem>
        <DropdownMenuItem onClick={() => toast.success(`Emailed ${user.email}`)}>Email user</DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem className="text-red-600" onClick={() => onDelete(user.id)}>
          <Trash2 className="mr-2 h-3.5 w-3.5" /> Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
