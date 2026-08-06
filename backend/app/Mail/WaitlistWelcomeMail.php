<?php

namespace App\Mail;

use App\Models\WaitlistEntry;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

/**
 * Sent once, immediately after a waitlist signup commits. Carries the queue
 * position, the user's own referral link, and the email verification link.
 */
class WaitlistWelcomeMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(public WaitlistEntry $entry) {}

    /**
     * Subject lines vary by role so the email feels personal from the
     * first line in the inbox, before the recipient even opens it.
     */
    private function subjectForRole(): string
    {
        return match ($this->entry->role) {
            'vendor'  => "Your vendor spot on MyTijaara is reserved",
            'artisan' => "You're on the MyTijaara waitlist — artisan edition",
            'rider'   => "You're on the MyTijaara rider waitlist",
            default   => "You're on the MyTijaara waitlist",
        };
    }

    public function envelope(): Envelope
    {
        return new Envelope(subject: $this->subjectForRole());
    }

    public function content(): Content
    {
        $site = rtrim((string) config('app.frontend_url', config('app.url')), '/');
        $api  = rtrim((string) config('app.url'), '/');

        return new Content(view: 'mail.waitlist-welcome', with: [
            'name'           => $this->entry->name,
            'role'           => $this->entry->role ?? 'customer',
            'position'       => $this->entry->position,
            'referralUrl'    => $site.'/?ref='.$this->entry->referral_code,
            'verifyUrl'      => $this->entry->verification_token
                ? $api.'/api/v1/waitlist/verify/'.$this->entry->verification_token
                : null,
            'unsubscribeUrl' => $site.'/unsubscribe?email='.urlencode($this->entry->email),
        ]);
    }
}
