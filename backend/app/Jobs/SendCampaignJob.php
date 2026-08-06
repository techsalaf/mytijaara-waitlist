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

        // Use the mail server the admin configured, not the one in .env.
        SmtpConfig::apply();

        $unsubscribed = Unsubscribe::pluck('email')->flip();

        $sent = 0;
        $skipped = 0;
        $this->recipients($campaign)->chunkById(200, function ($entries) use ($campaign, $unsubscribed, &$sent, &$skipped) {
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
                    EmailEvent::create([
                        'campaign_id' => $campaign->id,
                        'waitlist_entry_id' => $entry->id,
                        'email' => $entry->email,
                        'type' => 'bounce',
                    ]);
                    $campaign->increment('bounces');
                }
            }
        });

        // Nobody was reachable: return the campaign to draft so the segment can
        // be fixed and the run retried, instead of stranding it in `sent`.
        if ($sent === 0) {
            $campaign->update(['status' => 'draft']);
            Log::warning('campaign matched no deliverable recipients', [
                'campaign' => $campaign->public_id,
                'suppressed' => $skipped,
            ]);

            return;
        }

        $campaign->update([
            'status' => 'sent',
            'sent' => $campaign->sent + $sent,
            'recipients' => $campaign->recipients + $sent,
            'sent_at' => now(),
        ]);
    }

    /**
     * Build the recipient query from the campaign segment rules.
     *
     * Delegated to `CampaignSegment` so the estimated reach in the builder and
     * the rows actually mailed here can never drift apart.
     */
    private function recipients(EmailCampaign $campaign)
    {
        return CampaignSegment::query($campaign->segment ?? []);
    }
}
