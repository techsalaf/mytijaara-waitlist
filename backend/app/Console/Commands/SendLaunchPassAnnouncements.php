<?php

namespace App\Console\Commands;

use App\Mail\LaunchPassNotificationMail;
use App\Models\CronRun;
use App\Models\EmailEvent;
use App\Models\Unsubscribe;
use App\Models\WaitlistEntry;
use App\Support\SmtpConfig;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Str;

/**
 * Emails waitlisters to announce the launch date (October 2, 2026 at TAA NATCON 2026)
 * and provide their 1-click personalized digital launch pass.
 *
 * Idempotent: checks for an existing `launch_pass_announcement` EmailEvent per entry,
 * preventing double-sends across repeat executions.
 */
class SendLaunchPassAnnouncements extends Command
{
    protected $signature = 'waitlist:send-launch-pass-announcement
        {--limit=50 : Maximum number of recipients to process in this run}
        {--dry-run : Report who would be emailed without sending}
        {--force : Send even if a launch pass announcement was already recorded for the entry}
        {--trigger=manual : Where the run originated from (schedule|manual)}';

    protected $description = 'Email waitlisters their personalized launch pass and announce the launch date and location';

    public function handle(): int
    {
        $limit = max(1, (int) ($this->option('limit') ?: 50));
        $dryRun = (bool) $this->option('dry-run');
        $force = (bool) $this->option('force');
        $trigger = (string) $this->option('trigger');

        $run = $dryRun ? null : CronRun::start($this->getName(), $trigger);

        try {
            if (! $dryRun) {
                SmtpConfig::apply();
            }

            $unsubscribed = Unsubscribe::pluck('email')->flip();

            // Find all active waitlist entries
            $query = WaitlistEntry::query()
                ->where('status', '<>', 'unsubscribed')
                ->whereNotIn('email', function ($q) {
                    $q->select('email')->from((new Unsubscribe)->getTable());
                });

            if (! $force) {
                // Exclude entries that have already received this announcement
                $query->whereNotIn('id', function ($q) {
                    $q->select('waitlist_entry_id')
                        ->from('email_events')
                        ->where('type', 'launch_pass_announcement')
                        ->whereNotNull('waitlist_entry_id');
                });
            }

            $dueAtStart = (int) $query->count();
            $candidates = $query->orderBy('position', 'asc')->limit($limit)->get();

            $sent = 0;
            $failed = 0;
            $skipped = 0;
            $lastError = null;

            $this->info(sprintf(
                'Found %d waitlister(s) eligible for launch pass announcement (processing up to %d).',
                $dueAtStart,
                $limit
            ));

            foreach ($candidates as $entry) {
                if ($unsubscribed->has($entry->email) || $entry->status === 'unsubscribed') {
                    $skipped++;
                    continue;
                }

                // Ensure launch_pass_token exists
                if (! $entry->launch_pass_token) {
                    $entry->forceFill(['launch_pass_token' => Str::random(32)])->save();
                }

                if ($dryRun) {
                    $this->line(sprintf(
                        '  [dry run] Would send launch pass to #%d %s <%s> (token: %s)',
                        $entry->position,
                        $entry->name,
                        $entry->email,
                        $entry->launch_pass_token
                    ));
                    $sent++;
                    continue;
                }

                try {
                    Mail::to($entry->email)->send(new LaunchPassNotificationMail($entry));

                    EmailEvent::create([
                        'campaign_id' => null,
                        'waitlist_entry_id' => $entry->id,
                        'email' => $entry->email,
                        'type' => 'launch_pass_announcement',
                    ]);

                    $this->line(sprintf('  ✓ Sent to %s (#%d %s)', $entry->email, $entry->position, $entry->name));
                    $sent++;
                } catch (\Throwable $e) {
                    $failed++;
                    $lastError = Str::limit($e->getMessage(), 480);

                    EmailEvent::create([
                        'campaign_id' => null,
                        'waitlist_entry_id' => $entry->id,
                        'email' => $entry->email,
                        'type' => 'launch_pass_announcement_failed',
                    ]);

                    Log::warning('launch pass announcement send failed', [
                        'entry' => $entry->public_id,
                        'email' => $entry->email,
                        'error' => $e->getMessage(),
                    ]);

                    $this->warn(sprintf('  ✗ Failed %s: %s', $entry->email, $lastError));
                }
            }

            $summary = sprintf('%d sent, %d failed, %d skipped, %d due at start.', $sent, $failed, $skipped, $dueAtStart);
            $this->info(($dryRun ? '[dry run] ' : '') . $summary);

            $run?->finish($sent, $failed, $skipped, $lastError ?? $summary, [
                'dueAtStart' => $dueAtStart,
                'batchSize' => $limit,
            ]);

            return $failed > 0 && $sent === 0 ? self::FAILURE : self::SUCCESS;
        } catch (\Throwable $e) {
            Log::error('SendLaunchPassAnnouncements failed', ['error' => $e->getMessage()]);
            $run?->fail(Str::limit($e->getMessage(), 500));
            $this->error('Execution failed: ' . $e->getMessage());

            return self::FAILURE;
        }
    }
}
