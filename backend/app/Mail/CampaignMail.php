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
        $site = rtrim((string) config('app.frontend_url', config('app.url')), '/');
        $branding = \App\Models\Setting::where('group', 'branding')->first();

        $rawLogoUrl = $branding?->data['logoUrl'] ?? null;
        $siteName = $branding?->data['siteName'] ?? 'MyTijaara';

        $logoUrl = null;
        if ($rawLogoUrl) {
            if (str_starts_with($rawLogoUrl, 'http://') || str_starts_with($rawLogoUrl, 'https://')) {
                $logoUrl = $rawLogoUrl;
            } else {
                $logoUrl = $site . '/' . ltrim($rawLogoUrl, '/');
            }
        }

        $unsubscribeUrl = $site . '/unsubscribe?email=' . urlencode($this->entry->email);
        $trackingPixelUrl = $site . '/api/v1/track/open/' . $this->campaign->public_id . '?e=' . urlencode($this->entry->email);

        // Personalise the stored HTML with tokens.
        $body = strtr((string) $this->campaign->html, [
            '{{name}}' => e($this->entry->name),
            '{{first_name}}' => e(explode(' ', trim($this->entry->name))[0]),
            '{{email}}' => e($this->entry->email),
            '{{unsubscribe}}' => $unsubscribeUrl,
        ]);

        // Append tracking pixel
        $body .= '<img src="' . $trackingPixelUrl . '" width="1" height="1" style="display:none;width:1px;height:1px;" alt="" />';

        return new Content(view: 'mail.campaign', with: [
            'subject' => $this->campaign->subject,
            'body' => $body,
            'logoUrl' => $logoUrl,
            'siteName' => $siteName,
            'unsubscribeUrl' => $unsubscribeUrl,
        ]);
    }
}
