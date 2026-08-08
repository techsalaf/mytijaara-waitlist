<?php

namespace App\Mail;

use App\Models\WaitlistEntry;
use App\Support\ReferralProgram;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

/**
 * Sent by `RewardDispatcher` when an admin pays a referrer.
 *
 * This mail is the referrer's only notice that the reward landed, so the send is
 * treated as part of the payout: if it throws, the dispatcher un-marks the
 * referrals rather than recording a payout nobody was told about.
 */
class ReferralRewardMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public WaitlistEntry $entry,
        public int $referralsRewarded,
        public int $amount,
        public string $currency = 'NGN',
        public ?string $note = null,
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(subject: 'Your MyTijaara referral reward is on its way');
    }

    public function content(): Content
    {
        $site = rtrim((string) config('app.frontend_url', config('app.url')), '/');

        // Fetch logo from branding settings
        $branding = \App\Models\Setting::where('group', 'branding')->first();
        $logoUrl = $branding?->data['logoUrl'] ?? null;
        $siteName = $branding?->data['siteName'] ?? 'MyTijaara';

        return new Content(view: 'mail.referral-reward', with: [
            'name' => $this->entry->name,
            'referrals' => $this->referralsRewarded,
            'amount' => ReferralProgram::format($this->amount, $this->currency),
            'note' => $this->note,
            'referralUrl' => $site.'/?ref='.$this->entry->referral_code,
            'unsubscribeUrl' => $site.'/unsubscribe?email='.urlencode($this->entry->email),
            'logoUrl' => $logoUrl,
            'siteName' => $siteName,
        ]);
    }
}
