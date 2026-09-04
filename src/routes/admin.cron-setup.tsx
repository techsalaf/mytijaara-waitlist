import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { PageHeader, SectionCard, StatCard } from "@/components/admin/ui-bits";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertTriangle,
  BellRing,
  Check,
  CheckCircle2,
  ClipboardCopy,
  Clock,
  KeyRound,
  Loader2,
  MailCheck,
  MailWarning,
  PlayCircle,
  RefreshCw,
  ShieldCheck,
  Terminal,
  Timer,
  Users,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { API_BASE_URL, cronApi, type CronRunRow, type CronStatus } from "@/lib/api";
import {
  EXPRESSION_LABELS,
  REMINDER_ONLY_EXPRESSION,
  SCHEDULE_EXPRESSION,
  buildCronPlan,
  cycleLengthDays,
  humanMs,
  pluralDays,
  relativeTime,
} from "@/lib/cron/setup";

export const Route = createFileRoute("/admin/cron-setup")({
  head: () => ({
    meta: [{ title: "Cron Setup — MyTijaara Admin" }, { name: "robots", content: "noindex" }],
  }),
  component: CronSetupPage,
});

const RUN_STATUS: Record<string, { badge: string; label: string; icon: typeof Check }> = {
  success: { badge: "bg-emerald-50 text-emerald-700", label: "success", icon: CheckCircle2 },
  partial: { badge: "bg-gold/15 text-gold-foreground", label: "partial", icon: AlertTriangle },
  failed: { badge: "bg-red-50 text-red-700", label: "failed", icon: XCircle },
  running: { badge: "bg-sky-50 text-sky-700", label: "running", icon: Loader2 },
};

const TRIGGER_LABELS: Record<string, string> = {
  schedule: "Laravel scheduler",
  http: "cURL / HTTP",
  manual: "Run now button",
};

/** Absolute timestamp for a tooltip, relative for the label. */
function exactTime(iso: string | null): string {
  if (!iso) return "no timestamp recorded";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "unparseable timestamp" : d.toLocaleString();
}

/**
 * A one-line command with a copy button. The whole point of this page is that an
 * administrator never retypes a path, so every command on it goes through here.
 */
function CopyLine({ value, label }: { value: string; label?: string }) {
  const [copied, setCopied] = useState(false);

  return (
    <div className="space-y-1.5">
      {label && <div className="text-xs font-medium text-muted-foreground">{label}</div>}
      <div className="flex items-stretch gap-2">
        <code className="min-w-0 flex-1 overflow-x-auto whitespace-pre rounded-lg border border-border/60 bg-muted/40 px-3 py-2 font-mono text-xs leading-relaxed">
          {value}
        </code>
        <Button
          size="sm"
          variant="outline"
          className="shrink-0"
          aria-label={`Copy: ${label ?? value}`}
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(value);
              setCopied(true);
              setTimeout(() => setCopied(false), 2000);
            } catch {
              toast.error("The clipboard is blocked. Select the text and copy it manually.");
            }
          }}
        >
          {copied ? <Check className="h-4 w-4" /> : <ClipboardCopy className="h-4 w-4" />}
          <span className="ml-2 hidden sm:inline">{copied ? "Copied" : "Copy"}</span>
        </Button>
      </div>
    </div>
  );
}

/** Numbered step wrapper, so the guide reads as a sequence and not as reference docs. */
function Step({
  n,
  title,
  children,
}: {
  n: number;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex gap-4">
      <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
        {n}
      </div>
      <div className="min-w-0 flex-1 space-y-3 pb-2">
        <h3 className="text-sm font-semibold leading-8">{title}</h3>
        {children}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5 py-2 sm:flex-row sm:items-baseline sm:gap-4">
      <div className="w-full shrink-0 text-xs font-medium text-muted-foreground sm:w-56">
        {label}
      </div>
      <div className="min-w-0 flex-1 text-sm">{children}</div>
    </div>
  );
}

function CronSetupPage() {
  const [status, setStatus] = useState<CronStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [running, setRunning] = useState(false);
  const [runOutput, setRunOutput] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const response = await cronApi.status();
      setStatus(response.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not read the scheduled-task status");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  /**
   * "Run now" sends real mail, so it is a deliberate button press and never
   * automatic. The response carries a fresh stats snapshot, which is what makes
   * the numbers on the page move without a second request.
   */
  const runNow = useCallback(async () => {
    setRunning(true);
    setRunOutput(null);
    try {
      const response = await cronApi.runNow("reminders");
      setRunOutput(response.data.output || "(the command printed nothing)");
      setStatus(response.data.stats);
      if (response.data.exitCode === 0) {
        toast.success("Reminder batch finished. See the output below.");
      } else {
        toast.error(`The command exited with code ${response.data.exitCode}. See the output below.`);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "The run could not be started";
      setRunOutput(null);
      toast.error(message);
    } finally {
      setRunning(false);
    }
  }, []);

  const plan = useMemo(
    () =>
      status
        ? buildCronPlan(
            status.paths,
            API_BASE_URL,
            typeof window === "undefined" ? undefined : window.location.origin,
          )
        : null,
    [status],
  );

  if (loading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Cron Setup" description="Reading the scheduled-task status…" />
        <div className="grid min-h-[40vh] place-items-center text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      </div>
    );
  }

  if (error || !status || !plan) {
    return (
      <div className="space-y-6">
        <PageHeader title="Cron Setup" description="The status endpoint did not respond." />
        <SectionCard>
          <div className="space-y-3 py-8 text-center">
            <AlertTriangle className="mx-auto h-8 w-8 text-destructive" />
            <p className="text-sm text-destructive">{error ?? "No status data returned."}</p>
            <p className="text-xs text-muted-foreground">
              This page needs the <code className="font-mono">settings.view</code> permission. If
              the API itself is down, the cron will also be failing.
            </p>
            <Button size="sm" variant="outline" onClick={() => void load()}>
              Try again
            </Button>
          </div>
        </SectionCard>
      </div>
    );
  }

  const cycleDays = cycleLengthDays(status.intervalDays, status.maxPerEntry);
  const everRun = status.lastAnyTaskRun !== null;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Cron Setup"
        description="Automatic reminders for waitlisters who never confirmed their email address, and the one cPanel setting that makes them run."
        actions={
          <>
            <Button size="sm" variant="outline" onClick={() => void load(true)} disabled={refreshing}>
              {refreshing ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="mr-2 h-4 w-4" />
              )}
              Refresh
            </Button>
            <Button size="sm" onClick={() => void runNow()} disabled={running}>
              {running ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <PlayCircle className="mr-2 h-4 w-4" />
              )}
              {running ? "Sending…" : "Run now"}
            </Button>
          </>
        }
      />
      {/* Is it working? Three yes/no answers, before any instructions. */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <HealthTile
          ok={status.schedulerHealthy}
          icon={Clock}
          title={status.schedulerHealthy ? "Cron is firing" : "No cron activity"}
          detail={
            everRun
              ? `Last task ran ${relativeTime(status.lastAnyTaskRun?.startedAt ?? null)} · ${exactTime(status.lastAnyTaskRun?.startedAt ?? null)}`
              : "Nothing has ever run. Follow the setup steps below."
          }
        />
        <HealthTile
          ok={status.tokenConfigured}
          icon={KeyRound}
          neutral={!status.tokenConfigured}
          title={status.tokenConfigured ? "Cron token set" : "Cron token not set"}
          detail={
            status.tokenConfigured
              ? "The cURL fallback trigger is available and protected."
              : "Only needed for the cURL fallback. The recommended setup does not use it."
          }
        />
        <HealthTile
          ok={status.enabled}
          icon={BellRing}
          title={status.enabled ? "Reminders enabled" : "Reminders switched off"}
          detail={
            status.enabled
              ? `One reminder every ${pluralDays(status.intervalDays)} per unconfirmed address.`
              : "VERIFICATION_REMINDERS_ENABLED=false — runs are logged but no mail is sent."
          }
        />
      </div>

      {/* Audience and throughput. */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Due on the next run"
          value={status.dueNow}
          icon={Timer}
          hint={`Capped at ${status.batchSize} per run`}
        />
        <StatCard
          label="Unconfirmed, still reachable"
          value={status.eligibleTotal}
          icon={Users}
          hint={`${status.unverifiedTotal} unconfirmed in total${status.eligibleTotal !== status.unverifiedTotal ? " (rest unsubscribed)" : ""}`}
        />
        <StatCard
          label="Reminders sent, 30 days"
          value={status.remindersSent30d}
          icon={MailCheck}
          hint={`across ${status.runs30d} run${status.runs30d === 1 ? "" : "s"}`}
        />
        <StatCard
          label="Failed sends, 30 days"
          value={status.remindersFailed30d}
          icon={MailWarning}
          hint={
            status.remindersFailed30d === 0
              ? "no delivery failures"
              : "see the run log at the bottom"
          }
        />
      </div>

      {status.lastError && (
        <div className="rounded-2xl border border-destructive/40 bg-destructive/5 p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
            <div className="min-w-0 space-y-1">
              <div className="text-sm font-semibold text-destructive">
                Last recorded failure · {relativeTime(status.lastErrorAt)}
              </div>
              <p className="break-words font-mono text-xs leading-relaxed text-destructive/90">
                {status.lastError}
              </p>
              <p className="text-xs text-muted-foreground">
                A failure here is almost always the mail server rejecting an address. Check{" "}
                <strong>Settings → SMTP</strong> first, then the waitlist row's own error.
              </p>
            </div>
          </div>
        </div>
      )}

      {runOutput !== null && (
        <SectionCard
          title="Output from the last manual run"
          description="Exactly what the command printed. This is the same text cPanel would email you."
        >
          <pre className="max-h-72 overflow-auto whitespace-pre-wrap rounded-lg border border-border/60 bg-muted/40 p-3 font-mono text-xs leading-relaxed">
            {runOutput}
          </pre>
        </SectionCard>
      )}
      <SectionCard
        title="What this cron actually does"
        description="Read this once. Everything below is mechanical."
      >
        <div className="space-y-3 text-sm leading-relaxed text-muted-foreground">
          <p>
            When somebody joins the waitlist they get a welcome email with a confirmation link. Some
            never click it, which means we hold an address we cannot legitimately email on launch
            day. This job finds those people and sends one polite reminder every{" "}
            <strong className="text-foreground">{pluralDays(status.intervalDays)}</strong>, with a
            working confirmation button.
          </p>
          <ul className="ml-5 list-disc space-y-1.5">
            <li>
              <strong className="text-foreground">Confirmed users never receive it.</strong> The
              status is re-checked in the instant before each send, so somebody who confirms while
              the batch is running does not get the email.
            </li>
            <li>
              <strong className="text-foreground">
                At most {status.maxPerEntry > 0 ? status.maxPerEntry : "unlimited"} reminders per
                address
              </strong>
              {cycleDays
                ? `, which is ${pluralDays(cycleDays)} of nudging. After that we leave them alone.`
                : ". The cap is disabled, so reminders continue indefinitely."}
            </li>
            <li>
              <strong className="text-foreground">Unsubscribed people are excluded</strong>, both
              those marked unsubscribed in the admin panel and those who used the footer link.
            </li>
            <li>
              <strong className="text-foreground">Running it twice sends nothing twice.</strong>{" "}
              Each address is claimed in the database before its email is sent, so a duplicated cron
              entry, an impatient second click, and a retry all produce one email.
            </li>
            <li>
              <strong className="text-foreground">
                Up to {status.batchSize} addresses per run.
              </strong>{" "}
              Shared hosting kills long PHP processes, so the job takes a bounded bite and leaves
              the rest for the next run.
            </li>
          </ul>
        </div>
      </SectionCard>
      <SectionCard
        title="Set it up in cPanel — the recommended way"
        description="One cron entry, added once. It covers this job and every other scheduled task the site has."
      >
        <div className="space-y-6">
          <Step n={1} title="Log in to cPanel and open Cron Jobs">
            <p className="text-sm leading-relaxed text-muted-foreground">
              Namecheap cPanel → the <strong>Advanced</strong> section → <strong>Cron Jobs</strong>.
              If you are asked for an email address for cron output, put an address you actually
              read: the job stays silent when it succeeds and emails you when a whole batch fails.
            </p>
          </Step>

          <Step n={2} title={`Set "Common Settings" to ${EXPRESSION_LABELS[SCHEDULE_EXPRESSION]}`}>
            <CopyLine label="Or type the schedule manually" value={SCHEDULE_EXPRESSION} />
            <p className="text-xs leading-relaxed text-muted-foreground">
              Five minutes is not arbitrary. Namecheap&apos;s acceptable use policy forbids cron
              intervals shorter than five minutes on shared hosting, and allows at most five cron
              entries. Laravel&apos;s own documentation says every minute; following it here would
              put the account in breach. Five minutes is well inside what this job needs — it only
              looks for work once an hour.
            </p>
          </Step>

          <Step n={3} title="Paste this into the Command box">
            <CopyLine value={plan.scheduleCommand} />
            {!plan.php.verified && (
              <p className="rounded-lg border border-gold/40 bg-gold/10 px-3 py-2 text-xs leading-relaxed">
                <strong>Check this path.</strong> None of the usual PHP locations were found on this
                server, so the command above uses a bare <code className="font-mono">php</code> and
                relies on cron&apos;s own PATH. If the job does nothing, open cPanel&apos;s{" "}
                <strong>Terminal</strong> and run <code className="font-mono">which php</code>, then
                substitute what it prints.
              </p>
            )}
            {plan.php.verified && (
              <p className="text-xs leading-relaxed text-muted-foreground">
                <code className="font-mono">{plan.php.path}</code> was confirmed to exist and be
                executable on this server, so this line is correct as written.
                {plan.php.alternatives.length > 0 && (
                  <>
                    {" "}
                    If cPanel rejects it, these also exist:{" "}
                    {plan.php.alternatives.map((p) => (
                      <code key={p} className="mr-1 font-mono">
                        {p}
                      </code>
                    ))}
                  </>
                )}
              </p>
            )}
            <details className="rounded-lg border border-border/60 bg-muted/20 px-3 py-2">
              <summary className="cursor-pointer text-xs font-medium">
                If that command does not work
              </summary>
              <div className="mt-3 space-y-3">
                <CopyLine
                  label="Some hosts need the directory changed first"
                  value={plan.scheduleCommandCd}
                />
                <CopyLine
                  label="Keep the output in a file instead of silencing it (useful for the first day)"
                  value={plan.scheduleCommandLogged}
                />
              </div>
            </details>
          </Step>

          <Step n={4} title="Save it, then prove it works">
            <p className="text-sm leading-relaxed text-muted-foreground">
              Click <strong>Add New Cron Job</strong>. Then come back here and press{" "}
              <strong>Run now</strong> at the top of this page — that runs the exact same command
              through the application and shows you its output. Within ten minutes, the{" "}
              <strong>Cron is firing</strong> tile at the top of this page should turn green on its
              own and the run log at the bottom should gain a row with trigger{" "}
              <em>Laravel scheduler</em>.
            </p>
            <p className="text-xs leading-relaxed text-muted-foreground">
              A green tile there is the only proof that matters. It reads the database rows the job
              writes about itself, not the cPanel configuration.
            </p>
          </Step>
        </div>
      </SectionCard>
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <SectionCard
          title="This server, as the application sees it"
          description="Read live from the machine that will run the cron. Nothing here is typed by hand."
        >
          <div className="divide-y divide-border/60">
            <Field label="Project directory">
              <code className="break-all font-mono text-xs">{status.paths.basePath}</code>
            </Field>
            <Field label="Artisan script">
              <code className="break-all font-mono text-xs">{status.paths.artisan}</code>
            </Field>
            <Field label="PHP for cron (command line)">
              <code className="break-all font-mono text-xs">{plan.php.path}</code>{" "}
              {plan.php.verified ? (
                <Badge className="ml-1 bg-emerald-50 text-emerald-700">confirmed</Badge>
              ) : (
                <Badge className="ml-1 bg-gold/15 text-gold-foreground">unverified</Badge>
              )}
            </Field>
            <Field label="PHP serving this page">
              <code className="break-all font-mono text-xs">{status.paths.phpBinary}</code>
              <p className="mt-1 text-xs text-muted-foreground">
                {status.paths.phpVersion} · {status.paths.phpSapi}. Do not use this path in cron: on
                cPanel it is a web-server binary, not the command-line one.
              </p>
            </Field>
            <Field label="HTTP trigger endpoint">
              <code className="break-all font-mono text-xs">{plan.triggerUrl}</code>
            </Field>
            <Field label="Application log">
              <code className="break-all font-mono text-xs">{status.paths.logPath}</code>
            </Field>
          </div>
        </SectionCard>

        <SectionCard
          title="Settings that control the cadence"
          description="All optional. Every one has a working default, so an empty .env still behaves correctly."
        >
          <div className="space-y-3">
            <EnvRow
              name="VERIFICATION_REMINDERS_ENABLED"
              value={String(status.enabled)}
              note="Master switch. false means runs are still logged but no mail leaves the server — the honest way to pause sending during an SMTP quota problem."
            />
            <EnvRow
              name="VERIFICATION_REMINDER_INTERVAL_DAYS"
              value={String(status.intervalDays)}
              note="Days between reminders, and days after signup before the first one. Measured from the last reminder, or from the signup date if there has not been one."
            />
            <EnvRow
              name="VERIFICATION_REMINDER_MAX_PER_ENTRY"
              value={String(status.maxPerEntry)}
              note={`Hard stop per address. 0 disables the cap. At the current interval this is ${cycleDays ? pluralDays(cycleDays) : "unlimited"} of reminders.`}
            />
            <EnvRow
              name="VERIFICATION_REMINDER_BATCH_SIZE"
              value={String(status.batchSize)}
              note="Addresses per run. Keep it low enough that one run finishes inside the host's PHP time limit."
            />
            <EnvRow
              name="CRON_TOKEN"
              value={status.tokenConfigured ? "set (never displayed)" : "not set"}
              note="Only needed for the cURL fallback below. Never shown here, never sent to the browser, never in a public page."
              secret
            />
          </div>
          <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
            These live in <code className="font-mono">{status.paths.basePath}/.env</code>. Edit it
            with cPanel&apos;s File Manager, then run{" "}
            <code className="font-mono">php artisan config:clear</code> so the change is picked up.
          </p>
        </SectionCard>
      </div>
      <SectionCard
        title="Testing and verifying"
        description="Two safe commands and three things to look at. None of these send mail unless the name says so."
      >
        <div className="space-y-5">
          <div className="space-y-2">
            <div className="text-sm font-semibold">See who would be emailed, without emailing</div>
            <CopyLine value={plan.dryRunCommand} />
            <p className="text-xs leading-relaxed text-muted-foreground">
              Prints one line per address it would nudge and then stops. It writes nothing to the
              database and does not appear in the run log, so it is safe to run on the live site as
              often as you like. Right now it would list{" "}
              <strong className="text-foreground">{status.dueNow}</strong> address
              {status.dueNow === 1 ? "" : "es"}.
            </p>
          </div>

          <div className="space-y-2">
            <div className="text-sm font-semibold">Send for real, from the command line</div>
            <CopyLine value={`${plan.php.path} ${status.paths.artisan} ${status.command}`} />
            <p className="text-xs leading-relaxed text-muted-foreground">
              This is the same thing the <strong>Run now</strong> button does. Add{" "}
              <code className="font-mono">--limit=1</code> to send exactly one reminder as a test.
            </p>
          </div>

          <div className="space-y-2">
            <div className="text-sm font-semibold">Where to look when something is wrong</div>
            <CopyLine label="Cron output, if you used the logged variant" value={plan.tailCronLog} />
            <CopyLine label="Application log — every failed send is recorded here" value={plan.tailAppLog} />
            <p className="text-xs leading-relaxed text-muted-foreground">
              The run log at the bottom of this page holds the same information without shell
              access, and is the first place to look. A failed send also writes the transport error
              onto the waitlist row itself, so the waitlist record for that person shows why their
              reminder never arrived.
            </p>
          </div>
        </div>
      </SectionCard>
      <SectionCard
        title="If the recommended setup will not work"
        description="Two fallbacks, in order of preference. Use the first one that your host allows."
      >
        <div className="space-y-6">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <Badge className="bg-primary/10 text-primary">Fallback 1</Badge>
              <span className="text-sm font-semibold">Reminders only, no Laravel scheduler</span>
            </div>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Use this if you would rather not run the scheduler, or if you have hit Namecheap&apos;s
              five-cron-entry limit and want the smallest possible entry. It runs this one job and
              nothing else, so scheduled email campaigns will not be sent.
            </p>
            <CopyLine label={`Schedule: ${EXPRESSION_LABELS[REMINDER_ONLY_EXPRESSION]}`} value={REMINDER_ONLY_EXPRESSION} />
            <CopyLine label="Command" value={plan.directCommand} />
          </div>

          <div className="space-y-2 border-t border-border/60 pt-5">
            <div className="flex flex-wrap items-center gap-2">
              <Badge className="bg-gold/15 text-gold-foreground">Fallback 2</Badge>
              <span className="text-sm font-semibold">
                cURL the protected endpoint, when cron cannot run PHP at all
              </span>
            </div>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Slower and subject to the web server&apos;s timeout, so it is the last resort. It is
              safe: the endpoint runs a fixed list of tasks and takes no command from the request, so
              even a leaked URL cannot be used to send arbitrary email. It answers{" "}
              <code className="font-mono">503</code> to everything until a token is configured.
            </p>
            <ol className="ml-5 list-decimal space-y-2 text-sm leading-relaxed text-muted-foreground">
              <li>
                Generate a secret. In cPanel&apos;s Terminal, run:
                <div className="mt-1.5">
                  <CopyLine value={'php -r "echo bin2hex(random_bytes(32)), PHP_EOL;"'} />
                </div>
              </li>
              <li>
                Add it to <code className="font-mono">{status.paths.basePath}/.env</code> as{" "}
                <code className="font-mono">CRON_TOKEN=</code>the value you just generated, then run{" "}
                <code className="font-mono">php artisan config:clear</code>.
              </li>
              <li>
                Use this as the cron command, replacing{" "}
                <code className="font-mono">YOUR_CRON_TOKEN</code> with that same value:
                <div className="mt-1.5">
                  <CopyLine value={plan.curlCommand} />
                </div>
              </li>
            </ol>
            <p className="text-xs leading-relaxed text-muted-foreground">
              The token goes in a header rather than the query string so it stays out of server
              access logs. If your cron only accepts a bare URL, append{" "}
              <code className="font-mono">?token=YOUR_CRON_TOKEN</code> instead — it works, but the
              secret will appear in the access log. Add{" "}
              <code className="font-mono">&amp;task={status.httpTaskKeys[0] ?? "reminders"}</code> to
              run a single task; with no <code className="font-mono">task</code> it runs all of them
              ({status.httpTaskKeys.join(", ") || "none configured"}).
            </p>
            {!status.tokenConfigured && (
              <p className="rounded-lg border border-border/60 bg-muted/30 px-3 py-2 text-xs leading-relaxed">
                <ShieldCheck className="mr-1 inline h-3.5 w-3.5" />
                No token is configured, so this endpoint currently refuses every request. That is the
                correct state if you are using the recommended setup — nothing to fix.
              </p>
            )}
          </div>
        </div>
      </SectionCard>
      <SectionCard
        title="When it is not working"
        description="Symptom, cause, fix. In the order these actually happen."
      >
        <div className="space-y-4">
          {TROUBLESHOOTING.map((row) => (
            <div
              key={row.symptom}
              className="rounded-xl border border-border/60 bg-muted/20 p-4 text-sm leading-relaxed"
            >
              <div className="font-semibold">{row.symptom}</div>
              <p className="mt-1 text-muted-foreground">
                <span className="font-medium text-foreground">Usually: </span>
                {row.cause}
              </p>
              <p className="mt-1 text-muted-foreground">
                <span className="font-medium text-foreground">Fix: </span>
                {row.fix}
              </p>
            </div>
          ))}
        </div>
      </SectionCard>

      <SectionCard
        title="Run log"
        description={`The last ${status.recentRuns.length || 10} executions of this job, written by the job itself. Older rows than 90 days are pruned automatically.`}
        actions={
          status.lastReminderAt ? (
            <span className="text-xs text-muted-foreground">
              Last reminder sent {relativeTime(status.lastReminderAt)}
            </span>
          ) : null
        }
      >
        {status.recentRuns.length === 0 ? (
          <div className="space-y-2 py-10 text-center">
            <Terminal className="mx-auto h-7 w-7 text-muted-foreground" />
            <p className="text-sm font-medium">This job has never run.</p>
            <p className="mx-auto max-w-md text-xs leading-relaxed text-muted-foreground">
              Add the cron entry above, or press <strong>Run now</strong> to create the first row and
              confirm the whole path works end to end.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>When</TableHead>
                  <TableHead>Triggered by</TableHead>
                  <TableHead>Result</TableHead>
                  <TableHead className="text-right">Sent</TableHead>
                  <TableHead className="text-right">Failed</TableHead>
                  <TableHead className="text-right">Skipped</TableHead>
                  <TableHead className="text-right">Took</TableHead>
                  <TableHead>Notes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {status.recentRuns.map((run) => (
                  <RunRow key={run.id} run={run} />
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </SectionCard>
    </div>
  );
}

/**
 * The failures we have actually caused or seen, not a generic FAQ. Ordered by how
 * often each one is the answer.
 */
const TROUBLESHOOTING: Array<{ symptom: string; cause: string; fix: string }> = [
  {
    symptom: "The cron entry is saved but nothing ever appears in the run log",
    cause: "the PHP path in the command is wrong, so the shell exits before Laravel starts.",
    fix: "Open cPanel → Terminal, paste the command in by hand and read the error. `command not found` means the PHP path is wrong; `Could not open input file` means the project directory is wrong.",
  },
  {
    symptom: "Runs are logged but nobody receives an email",
    cause: "SMTP is not configured, or reminders are switched off.",
    fix: "Check the three tiles at the top of this page, then Settings → SMTP and use its Send test email button. A run with sent=0 and skipped>0 instead means everybody due has already confirmed — that is success, not a failure.",
  },
  {
    symptom: "cPanel emails you every five minutes",
    cause: "the cron command still has its output enabled; cron mails whatever a job prints.",
    fix: "Use the command exactly as shown in step 3 — it ends with `>/dev/null 2>&1`, which silences routine output while still letting cron email you when the job exits with an error.",
  },
  {
    symptom: "A specific person keeps not receiving their reminder",
    cause: "their address is rejecting mail, or they unsubscribed.",
    fix: "Open their waitlist record. A failed send stores the mail server's own error message on the row. An address that fails keeps its place in the cadence, so it is retried after the full interval rather than on every run.",
  },
  {
    symptom: "The `Cron is firing` tile is red but the log has recent rows",
    cause: "nothing has run in the last 48 hours; the tile is deliberately loose.",
    fix: "Press Refresh. If it stays red with rows from today, the server clock and the database clock disagree — worth raising with the host, since it also affects the reminder cadence.",
  },
  {
    symptom: "Everything is green but you want to be sure it is not sending twice",
    cause: "nothing — but this is worth verifying once.",
    fix: "Press Run now twice in a row. The second run must report 0 sent. Each address is claimed in the database before its email is sent, so the second run finds nothing due.",
  },
];

function RunRow({ run }: { run: CronRunRow }) {
  const style = RUN_STATUS[run.status] ?? {
    badge: "bg-muted text-muted-foreground",
    label: run.status,
    icon: Clock,
  };

  return (
    <TableRow>
      <TableCell className="whitespace-nowrap" title={exactTime(run.startedAt)}>
        {relativeTime(run.startedAt)}
      </TableCell>
      <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
        {TRIGGER_LABELS[run.trigger] ?? run.trigger}
      </TableCell>
      <TableCell>
        <Badge className={style.badge}>{style.label}</Badge>
      </TableCell>
      <TableCell className="text-right font-medium">{run.succeeded}</TableCell>
      <TableCell
        className={`text-right ${run.failed > 0 ? "font-semibold text-destructive" : "text-muted-foreground"}`}
      >
        {run.failed}
      </TableCell>
      <TableCell className="text-right text-muted-foreground">{run.skipped}</TableCell>
      <TableCell className="whitespace-nowrap text-right text-xs text-muted-foreground">
        {humanMs(run.durationMs)}
      </TableCell>
      <TableCell className="max-w-xs truncate text-xs text-muted-foreground" title={run.message ?? ""}>
        {run.message ?? "—"}
      </TableCell>
    </TableRow>
  );
}

function EnvRow({
  name,
  value,
  note,
  secret = false,
}: {
  name: string;
  value: string;
  note: string;
  secret?: boolean;
}) {
  return (
    <div className="rounded-xl border border-border/60 bg-muted/20 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <code className="break-all font-mono text-xs font-semibold">{name}</code>
        <Badge
          className={
            secret
              ? "bg-muted text-muted-foreground"
              : "bg-primary/10 font-mono text-[11px] text-primary"
          }
        >
          {value}
        </Badge>
      </div>
      <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">{note}</p>
    </div>
  );
}

function HealthTile({
  ok,
  neutral = false,
  icon: Icon,
  title,
  detail,
}: {
  ok: boolean;
  neutral?: boolean;
  icon: typeof Clock;
  title: string;
  detail: string;
}) {
  const tone = neutral
    ? "border-border/60 bg-card"
    : ok
      ? "border-emerald-200 bg-emerald-50/40"
      : "border-destructive/40 bg-destructive/5";
  const iconTone = neutral
    ? "bg-muted text-muted-foreground"
    : ok
      ? "bg-emerald-100 text-emerald-700"
      : "bg-destructive/10 text-destructive";

  return (
    <div className={`rounded-2xl border p-5 shadow-sm ${tone}`}>
      <div className="flex items-start gap-3">
        <div className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl ${iconTone}`}>
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <div className="text-sm font-semibold">{title}</div>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{detail}</p>
        </div>
      </div>
    </div>
  );
}



