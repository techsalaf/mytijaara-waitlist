<?php

namespace App\Mail;

use App\Models\CmsSection;
use App\Models\Setting;
use App\Models\WaitlistEntry;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

/**
 * Sent to waitlisters to announce the launch date (October 2, 2026),
 * location (TAA NATCON 2026), and provide their 1-click personalized
 * Launch Pass link.
 */
class LaunchPassNotificationMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(public WaitlistEntry $entry) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: "Your MyTijaara Launch Pass is ready — October 2 at TAA NATCON 2026"
        );
    }

    public function content(): Content
    {
        $site = rtrim((string) config('app.frontend_url', config('app.url')), '/');

        // Fetch settings & branding
        $integrations = Setting::where('group', 'integrations')->first();
        $branding = Setting::where('group', 'branding')->first();
        $cmsSection = CmsSection::where('section', 'launch_pass')->first();

        $whatsappChannelUrl = $integrations?->data['whatsappChannelUrl'] ?? null;
        $rawLogoUrl = $branding?->data['logoUrl'] ?? $branding?->data['logo'] ?? null;
        $siteName = $branding?->data['siteName'] ?? 'MyTijaara';

        // Event metadata from CMS with reliable fallbacks
        $cmsData = (array) ($cmsSection?->data ?? []);
        $eventName = $cmsData['eventName'] ?? 'TAA NATCON 2026';
        $eventDate = $cmsData['eventDate'] ?? 'October 2, 2026';

        // Ensure logoUrl is an absolute email-compatible URL
        $logoUrl = null;
        if ($rawLogoUrl) {
            if (str_starts_with($rawLogoUrl, 'http://') || str_starts_with($rawLogoUrl, 'https://')) {
                $logoUrl = $rawLogoUrl;
            } else {
                $logoUrl = $site . '/' . ltrim($rawLogoUrl, '/');
            }
        }

        $launchPassUrl = $site . '/launch-pass/' . ($this->entry->launch_pass_token ?? '');

        return new Content(view: 'mail.launch-pass-notification', with: [
            'name'               => $this->entry->name,
            'firstName'          => explode(' ', trim($this->entry->name))[0],
            'position'           => $this->entry->position,
            'role'               => $this->entry->role ?? 'member',
            'launchPassUrl'      => $launchPassUrl,
            'eventName'          => $eventName,
            'eventDate'          => $eventDate,
            'referralUrl'        => $site . '/?ref=' . ($this->entry->referral_code ?? ''),
            'benefitsUrl'        => $site . '/referral-rewards',
            'unsubscribeUrl'     => $site . '/unsubscribe?email=' . urlencode($this->entry->email),
            'whatsappChannelUrl' => $whatsappChannelUrl,
            'logoUrl'            => $logoUrl,
            'siteName'           => $siteName,
        ]);
    }
}
