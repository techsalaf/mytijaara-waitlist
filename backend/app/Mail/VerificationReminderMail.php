<?php

namespace App\Mail;

use App\Models\Setting;
use App\Models\WaitlistEntry;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

/**
 * The 3-day nudge for a waitlister who has not confirmed their email address.
 *
 * Built from `WaitlistWelcomeMail` on purpose: same header, same palette, same
 * position badge, same referral block, same WhatsApp block, so it reads as the
 * next message from a brand the recipient already heard from. What changes is the
 * framing. It says plainly that this is a reminder, that the address is still
 * unconfirmed, what confirming unlocks, and why the mail arrived. It never
 * pretends to be a first welcome.
 *
 * `$attempt` is the reminder ordinal (1 = first nudge). It drives the subject
 * line and the opener so the third nudge does not read like the first.
 */
class VerificationReminderMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public WaitlistEntry $entry,
        public int $attempt = 1,
    ) {}

    /**
     * Escalating but never scolding. The final nudge says it is the final one,
     * which is both honest and the best-performing thing to say.
     */
    private function subjectLine(): string
    {
        $max = (int) config('reminders.max_per_entry', 5);
        $isLast = $max > 0 && $this->attempt >= $max;

        if ($isLast) {
            return 'Last reminder: confirm your email to keep your MyTijaara spot';
        }

        return match (true) {
            $this->attempt <= 1 => 'Quick reminder: confirm your email for MyTijaara',
            $this->attempt === 2 => "Still unconfirmed — one tap keeps your MyTijaara spot",
            default => "Your MyTijaara spot is waiting on one click",
        };
    }

    public function envelope(): Envelope
    {
        return new Envelope(subject: $this->subjectLine());
    }

    public function content(): Content
    {
        $site = rtrim((string) config('app.frontend_url', config('app.url')), '/');

        // Same settings reads as the welcome mail so branding stays in step when
        // an administrator changes the logo or the WhatsApp channel.
        $integrations = Setting::where('group', 'integrations')->first();
        $branding = Setting::where('group', 'branding')->first();

        $whatsappChannelUrl = $integrations?->data['whatsappChannelUrl'] ?? null;
        $rawLogoUrl = $branding?->data['logoUrl'] ?? null;
        $siteName = $branding?->data['siteName'] ?? 'MyTijaara';

        $logoUrl = null;
        if ($rawLogoUrl) {
            $logoUrl = (str_starts_with($rawLogoUrl, 'http://') || str_starts_with($rawLogoUrl, 'https://'))
                ? $rawLogoUrl
                : $site.'/'.ltrim($rawLogoUrl, '/');
        }

        $max = (int) config('reminders.max_per_entry', 5);

        return new Content(view: 'mail.verification-reminder', with: [
            'name' => $this->entry->name,
            'role' => $this->entry->role ?? 'customer',
            'position' => $this->entry->position,
            'attempt' => $this->attempt,
            'isFinal' => $max > 0 && $this->attempt >= $max,
            'intervalDays' => (int) config('reminders.interval_days', 3),
            'joinedAgo' => $this->entry->created_at?->diffForHumans(null, true),
            'referralUrl' => $site.'/?ref='.$this->entry->referral_code,
            'benefitsUrl' => $site.'/referral-rewards',
            // Null is impossible in the normal flow — the command mints a token
            // before it sends — but the template still guards, because a reminder
            // whose only button is dead is worse than no reminder.
            'verifyUrl' => $this->entry->verification_token
                ? $site.'/verify-email?token='.$this->entry->verification_token
                : null,
            'unsubscribeUrl' => $site.'/unsubscribe?email='.urlencode($this->entry->email),
            'whatsappChannelUrl' => $whatsappChannelUrl,
            'logoUrl' => $logoUrl,
            'siteName' => $siteName,
        ]);
    }
}
