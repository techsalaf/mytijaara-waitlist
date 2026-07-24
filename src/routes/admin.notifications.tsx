import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, SectionCard } from "@/components/admin/ui-bits";
import { notifications } from "@/lib/mock-data";
import { Bell, Check, CheckCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/notifications")({
  head: () => ({ meta: [{ title: "Notifications — MyTijaara Admin" }, { name: "robots", content: "noindex" }] }),
  component: NotificationsPage,
});

function NotificationsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Notifications"
        description={`${notifications.filter((n) => n.unread).length} unread`}
        actions={<Button size="sm" variant="outline"><CheckCheck className="mr-2 h-4 w-4" /> Mark all as read</Button>}
      />
      <Tabs defaultValue="all">
        <TabsList>
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="system">System</TabsTrigger>
          <TabsTrigger value="email">Email</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
        </TabsList>
        <TabsContent value="all" className="mt-4">
          <SectionCard>
            <div className="space-y-2">
              {notifications.map((n) => (
                <div key={n.id} className={cn("flex items-start gap-3 rounded-xl border p-4", n.unread ? "border-[#0D7A46]/30 bg-[#0D7A46]/[0.03]" : "border-border/60")}>
                  <div className={cn("grid h-9 w-9 place-items-center rounded-xl",
                    n.type === "success" ? "bg-emerald-100 text-emerald-700" :
                    n.type === "warning" ? "bg-[#D4A017]/15 text-[#8a6b0f]" :
                    "bg-[#0D7A46]/10 text-[#0D7A46]"
                  )}><Bell className="h-4 w-4" /></div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold">{n.title}</span>
                      {n.unread && <span className="h-1.5 w-1.5 rounded-full bg-[#D4A017]" />}
                    </div>
                    <p className="text-sm text-muted-foreground">{n.body}</p>
                    <div className="mt-1 text-xs text-muted-foreground">{n.time}</div>
                  </div>
                  <Button variant="ghost" size="icon" className="h-8 w-8"><Check className="h-3.5 w-3.5" /></Button>
                </div>
              ))}
            </div>
          </SectionCard>
        </TabsContent>
        <TabsContent value="system"><SectionCard><p className="text-sm text-muted-foreground">System notifications appear here.</p></SectionCard></TabsContent>
        <TabsContent value="email"><SectionCard><p className="text-sm text-muted-foreground">Email campaign notifications appear here.</p></SectionCard></TabsContent>
        <TabsContent value="activity"><SectionCard><p className="text-sm text-muted-foreground">Activity feed appears here.</p></SectionCard></TabsContent>
      </Tabs>
    </div>
  );
}
