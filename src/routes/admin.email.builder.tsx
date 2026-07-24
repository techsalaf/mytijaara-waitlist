import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { SectionCard } from "@/components/admin/ui-bits";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Bold, Italic, Link as LinkIcon, Image, Send, Save, Eye } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/email/builder")({
  component: Builder,
});

function Builder() {
  const [subject, setSubject] = useState("You're on the list! Here's what's next 🎉");
  const [preheader, setPreheader] = useState("Big things are coming to your city.");
  const [body, setBody] = useState(`Hi {{first_name}},

Welcome to MyTijaara — you're officially #{{position}} on our waitlist!

We're building Nigeria's first true super app. From ordering jollof to booking a plumber, MyTijaara has you covered.

Share your unique referral link to move up the list and unlock rewards.

— The MyTijaara Team`);

  return (
    <div className="space-y-4">
      <Button asChild variant="ghost" size="sm" className="-ml-2">
        <Link to="/admin/email"><ArrowLeft className="mr-1 h-3 w-3" /> All campaigns</Link>
      </Button>

      <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
        <SectionCard>
          <div className="mb-4 grid gap-3 sm:grid-cols-2">
            <div><Label>Campaign name</Label><Input defaultValue="Welcome to MyTijaara" className="mt-1.5" /></div>
            <div>
              <Label>Template</Label>
              <Select defaultValue="welcome">
                <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="welcome">Welcome</SelectItem>
                  <SelectItem value="referral">Referral bonus</SelectItem>
                  <SelectItem value="invite">Early access invite</SelectItem>
                  <SelectItem value="update">Product update</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div><Label>Subject</Label><Input value={subject} onChange={(e) => setSubject(e.target.value)} className="mt-1.5" /></div>
          <div className="mt-3"><Label>Preheader</Label><Input value={preheader} onChange={(e) => setPreheader(e.target.value)} className="mt-1.5" /></div>

          <div className="mt-4 overflow-hidden rounded-xl border border-border/60">
            <div className="flex items-center gap-1 border-b border-border/60 bg-muted/40 px-2 py-1.5">
              <Button variant="ghost" size="icon" className="h-7 w-7"><Bold className="h-3.5 w-3.5" /></Button>
              <Button variant="ghost" size="icon" className="h-7 w-7"><Italic className="h-3.5 w-3.5" /></Button>
              <Button variant="ghost" size="icon" className="h-7 w-7"><LinkIcon className="h-3.5 w-3.5" /></Button>
              <Button variant="ghost" size="icon" className="h-7 w-7"><Image className="h-3.5 w-3.5" /></Button>
              <div className="mx-1 h-4 w-px bg-border" />
              <Select defaultValue="paragraph">
                <SelectTrigger className="h-7 w-28 border-none bg-transparent text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="h1">Heading 1</SelectItem>
                  <SelectItem value="h2">Heading 2</SelectItem>
                  <SelectItem value="paragraph">Paragraph</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Textarea value={body} onChange={(e) => setBody(e.target.value)} rows={16} className="rounded-none border-0 font-mono text-sm focus-visible:ring-0" />
          </div>

          <div className="mt-4 flex flex-wrap justify-end gap-2">
            <Button variant="outline" size="sm"><Eye className="mr-2 h-4 w-4" /> Preview</Button>
            <Button variant="outline" size="sm" onClick={() => toast.success("Draft saved")}><Save className="mr-2 h-4 w-4" /> Save draft</Button>
            <Button size="sm" className="bg-[#0D7A46] hover:bg-[#166534]" onClick={() => toast.success("Campaign queued for sending")}>
              <Send className="mr-2 h-4 w-4" /> Send now
            </Button>
          </div>
        </SectionCard>

        <div className="space-y-4">
          <SectionCard title="Audience">
            <Label className="text-xs">Segment</Label>
            <Select defaultValue="all">
              <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All active users (2,847)</SelectItem>
                <SelectItem value="lagos">Lagos users (892)</SelectItem>
                <SelectItem value="unverified">Unverified (642)</SelectItem>
                <SelectItem value="referrers">Top referrers (25)</SelectItem>
              </SelectContent>
            </Select>
            <div className="mt-4 rounded-lg bg-muted/40 p-3 text-xs">
              <div className="font-medium">Estimated reach</div>
              <div className="mt-1 text-2xl font-bold text-[#0D7A46]">2,847</div>
              <div className="text-muted-foreground">recipients after suppressions</div>
            </div>
          </SectionCard>

          <SectionCard title="Send options">
            <div className="space-y-3 text-sm">
              <div className="rounded-lg border border-border/60 p-3">
                <Label className="text-xs">From name</Label>
                <Input defaultValue="Adaeze from MyTijaara" className="mt-1 h-8" />
              </div>
              <div className="rounded-lg border border-border/60 p-3">
                <Label className="text-xs">Reply-to</Label>
                <Input defaultValue="hello@mytijaara.com" className="mt-1 h-8" />
              </div>
              <div className="rounded-lg border border-border/60 p-3">
                <Label className="text-xs">Schedule</Label>
                <Select defaultValue="now">
                  <SelectTrigger className="mt-1 h-8"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="now">Send immediately</SelectItem>
                    <SelectItem value="later">Schedule for later</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </SectionCard>
        </div>
      </div>
    </div>
  );
}
