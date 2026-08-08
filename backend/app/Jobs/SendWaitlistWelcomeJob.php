<?php

namespace App\Jobs;

use App\Mail\WaitlistWelcomeMail;
use App\Models\WaitlistEntry;
use App\Support\SmtpConfig;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;

/**
 * Sends the welcome email to a new waitlist signup. Runs on the queue so the
 * signup API response returns immediately without waiting for SMTP.
 *
 * Retries on transient SMTP failures but logs and abandons on permanent failure
 * so a broken mail config doesn't trap jobs forever.
 */
class SendWaitlistWelcomeJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 3;

    public int $backoff = 30;

    public function __construct(public int $waitlistEntryId) {}

    public function handle(): void
    {
        $entry = WaitlistEntry::find($this->waitlistEntryId);
        if (! $entry) {
            Log::warning('waitlist welcome job: entry not found', ['id' => $this->waitlistEntryId]);
            return;
        }

        try {
            SmtpConfig::apply();
            Mail::to($entry->email)->send(new WaitlistWelcomeMail($entry));
        } catch (\Throwable $e) {
            Log::warning('waitlist welcome mail failed', [
                'entry' => $entry->public_id,
                'error' => $e->getMessage(),
            ]);
            throw $e;
        }
    }
}
