<?php

namespace App\Jobs;

use App\Mail\CampaignMail;
use App\Models\EmailCampaign;
use App\Models\EmailEvent;
use App\Models\Unsubscribe;
use App\Support\CampaignSegment;
use App\Support\SmtpConfig;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;

/**
 * Delivers a campaign to its target segment. Records a per-recipient `sent`
 * event and updates the campaign counters. Runs on the queue so the API
 * request returns immediately.
 *
 * Two things this job is careful about:
 *
 *  1. It applies the admin SMTP settings before sending. Without this the queue
 *     worker used whatever was in `.env`, so a campaign ignored the mail server
 *     configured in the admin panel.
 *  2. A campaign that matched nobody goes back to `draft`, not `sent`. Marking
 *     an empty run as sent made a broken segment look like a delivered campaign
 *     and was unrecoverable, because `sent` is a terminal status.
 */
class SendCampaignJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 3;

    public int $backoff = 30;

    public function __construct(public int $campaignId) {}

    public function handle(): void
    {
        $campaign = EmailCampaign::find($this->campaignId);
        if (! $campaign || $campaign->status === 'sent') {
            return;
        }

        try {
            // Use the mail server the admin configured, not the one in .env.
            SmtpConfig::apply();

            $unsubscribed = Unsubscribe::pluck('email')->flip();

            $sent = 0;
            $skipped = 0;
            $failedCount = 0;

            $this->recipients($campaign)->chunkById(200, function ($entries) use ($campaign, $unsubscribed, &$sent, &$skipped, &$failedCount) {
                foreach ($entries as $entry) {
                    if ($unsubscribed->has($entry->email) || $entry->status === 'unsubscribed') {
                        $skipped++;

                        continue;
                    }

                    try {
                        Mail::to($entry->email)->send(new CampaignMail($campaign, $entry));
                        EmailEvent::create([
                            'campaign_id' => $campaign->id,
                            'waitlist_entry_id' => $entry->id,
                            'email' => $entry->email,
                            'type' => 'sent',
                        ]);
                        $sent++;
                    } catch (\Throwable $e) {
                        $failedCount++;
                        EmailEvent::create([
                            'campaign_id' => $campaign->id,
                            'waitlist_entry_id' => $entry->id,
                            'email' => $entry->email,
                            'type' => 'bounce',
                        ]);
                        $campaign->increment('bounces');
                        Log::warning('campaign mail send failed', [
                            'campaign' => $campaign->public_id,
                            'email' => $entry->email,
                            'error' => $e->getMessage(),
                        ]);
                    }
                }
            });

            // Nobody was reachable: return the campaign to draft so segment can be fixed
            if ($sent === 0) {
                $status = $failedCount > 0 ? 'failed' : 'draft';
                $campaign->update(['status' => $status]);
                Log::warning('campaign completed with no successful deliveries', [
                    'campaign' => $campaign->public_id,
                    'status' => $status,
                    'suppressed' => $skipped,
                    'failed' => $failedCount,
                ]);

                return;
            }

            $finalStatus = ($failedCount > 0) ? 'partially_sent' : 'sent';
            $campaign->update([
                'status' => $finalStatus,
                'sent' => $campaign->sent + $sent,
                'recipients' => $campaign->recipients + $sent,
                'sent_at' => now(),
            ]);
        } catch (\Throwable $e) {
            Log::error('SendCampaignJob exception', [
                'campaign' => $this->campaignId,
                'error' => $e->getMessage(),
            ]);
            $campaign->update(['status' => 'failed']);
            throw $e;
        }
    }

    /**
     * Handle job failure after all retries are exhausted.
     */
    public function failed(\Throwable $exception): void
    {
        $campaign = EmailCampaign::find($this->campaignId);
        if ($campaign && $campaign->status === 'sending') {
            $campaign->update(['status' => 'failed']);
        }
    }

    /**
     * Build the recipient query from the campaign segment rules.
     */
    private function recipients(EmailCampaign $campaign)
    {
        return CampaignSegment::query($campaign->segment ?? []);
    }
}
