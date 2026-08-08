<?php

namespace App\Mail;

use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

/**
 * Sent when an admin invites a team member. Carries a real password-reset token
 * so the recipient sets their own password; the account is created with a
 * throwaway random one that is never transmitted.
 */
class AdminInviteMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(public User $user, public string $token) {}

    public function envelope(): Envelope
    {
        return new Envelope(subject: 'You have been invited to the MyTijaara admin panel');
    }

    public function content(): Content
    {
        $site = rtrim((string) config('app.frontend_url', config('app.url')), '/');

        // Fetch logo from branding settings
        $branding = \App\Models\Setting::where('group', 'branding')->first();
        $logoUrl = $branding?->data['logoUrl'] ?? null;
        $siteName = $branding?->data['siteName'] ?? 'MyTijaara';

        return new Content(view: 'mail.admin-invite', with: [
            'name' => $this->user->name,
            'role' => $this->user->roles->first()?->label ?: 'Team member',
            'acceptUrl' => $site.'/auth/reset-password?token='.$this->token.'&email='.urlencode($this->user->email),
            'logoUrl' => $logoUrl,
            'siteName' => $siteName,
        ]);
    }
}
