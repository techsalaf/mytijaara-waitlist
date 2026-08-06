<?php

namespace App\Console\Commands;

use App\Jobs\SendCampaignJob;
use App\Models\EmailCampaign;
use Illuminate\Console\Command;

/**
 * Dispatches campaigns whose `scheduled_at` has passed.
 *
 * The admin panel could save a campaign as `scheduled` but nothing ever sent it,
 * so "Schedule for later" was a silent no-op. This command is the missing half;
 * it is registered on the scheduler in `routes/console.php` and runs every
 * minute.
 *
 * Flipping the row to `sending` before dispatching is what stops a double send:
 * the status guard means an overlapping run finds nothing to claim, and
 * `SendCampaignJob` itself also returns early on an already-sent campaign.
 */
class SendScheduledCampaigns extends Command
{
    protected $signature = 'campaigns:send-due';

    protected $description = 'Queue any scheduled campaign whose send time has passed';

    public function handle(): int
    {
        $due = EmailCampaign::query()
            ->where('status', 'scheduled')
            ->whereNotNull('scheduled_at')
            ->where('scheduled_at', '<=', now())
            ->get();

        foreach ($due as $campaign) {
            // Claim it first. `where('status', 'scheduled')` makes the update a
            // no-op if a concurrent run got there first.
            $claimed = EmailCampaign::where('id', $campaign->id)
                ->where('status', 'scheduled')
                ->update(['status' => 'sending']);

            if ($claimed === 0) {
                continue;
            }

            SendCampaignJob::dispatch($campaign->id);
            $this->info("Queued {$campaign->public_id} ({$campaign->name}).");
        }

        if ($due->isEmpty()) {
            $this->info('No campaigns due.');
        }

        return self::SUCCESS;
    }
}
