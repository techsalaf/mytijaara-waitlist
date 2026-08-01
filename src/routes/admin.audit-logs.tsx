import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { PageHeader, SectionCard } from "@/components/admin/ui-bits";
import { auditApi, type AuditEntry } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, Download, Server, Globe, Smartphone } from "lucide-react";

export const Route = createFileRoute("/admin/audit-logs")({
  head: () => ({
    meta: [{ title: "Audit Logs — MyTijaara Admin" }, { name: "robots", content: "noindex" }],
  }),
  component: AuditLogs,
});

function AuditLogs() {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [search, setSearch] = useState("");
  useEffect(() => {
    void auditApi.list({ search }).then((response) => setEntries(response.data));
  }, [search]);
  return (
    <div className="space-y-6">
      <PageHeader
        title="Audit Logs"
        description="Every important action across your admin panel."
        actions={
          <Button size="sm" variant="outline">
            <Download className="mr-2 h-4 w-4" /> Export
          </Button>
        }
      />
      <SectionCard>
        <div className="mb-4 flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search logs…"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="pl-9"
            />
          </div>
        </div>
        <ol className="relative space-y-4 border-l-2 border-border/60 pl-6">
          {entries.map((e) => (
            <li key={e.id} className="relative rounded-xl border border-border/60 bg-card p-4">
              <span className="absolute -left-[30px] top-4 grid h-4 w-4 place-items-center rounded-full border-2 border-primary bg-card">
                <span className="h-1.5 w-1.5 rounded-full bg-primary" />
              </span>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-semibold">{e.user}</span>
                <span className="text-sm text-muted-foreground">{e.action}</span>
                <Badge variant="secondary" className="text-xs">
                  {e.target}
                </Badge>
                <span className="ml-auto text-xs text-muted-foreground">{e.time}</span>
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
            </li>
          ))}
        </ol>
      </SectionCard>
    </div>
  );
}
