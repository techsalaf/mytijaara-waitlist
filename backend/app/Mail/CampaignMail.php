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

        $rawLogoUrl = $branding?->data['logoUrl'] ?? $branding?->data['logo'] ?? null;
        $siteName = $branding?->data['siteName'] ?? 'MyTijaara';

        $logoUrl = 'https://mytijaara.com/logo.png';
        if ($rawLogoUrl) {
            if (str_starts_with($rawLogoUrl, 'http://') || str_starts_with($rawLogoUrl, 'https://')) {
                $logoUrl = $rawLogoUrl;
            } else {
                $logoUrl = $site . '/' . ltrim($rawLogoUrl, '/');
            }
        }

        $apiUrl = rtrim((string) config('app.url'), '/');
        $unsubscribeUrl = $site . '/unsubscribe?email=' . urlencode($this->entry->email);
        $trackingPixelUrl = $apiUrl . '/api/v1/track/open/' . $this->campaign->public_id . '?e=' . urlencode($this->entry->email);
        $referralUrl = $site . '/?ref=' . ($this->entry->referral_code ?? '');
        $verifyUrl = $site . '/verify-email?token=' . ($this->entry->verification_token ?? '');

        // Personalise the stored HTML with standard tokens.
        $body = strtr((string) $this->campaign->html, [
            '{{name}}' => e($this->entry->name),
            '{{first_name}}' => e(explode(' ', trim($this->entry->name))[0]),
            '{{firstName}}' => e(explode(' ', trim($this->entry->name))[0]),
            '{{email}}' => e($this->entry->email),
            '{{role}}' => e(ucfirst($this->entry->role ?? 'member')),
            '{{position}}' => e((string) ($this->entry->position ?? '1')),
            '{{referralUrl}}' => $referralUrl,
            '{{referral_url}}' => $referralUrl,
            '{{verifyUrl}}' => $verifyUrl,
            '{{verify_url}}' => $verifyUrl,
            '{{logoUrl}}' => $logoUrl,
            '{{logo_url}}' => $logoUrl,
            '{{siteName}}' => e($siteName),
            '{{site_name}}' => e($siteName),
            '{{unsubscribe}}' => $unsubscribeUrl,
            '{{unsubscribeUrl}}' => $unsubscribeUrl,
            '{{amount}}' => '₦5,000',
            '{{referrals}}' => '3',
            '{{resetLink}}' => $site . '/auth/reset-password?token=sample',
            '{{reset_link}}' => $site . '/auth/reset-password?token=sample',
        ]);

        // Wrap external links for click tracking (excluding unsubscribe)
        $clickTrackerBase = $apiUrl . '/api/v1/track/click/' . $this->campaign->public_id . '?e=' . urlencode($this->entry->email) . '&url=';
        $body = preg_replace_callback(
            '/<a\s+([^>]*?)href=["\'](https?:\/\/[^"\']+)["\']([^>]*)>/i',
            function ($matches) use ($clickTrackerBase, $unsubscribeUrl) {
                $url = $matches[2];
                if (str_contains($url, 'unsubscribe') || $url === $unsubscribeUrl || str_contains($url, '/track/')) {
                    return $matches[0];
                }
                $wrapped = $clickTrackerBase . urlencode($url);
                return '<a ' . $matches[1] . 'href="' . $wrapped . '"' . $matches[3] . '>';
            },
            $body
        );

        // Append tracking pixel before </body> or at the end
        $pixelTag = '<img src="' . $trackingPixelUrl . '" width="1" height="1" style="display:none;width:1px;height:1px;" alt="" />';
        if (str_contains($body, '</body>')) {
            $body = str_replace('</body>', $pixelTag . '</body>', $body);
        } else {
            $body .= $pixelTag;
        }

        if (str_contains($body, '<html') || str_contains($body, '<!DOCTYPE')) {
            return new Content(htmlString: $body);
        }

        return new Content(view: 'mail.campaign', with: [
            'subject' => $this->campaign->subject,
            'body' => $body,
            'logoUrl' => $logoUrl,
            'siteName' => $siteName,
            'unsubscribeUrl' => $unsubscribeUrl,
        ]);
    }
}
