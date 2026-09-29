<?php

namespace App\Console\Commands;

use App\Mail\WaitlistVendorAnnouncementMail;
use App\Models\CronRun;
use App\Models\EmailEvent;
use App\Models\Unsubscribe;
use App\Models\WaitlistEntry;
use App\Support\SmtpConfig;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Str;

class SendWaitlistVendorAnnouncement extends Command
{
    protected $signature = 'waitlist:send-vendor-announcement
        {--limit=100 : Maximum number of recipients to process in this run}
        {--dry-run : Report who would be emailed without sending}
        {--force : Send live even if already recorded or in dry-run}
        {--trigger=manual : Where the run originated from}';

    protected $description = 'Send 3-day launch announcement to waitlist vendors urging them to register and upload products for free';

    public function handle(): int
    {
        $limit = max(1, (int) ($this->option('limit') ?: 100));
        $dryRun = (bool) $this->option('dry-run') && ! (bool) $this->option('force');
        $force = (bool) $this->option('force');
        $trigger = (string) $this->option('trigger');

        $run = $dryRun ? null : CronRun::start($this->getName(), $trigger);

        try {
            if (! $dryRun) {
                SmtpConfig::apply();
            }

            $unsubscribed = Unsubscribe::pluck('email')->flip();

            // Find all active waitlist vendors
            $query = WaitlistEntry::query()
                ->where('role', 'vendor')
                ->where('status', '<>', 'unsubscribed')
                ->whereNotNull('email')
                ->whereNotIn('email', function ($q) {
                    $q->select('email')->from((new Unsubscribe)->getTable());
                });

            if (! $force) {
                // Prevent duplicate sends
                $query->whereNotIn('id', function ($q) {
                    $q->select('waitlist_entry_id')
                        ->from('email_events')
                        ->where('type', 'waitlist_vendor_announcement')
                        ->whereNotNull('waitlist_entry_id');
                });
            }

            $dueAtStart = (int) $query->count();
            $candidates = $query->orderBy('position', 'asc')->limit($limit)->get();

            $this->info(sprintf(
                '=== Waitlist Vendor Launch Outreach (%s Mode) ===',
                $dryRun ? 'DRY RUN' : 'LIVE EXECUTION'
            ));
            $this->line(sprintf('Found %d vendor(s) eligible (processing up to %d recipients).\n', $dueAtStart, $limit));

            $sent = 0;
            $failed = 0;
            $skipped = 0;
            $lastError = null;

            foreach ($candidates as $entry) {
                if ($unsubscribed->has($entry->email) || $entry->status === 'unsubscribed') {
                    $skipped++;
                    continue;
                }

                if ($dryRun) {
                    $this->line(sprintf(
                        '  [dry run] Would email Vendor: %s <%s> (Phone: %s)',
                        $entry->name,
                        $entry->email,
                        $entry->phone ?: 'N/A'
                    ));
                    $sent++;
                    continue;
                }

                try {
                    Mail::to($entry->email)->send(new WaitlistVendorAnnouncementMail($entry));

                    EmailEvent::create([
                        'campaign_id' => null,
                        'waitlist_entry_id' => $entry->id,
                        'email' => $entry->email,
                        'type' => 'waitlist_vendor_announcement',
                    ]);

                    $this->line(sprintf('  ✓ Sent to %s (%s)', $entry->email, $entry->name));
                    $sent++;
                } catch (\Throwable $e) {
                    $failed++;
                    $lastError = Str::limit($e->getMessage(), 480);

                    EmailEvent::create([
                        'campaign_id' => null,
                        'waitlist_entry_id' => $entry->id,
                        'email' => $entry->email,
                        'type' => 'waitlist_vendor_announcement_failed',
                    ]);

                    Log::warning('Waitlist vendor announcement send failed', [
                        'entry' => $entry->public_id,
                        'email' => $entry->email,
                        'error' => $e->getMessage(),
                    ]);

                    $this->warn(sprintf('  ✗ Failed %s: %s', $entry->email, $lastError));
                }
            }

            $summary = sprintf('%d sent, %d failed, %d skipped, %d due at start.', $sent, $failed, $skipped, $dueAtStart);
            $this->info(($dryRun ? '[dry run complete] ' : '') . $summary);

            $run?->finish($sent, $failed, $skipped, $lastError ?? $summary, [
                'dueAtStart' => $dueAtStart,
                'batchSize' => $limit,
            ]);

            return $failed > 0 && $sent === 0 ? self::FAILURE : self::SUCCESS;
        } catch (\Throwable $e) {
            Log::error('SendWaitlistVendorAnnouncement failed', ['error' => $e->getMessage()]);
            $run?->fail(Str::limit($e->getMessage(), 500));
            $this->error('Execution failed: ' . $e->getMessage());

            return self::FAILURE;
        }
    }
}
