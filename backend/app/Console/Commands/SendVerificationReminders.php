<?php

namespace App\Console\Commands;

use App\Mail\VerificationReminderMail;
use App\Models\CronRun;
use App\Models\EmailEvent;
use App\Models\WaitlistEntry;
use App\Support\SmtpConfig;
use App\Support\VerificationReminders;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Str;

/**
 * Nudges waitlisters who never confirmed their email address.
 *
 * Runs from the host's cron (see `/admin/cron-setup`) either as this Artisan
 * command or through `GET /api/v1/cron/run`. It is written to be safe to run far
 * more often than the reminder interval: the cadence lives in the data, not in
 * the schedule, so an hourly cron and a five-minutely cron send exactly the same
 * mail.
 *
 * Three properties matter, and each has a specific mechanism:
 *
 *  - **A verified user never gets mailed.** The row is re-read from the database
 *    immediately before the send and the claim UPDATE carries
 *    `where('verified', false)` as well. A user who confirms while the batch is
 *    running loses their reminder rather than racing it.
 *  - **A double cron run cannot double-send.** The claim is a compare-and-swap on
 *    `last_verification_reminder_at`: the UPDATE only matches if the column still
 *    holds the value this process read. Whichever process gets there first wins;
 *    the loser sees `$claimed === 0` and moves on. No table locks, no queue.
 *  - **One bad address cannot stop the batch.** Every send is wrapped
 *    individually. A failure is recorded on the row and in the run log, and the
 *    claim is deliberately *kept*, so a permanently broken address waits the full
 *    interval instead of being retried on every single cron tick.
 */
class SendVerificationReminders extends Command
{
    protected $signature = 'waitlist:send-verification-reminders
        {--limit= : Override the configured batch size for this run}
        {--dry-run : Report who would be mailed without sending or writing}
        {--trigger=schedule : Where the run came from (schedule|http|manual)}';

    protected $description = 'Email unverified waitlisters a reminder to confirm their address';

    public function handle(): int
    {
        $trigger = (string) $this->option('trigger');
        $dryRun = (bool) $this->option('dry-run');

        // A dry run is a read-only inspection, so it does not open a run row —
        // otherwise `/admin/cron-setup` would report a send that never happened.
        $run = $dryRun ? null : CronRun::start($this->getName(), $trigger);

        try {
            if (! VerificationReminders::isEnabled()) {
                $this->warn('Verification reminders are disabled (VERIFICATION_REMINDERS_ENABLED=false).');
                $run?->finish(0, 0, 0, 'Disabled by configuration.');

                return self::SUCCESS;
            }

            $result = $this->process($dryRun);

            $message = sprintf(
                '%d sent, %d failed, %d skipped, %d due at start.',
                $result['sent'],
                $result['failed'],
                $result['skipped'],
                $result['dueAtStart'],
            );

            $run?->finish($result['sent'], $result['failed'], $result['skipped'], $result['lastError'] ?? $message, [
                'dueAtStart' => $result['dueAtStart'],
                'intervalDays' => VerificationReminders::intervalDays(),
                'batchSize' => $result['batchSize'],
            ]);

            $this->info(($dryRun ? '[dry run] ' : '').$message);

            // Housekeeping, after the run is closed out so a prune failure can
            // never lose the record of work that actually happened.
            if (! $dryRun) {
                $pruned = CronRun::prune($this->getName());
                if ($pruned > 0) {
                    $this->line("  pruned {$pruned} run log row(s) older than 90 days");
                }
            }

            // A run where every attempt failed is a failed run. Cron on cPanel
            // mails the operator on a non-zero exit, which is the cheapest
            // possible alerting channel on shared hosting.
            return $result['failed'] > 0 && $result['sent'] === 0 ? self::FAILURE : self::SUCCESS;
        } catch (\Throwable $e) {
            // Anything that escapes the per-recipient guards: a dead database, a
            // misconfigured mailer, a template that will not compile.
            Log::error('verification reminders run failed', ['error' => $e->getMessage()]);
            $run?->fail(Str::limit($e->getMessage(), 500));
            $this->error('Run failed: '.$e->getMessage());

            return self::FAILURE;
        }
    }

    /**
     * Walk the due set and send. Returns the counters the run log stores.
     *
     * @return array{sent:int,failed:int,skipped:int,dueAtStart:int,batchSize:int,lastError:?string}
     */
    private function process(bool $dryRun): array
    {
        $batch = $this->resolvedLimit();
        $chunk = min(VerificationReminders::chunkSize(), $batch);
        $dueAtStart = (int) VerificationReminders::dueQuery()->count();

        $sent = 0;
        $failed = 0;
        $skipped = 0;
        $lastError = null;

        // Applied once per run, not once per recipient: it is a cached settings
        // read plus a config write, and the transport is only rebuilt when the
        // stored SMTP row is actually enabled.
        if (! $dryRun) {
            SmtpConfig::apply();
        }

        // Ids already handled this run. Bounded by the batch size, so the
        // `whereNotIn` stays a short IN list. It exists to guarantee the loop
        // terminates: a claimed row leaves the due set on its own, but a dry run
        // writes nothing and would otherwise re-read the same page forever.
        $handled = [];

        while (count($handled) < $batch) {
            $take = min($chunk, $batch - count($handled));

            $page = VerificationReminders::dueOrder(VerificationReminders::dueQuery())
                ->when($handled !== [], fn ($q) => $q->whereNotIn('id', $handled))
                ->limit($take)
                ->get();

            if ($page->isEmpty()) {
                break;
            }

            foreach ($page as $candidate) {
                $handled[] = $candidate->id;

                if ($dryRun) {
                    $this->line(sprintf(
                        '  would send #%d to %s (reminder %d, last touched %s)',
                        $candidate->id,
                        $candidate->email,
                        $candidate->verification_reminders_sent + 1,
                        optional($candidate->last_verification_reminder_at ?? $candidate->created_at)->toDateTimeString() ?? 'never',
                    ));
                    $sent++;

                    continue;
                }

                $outcome = $this->sendOne($candidate);

                match ($outcome['result']) {
                    'sent' => $sent++,
                    'failed' => $failed++,
                    default => $skipped++,
                };

                if ($outcome['result'] === 'failed') {
                    $lastError = $outcome['error'];
                }
            }
        }

        return [
            'sent' => $sent,
            'failed' => $failed,
            'skipped' => $skipped,
            'dueAtStart' => $dueAtStart,
            'batchSize' => $batch,
            'lastError' => $lastError,
        ];
    }

    /**
     * Claim one entry and mail it.
     *
     * @return array{result:'sent'|'failed'|'skipped',error:?string}
     */
    private function sendOne(WaitlistEntry $candidate): array
    {
        // Re-read rather than trusting the row the page query returned. The gap
        // between the SELECT and this point is small but it is exactly the gap a
        // user clicking their original verification link falls into.
        $entry = WaitlistEntry::find($candidate->id);

        if (! $entry || $entry->verified) {
            $this->line("  skip {$candidate->email}: already verified.");

            return ['result' => 'skipped', 'error' => null];
        }

        // Mint a token if the row somehow lost one. Without it the mail's only
        // button would 404, which is worse than sending nothing.
        if (! $entry->verification_token) {
            $entry->forceFill(['verification_token' => Str::random(48)])->save();
        }

        $previousTouch = $entry->last_verification_reminder_at;
        $attempt = (int) $entry->verification_reminders_sent + 1;

        // The claim. `verified = false` and the previous timestamp are both part
        // of the WHERE, so this UPDATE matches at most once across any number of
        // concurrent runs.
        $claim = WaitlistEntry::where('id', $entry->id)
            ->where('verified', false)
            ->when(
                $previousTouch === null,
                fn ($q) => $q->whereNull('last_verification_reminder_at'),
                fn ($q) => $q->where('last_verification_reminder_at', $previousTouch),
            )
            ->update(['last_verification_reminder_at' => now()]);

        if ($claim === 0) {
            $this->line("  skip {$candidate->email}: claimed by another run.");

            return ['result' => 'skipped', 'error' => null];
        }

        try {
            Mail::to($entry->email)->send(new VerificationReminderMail($entry->fresh(), $attempt));

            // Counter and error state move together with the send, after it, so
            // a crash inside the mailer cannot inflate the count.
            $entry->forceFill([
                'verification_reminders_sent' => $attempt,
                'last_verification_reminder_error' => null,
            ])->save();

            EmailEvent::create([
                'campaign_id' => null,
                'waitlist_entry_id' => $entry->id,
                'email' => $entry->email,
                'type' => 'verification_reminder',
            ]);

            $this->line("  sent reminder {$attempt} to {$entry->email}");

            return ['result' => 'sent', 'error' => null];
        } catch (\Throwable $e) {
            $error = Str::limit($e->getMessage(), 480);

            // The claim stays. This address has just burned its slot for the
            // interval, which is what stops a permanently invalid mailbox from
            // being retried on every cron tick and dragging the batch down.
            $entry->forceFill(['last_verification_reminder_error' => $error])->save();

            EmailEvent::create([
                'campaign_id' => null,
                'waitlist_entry_id' => $entry->id,
                'email' => $entry->email,
                'type' => 'verification_reminder_failed',
            ]);

            Log::warning('verification reminder failed', [
                'entry' => $entry->public_id,
                'error' => $e->getMessage(),
            ]);
            $this->warn("  failed {$entry->email}: {$error}");

            return ['result' => 'failed', 'error' => $error];
        }
    }

    /** `--limit` wins over the configured batch size; both are floored at 1. */
    private function resolvedLimit(): int
    {
        $override = $this->option('limit');

        if ($override !== null && $override !== '' && (int) $override > 0) {
            return (int) $override;
        }

        return VerificationReminders::batchSize();
    }
}
