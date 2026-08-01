<?php

namespace App\Mail;

use App\Models\EmailCampaign;
use App\Models\WaitlistEntry;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class CampaignMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(public EmailCampaign $campaign, public WaitlistEntry $entry) {}

    public function envelope(): Envelope
    {
        return new Envelope(subject: $this->campaign->subject);
    }

    public function content(): Content
    {
        // Personalise the stored HTML with simple {{name}} / {{unsubscribe}} tokens.
        $unsubscribeUrl = rtrim(config('app.frontend_url', config('app.url')), '/')
            .'/unsubscribe?email='.urlencode($this->entry->email);

        $html = strtr((string) $this->campaign->html, [
            '{{name}}' => e($this->entry->name),
            '{{email}}' => e($this->entry->email),
            '{{unsubscribe}}' => $unsubscribeUrl,
        ]);

        return new Content(htmlString: $html !== '' ? $html : $this->campaign->subject);
    }
}
