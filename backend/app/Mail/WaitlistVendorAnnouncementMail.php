<?php

namespace App\Mail;

use App\Models\Setting;
use App\Models\WaitlistEntry;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class WaitlistVendorAnnouncementMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(public WaitlistEntry $entry) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: "🚨 Launch in 3 Days: Create Your Shop for FREE & Start Selling on MyTijaara!"
        );
    }

    public function content(): Content
    {
        $site = rtrim((string) config('app.frontend_url', 'https://mytijaara.com'), '/');
        $branding = Setting::where('group', 'branding')->first();
        $siteName = $branding?->data['siteName'] ?? 'MyTijaara';

        return new Content(
            view: 'emails.waitlist-vendor-announcement',
            with: [
                'name' => $this->entry->name,
                'email' => $this->entry->email,
                'applyUrl' => 'https://dashboard.mytijaara.com/vendor/apply',
                'conciergeUrl' => 'https://wa.me/2349155875899?text=START',
                'conciergePhone' => '+234 915 587 5899',
                'siteName' => $siteName,
                'unsubscribeUrl' => $site . '/unsubscribe?email=' . urlencode($this->entry->email),
            ]
        );
    }
}
