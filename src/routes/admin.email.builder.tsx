import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { SectionCard } from "@/components/admin/ui-bits";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
  Send,
  Save,
  Clock,
  Loader2,
  List,
  Heading2,
  Eye,
  Code,
  Sparkles,
  Type,
} from "lucide-react";
import { toast } from "sonner";
import { campaignsApi, templatesApi, waitlistApi } from "@/lib/api";
import type { CampaignSegment, EmailTemplate, WaitlistUser } from "@/lib/types";
import {
  Search,
  UserPlus,
  UserMinus,
  UserCheck,
  X,
  Loader2 as Loader2Icon,
} from "lucide-react";

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
  const [editorMode, setEditorMode] = useState<"edit" | "preview">("edit");

  // Individual waitlist selection state
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<WaitlistUser[]>([]);
  const [selectedIndividuals, setSelectedIndividuals] = useState<WaitlistUser[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showIndividualSelector, setShowIndividualSelector] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const nameRef = useRef<HTMLInputElement>(null);

  // Selected segment's live reach count
  const reach = segmentValue === "none"
    ? selectedIndividuals.length
    : (segments.find((s) => s.value === segmentValue)?.reach ?? null);

  useEffect(() => {
    nameRef.current?.focus();
    void Promise.all([
      templatesApi.list().then((r) => setTemplates(r.data)),
      campaignsApi.segments().then((r) => setSegments(r.data)),
    ]);
  }, []);

  const searchWaitlist = async (query: string) => {
    if (!query.trim() || query.length < 2) {
      setSearchResults([]);
      return;
    }
    setIsSearching(true);
    try {
      const res = await waitlistApi.list({ search: query.trim(), per_page: 10 });
      setSearchResults(res.data);
    } catch (err) {
      toast.error("Failed to search waitlist");
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSearchChange = (query: string) => {
    setSearchQuery(query);
    // Debounce search
    const timeout = setTimeout(() => searchWaitlist(query), 300);
    return () => clearTimeout(timeout);
  };

  const addIndividual = (user: WaitlistUser) => {
    setSelectedIndividuals((prev) => {
      if (prev.some((u) => u.id === user.id)) return prev;
      return [...prev, user];
    });
    setSearchQuery("");
    setSearchResults([]);
  };

  const removeIndividual = (userId: string) => {
    setSelectedIndividuals((prev) => prev.filter((u) => u.id !== userId));
  };

  const clearIndividuals = () => {
    setSelectedIndividuals([]);
  };

  const handleSelectTemplate = async (selectedId: string) => {
    if (selectedId === "none" || !selectedId) {
      setTemplateId("");
      return;
    }
    setTemplateId(selectedId);
    try {
      const res = await templatesApi.get(selectedId);
      const t = res.data;
      if (t) {
        if (t.name) setName(t.name);
        if (t.subject) setSubject(t.subject);
        if (t.html) {
          setBody(t.html);
        } else if (t.text) {
          setBody(t.text);
        }
        toast.success(`Prefilled campaign with template "${t.name}".`);
      }
    } catch {
      // Degrade gracefully
    }
  };

  const insertFormatting = (prefix: string, suffix: string = "") => {
    const el = textareaRef.current;
    if (!el) {
      setBody((prev) => prev + prefix + suffix);
      return;
    }
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const text = el.value;
    const selected = text.substring(start, end);
    const replacement = prefix + (selected || "text") + suffix;
    const nextValue = text.substring(0, start) + replacement + text.substring(end);
    setBody(nextValue);

    setTimeout(() => {
      el.focus();
      el.setSelectionRange(start + prefix.length, start + prefix.length + (selected.length || 4));
    }, 50);
  };

  const insertToken = (token: string) => {
    insertFormatting(token);
  };

  const buildHtml = () => {
    const isFullHtml = body.includes("<html") || body.includes("<!DOCTYPE");
    if (isFullHtml) {
      return body;
    }

    const escapedPreheader = preheader
      ? `<p style="color:#666666;font-size:13px;margin:0 0 16px;">${preheader}</p>`
      : "";

    // Convert newlines to formatted paragraph blocks if body is raw text
    let formattedBody = body;
    if (!body.includes("<p>") && !body.includes("<div>") && !body.includes("<table")) {
      formattedBody = body
        .split("\n\n")
        .map((para) => `<p style="margin:0 0 16px;line-height:1.6;">${para.replace(/\n/g, "<br>")}</p>`)
        .join("");
    }

    return `${escapedPreheader}${formattedBody}`;
  };

  const campaignPayload = (status: "draft" | "sending" | "scheduled") => {
    const isNoneSegment = segmentValue === "none";
    const baseSegment = isNoneSegment
      ? null
      : (segments.find((s) => s.value === segmentValue)?.rules ?? null);

    // If individuals are selected, add them to the segment rules
    let finalSegment: Record<string, unknown> | null = baseSegment;
    if (selectedIndividuals.length > 0) {
      if (isNoneSegment) {
        finalSegment = {
          only_individuals: true,
          ids: selectedIndividuals.map((u) => u.id),
          emails: selectedIndividuals.map((u) => u.email),
        };
      } else {
        finalSegment = {
          ...baseSegment,
          ids: selectedIndividuals.map((u) => u.id),
          emails: selectedIndividuals.map((u) => u.email),
        };
      }
    }

    return {
      name: name.trim() || "Untitled campaign",
      subject: subject.trim() || "(no subject)",
      html: buildHtml(),
      status,
      template: templateId || null,
      segment: finalSegment,
      scheduledAt: status === "scheduled" ? scheduledAt || null : null,
    };
  };

  const saveDraft = async () => {
    setIsSaving(true);
    try {
      const r = await campaignsApi.create(campaignPayload("draft"));
      toast.success("Draft saved successfully!");
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
    if (segmentValue === "none" && selectedIndividuals.length === 0) {
      toast.error("Select at least one individual recipient or an audience segment.");
      return;
    }
    setIsSaving(true);
    try {
      const r = await campaignsApi.create(campaignPayload("draft"));
      await campaignsApi.send(r.data.id);
      toast.success("Campaign sent successfully!");
      void navigate({ to: "/admin/email/$id", params: { id: r.data.id } });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not send the campaign.");
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
    if (segmentValue === "none" && selectedIndividuals.length === 0) {
      toast.error("Select at least one individual recipient or an audience segment.");
      return;
    }
    setIsSaving(true);
    try {
      const r = await campaignsApi.create(campaignPayload("scheduled"));
      toast.success("Campaign scheduled successfully.");
      void navigate({ to: "/admin/email/$id", params: { id: r.data.id } });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not schedule the campaign.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <Button asChild variant="ghost" size="sm" className="-ml-2">
        <Link to="/admin/email">
          <ArrowLeft className="mr-1.5 h-4 w-4" /> All campaigns
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
            onClick={() => void saveDraft()}
            disabled={isSaving}
            className="cursor-pointer"
          >
            Save as Draft
          </Button>

          {scheduleMode === "now" ? (
            <Button onClick={() => void sendNow()} disabled={isSaving} className="cursor-pointer bg-primary hover:bg-primary/90">
              <Send className="mr-1.5 h-4 w-4" /> Send Now
            </Button>
          ) : (
            <Button onClick={() => void scheduleLater()} disabled={isSaving} className="cursor-pointer bg-primary hover:bg-primary/90">
              <CalendarIcon className="mr-1.5 h-4 w-4" /> Schedule Send
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <div className="space-y-6">
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
                    <SelectValue placeholder="Select template…" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No template (custom)</SelectItem>
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
              <Label>Subject line</Label>
              <Input
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="e.g. You're officially on the list 🎉"
                className="mt-1.5"
              />
            </div>

            <div className="mt-3">
              <Label>Preheader text</Label>
              <Input
                value={preheader}
                onChange={(e) => setPreheader(e.target.value)}
                placeholder="Short preview snippet shown in recipient's inbox"
                className="mt-1.5 text-xs"
              />
            </div>

            {/* Robust Formatting Toolbar */}
            <div className="mt-5 rounded-2xl border border-border/70 overflow-hidden shadow-sm bg-card">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border bg-muted/40 p-2">
                <div className="flex flex-wrap items-center gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => insertFormatting("<strong>", "</strong>")}
                    className="h-8 px-2 text-xs"
                    title="Bold"
                  >
                    <Bold className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => insertFormatting("<em>", "</em>")}
                    className="h-8 px-2 text-xs"
                    title="Italic"
                  >
                    <Italic className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => insertFormatting("<h2 style=\"color:#1f5c3a;font-size:20px;\">", "</h2>")}
                    className="h-8 px-2 text-xs"
                    title="Heading 2"
                  >
                    <Heading2 className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => insertFormatting('<a href="https://" style="color:#1f5c3a;text-decoration:underline;">', "</a>")}
                    className="h-8 px-2 text-xs"
                    title="Insert Link"
                  >
                    <LinkIcon className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => insertFormatting('<ul style="padding-left:20px;">\n  <li>', "</li>\n</ul>")}
                    className="h-8 px-2 text-xs"
                    title="Bullet List"
                  >
                    <List className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => insertFormatting('\n<p style="text-align:center;margin:24px 0;"><a href="https://" style="background:#1f5c3a;color:#ffffff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold;display:inline-block;">', '</a></p>\n')}
                    className="h-8 px-2 text-xs font-semibold text-primary"
                    title="Insert Button CTA"
                  >
                    + Button CTA
                  </Button>
                </div>

                {/* Tokens insertion */}
                <div className="flex items-center gap-2">
                  <Select onValueChange={(v) => insertToken(v)}>
                    <SelectTrigger className="h-8 text-xs w-[130px] bg-background">
                      <SelectValue placeholder="Insert tag…" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="{{first_name}}">First Name</SelectItem>
                      <SelectItem value="{{name}}">Full Name</SelectItem>
                      <SelectItem value="{{email}}">Email</SelectItem>
                      <SelectItem value="{{unsubscribe}}">Unsubscribe Link</SelectItem>
                    </SelectContent>
                  </Select>

                  <div className="flex rounded-lg border border-border p-0.5 bg-background">
                    <Button
                      type="button"
                      variant={editorMode === "edit" ? "secondary" : "ghost"}
                      size="sm"
                      onClick={() => setEditorMode("edit")}
                      className="h-7 px-2.5 text-xs gap-1"
                    >
                      <Type className="h-3 w-3" /> Edit
                    </Button>
                    <Button
                      type="button"
                      variant={editorMode === "preview" ? "secondary" : "ghost"}
                      size="sm"
                      onClick={() => setEditorMode("preview")}
                      className="h-7 px-2.5 text-xs gap-1"
                    >
                      <Eye className="h-3 w-3" /> Preview
                    </Button>
                  </div>
                </div>
              </div>

              {editorMode === "edit" ? (
                <Textarea
                  ref={textareaRef}
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  placeholder={"Hi {{first_name}},\n\nWrite your email body content here. You can use formatting buttons above or plain text…"}
                  rows={16}
                  className="rounded-none border-0 font-mono text-sm focus-visible:ring-0 p-4"
                />
              ) : body.includes("<html") || body.includes("<!DOCTYPE") || body.includes("<table") ? (
                <div className="bg-white">
                  <div className="px-6 py-2.5 bg-muted/40 text-xs text-muted-foreground border-b font-mono">
                    Subject: {subject || "(no subject)"}
                  </div>
                  <iframe
                    title="email-preview"
                    srcDoc={buildHtml()}
                    className="w-full min-h-[520px] border-0 bg-white"
                  />
                </div>
              ) : (
                <div className="p-6 bg-white min-h-[350px] text-sm text-foreground">
                  <div className="text-xs text-muted-foreground border-b pb-2 mb-4 font-mono">
                    Subject: {subject || "(no subject)"}
                  </div>
                  <div
                    className="prose max-w-none text-slate-800"
                    dangerouslySetInnerHTML={{ __html: buildHtml() }}
                  />
                </div>
              )}
            </div>

            <div className="mt-4 flex flex-wrap justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={isSaving}
                onClick={() => void saveDraft()}
              >
                {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                Save Draft
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
                  Send Now
                </Button>
              )}
            </div>
          </SectionCard>
        </div>

        {/* Sidebar: Audience & Scheduling */}
        <div className="space-y-4">
          <SectionCard title="Audience Segment">
            <Label className="text-xs">Target Segment</Label>
            <Select value={segmentValue} onValueChange={setSegmentValue}>
              <SelectTrigger className="mt-1.5">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No Preset (Individual Recipients Only)</SelectItem>
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

            <div className="mt-4 rounded-xl bg-primary/5 border border-primary/10 p-4 text-xs">
              <div className="font-semibold text-foreground">Estimated Audience Reach</div>
              {reach !== null ? (
                <>
                  <div className="mt-1 text-3xl font-extrabold text-primary">
                    {reach.toLocaleString()}
                  </div>
                  <div className="text-muted-foreground mt-0.5">recipients after suppressions</div>
                </>
              ) : (
                <div className="mt-1 text-muted-foreground">Calculating reach…</div>
              )}
            </div>
          </SectionCard>

          {/* Individual Recipients Selector */}
          <SectionCard title="Individual Recipients" description="Add specific waitlisters by name or email">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowIndividualSelector(!showIndividualSelector)}
                  className="cursor-pointer"
                >
                  {showIndividualSelector ? <UserMinus className="mr-1.5 h-3.5 w-3.5" /> : <UserPlus className="mr-1.5 h-3.5 w-3.5" />}
                  {showIndividualSelector ? "Hide Search" : "Add Individual Recipients"}
                </Button>
                {selectedIndividuals.length > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearIndividuals}
                    className="text-destructive hover:text-destructive"
                  >
                    <X className="mr-1.5 h-3.5 w-3.5" /> Clear All
                  </Button>
                )}
              </div>

              {showIndividualSelector && (
                <div className="space-y-3">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      value={searchQuery}
                      onChange={(e) => handleSearchChange(e.target.value)}
                      placeholder="Search by name or email…"
                      className="pl-10"
                    />
                    {isSearching && <Loader2Icon className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />}
                  </div>

                  {searchResults.length > 0 && (
                    <div className="max-h-60 overflow-y-auto space-y-1 border border-border/60 rounded-lg p-2">
                      {searchResults.map((user) => {
                        const isSelected = selectedIndividuals.some((u) => u.id === user.id);
                        return (
                          <div
                            key={user.id}
                            className={`flex items-center justify-between gap-2 p-2 rounded-md transition-colors ${
                              isSelected ? "bg-primary/10" : "hover:bg-muted/50"
                            }`}
                          >
                            <div className="flex items-center gap-2 flex-1 min-w-0">
                              <div className="grid h-8 w-8 place-items-center rounded-full bg-primary/10 text-primary text-xs font-medium">
                                {user.name.charAt(0).toUpperCase()}
                              </div>
                              <div className="min-w-0">
                                <p className="text-sm font-medium truncate">{user.name}</p>
                                <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                              </div>
                            </div>
                            {isSelected ? (
                              <UserCheck className="h-5 w-5 text-primary flex-shrink-0" />
                            ) : (
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => addIndividual(user)}
                                className="h-7 px-2 flex-shrink-0"
                              >
                                Add
                              </Button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {searchQuery.length >= 2 && !isSearching && searchResults.length === 0 && (
                    <p className="text-xs text-muted-foreground text-center py-2">No waitlisters found matching "{searchQuery}"</p>
                  )}

                  {searchQuery.length < 2 && !isSearching && !searchResults.length && (
                    <p className="text-xs text-muted-foreground text-center py-2">Type at least 2 characters to search</p>
                  )}
                </div>
              )}

              {selectedIndividuals.length > 0 && (
                <div className="border-t border-border/60 pt-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium">Selected ({selectedIndividuals.length})</span>
                    <Badge variant="secondary" className="text-xs">
                      {selectedIndividuals.length} individual{selectedIndividuals.length !== 1 ? "s" : ""}
                    </Badge>
                  </div>
                  <div className="flex flex-wrap gap-1.5 max-h-40 overflow-y-auto">
                    {selectedIndividuals.map((user) => (
                      <span
                        key={user.id}
                        className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 text-primary px-2.5 py-1 text-xs font-medium"
                      >
                        {user.name}
                        <button
                          type="button"
                          onClick={() => removeIndividual(user.id)}
                          className="text-primary hover:text-primary/70"
                          aria-label={`Remove ${user.name}`}
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">
                    These individuals will be included in the campaign regardless of the segment selection above.
                  </p>
                </div>
              )}
            </div>
          </SectionCard>

          <SectionCard title="Delivery Schedule">
            <div className="space-y-3 text-sm">
              <div className="rounded-xl border border-border/60 p-3">
                <Label className="text-xs">Send Option</Label>
                <Select
                  value={scheduleMode}
                  onValueChange={(v) => setScheduleMode(v as "now" | "later")}
                >
                  <SelectTrigger className="mt-1.5 h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="now">Send Immediately</SelectItem>
                    <SelectItem value="later">Schedule for Later</SelectItem>
                  </SelectContent>
                </Select>

                {scheduleMode === "later" && (
                  <div className="mt-3">
                    <Label className="text-xs">Schedule Date & Time</Label>
                    <Input
                      type="datetime-local"
                      value={scheduledAt}
                      onChange={(e) => setScheduledAt(e.target.value)}
                      className="mt-1 h-8 text-xs"
                    />
                  </div>
                )}
              </div>
            </div>
          </SectionCard>
        </div>
      </div>
    </div>
  );
}

function CalendarIcon({ className }: { className?: string }) {
  return <Clock className={className} />;
}
