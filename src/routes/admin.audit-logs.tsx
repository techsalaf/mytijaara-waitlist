import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { PageHeader, SectionCard } from "@/components/admin/ui-bits";
import { auditApi, type AuditEntry } from "@/lib/api";
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
  ChevronLeft,
  ChevronRight,
  Download,
  Globe,
  Loader2,
  Search,
  Server,
  Smartphone,
  Trash2,
} from "lucide-react";
import { toCsv, downloadCsv } from "@/lib/csv";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/audit-logs")({
  head: () => ({
    meta: [{ title: "Audit Logs — MyTijaara Admin" }, { name: "robots", content: "noindex" }],
  }),
  component: AuditLogs,
});

const PER_PAGE = 50;

function AuditLogs() {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [actions, setActions] = useState<string[]>([]);
  const [actors, setActors] = useState<string[]>([]);

  const [search, setSearch] = useState("");
  const [action, setAction] = useState("all");
  const [user, setUser] = useState("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [page, setPage] = useState(1);

  const [lastPage, setLastPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const params = useCallback(
    (overrides?: { page?: number; per_page?: number }) => ({
      search: search.trim() || undefined,
      action: action === "all" ? undefined : action,
      user: user === "all" ? undefined : user,
      from: from || undefined,
      to: to || undefined,
      page: overrides?.page ?? page,
      per_page: overrides?.per_page ?? PER_PAGE,
    }),
    [search, action, user, from, to, page],
  );

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await auditApi.list(params());
      setEntries(response.data);
      setTotal(typeof response.meta?.total === "number" ? response.meta.total : response.data.length);
      setLastPage(typeof response.meta?.last_page === "number" ? response.meta.last_page : 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load the audit log");
    } finally {
      setLoading(false);
    }
  }, [params]);

  useEffect(() => {
    const timer = setTimeout(() => void load(), 250);
    return () => clearTimeout(timer);
  }, [load]);

  // Filters change the result set, so the page cursor resets with them.
  useEffect(() => {
    setPage(1);
  }, [search, action, user, from, to]);

  useEffect(() => {
    void auditApi
      .actions()
      .then((response) => setActions(response.data))
      .catch(() => {
        /* the dropdown degrades to "All actions" */
      });
    void auditApi
      .actors()
      .then((response) => setActors(response.data))
      .catch(() => {
        /* the dropdown degrades to "All users" */
      });
  }, []);

  /** Export the whole filtered set, not just the visible page. */
  const exportCsv = async () => {
    setExporting(true);
    try {
      const response = await auditApi.list(params({ page: 1, per_page: 200 }));
      if (response.data.length === 0) {
        toast.error("Nothing to export for these filters");
        return;
      }
      const csv = toCsv(
        response.data.map((entry) => ({
          id: entry.id,
          user: entry.user,
          action: entry.action,
          target: entry.target,
          at: entry.createdAt ?? entry.time,
          ip: entry.ip,
          device: entry.device,
          changes: entry.changes,
        })),
      );
      downloadCsv(`audit-logs-${new Date().toISOString().slice(0, 10)}.csv`, csv);
      toast.success(`Exported ${response.data.length} entries`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Export failed");
    } finally {
      setExporting(false);
    }
  };

  const clearLogs = async () => {
    if (!window.confirm("Permanently delete all audit log entries? This cannot be undone.")) return;
    setClearing(true);
    try {
      const result = await auditApi.clear();
      toast.success(`Cleared ${result.data.cleared} audit log entries`);
      setEntries([]);
      setTotal(0);
      setLastPage(1);
      setPage(1);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to clear logs");
    } finally {
      setClearing(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Audit Logs"
        description="Every important action across your admin panel."
        actions={
          <>
            <Button
              size="sm"
              variant="outline"
              onClick={() => void exportCsv()}
              disabled={exporting || total === 0}
              title={total === 0 ? "No entries to export" : undefined}
            >
              {exporting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Download className="mr-2 h-4 w-4" />
              )}
              Export
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="text-destructive hover:bg-destructive/10 hover:text-destructive"
              onClick={() => void clearLogs()}
              disabled={clearing || total === 0}
              title={total === 0 ? "No entries to clear" : "Permanently delete all log entries"}
            >
              {clearing ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="mr-2 h-4 w-4" />
              )}
              Clear Logs
            </Button>
          </>
        }
      />
      <SectionCard>
        <div className="mb-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
          <div className="relative lg:col-span-2">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search actor, action or target…"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={action} onValueChange={setAction}>
            <SelectTrigger>
              <SelectValue placeholder="All actions" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All actions</SelectItem>
              {actions.map((a) => (
                <SelectItem key={a} value={a}>
                  {a}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={user} onValueChange={setUser}>
            <SelectTrigger>
              <SelectValue placeholder="All users" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All users</SelectItem>
              {actors.map((a) => (
                <SelectItem key={a} value={a}>
                  {a}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="grid grid-cols-2 gap-2">
            <Input
              type="date"
              aria-label="From date"
              value={from}
              onChange={(event) => setFrom(event.target.value)}
            />
            <Input
              type="date"
              aria-label="To date"
              value={to}
              onChange={(event) => setTo(event.target.value)}
            />
          </div>
        </div>

        {loading && (
          <div className="grid min-h-[25vh] place-items-center text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        )}

        {!loading && error && (
          <div className="space-y-3 py-6 text-center">
            <p className="text-sm text-destructive">{error}</p>
            <Button size="sm" variant="outline" onClick={() => void load()}>
              Try again
            </Button>
          </div>
        )}

        {!loading && !error && entries.length === 0 && (
          <p className="py-10 text-center text-sm text-muted-foreground">
            No admin actions recorded for these filters.
          </p>
        )}

        {!loading && !error && entries.length > 0 && (
          <>
            <ol className="relative space-y-4 border-l-2 border-border/60 pl-6">
              {entries.map((e) => (
                <li key={e.id} className="relative rounded-xl border border-border/60 bg-card p-4">
                  <span className="absolute -left-[30px] top-4 grid h-4 w-4 place-items-center rounded-full border-2 border-primary bg-card">
                    <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                  </span>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-semibold">{e.user}</span>
                    <span className="text-sm text-muted-foreground">{e.action}</span>
                    {e.target && (
                      <Badge variant="secondary" className="text-xs">
                        {e.target}
                      </Badge>
                    )}
                    <span className="ml-auto text-xs text-muted-foreground" title={e.createdAt ?? ""}>
                      {e.time}
                    </span>
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Globe className="h-3 w-3" /> {e.ip}
                    </span>
                    <span className="flex items-center gap-1">
                      {e.device.includes("Server") ? (
                        <Server className="h-3 w-3" />
                      ) : (
                        <Smartphone className="h-3 w-3" />
                      )}{" "}
                      {e.device}
                    </span>
                  </div>
                  {e.changes && Object.keys(e.changes).length > 0 && (
                    <pre className="mt-2 overflow-x-auto rounded-lg bg-muted/40 p-2 text-[11px] leading-relaxed text-muted-foreground">
                      {JSON.stringify(e.changes, null, 2)}
                    </pre>
                  )}
                </li>
              ))}
            </ol>

            <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
              <span>
                Page {page} of {lastPage} · {total} entr{total === 1 ? "y" : "ies"}
              </span>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={page >= lastPage}
                  onClick={() => setPage((p) => Math.min(lastPage, p + 1))}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </>
        )}
      </SectionCard>
    </div>
  );
}
