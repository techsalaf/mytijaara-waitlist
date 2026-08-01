<?php

namespace App\Jobs;

use App\Mail\CampaignMail;
use App\Models\EmailCampaign;
use App\Models\EmailEvent;
use App\Models\Unsubscribe;
use App\Models\WaitlistEntry;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Mail;

/**
 * Delivers a campaign to its target segment. Records a per-recipient `sent`
 * event and updates the campaign counters. Runs on the queue so the API
 * request returns immediately.
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

        $unsubscribed = Unsubscribe::pluck('email')->flip();

        $sent = 0;
        $this->recipients($campaign)->chunkById(200, function ($entries) use ($campaign, $unsubscribed, &$sent) {
            foreach ($entries as $entry) {
                if ($unsubscribed->has($entry->email) || $entry->status === 'unsubscribed') {
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

        $campaign->update([
            'status' => 'sent',
            'sent' => $campaign->sent + $sent,
            'recipients' => $campaign->recipients + $sent,
            'sent_at' => now(),
        ]);
    }

    /** Build the recipient query from the campaign segment rules. */
    private function recipients(EmailCampaign $campaign)
    {
        $query = WaitlistEntry::query()->whereNotNull('email');
        $segment = $campaign->segment ?? [];

        if (! empty($segment['status'])) {
            $query->where('status', $segment['status']);
        }
        if (! empty($segment['verified'])) {
            $query->where('verified', true);
        }
        if (! empty($segment['source'])) {
            $query->where('source', $segment['source']);
        }
        if (! empty($segment['city'])) {
            $query->where('city', $segment['city']);
        }

        return $query;
    }
}
