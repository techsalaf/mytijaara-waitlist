import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  Search,
  Filter,
  Download,
  Plus,
  MoreHorizontal,
  CheckCircle2,
  XCircle,
  Eye,
  Pencil,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Tag,
  UsersRound,
} from "lucide-react";
import { PageHeader, StatCard, EmptyState, confirmDestructive } from "@/components/admin/ui-bits";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
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
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { type WaitlistUser } from "@/lib/types";
import { Users, UserCheck, Percent, Award } from "lucide-react";
import { toast } from "sonner";
import { waitlistApi } from "@/lib/api";
import { toCsv, downloadCsv } from "@/lib/csv";

export const Route = createFileRoute("/admin/waitlist")({
  head: () => ({
    meta: [{ title: "Waitlist — MyTijaara Admin" }, { name: "robots", content: "noindex" }],
  }),
  component: WaitlistPage,
});

const PAGE_SIZES = [25, 50, 100];
const DEFAULT_PAGE_SIZE = 25;

function WaitlistPage() {
  const [rows, setRows] = useState<WaitlistUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("all");
  const [source, setSource] = useState("all");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [totalCount, setTotalCount] = useState(0);
  const [view, setView] = useState<WaitlistUser | null>(null);
  const [addOpen, setAddOpen] = useState(false);

  // Fetch data from server with current filters and pagination
  const loadUsers = async (currentPage: number, currentPageSize: number) => {
    setLoading(true);
    try {
      const response = await waitlistApi.list({
        page: currentPage,
        per_page: currentPageSize,
        search: q || undefined,
        status: status !== "all" ? status : undefined,
        source: source !== "all" ? source : undefined,
      });
      setRows(response.data);
      // `meta` is an untyped bag, so the total is narrowed before it reaches a
      // numeric state setter; a string or missing key falls back to the row count.
      setTotalCount(
        typeof response.meta?.total === "number" ? response.meta.total : response.data.length,
      );
    } catch (error) {
      console.error("Failed to load waitlist:", error);
      setRows([]);
      setTotalCount(0);
    } finally {
      setLoading(false);
    }
  };

  // Load data on mount and when filters change
  useEffect(() => {
    setPage(1); // Reset to page 1 when filters change
    loadUsers(1, pageSize);
  }, [q, status, source, pageSize]);

  // Load data when page changes
  useEffect(() => {
    loadUsers(page, pageSize);
  }, [page]);

  // Listen for data changes (add, delete, restore) and refresh
  useEffect(() => {
    const handleDataChange = () => {
      loadUsers(page, pageSize);
    };
    window.addEventListener("waitlist:changed", handleDataChange as EventListener);
    return () => window.removeEventListener("waitlist:changed", handleDataChange as EventListener);
  }, [page, pageSize]);

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  const toggleAll = () => {
    if (rows.length > 0 && rows.every((r) => selected.has(r.id))) {
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
    const snapshot = rows.filter((u) => ids.includes(u.id));
    confirmDestructive({
      message: `${ids.length} user${ids.length > 1 ? "s" : ""} deleted`,
      description: "You can undo this action.",
      perform: async () => {
        setSelected(new Set());
        // Remove from UI optimistically
        setRows((prev) => prev.filter((u) => !ids.includes(u.id)));
        setTotalCount((prev) => Math.max(0, prev - ids.length));
        
        // Call API and refresh on completion
        await waitlistApi.remove(ids);
        window.dispatchEvent(new CustomEvent("waitlist:changed"));
      },
      undo: async () => {
        // Restore on undo
        await waitlistApi.restore(snapshot);
        window.dispatchEvent(new CustomEvent("waitlist:changed"));
      },
    });
  };

  const bulkAction = async (label: string) => {
    if (label === "Delete") {
      deleteUsers(Array.from(selected));
      return;
    }
    if (label === "Verify") {
      const ids = Array.from(selected);
      await Promise.all(ids.map((id) => waitlistApi.update(id, { verified: true })));
      window.dispatchEvent(new CustomEvent("waitlist:changed"));
      setRows((current) =>
        current.map((user) => (ids.includes(user.id) ? { ...user, verified: true } : user)),
      );
    }
    toast.success(`${label} applied to ${selected.size} users`);
    setSelected(new Set());
  };

  const exportCsv = () => {
    const csv = toCsv(rows, [
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
    toast.success(`Exported ${rows.length} rows`);
  };

  const total = totalCount || 1;
  const verified = rows.filter((u) => u.verified).length;

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
            <Button size="sm" className="bg-primary hover:bg-primary/90" onClick={() => setAddOpen(true)}>
              <Plus className="mr-2 h-4 w-4" /> Add user
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Total signups" value={totalCount} delta={0} icon={Users} />
        <StatCard
          label="Verified"
          value={verified}
          delta={0}
          icon={UserCheck}
          hint={`${totalCount > 0 ? Math.round((verified / totalCount) * 100) : 0}% verified`}
        />
        <StatCard
          label="Avg referrals"
          value={
            rows.length
              ? (rows.reduce((s, u) => s + u.referrals, 0) / rows.length).toFixed(1)
              : "0"
          }
          icon={Award}
        />
        <StatCard label="Conversion" value="–" delta={0} icon={Percent} />
      </div>

      <div className="rounded-2xl border border-border/60 bg-card shadow-sm">
        <div className="flex flex-wrap items-center gap-2 border-b border-border/60 p-4">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search name, email, city…"
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setPage(1);
              }}
              className="pl-9"
            />
          </div>
          <Select
            value={status}
            onValueChange={(v) => {
              setStatus(v);
              setPage(1);
            }}
          >
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="invited">Invited</SelectItem>
              <SelectItem value="onboarded">Onboarded</SelectItem>
              <SelectItem value="unsubscribed">Unsubscribed</SelectItem>
            </SelectContent>
          </Select>
          <Select
            value={source}
            onValueChange={(v) => {
              setSource(v);
              setPage(1);
            }}
          >
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Source" />
            </SelectTrigger>
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
          <Button variant="outline" size="sm" className="hidden sm:inline-flex">
            <Filter className="mr-2 h-4 w-4" /> More filters
          </Button>
        </div>

        {selected.size > 0 && (
          <div className="flex flex-wrap items-center gap-2 border-b border-border/60 bg-primary/5 px-4 py-2 text-sm">
            <span className="font-medium">{selected.size} selected</span>
            <div className="ml-auto flex flex-wrap gap-2">
              <Button size="sm" variant="outline" onClick={() => bulkAction("Verify")}>
                <CheckCircle2 className="mr-1 h-3 w-3" /> Verify
              </Button>
              <Button size="sm" variant="outline" onClick={() => bulkAction("Tag")}>
                <Tag className="mr-1 h-3 w-3" /> Tag
              </Button>
              <Button size="sm" variant="outline" onClick={() => bulkAction("Email")}>
                Email
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="text-red-600"
                onClick={() => bulkAction("Delete")}
              >
                Delete
              </Button>
            </div>
          </div>
        )}

        {/* Desktop table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/30 text-left text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="p-3 w-10">
                  <Checkbox
                    checked={rows.length > 0 && rows.every((r) => selected.has(r.id))}
                    onCheckedChange={toggleAll}
                  />
                </th>
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
              {loading &&
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i} className="border-t border-border/40">
                    <td colSpan={9} className="p-3">
                      <div className="h-8 animate-pulse rounded bg-muted/60" />
                    </td>
                  </tr>
                ))}
              {!loading &&
                rows.map((u) => (
                  <tr key={u.id} className="border-t border-border/40 hover:bg-muted/20">
                    <td className="p-3">
                      <Checkbox checked={selected.has(u.id)} onCheckedChange={() => toggle(u.id)} />
                    </td>
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <div className="grid h-8 w-8 place-items-center rounded-full bg-primary/10 text-[10px] font-semibold text-primary">
                          {u.name
                            .split(" ")
                            .map((n) => n[0])
                            .slice(0, 2)
                            .join("")}
                        </div>
                        <div className="min-w-0">
                          <div className="font-medium truncate max-w-[200px]">{u.name}</div>
                          <div className="text-xs text-muted-foreground truncate max-w-[200px]">
                            {u.email}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="p-3 text-muted-foreground">{u.city}</td>
                    <td className="p-3">
                      <StatusBadge status={u.status} />
                    </td>
                    <td className="p-3">
                      {u.verified ? (
                        <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                      ) : (
                        <XCircle className="h-4 w-4 text-muted-foreground" />
                      )}
                    </td>
                    <td className="p-3">
                      <Badge variant="secondary" className="capitalize">
                        {u.source}
                      </Badge>
                    </td>
                    <td className="p-3 text-right font-semibold">{u.referrals}</td>
                    <td className="p-3 text-muted-foreground text-xs">
                      {new Date(u.joinedAt).toLocaleDateString()}
                    </td>
                    <td className="p-3">
                      <RowMenu user={u} onView={setView} onDelete={(id) => deleteUsers([id])} />
                    </td>
                  </tr>
                ))}
              {!loading && rows.length === 0 && (
                <tr>
                  <td colSpan={9} className="p-6">
                    <EmptyState
                      illustration="search"
                      title="No users match your filters"
                      description="Try clearing the search or picking a different status."
                      action={
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setQ("");
                            setStatus("all");
                            setSource("all");
                          }}
                        >
                          Clear filters
                        </Button>
                      }
                    />
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile cards */}
        <div className="md:hidden divide-y divide-border/40">
          {loading &&
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="p-4">
                <div className="h-16 animate-pulse rounded bg-muted/60" />
              </div>
            ))}
          {!loading &&
            rows.map((u) => (
              <div key={u.id} className="flex items-start gap-3 p-4">
                <Checkbox
                  checked={selected.has(u.id)}
                  onCheckedChange={() => toggle(u.id)}
                  className="mt-1"
                />
                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                  {u.name
                    .split(" ")
                    .map((n) => n[0])
                    .slice(0, 2)
                    .join("")}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <div className="truncate font-medium">{u.name}</div>
                    {u.verified && (
                      <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-600" />
                    )}
                  </div>
                  <div className="truncate text-xs text-muted-foreground">{u.email}</div>
                  <div className="mt-2 flex flex-wrap items-center gap-1.5">
                    <StatusBadge status={u.status} />
                    <Badge variant="secondary" className="text-[10px] capitalize">
                      {u.source}
                    </Badge>
                    <span className="text-[11px] text-muted-foreground">
                      {u.city} · {u.referrals} refs
                    </span>
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
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground text-xs">Per page:</span>
            <Select value={String(pageSize)} onValueChange={(v) => setPageSize(Number(v))}>
              <SelectTrigger className="w-[80px]">
                <SelectValue placeholder="Size" />
              </SelectTrigger>
              <SelectContent>
                {PAGE_SIZES.map((size) => (
                  <SelectItem key={size} value={String(size)}>
                    {size}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="text-muted-foreground text-xs">
            Showing <strong>{rows.length ? (page - 1) * pageSize + 1 : 0}</strong>–
            <strong>{Math.min(page * pageSize, totalCount)}</strong> of{" "}
            <strong>{totalCount}</strong>
          </div>
          <div className="flex items-center gap-1">
            <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(page - 1)}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="px-2 text-xs">
              Page {page} / {totalPages}
            </div>
            <Button
              variant="outline"
              size="sm"
              disabled={page === totalPages}
              onClick={() => setPage(page + 1)}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
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
                    {view.name
                      .split(" ")
                      .map((n) => n[0])
                      .slice(0, 2)
                      .join("")}
                  </div>
                  {view.name}
                </DialogTitle>
                <DialogDescription>
                  {view.email} · {view.phone}
                </DialogDescription>
              </DialogHeader>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <Field label="Status">
                  <StatusBadge status={view.status} />
                </Field>
                <Field label="Verified">{view.verified ? "Yes" : "No"}</Field>
                <Field label="City">
                  {view.city}, {view.state}
                </Field>
                <Field label="Source" className="capitalize">
                  {view.source}
                </Field>
                <Field label="Device">{view.device}</Field>
                <Field label="Referrals">{view.referrals}</Field>
                <Field label="Position">#{view.position}</Field>
                <Field label="Joined">{new Date(view.joinedAt).toLocaleDateString()}</Field>
              </div>
              <div>
                <Label className="text-xs">Tags</Label>
                <div className="mt-1.5 flex flex-wrap gap-1">
                  {view.tags.length ? (
                    view.tags.map((t) => (
                      <Badge key={t} variant="secondary">
                        {t}
                      </Badge>
                    ))
                  ) : (
                    <span className="text-xs text-muted-foreground">No tags</span>
                  )}
                </div>
              </div>
              <div>
                <Label htmlFor="notes" className="text-xs">
                  Notes
                </Label>
                <Textarea
                  id="notes"
                  defaultValue={view.notes ?? ""}
                  placeholder="Add a note about this user…"
                  className="mt-1.5"
                />
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setView(null)}>
                  Close
                </Button>
                <Button
                  className="bg-primary hover:bg-primary/90"
                  onClick={() => {
                    toast.success("Saved");
                    setView(null);
                  }}
                >
                  Save changes
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      <AddUserDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        onCreated={() => {
          window.dispatchEvent(new CustomEvent("waitlist:changed"));
          setAddOpen(false);
        }}
      />
    </div>
  );
}

function Field({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
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
  return (
    <span
      className={
        "inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold capitalize " + map[status]
      }
    >
      {status}
    </span>
  );
}

function RowMenu({
  user,
  onView,
  onDelete,
}: {
  user: WaitlistUser;
  onView: (u: WaitlistUser) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-7 w-7">
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>Actions</DropdownMenuLabel>
        <DropdownMenuItem onClick={() => onView(user)}>
          <Eye className="mr-2 h-3.5 w-3.5" /> View
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => toast.success("Edit dialog would open")}>
          <Pencil className="mr-2 h-3.5 w-3.5" /> Edit
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => toast.success(`Emailed ${user.email}`)}>
          Email user
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem className="text-red-600" onClick={() => onDelete(user.id)}>
          <Trash2 className="mr-2 h-3.5 w-3.5" /> Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/* ------------------------------------------------------------------ */
/* Add User Dialog                                                      */
/* ------------------------------------------------------------------ */

type AddForm = {
  name: string;
  email: string;
  phone: string;
  city: string;
  role: string;
  source: string;
  referralCode: string;
};

const EMPTY_FORM: AddForm = {
  name: "",
  email: "",
  phone: "",
  city: "",
  role: "customer",
  source: "organic",
  referralCode: "",
};

function AddUserDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onCreated: () => void;
}) {
  const [form, setForm] = useState<AddForm>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const set = (key: keyof AddForm) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim() || !form.city.trim()) {
      toast.error("Name, email and city are required.");
      return;
    }
    setSaving(true);
    try {
      await waitlistApi.create({
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim() || undefined,
        city: form.city.trim(),
        role: form.role as "customer" | "vendor" | "rider" | "artisan",
        source: form.source as "organic" | "referral" | "instagram" | "twitter" | "facebook" | "tiktok" | "google",
        referralCode: form.source === "referral" && form.referralCode.trim()
          ? form.referralCode.trim()
          : undefined,
        consent: true,
      });
      toast.success(`${form.name} added to the waitlist.`);
      setForm(EMPTY_FORM);
      onCreated();
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Failed to add user. Check if the email already exists.";
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add waitlist user</DialogTitle>
          <DialogDescription>
            Manually add a user to the waitlist. They will receive position #
            {/* position is assigned server-side */} based on current signup order.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <Label htmlFor="add-name">Full name *</Label>
              <Input
                id="add-name"
                value={form.name}
                onChange={set("name")}
                placeholder="Amuda Rasheed"
                required
                className="mt-1"
              />
            </div>
            <div className="col-span-2">
              <Label htmlFor="add-email">Email *</Label>
              <Input
                id="add-email"
                type="email"
                value={form.email}
                onChange={set("email")}
                placeholder="rasheed@example.com"
                required
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="add-phone">Phone</Label>
              <Input
                id="add-phone"
                type="tel"
                value={form.phone}
                onChange={set("phone")}
                placeholder="+234 800 000 0000"
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="add-city">City *</Label>
              <Input
                id="add-city"
                value={form.city}
                onChange={set("city")}
                placeholder="Lagos"
                required
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="add-role">Role *</Label>
              <Select value={form.role} onValueChange={(v) => setForm((f) => ({ ...f, role: v }))}>
                <SelectTrigger id="add-role" className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="customer">Customer</SelectItem>
                  <SelectItem value="vendor">Vendor</SelectItem>
                  <SelectItem value="rider">Rider</SelectItem>
                  <SelectItem value="artisan">Artisan</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="add-source">Source *</Label>
              <Select
                value={form.source}
                onValueChange={(v) => setForm((f) => ({ ...f, source: v }))}
              >
                <SelectTrigger id="add-source" className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="organic">Organic</SelectItem>
                  <SelectItem value="referral">Referral</SelectItem>
                  <SelectItem value="instagram">Instagram</SelectItem>
                  <SelectItem value="twitter">Twitter/X</SelectItem>
                  <SelectItem value="facebook">Facebook</SelectItem>
                  <SelectItem value="tiktok">TikTok</SelectItem>
                  <SelectItem value="google">Google</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {form.source === "referral" && (
              <div className="col-span-2">
                <Label htmlFor="add-referral">Referral code</Label>
                <Input
                  id="add-referral"
                  value={form.referralCode}
                  onChange={set("referralCode")}
                  placeholder="ABC123"
                  className="mt-1"
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setForm(EMPTY_FORM);
                onOpenChange(false);
              }}
            >
              Cancel
            </Button>
            <Button type="submit" className="bg-primary hover:bg-primary/90" disabled={saving}>
              {saving ? "Adding…" : "Add user"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
