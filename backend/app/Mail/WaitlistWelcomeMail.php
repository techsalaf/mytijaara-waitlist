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

    public function envelope(): Envelope
    {
        return new Envelope(subject: "You're on the MyTijaara waitlist");
    }

    public function content(): Content
    {
        $site = rtrim((string) config('app.frontend_url', config('app.url')), '/');
        $api = rtrim((string) config('app.url'), '/');

        return new Content(view: 'mail.waitlist-welcome', with: [
            'name' => $this->entry->name,
            'position' => $this->entry->position,
            'referralUrl' => $site.'/?ref='.$this->entry->referral_code,
            'verifyUrl' => $this->entry->verification_token
                ? $api.'/api/v1/waitlist/verify/'.$this->entry->verification_token
                : null,
            'unsubscribeUrl' => $site.'/unsubscribe?email='.urlencode($this->entry->email),
        ]);
    }
}
