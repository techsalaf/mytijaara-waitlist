import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { SectionCard } from "@/components/admin/ui-bits";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Circle } from "lucide-react";
import { adminUsers } from "@/lib/mock-data";

export const Route = createFileRoute("/admin/users/$id")({
  loader: ({ params }) => {
    const u = adminUsers.find((x) => x.id === params.id);
    if (!u) throw notFound();
    return u;
  },
  notFoundComponent: () => <div className="text-center p-10">User not found. <Link to="/admin/users" className="text-primary">Go back</Link></div>,
  component: UserDetail,
});

const timeline = [
  { time: "2m ago", action: "Updated dashboard widget layout" },
  { time: "24m ago", action: "Sent campaign 'Welcome to MyTijaara' to 1,847 users" },
  { time: "1h ago", action: "Signed in from Lagos, Nigeria" },
  { time: "yesterday", action: "Edited hero section" },
  { time: "yesterday", action: "Deleted 3 old media files" },
  { time: "2 days ago", action: "Created role 'Content Editor'" },
  { time: "3 days ago", action: "Exported waitlist (247 users)" },
];

function UserDetail() {
  const u = Route.useLoaderData();
  return (
    <div className="space-y-6">
      <Button asChild variant="ghost" size="sm" className="-ml-2">
        <Link to="/admin/users"><ArrowLeft className="mr-1 h-3 w-3" /> Back to users</Link>
      </Button>

      <div className="flex flex-wrap items-center gap-4">
        <div className="grid h-16 w-16 place-items-center rounded-2xl bg-primary text-lg font-bold text-white">{u.avatar}</div>
        <div>
          <h1 className="text-2xl font-bold">{u.name}</h1>
          <div className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
            <span>{u.email}</span> · <Badge variant="secondary">{u.role}</Badge>
            <Badge className="bg-emerald-50 text-emerald-700">{u.status}</Badge>
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <SectionCard title="Profile" className="lg:col-span-2">
          <div className="grid gap-4 sm:grid-cols-2">
            <div><Label>Full name</Label><Input defaultValue={u.name} className="mt-1.5" /></div>
            <div><Label>Email</Label><Input defaultValue={u.email} className="mt-1.5" /></div>
            <div><Label>Phone</Label><Input defaultValue="+234 803 555 0198" className="mt-1.5" /></div>
            <div><Label>Location</Label><Input defaultValue="Lagos, Nigeria" className="mt-1.5" /></div>
          </div>
          <div className="mt-4"><Label>Notes</Label><Textarea placeholder="Internal notes about this admin…" rows={3} className="mt-1.5" /></div>
        </SectionCard>

        <SectionCard title="Access">
          <div className="space-y-2 text-sm">
            <div className="flex justify-between rounded-lg bg-muted/40 p-2"><span className="text-muted-foreground">Role</span><span className="font-semibold">{u.role}</span></div>
            <div className="flex justify-between rounded-lg bg-muted/40 p-2"><span className="text-muted-foreground">Permissions</span><span className="font-semibold">42</span></div>
            <div className="flex justify-between rounded-lg bg-muted/40 p-2"><span className="text-muted-foreground">2FA</span><span className="font-semibold text-emerald-600">Enabled</span></div>
            <div className="flex justify-between rounded-lg bg-muted/40 p-2"><span className="text-muted-foreground">Sessions</span><span className="font-semibold">2 active</span></div>
          </div>
        </SectionCard>
      </div>

      <SectionCard title="Activity timeline">
        <ol className="relative space-y-4 border-l-2 border-border/60 pl-6">
          {timeline.map((e, i) => (
            <li key={i} className="relative">
              <span className="absolute -left-[30px] top-1 grid h-4 w-4 place-items-center rounded-full border-2 border-primary bg-white">
                <Circle className="h-1.5 w-1.5 fill-primary text-primary" />
              </span>
              <div className="text-sm">{e.action}</div>
              <div className="text-xs text-muted-foreground">{e.time}</div>
            </li>
          ))}
        </ol>
      </SectionCard>
    </div>
  );
}
