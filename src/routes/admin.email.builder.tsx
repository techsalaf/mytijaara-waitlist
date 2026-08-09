import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { SectionCard } from "@/components/admin/ui-bits";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeft,
  Bold,
  Italic,
  Link as LinkIcon,
  Image,
  Send,
  Save,
  Clock,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { campaignsApi, templatesApi } from "@/lib/api";
import type { CampaignSegment, EmailTemplate } from "@/lib/types";

export const Route = createFileRoute("/admin/email/builder")({
  component: Builder,
});

function Builder() {
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [subject, setSubject] = useState("");
  const [preheader, setPreheader] = useState("");
  const [body, setBody] = useState("");
  const [templateId, setTemplateId] = useState<string>("");
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [segments, setSegments] = useState<CampaignSegment[]>([]);
  const [segmentValue, setSegmentValue] = useState("all");
  const [scheduleMode, setScheduleMode] = useState<"now" | "later">("now");
  const [scheduledAt, setScheduledAt] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  // The selected segment's live reach.
  const reach = segments.find((s) => s.value === segmentValue)?.reach ?? null;

  useEffect(() => {
    void Promise.all([
      templatesApi.list().then((r) => setTemplates(r.data)),
      /**
       * These counts come from `CampaignSegment::reach()` on the server,
       * which is the same function the dispatcher uses to build the actual
       * recipient list, so "Estimated reach: 2,847" matches who would
       * actually be mailed.
       */
      campaignsApi.segments().then((r) => setSegments(r.data)),
    ]);
  }, []);

  const buildHtml = () => {
    const escapedPreheader = preheader
      ? `<p style="color:#888;font-size:13px;">${preheader}</p>`
      : "";
    const escapedBody = body
      .split("\n")
      .map((line) => `<p>${line || "&nbsp;"}</p>`)
      .join("");
    return `${escapedPreheader}${escapedBody}`;
  };

  const campaignPayload = (status: "draft" | "sending" | "scheduled") => ({
    name: name.trim() || "Untitled campaign",
    subject: subject.trim() || "(no subject)",
    html: buildHtml(),
    status,
    template: templateId || null,
    segment: segments.find((s) => s.value === segmentValue)?.rules ?? null,
    scheduledAt: status === "scheduled" ? scheduledAt || null : null,
  });

  const saveDraft = async () => {
    setIsSaving(true);
    try {
      const r = await campaignsApi.create(campaignPayload("draft"));
      toast.success("Draft saved");
      void navigate({ to: "/admin/email/$id", params: { id: r.data.id } });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save the draft.");
    } finally {
      setIsSaving(false);
    }
  };

  const sendNow = async () => {
    if (!name.trim() || !subject.trim()) {
      toast.error("Campaign name and subject are required before sending.");
      return;
    }
    setIsSaving(true);
    try {
      const r = await campaignsApi.create(campaignPayload("draft"));
      await campaignsApi.send(r.data.id);
      toast.success("Campaign queued for sending.");
      void navigate({ to: "/admin/email/$id", params: { id: r.data.id } });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not queue the campaign.");
    } finally {
      setIsSaving(false);
    }
  };

  const scheduleLater = async () => {
    if (!scheduledAt) {
      toast.error("Pick a send time to schedule.");
      return;
    }
    if (!name.trim() || !subject.trim()) {
      toast.error("Campaign name and subject are required.");
      return;
    }
    setIsSaving(true);
    try {
      const r = await campaignsApi.create(campaignPayload("scheduled"));
      toast.success("Campaign scheduled.");
      void navigate({ to: "/admin/email/$id", params: { id: r.data.id } });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not schedule the campaign.");
    } finally {
      setIsSaving(false);
    }
  };

  const nameRef = useRef<HTMLInputElement>(null);
  useEffect(() => { nameRef.current?.focus(); }, []);

  return (
    <div className="space-y-4">
      <Button asChild variant="ghost" size="sm" className="-ml-2">
        <Link to="/admin/email">
          <ArrowLeft className="mr-1 h-3 w-3" /> All campaigns
        </Link>
      </Button>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold">Create Campaign</h1>
          <p className="text-sm text-muted-foreground">
            Compose a broadcast or lifecycle email for your waitlist.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={saveDraft}
            disabled={isSaving}
            className="cursor-pointer"
          >
            Save as Draft
          </Button>

          {scheduleMode === "now" ? (
            <Button onClick={sendNow} disabled={isSaving} className="cursor-pointer">
              <Send className="mr-1.5 h-4 w-4" /> Send Now
            </Button>
          ) : (
            <Button onClick={scheduleLater} disabled={isSaving} className="cursor-pointer">
              <Calendar className="mr-1.5 h-4 w-4" /> Schedule Send
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
        <SectionCard>
          <div className="mb-4 grid gap-3 sm:grid-cols-2">
            <div>
              <Label>Campaign name</Label>
                <Input
                  ref={nameRef}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Welcome series #3"
                  className="mt-1.5"
                />
              </div>
              <div>
                <Label>Template</Label>
                <Select
                  value={templateId || "none"}
                  onValueChange={(v) => void handleSelectTemplate(v)}
                >
                  <SelectTrigger className="mt-1.5">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No template</SelectItem>
                    {templates.map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

          <div>
            <Label>Subject</Label>
            <Input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="e.g. You're officially on the list 🎉"
              className="mt-1.5"
            />
          </div>
          <div className="mt-3">
            <Label>Preheader</Label>
            <Input
              value={preheader}
              onChange={(e) => setPreheader(e.target.value)}
              placeholder="Short preview shown in inbox"
              className="mt-1.5"
            />
          </div>

          <div className="mt-4 overflow-hidden rounded-xl border border-border/60">
            <div className="flex items-center gap-1 border-b border-border/60 bg-muted/40 px-2 py-1.5">
              <Button variant="ghost" size="icon" className="h-7 w-7">
                <Bold className="h-3.5 w-3.5" />
              </Button>
              <Button variant="ghost" size="icon" className="h-7 w-7">
                <Italic className="h-3.5 w-3.5" />
              </Button>
              <Button variant="ghost" size="icon" className="h-7 w-7">
                <LinkIcon className="h-3.5 w-3.5" />
              </Button>
              <Button variant="ghost" size="icon" className="h-7 w-7">
                <Image className="h-3.5 w-3.5" />
              </Button>
            </div>
            <Textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder={"Hi {{first_name}},\n\nWrite your email here…"}
              rows={16}
              className="rounded-none border-0 font-mono text-sm focus-visible:ring-0"
            />
          </div>

          <div className="mt-4 flex flex-wrap justify-end gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={isSaving}
              onClick={() => void saveDraft()}
            >
              {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              Save draft
            </Button>
            {scheduleMode === "later" ? (
              <Button
                size="sm"
                className="bg-primary hover:bg-primary/90"
                disabled={isSaving || !scheduledAt}
                onClick={() => void scheduleLater()}
              >
                {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Clock className="mr-2 h-4 w-4" />}
                Schedule
              </Button>
            ) : (
              <Button
                size="sm"
                className="bg-primary hover:bg-primary/90"
                disabled={isSaving}
                onClick={() => void sendNow()}
              >
                {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                Send now
              </Button>
            )}
          </div>
        </SectionCard>

        <div className="space-y-4">
          <SectionCard title="Audience">
            <Label className="text-xs">Segment</Label>
            <Select value={segmentValue} onValueChange={setSegmentValue}>
              <SelectTrigger className="mt-1.5">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {segments.length === 0 ? (
                  <SelectItem value="all">Loading…</SelectItem>
                ) : (
                  segments.map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      {s.label} ({s.reach.toLocaleString()})
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
            <div className="mt-4 rounded-lg bg-muted/40 p-3 text-xs">
              <div className="font-medium">Estimated reach</div>
              {reach !== null ? (
                <>
                  <div className="mt-1 text-2xl font-bold text-primary">
                    {reach.toLocaleString()}
                  </div>
                  <div className="text-muted-foreground">recipients after suppressions</div>
                </>
              ) : (
                <div className="mt-1 text-muted-foreground">Loading…</div>
              )}
            </div>
          </SectionCard>

          <SectionCard title="Send options">
            <div className="space-y-3 text-sm">
              <div className="rounded-lg border border-border/60 p-3">
                <Label className="text-xs">Schedule</Label>
                <Select
                  value={scheduleMode}
                  onValueChange={(v) => setScheduleMode(v as "now" | "later")}
                >
                  <SelectTrigger className="mt-1 h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="now">Send immediately</SelectItem>
                    <SelectItem value="later">Schedule for later</SelectItem>
                  </SelectContent>
                </Select>
                {scheduleMode === "later" && (
                  <Input
                    type="datetime-local"
                    value={scheduledAt}
                    onChange={(e) => setScheduledAt(e.target.value)}
                    className="mt-2 h-8 text-xs"
                    min={new Date(Date.now() + 60_000).toISOString().slice(0, 16)}
                  />
                )}
              </div>
            </div>
          </SectionCard>
        </div>
      </div>
    </div>
  );
}
